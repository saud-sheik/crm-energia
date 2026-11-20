import { RentalContract, Deal, Account, Quote, User, Asset, AssetBooking, Invoice } from "@nexus-crm/database";
import { Op } from "sequelize";

export interface GenerateContractInput {
  dealId: string;
  quoteId?: string;
  accountId?: string;
  contractStartDate: string | Date;
  contractEndDate: string | Date;
  totalContractValue: number;
  monthlyRecurringRate?: number;
  securityDepositAmount?: number;
  breakdownResponseSlaHours?: 2 | 4 | 8;
  backupUnitCommitment?: boolean;
  insuranceResponsibility?: "CLIENT_COMPREHENSIVE" | "ENERGIA_COVER" | "JOINT";
  damageLiabilityTerms?: string;
  siteLocation?: string;
  equipmentSummary?: string;
}

export const STANDARD_DAMAGE_LIABILITY =
  "The Lessee shall be fully liable for any loss, mechanical abuse, or damage arising from unauthorized operation, incorrect fuel grade contamination, or site negligence. Standard wear and tear excepted.";

export class RentalContractService {
  /**
   * Generate an equipment hire contract from an approved deal or quote
   */
  public static async generateContract(input: GenerateContractInput): Promise<RentalContract> {
    const deal = await Deal.findByPk(input.dealId);
    if (!deal) {
      throw new Error(`Opportunity/Deal with ID ${input.dealId} not found.`);
    }

    const accountId = input.accountId || deal.accountId || null;
    const year = new Date().getFullYear();
    const contractNumber = `EN-RC-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    const slaHours = input.breakdownResponseSlaHours || 4;
    const backupUnit = input.backupUnitCommitment !== undefined ? input.backupUnitCommitment : true;

    const contract = await RentalContract.create({
      contractNumber,
      dealId: input.dealId,
      quoteId: input.quoteId || null,
      accountId,
      status: "AWAITING_CLIENT_SIGNATURE",
      contractStartDate: new Date(input.contractStartDate),
      contractEndDate: new Date(input.contractEndDate),
      totalContractValue: input.totalContractValue,
      monthlyRecurringRate: input.monthlyRecurringRate || null,
      securityDepositAmount: input.securityDepositAmount || 0,
      breakdownResponseSlaHours: slaHours,
      backupUnitCommitment: backupUnit,
      insuranceResponsibility: input.insuranceResponsibility || "CLIENT_COMPREHENSIVE",
      damageLiabilityTerms: input.damageLiabilityTerms || STANDARD_DAMAGE_LIABILITY,
      siteLocation: input.siteLocation || "Operational Project Site",
      equipmentSummary: input.equipmentSummary || "Industrial Power Equipment Generator Asset"
    });

    return contract;
  }

  /**
   * Submit contract for legal & commercial sign-off
   */
  public static async submitForLegalReview(contractId: string): Promise<RentalContract> {
    const contract = await RentalContract.findByPk(contractId);
    if (!contract) {
      throw new Error(`Rental contract with ID ${contractId} not found.`);
    }

    await contract.update({ status: "LEGAL_REVIEW" });
    return contract;
  }

  /**
   * Complete legal review and dispatch for client e-signature
   */
  public static async approveLegalReview(contractId: string, reviewerUserId?: string): Promise<RentalContract> {
    const contract = await RentalContract.findByPk(contractId);
    if (!contract) {
      throw new Error(`Rental contract with ID ${contractId} not found.`);
    }

    await contract.update({
      status: "AWAITING_CLIENT_SIGNATURE",
      legalReviewedByUserId: reviewerUserId || null,
      legalReviewedAt: new Date()
    });

    return contract;
  }

  /**
   * Record client e-signature
   */
  public static async recordClientSignature(params: {
    contractId: string;
    signatoryName: string;
    signatoryTitle: string;
    signatureData?: string;
  }): Promise<RentalContract> {
    const contract = await RentalContract.findByPk(params.contractId);
    if (!contract) {
      throw new Error(`Rental contract with ID ${params.contractId} not found.`);
    }

    if (!params.signatoryName || !params.signatoryTitle) {
      throw new Error("Client signatory name and official title are required.");
    }

    await contract.update({
      clientSignatoryName: params.signatoryName,
      clientSignatoryTitle: params.signatoryTitle,
      clientSignedAt: new Date(),
      clientSignatureData: params.signatureData || "DIGITALLY_SIGNED_AUTHORIZED_REP",
      status: "AWAITING_COMPANY_SIGNATURE",
      termsAccepted: true
    });

    return contract;
  }

  /**
   * Company Executive countersigns, activating rental agreement and bumping Deal to 100% Won!
   */
  public static async recordCompanyCountersignature(params: {
    contractId: string;
    companyUserId: string;
    signatureData?: string;
  }): Promise<RentalContract> {
    const contract = await RentalContract.findByPk(params.contractId);
    if (!contract) {
      throw new Error(`Rental contract with ID ${params.contractId} not found.`);
    }

    if (contract.status !== "AWAITING_COMPANY_SIGNATURE" && contract.status !== "AWAITING_CLIENT_SIGNATURE") {
      throw new Error(`Contract must be in signature state (current status: ${contract.status})`);
    }

    // Activate contract
    await contract.update({
      companySignatoryUserId: params.companyUserId,
      companySignedAt: new Date(),
      companySignatureData: params.signatureData || "ENERGIA_AUTHORIZED_EXECUTIVE_SIGNATURE",
      status: "ACTIVE"
    });

    // Automatically mark the parent Deal as 100% Won!
    const deal = await Deal.findByPk(contract.dealId);
    if (deal) {
      await deal.update({
        probability: 100,
        status: "WON",
        wonAt: new Date()
      });
    }

    // Auto-Lock Fleet Asset: Create/Update AssetBooking & set Asset to Deployed
    try {
      if (AssetBooking) {
        let existingBooking = await AssetBooking.findOne({ where: { dealId: contract.dealId } });
        if (existingBooking) {
          await existingBooking.update({
            bookingStatus: "DISPATCHED_ON_HIRE",
            contractId: contract.id,
            startDate: contract.contractStartDate,
            endDate: contract.contractEndDate,
            siteLocation: contract.siteLocation
          });
        } else if (Asset) {
          const availableAsset = await Asset.findOne({
            where: { status: "In Storage" }
          });
          if (availableAsset) {
            await AssetBooking.create({
              assetId: availableAsset.id,
              dealId: contract.dealId,
              contractId: contract.id,
              customerId: contract.accountId || null,
              startDate: contract.contractStartDate,
              endDate: contract.contractEndDate,
              bookingStatus: "DISPATCHED_ON_HIRE",
              siteLocation: contract.siteLocation,
              notes: `Auto-reserved via executed rental contract ${contract.contractNumber}`
            });
            await availableAsset.update({
              status: "Deployed",
              deployedAt: contract.contractStartDate,
              expectedReturnDate: contract.contractEndDate,
              dealId: contract.dealId,
              customerId: contract.accountId || null
            });
          }
        }
      }
    } catch (bookingErr) {
      console.warn("[rentalContractService] Fleet auto-booking integration:", bookingErr);
    }

    // Auto-Generate Initial Rental Invoicing Record in Invoices desk
    try {
      if (Invoice) {
        const invAmount = contract.monthlyRecurringRate || contract.totalContractValue || 50000;
        await Invoice.create({
          quoteId: contract.quoteId || null,
          status: "Sent",
          totalAmount: invAmount,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          notes: `Mobilisation & First Month Hire for Contract ${contract.contractNumber} (${contract.siteLocation})`,
          amountPaid: 0,
          paymentStatus: "unpaid"
        });
      }
    } catch (invErr) {
      console.warn("[rentalContractService] Invoice auto-generation integration:", invErr);
    }

    return contract;
  }

  /**
   * Retrieve list of rental contracts
   */
  public static async getContracts(filters?: { status?: string }) {
    const where: any = {};
    if (filters?.status && filters.status !== "ALL") {
      if (filters.status === "CLIENT_SIGNING") {
        where.status = { [Op.in]: ["AWAITING_CLIENT_SIGNATURE", "DRAFT"] };
      } else if (filters.status === "COMPANY_SIGNING") {
        where.status = "AWAITING_COMPANY_SIGNATURE";
      } else {
        where.status = filters.status;
      }
    }

    return RentalContract.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Deal,
          as: "deal",
          include: [
            { model: Account, as: "account" }
          ]
        },
        {
          model: Account,
          as: "account"
        },
        {
          model: User,
          as: "companySignatory",
          attributes: ["id", "name", "email"]
        },
        {
          model: User,
          as: "legalReviewer",
          attributes: ["id", "name", "email"]
        }
      ]
    });
  }

  /**
   * Retrieve single contract by ID
   */
  public static async getContractById(id: string) {
    return RentalContract.findByPk(id, {
      include: [
        {
          model: Deal,
          as: "deal",
          include: [
            { model: Account, as: "account" }
          ]
        },
        {
          model: Account,
          as: "account"
        },
        {
          model: User,
          as: "companySignatory",
          attributes: ["id", "name", "email"]
        },
        {
          model: User,
          as: "legalReviewer",
          attributes: ["id", "name", "email"]
        }
      ]
    });
  }
}
