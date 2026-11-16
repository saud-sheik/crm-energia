import { Router } from "express";
import { authMiddleware, requireAdminOrManager } from "../middleware/auth";
import {
  getCreditQueue,
  getDealCreditStatus,
  submitCreditApplication,
  reviewCreditApplication,
  activateAdvanceFallback,
  confirmAdvancePayment
} from "../controllers/creditKycController";

const router = Router();

// Pluggable routes for Energia Credit Check & KYC Due Diligence
router.get("/queue", authMiddleware, getCreditQueue);
router.get("/deal/:dealId", authMiddleware, getDealCreditStatus);
router.post("/submit", authMiddleware, submitCreditApplication);
router.post("/review/:id", authMiddleware, requireAdminOrManager, reviewCreditApplication);
router.post("/fallback-advance/:id", authMiddleware, activateAdvanceFallback);
router.post("/confirm-advance/:id", authMiddleware, requireAdminOrManager, confirmAdvancePayment);

export default router;

