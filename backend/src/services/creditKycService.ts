import { CreditApplication, Deal, Account, Lead, Quote, User } from "@nexus-crm/database";

export interface KycDocumentAttachment {
  type: "trade_license" | "commercial_registration" | "aof" | "vat_certificate" | "other";
  name: string;
  url?: string;
  uploadedAt: string;
  notes?: string;
}

export interface SubmitCreditApplicationInput {
  dealId: string;
  accountId?: string;
  quoteId?: string;
  requestedCreditLimit: number;
  requestedPaymentTerms: "30_DAYS" | "60_DAYS" | "90_DAYS" | "ADVANCE";
  tradeLicenseNumber?: string;
  commercialRegistrationNumber?: string;
  vatRegistrationNumber?: string;
  kycDocuments?: KycDocumentAttachment[];
  notes?: string;
}

export interface ReviewCreditDecisionInput {
  status: "APPROVED" | "DECLINED" | "ADVANCE_PAYMENT_REQUIRED";
  approvedCreditLimit?: number;
  approvedPaymentTerms?: string;
  declineReason?: string;
  notes?: string;
  reviewerUserId?: string;
}

export class CreditKycService {
  /**
   * Submit or update a credit application for an Opportunity at 90% PO Stage
   */
  public static async submitApplication(input: SubmitCreditApplicationInput): Promise<CreditApplication> {
    const deal = await Deal.findByPk(input.dealId);
    if (!deal) {
      throw new Error(`Opportunity/Deal with ID ${input.dealId} not found.`);
    }

    const accountId = input.accountId || deal.accountId || null;

    // Check if application already exists for this deal
    let application = await CreditApplication.findOne({ where: { dealId: input.dealId } });

    const serializedDocs = input.kycDocuments ? JSON.stringify(input.kycDocuments) : null;

    if (application) {
      // Update existing application and reset to pending review
      await application.update({
        accountId,
        quoteId: input.quoteId || application.quoteId,
        status: "PENDING_REVIEW",
        requestedCreditLimit: input.requestedCreditLimit,
        requestedPaymentTerms: input.requestedPaymentTerms,
        tradeLicenseNumber: input.tradeLicenseNumber || application.tradeLicenseNumber,
        commercialRegistrationNumber: input.commercialRegistrationNumber || application.commercialRegistrationNumber,
        vatRegistrationNumber: input.vatRegistrationNumber || application.vatRegistrationNumber,
        kycDocuments: serializedDocs || application.kycDocuments,
        notes: input.notes !== undefined ? input.notes : application.notes,
        declineReason: null,
        fallbackToAdvancePayment: false
      });
      return application;
    }

    application = await CreditApplication.create({
      dealId: input.dealId,
      accountId,
      quoteId: input.quoteId || null,
      status: "PENDING_REVIEW",
      requestedCreditLimit: input.requestedCreditLimit,
      requestedPaymentTerms: input.requestedPaymentTerms,
      tradeLicenseNumber: input.tradeLicenseNumber || null,
      commercialRegistrationNumber: input.commercialRegistrationNumber || null,
      vatRegistrationNumber: input.vatRegistrationNumber || null,
      kycDocuments: serializedDocs,
      notes: input.notes || null,
      fallbackToAdvancePayment: false,
      advancePaymentReceived: false
    });

    return application;
  }

  /**
   * Credit Department underwriting review decision
   */
  public static async reviewApplication(
    applicationId: string,
    decision: ReviewCreditDecisionInput
  ): Promise<CreditApplication> {
    const application = await CreditApplication.findByPk(applicationId);
    if (!application) {
      throw new Error(`Credit Application with ID ${applicationId} not found.`);
    }

    if (decision.status === "DECLINED" && !decision.declineReason) {
      throw new Error("A specific decline reason is mandatory when declining credit terms.");
    }

    if (decision.status === "APPROVED" && (!decision.approvedCreditLimit || decision.approvedCreditLimit <= 0)) {
      throw new Error("An approved credit limit greater than 0 SAR is mandatory for credit approvals.");
    }

    const isAdvanceFallback = decision.status === "ADVANCE_PAYMENT_REQUIRED";

    await application.update({
      status: decision.status,
      approvedCreditLimit: decision.status === "APPROVED" ? decision.approvedCreditLimit : null,
      approvedPaymentTerms:
        decision.status === "APPROVED"
          ? decision.approvedPaymentTerms || application.requestedPaymentTerms
          : isAdvanceFallback
          ? "100%_ADVANCE"
          : null,
      declineReason: decision.status === "DECLINED" ? decision.declineReason : null,
      reviewedByUserId: decision.reviewerUserId || null,
      reviewedAt: new Date(),
      notes: decision.notes !== undefined ? decision.notes : application.notes,
      fallbackToAdvancePayment: isAdvanceFallback
    });

    return application;
  }

  /**
   * Switch a declined application to 100% Advance Payment fallback branch
   */
  public static async activateAdvancePaymentFallback(applicationId: string, notes?: string): Promise<CreditApplication> {
    const application = await CreditApplication.findByPk(applicationId);
    if (!application) {
      throw new Error(`Credit Application with ID ${applicationId} not found.`);
    }

    await application.update({
      status: "ADVANCE_PAYMENT_REQUIRED",
      fallbackToAdvancePayment: true,
      approvedPaymentTerms: "100%_ADVANCE",
      notes: notes || "Switched to 100% Advance Payment fallback branch after credit review."
    });

    return application;
  }

  /**
   * Record that customer has paid 100% advance deposit, unblocking contract execution
   */
  public static async confirmAdvancePaymentReceived(applicationId: string): Promise<CreditApplication> {
    const application = await CreditApplication.findByPk(applicationId);
    if (!application) {
      throw new Error(`Credit Application with ID ${applicationId} not found.`);
    }

    await application.update({
      advancePaymentReceived: true,
      status: "APPROVED",
      approvedCreditLimit: 0,
      approvedPaymentTerms: "100%_ADVANCE_PAID"
    });

    return application;
  }

  /**
   * Retrieve Credit Review Queue with filters
   */
  public static async getQueue(filters?: { status?: string; search?: string }) {
    const where: any = {};
    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    const applications = await CreditApplication.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Deal,
          as: "deal",
          include: [
            { model: Account, as: "account" },
            { model: Lead, as: "lead" }
          ]
        },
        {
          model: Account,
          as: "account"
        },
        {
          model: User,
          as: "reviewer",
          attributes: ["id", "firstName", "lastName", "email", "role"]
        }
      ]
    });

    return applications;
  }

  /**
   * Get single application by ID with all relations
   */
  public static async getApplicationById(id: string) {
    return CreditApplication.findByPk(id, {
      include: [
        {
          model: Deal,
          as: "deal",
          include: [
            { model: Account, as: "account" },
            { model: Lead, as: "lead" }
          ]
        },
        {
          model: Account,
          as: "account"
        },
        {
          model: User,
          as: "reviewer",
          attributes: ["id", "firstName", "lastName", "email", "role"]
        }
      ]
    });
  }

  /**
   * Find application for a specific deal
   */
  public static async getDealApplication(dealId: string) {
    return CreditApplication.findOne({
      where: { dealId },
      include: [
        {
          model: Deal,
          as: "deal",
          include: [
            { model: Account, as: "account" },
            { model: Lead, as: "lead" }
          ]
        },
        {
          model: Account,
          as: "account"
        },
        {
          model: User,
          as: "reviewer",
          attributes: ["id", "firstName", "lastName", "email", "role"]
        }
      ]
    });
  }
}

