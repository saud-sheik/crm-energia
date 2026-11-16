import { Router } from "express";
import { authMiddleware, requireAdminOrManager } from "../middleware/auth";
import {
  getContracts,
  getContractById,
  generateContract,
  submitLegalReview,
  approveLegalReview,
  recordClientSignature,
  recordCompanyCountersignature
} from "../controllers/rentalContractController";

const router = Router();

// Pluggable routes for Energia Equipment Rental Contracts & Legal SLAs
router.get("/", authMiddleware, getContracts);
router.get("/:id", authMiddleware, getContractById);
router.post("/generate", authMiddleware, generateContract);
router.post("/:id/submit-legal", authMiddleware, submitLegalReview);
router.post("/:id/approve-legal", authMiddleware, requireAdminOrManager, approveLegalReview);
router.post("/:id/sign-client", authMiddleware, recordClientSignature);
router.post("/:id/sign-company", authMiddleware, requireAdminOrManager, recordCompanyCountersignature);

export default router;

