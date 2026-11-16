import { Request, Response } from "express";
import { RentalCpqService, RentalCalculationInput } from "../services/rentalCpqService";
import { Quote, QuoteLineItem, Deal, Account, Lead } from "@nexus-crm/database";

export const getRateCards = async (req: Request, res: Response) => {
  try {
    const catalog = RentalCpqService.getCatalog();
    return res.json({
      success: true,
      count: catalog.length,
      data: catalog
    });
  } catch (err: any) {
    console.error("[rentalCpqController.getRateCards] Error:", err);
    return res.status(500).json({ error: "Failed to retrieve equipment rate cards", details: err.message });
  }
};

export const calculateQuote = async (req: Request, res: Response) => {
  try {
    const input: RentalCalculationInput = req.body;

    if (!input || !input.equipmentId) {
      return res.status(400).json({ error: "equipmentId is required for rental quote calculation" });
    }

    const breakdown = RentalCpqService.calculateRentalQuote(input);
    return res.json({
      success: true,
      data: breakdown
    });
  } catch (err: any) {
    console.error("[rentalCpqController.calculateQuote] Error:", err);
    return res.status(500).json({ error: "Failed to calculate rental quote", details: err.message });
  }
};

export const createRentalQuote = async (req: Request, res: Response) => {
  try {
    const { dealId, calculationInput, notes, siteLocation } = req.body;

    if (!dealId) {
      return res.status(400).json({ error: "dealId is required to generate a rental quote" });
    }

    if (!calculationInput || !calculationInput.equipmentId) {
      return res.status(400).json({ error: "Valid calculationInput with equipmentId is required" });
    }

    // Verify Deal exists
    const deal = await Deal.findByPk(dealId);
    if (!deal) {
      return res.status(404).json({ error: `Deal with ID ${dealId} not found` });
    }

    const userId = (req as any).user?.id;

    const result = await RentalCpqService.createRentalQuote({
      dealId,
      calculationInput,
      notes,
      siteLocation,
      quoteNumberPrefix: "EN-QT",
      userId
    });

    return res.status(201).json({
      success: true,
      message: "Energia Rental Quote created successfully",
      quoteId: result.quoteId,
      quoteNumber: result.quoteNumber,
      breakdown: result.breakdown
    });
  } catch (err: any) {
    console.error("[rentalCpqController.createRentalQuote] Error:", err);
    return res.status(500).json({ error: "Failed to create rental quote", details: err.message });
  }
};

export const getRentalQuoteDetails = async (req: Request, res: Response) => {
  try {
    const { quoteId } = req.params;

    const quote = await Quote.findByPk(quoteId, {
      include: [
        { model: QuoteLineItem },
        {
          model: Deal,
          as: "deal",
          include: [
            { model: Account, as: "account" },
            { model: Lead, as: "lead" }
          ]
        }
      ]
    });

    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    return res.json({
      success: true,
      data: quote
    });
  } catch (err: any) {
    console.error("[rentalCpqController.getRentalQuoteDetails] Error:", err);
    return res.status(500).json({ error: "Failed to fetch rental quote details", details: err.message });
  }
};
