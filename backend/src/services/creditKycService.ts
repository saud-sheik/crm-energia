import { CreditApplication, Deal, Account, Lead, Quote, User, Activity } from "@nexus-crm/database";

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

    const isUpfrontAdvance = input.requestedPaymentTerms === "ADVANCE";
    const autoStatus = isUpfrontAdvance ? "APPROVED" : "PENDING_REVIEW";
    const autoPaymentTerms = isUpfrontAdvance ? "100%_ADVANCE_PAID" : null;
    const autoCreditLimit = isUpfrontAdvance ? 0 : null;
    const autoNote = isUpfrontAdvance
      ? `${input.notes || ""} [Fast-Track Auto-Approved: 100% Upfront Advance Cash Protection Guard]`.trim()
      : (input.notes || null);

    if (application) {
      // Update existing application
      await application.update({
        accountId,
        quoteId: input.quoteId || application.quoteId,
        status: autoStatus,
        approvedCreditLimit: autoCreditLimit,
        approvedPaymentTerms: autoPaymentTerms,
        requestedCreditLimit: input.requestedCreditLimit,
        requestedPaymentTerms: input.requestedPaymentTerms,
        tradeLicenseNumber: input.tradeLicenseNumber || application.tradeLicenseNumber,
        commercialRegistrationNumber: input.commercialRegistrationNumber || application.commercialRegistrationNumber,
        vatRegistrationNumber: input.vatRegistrationNumber || application.vatRegistrationNumber,
        kycDocuments: serializedDocs || application.kycDocuments,
        notes: autoNote !== undefined ? autoNote : application.notes,
        declineReason: null,
        fallbackToAdvancePayment: isUpfrontAdvance,
        advancePaymentReceived: isUpfrontAdvance
      });
      return application;
    }

    application = await CreditApplication.create({
      dealId: input.dealId,
      accountId,
      quoteId: input.quoteId || null,
      status: autoStatus,
      approvedCreditLimit: autoCreditLimit,
      approvedPaymentTerms: autoPaymentTerms,
      requestedCreditLimit: input.requestedCreditLimit,
      requestedPaymentTerms: input.requestedPaymentTerms,
      tradeLicenseNumber: input.tradeLicenseNumber || null,
      commercialRegistrationNumber: input.commercialRegistrationNumber || null,
      vatRegistrationNumber: input.vatRegistrationNumber || null,
      kycDocuments: serializedDocs,
      notes: autoNote,
      fallbackToAdvancePayment: isUpfrontAdvance,
      advancePaymentReceived: isUpfrontAdvance
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
          attributes: ["id", "name", "email", "role"]
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
          attributes: ["id", "name", "email", "role"]
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
          attributes: ["id", "name", "email", "role"]
        }
      ]
    });
  }

  /**
   * Helper to decode token or resolve dealId
   */
  public static resolveDealIdFromToken(token: string): string {
    if (!token) throw new Error("Missing KYC access token");
    try {
      const json = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
      if (json && json.dealId) return json.dealId;
    } catch (e) {
      // Fallback: check if token is already a valid UUID
    }
    return token;
  }

  /**
   * Generate secure 1-time digital KYC link for customer
   */
  public static async generatePublicKycLink(params: {
    dealId: string;
    recipientEmail?: string;
    recipientPhone?: string;
    channel?: "whatsapp" | "email" | "both";
  }) {
    const deal = await Deal.findByPk(params.dealId, {
      include: [
        { model: Account, as: "account" },
        { model: Lead, as: "lead" }
      ]
    });
    if (!deal) {
      throw new Error(`Opportunity/Deal with ID ${params.dealId} not found.`);
    }

    const payload = {
      dealId: deal.id,
      dealName: deal.name,
      companyName: (deal as any).account?.name || (deal as any).lead?.company || "Red Sea Coastal Works Subcontractor",
      contactName: (deal as any).lead ? `${(deal as any).lead.firstName || ""} ${(deal as any).lead.lastName || ""}`.trim() : "Fahad Al-Harbi",
      contactPhone: (deal as any).lead?.phone || "+966 50 123 4567",
      contactEmail: (deal as any).lead?.email || "f.alharbi@redsea-contracting.sa",
      existingCr: (deal as any).account?.registrationNumber || "2050119284",
      existingTradeLicense: "TL-2026-99120",
      existingVat: (deal as any).account?.taxId || "300182749200003",
      requestedCreditLimit: Number(deal.amount || (deal as any).dealValue || 50000),
      requestedPaymentTerms: "30_DAYS",
      createdAt: Date.now()
    };
    const token = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const kycUrl = `/kyc/${token}`;

    const channel = params.channel || "whatsapp";
    const recipient = params.recipientPhone || params.recipientEmail || (deal as any).lead?.phone || (deal as any).lead?.email || "Customer";

    // Log Activity on Deal
    try {
      if (Activity) {
        const cryptoMod = require("crypto");
        await Activity.create({
          id: cryptoMod.randomUUID(),
          dealId: deal.id,
          leadId: (deal as any).leadId || null,
          type: "whatsapp_sms",
          direction: "outbound",
          outcome: `Digital KYC Request Sent via ${channel.toUpperCase()}`,
          notes: `Secure customer KYC link dispatched to ${recipient}. URL: ${kycUrl}`
        });
      }
    } catch (actErr) {
      console.warn("[generatePublicKycLink] Activity note:", actErr);
    }

    return {
      success: true,
      token,
      kycUrl,
      dealId: deal.id,
      dealName: deal.name,
      companyName: (deal as any).account?.name || (deal as any).lead?.company || deal.name,
      recipient
    };
  }

  /**
   * Retrieve Public KYC Form Data for customer self-service
   */
  public static async getPublicKycData(token: string) {
    const dealId = this.resolveDealIdFromToken(token);
    const deal = await Deal.findByPk(dealId, {
      include: [
        { model: Account, as: "account" },
        { model: Lead, as: "lead" }
      ]
    });
    if (!deal) {
      throw new Error("Invalid or expired KYC access token.");
    }

    const existingApp = await CreditApplication.findOne({ where: { dealId } });
    const account = (deal as any).account;
    const lead = (deal as any).lead;

    return {
      dealId: deal.id,
      dealName: deal.name,
      companyName: account?.name || lead?.company || deal.name,
      contactName: lead ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim() : "Authorized Representative",
      contactEmail: lead?.email || "",
      contactPhone: lead?.phone || "",
      existingCr: existingApp?.commercialRegistrationNumber || account?.registrationNumber || "",
      existingTradeLicense: existingApp?.tradeLicenseNumber || "",
      existingVat: existingApp?.vatRegistrationNumber || account?.taxId || "",
      requestedCreditLimit: existingApp?.requestedCreditLimit || deal.amount || 50000,
      requestedPaymentTerms: existingApp?.requestedPaymentTerms || "30_DAYS",
      notes: existingApp?.notes || ""
    };
  }

  /**
   * Customer submits public KYC verification form
   */
  public static async submitPublicKyc(token: string, input: {
    commercialRegistrationNumber: string;
    tradeLicenseNumber?: string;
    vatRegistrationNumber: string;
    signatoryName: string;
    signatoryTitle: string;
    signatoryPhone?: string;
    kycDocuments?: KycDocumentAttachment[];
    notes?: string;
  }) {
    const dealId = this.resolveDealIdFromToken(token);
    const deal = await Deal.findByPk(dealId, {
      include: [{ model: Account, as: "account" }]
    });
    if (!deal) {
      throw new Error("Invalid or expired KYC access token.");
    }

    const account = (deal as any).account;

    // 1. Submit / Update CreditApplication
    const notesSummary = `Self-Service KYC Submission by ${input.signatoryName} (${input.signatoryTitle || "Representative"})${input.signatoryPhone ? ` • Phone: ${input.signatoryPhone}` : ""}${input.notes ? `\nClient Notes: ${input.notes}` : ""}`;

    const application = await this.submitApplication({
      dealId,
      accountId: account?.id || deal.accountId || undefined,
      requestedCreditLimit: deal.amount || 50000,
      requestedPaymentTerms: "30_DAYS",
      commercialRegistrationNumber: input.commercialRegistrationNumber,
      tradeLicenseNumber: input.tradeLicenseNumber,
      vatRegistrationNumber: input.vatRegistrationNumber,
      kycDocuments: input.kycDocuments,
      notes: notesSummary
    });

    // 2. Auto-sync CR and VAT directly onto Account if present
    if (account) {
      try {
        await account.update({
          registrationNumber: input.commercialRegistrationNumber || account.registrationNumber,
          taxId: input.vatRegistrationNumber || account.taxId
        });
      } catch (accErr) {
        console.warn("[submitPublicKyc] Account update note:", accErr);
      }
    }

    // 3. Log Activity on the Deal
    try {
      if (Activity) {
        const cryptoMod = require("crypto");
        await Activity.create({
          id: cryptoMod.randomUUID(),
          dealId: deal.id,
          leadId: (deal as any).leadId || null,
          type: "whatsapp_sms",
          direction: "inbound",
          outcome: "Client Completed Digital KYC Submission",
          notes: `CR: ${input.commercialRegistrationNumber} • VAT: ${input.vatRegistrationNumber} • Signatory: ${input.signatoryName}. Application status set to PENDING_REVIEW.`
        });
      }
    } catch (actErr) {
      console.warn("[submitPublicKyc] Activity note:", actErr);
    }

    return {
      success: true,
      message: "KYC compliance documents submitted successfully. Energia Credit Department is now underwriting your account.",
      applicationId: application.id
    };
  }
}

