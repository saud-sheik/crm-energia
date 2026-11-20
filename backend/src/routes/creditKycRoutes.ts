import { Router } from "express";
import { authMiddleware, requireAdminOrManager } from "../middleware/auth";
import {
  getCreditQueue,
  getDealCreditStatus,
  submitCreditApplication,
  reviewCreditApplication,
  activateAdvanceFallback,
  confirmAdvancePayment,
  requestPublicKycLink,
  getPublicKycData,
  submitPublicKyc
} from "../controllers/creditKycController";

const router = Router();

// Public self-service KYC endpoints (Client accesses via secure tokenized link)
router.get("/public/:token", getPublicKycData);
router.post("/public/:token/submit", submitPublicKyc);

// Authenticated internal routes for Energia Credit Check & KYC Due Diligence
router.get("/queue", authMiddleware, getCreditQueue);
router.get("/deal/:dealId", authMiddleware, getDealCreditStatus);
router.post("/request-link", authMiddleware, requestPublicKycLink);
router.post("/submit", authMiddleware, submitCreditApplication);
router.post("/review/:id", authMiddleware, requireAdminOrManager, reviewCreditApplication);
router.post("/fallback-advance/:id", authMiddleware, activateAdvanceFallback);
router.post("/confirm-advance/:id", authMiddleware, requireAdminOrManager, confirmAdvancePayment);

export default router;

