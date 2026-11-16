import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  getRateCards,
  calculateQuote,
  createRentalQuote,
  getRentalQuoteDetails
} from "../controllers/rentalCpqController";

const router = Router();

// Pluggable routes for Energia Equipment Rental CPQ Engine
router.get("/rate-cards", authMiddleware, getRateCards);
router.post("/calculate", authMiddleware, calculateQuote);
router.post("/quotes", authMiddleware, createRentalQuote);
router.get("/quotes/:quoteId", authMiddleware, getRentalQuoteDetails);

export default router;
