import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  checkAvailability,
  getFleetAvailabilityMatrix,
  createBooking,
  updateBookingStatus,
  getFleetSchedule
} from "../controllers/fleetAvailabilityController";

const router = Router();

// Pluggable routes for Energia Generator Fleet Availability & Booking Calendar
router.get("/check", authMiddleware, checkAvailability);
router.get("/matrix", authMiddleware, getFleetAvailabilityMatrix);
router.get("/schedule", authMiddleware, getFleetSchedule);
router.post("/bookings", authMiddleware, createBooking);
router.patch("/bookings/:id/status", authMiddleware, updateBookingStatus);

export default router;
