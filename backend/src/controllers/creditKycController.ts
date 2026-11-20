import { Request, Response } from "express";
import { CreditKycService } from "../services/creditKycService";

export const getCreditQueue = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const queue = await CreditKycService.getQueue({
      status: status as string,
      search: search as string
    });
    return res.json({
      success: true,
      count: queue.length,
      data: queue
    });
  } catch (err: any) {
    console.error("[creditKycController.getCreditQueue] Error:", err);
    return res.status(500).json({ error: "Failed to retrieve credit applications queue", details: err.message });
  }
};

export const getDealCreditStatus = async (req: Request, res: Response) => {
  try {
    const dealId = String(req.params.dealId);
    const application = await CreditKycService.getDealApplication(dealId);
    return res.json({
      success: true,
      data: application
    });
  } catch (err: any) {
    console.error("[creditKycController.getDealCreditStatus] Error:", err);
    return res.status(500).json({ error: "Failed to retrieve deal credit status", details: err.message });
  }
};

export const submitCreditApplication = async (req: Request, res: Response) => {
  try {
    const {
      dealId,
      accountId,
      quoteId,
      requestedCreditLimit,
      requestedPaymentTerms,
      tradeLicenseNumber,
      commercialRegistrationNumber,
      vatRegistrationNumber,
      kycDocuments,
      notes
    } = req.body;

    if (!dealId) {
      return res.status(400).json({ error: "dealId is required for credit submission" });
    }

    if (!requestedCreditLimit || requestedCreditLimit <= 0) {
      return res.status(400).json({ error: "requestedCreditLimit must be greater than 0 SAR" });
    }

    const application = await CreditKycService.submitApplication({
      dealId,
      accountId,
      quoteId,
      requestedCreditLimit: Number(requestedCreditLimit),
      requestedPaymentTerms: requestedPaymentTerms || "30_DAYS",
      tradeLicenseNumber,
      commercialRegistrationNumber,
      vatRegistrationNumber,
      kycDocuments,
      notes
    });

    return res.status(201).json({
      success: true,
      message: "Credit & KYC application submitted for underwriting review",
      data: application
    });
  } catch (err: any) {
    console.error("[creditKycController.submitCreditApplication] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit credit application" });
  }
};

export const reviewCreditApplication = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, approvedCreditLimit, approvedPaymentTerms, declineReason, notes } = req.body;
    const reviewerUserId = (req as any).user?.id;

    if (!status || !["APPROVED", "DECLINED", "ADVANCE_PAYMENT_REQUIRED"].includes(status)) {
      return res.status(400).json({ error: "Valid status ('APPROVED', 'DECLINED', 'ADVANCE_PAYMENT_REQUIRED') is required" });
    }

    const application = await CreditKycService.reviewApplication(id, {
      status,
      approvedCreditLimit: approvedCreditLimit ? Number(approvedCreditLimit) : undefined,
      approvedPaymentTerms,
      declineReason,
      notes,
      reviewerUserId
    });

    return res.json({
      success: true,
      message: `Credit application ${status.toLowerCase()} successfully`,
      data: application
    });
  } catch (err: any) {
    console.error("[creditKycController.reviewCreditApplication] Error:", err);
    return res.status(400).json({ error: err.message || "Failed to review credit application" });
  }
};

export const activateAdvanceFallback = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { notes } = req.body;

    const application = await CreditKycService.activateAdvancePaymentFallback(id, notes);
    return res.json({
      success: true,
      message: "Switched to 100% Advance Payment fallback branch",
      data: application
    });
  } catch (err: any) {
    console.error("[creditKycController.activateAdvanceFallback] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to activate advance payment fallback" });
  }
};

export const confirmAdvancePayment = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const application = await CreditKycService.confirmAdvancePaymentReceived(id);
    return res.json({
      success: true,
      message: "100% advance deposit confirmed. Opportunity cleared for contract execution.",
      data: application
    });
  } catch (err: any) {
    console.error("[creditKycController.confirmAdvancePayment] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to confirm advance payment" });
  }
};

export const requestPublicKycLink = async (req: Request, res: Response) => {
  try {
    const { dealId, recipientEmail, recipientPhone, channel } = req.body;
    if (!dealId) {
      return res.status(400).json({ error: "dealId is required" });
    }
    const result = await CreditKycService.generatePublicKycLink({
      dealId,
      recipientEmail,
      recipientPhone,
      channel
    });
    return res.json(result);
  } catch (err: any) {
    console.error("[creditKycController.requestPublicKycLink] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate KYC link" });
  }
};

export const getPublicKycData = async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const data = await CreditKycService.getPublicKycData(token);
    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("[creditKycController.getPublicKycData] Error:", err);
    return res.status(404).json({ error: err.message || "KYC link invalid or expired" });
  }
};

export const submitPublicKyc = async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const result = await CreditKycService.submitPublicKyc(token, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error("[creditKycController.submitPublicKyc] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit KYC verification" });
  }
};

