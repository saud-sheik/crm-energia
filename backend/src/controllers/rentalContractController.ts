import { Request, Response } from "express";
import { RentalContractService } from "../services/rentalContractService";

export const getContracts = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const contracts = await RentalContractService.getContracts({
      status: status as string
    });
    return res.json({
      success: true,
      count: contracts.length,
      data: contracts
    });
  } catch (err: any) {
    console.error("[rentalContractController.getContracts] Error:", err);
    return res.status(500).json({ error: "Failed to retrieve rental contracts", details: err.message });
  }
};

export const getContractById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contract = await RentalContractService.getContractById(id);
    if (!contract) {
      return res.status(404).json({ error: "Rental contract not found" });
    }
    return res.json({
      success: true,
      data: contract
    });
  } catch (err: any) {
    console.error("[rentalContractController.getContractById] Error:", err);
    return res.status(500).json({ error: "Failed to retrieve rental contract", details: err.message });
  }
};

export const generateContract = async (req: Request, res: Response) => {
  try {
    const {
      dealId,
      quoteId,
      accountId,
      contractStartDate,
      contractEndDate,
      totalContractValue,
      monthlyRecurringRate,
      securityDepositAmount,
      breakdownResponseSlaHours,
      backupUnitCommitment,
      insuranceResponsibility,
      damageLiabilityTerms,
      siteLocation,
      equipmentSummary
    } = req.body;

    if (!dealId || !contractStartDate || !contractEndDate || !totalContractValue) {
      return res.status(400).json({
        error: "dealId, contractStartDate, contractEndDate, and totalContractValue are required."
      });
    }

    const contract = await RentalContractService.generateContract({
      dealId,
      quoteId,
      accountId,
      contractStartDate,
      contractEndDate,
      totalContractValue: Number(totalContractValue),
      monthlyRecurringRate: monthlyRecurringRate ? Number(monthlyRecurringRate) : undefined,
      securityDepositAmount: securityDepositAmount ? Number(securityDepositAmount) : 0,
      breakdownResponseSlaHours,
      backupUnitCommitment,
      insuranceResponsibility,
      damageLiabilityTerms,
      siteLocation,
      equipmentSummary
    });

    return res.status(201).json({
      success: true,
      message: "Rental contract generated successfully",
      data: contract
    });
  } catch (err: any) {
    console.error("[rentalContractController.generateContract] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate rental contract" });
  }
};

export const submitLegalReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const contract = await RentalContractService.submitForLegalReview(id);
    return res.json({
      success: true,
      message: "Contract submitted for legal sign-off",
      data: contract
    });
  } catch (err: any) {
    console.error("[rentalContractController.submitLegalReview] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit for legal review" });
  }
};

export const approveLegalReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reviewerUserId = (req as any).user?.id;
    const contract = await RentalContractService.approveLegalReview(id, reviewerUserId);
    return res.json({
      success: true,
      message: "Legal review cleared. Contract dispatched for client signature.",
      data: contract
    });
  } catch (err: any) {
    console.error("[rentalContractController.approveLegalReview] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to approve legal review" });
  }
};

export const recordClientSignature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { signatoryName, signatoryTitle, signatureData } = req.body;

    const contract = await RentalContractService.recordClientSignature({
      contractId: id,
      signatoryName,
      signatoryTitle,
      signatureData
    });

    return res.json({
      success: true,
      message: "Client digital signature recorded successfully",
      data: contract
    });
  } catch (err: any) {
    console.error("[rentalContractController.recordClientSignature] Error:", err);
    return res.status(400).json({ error: err.message || "Failed to record client signature" });
  }
};

export const recordCompanyCountersignature = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { signatureData } = req.body;
    const companyUserId = (req as any).user?.id;

    const contract = await RentalContractService.recordCompanyCountersignature({
      contractId: id,
      companyUserId,
      signatureData
    });

    return res.json({
      success: true,
      message: "Company countersignature recorded. Contract is now ACTIVE and Deal is WON (100%)!",
      data: contract
    });
  } catch (err: any) {
    console.error("[rentalContractController.recordCompanyCountersignature] Error:", err);
    return res.status(400).json({ error: err.message || "Failed to countersign rental contract" });
  }
};
