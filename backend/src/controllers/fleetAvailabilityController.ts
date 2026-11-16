import { Request, Response } from "express";
import { FleetAvailabilityService } from "../services/fleetAvailabilityService";

export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const { assetId, startDate, endDate, excludeBookingId } = req.query;

    if (!assetId || !startDate || !endDate) {
      return res.status(400).json({
        error: "assetId, startDate, and endDate query parameters are required"
      });
    }

    const result = await FleetAvailabilityService.checkAssetAvailability(
      assetId as string,
      startDate as string,
      endDate as string,
      excludeBookingId as string
    );

    return res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    console.error("[fleetAvailabilityController.checkAvailability] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to check equipment availability" });
  }
};

export const getFleetAvailabilityMatrix = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = (startDate as string) || new Date().toISOString();
    const defaultEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = (endDate as string) || defaultEnd;

    const matrix = await FleetAvailabilityService.getFleetAvailabilityMatrix(start, end);

    return res.json({
      success: true,
      count: matrix.length,
      startDate: start,
      endDate: end,
      data: matrix
    });
  } catch (err: any) {
    console.error("[fleetAvailabilityController.getFleetAvailabilityMatrix] Error:", err);
    return res.status(500).json({ error: "Failed to retrieve fleet availability matrix", details: err.message });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  try {
    const {
      assetId,
      dealId,
      quoteId,
      customerId,
      startDate,
      endDate,
      siteLocation,
      assignedOperatorName,
      notes
    } = req.body;

    if (!assetId || !startDate || !endDate) {
      return res.status(400).json({
        error: "assetId, startDate, and endDate are required to create a booking"
      });
    }

    const booking = await FleetAvailabilityService.createBooking({
      assetId,
      dealId,
      quoteId,
      customerId,
      startDate,
      endDate,
      siteLocation,
      assignedOperatorName,
      notes
    });

    return res.status(201).json({
      success: true,
      message: "Fleet equipment reserved successfully",
      data: booking
    });
  } catch (err: any) {
    console.error("[fleetAvailabilityController.createBooking] Error:", err);
    return res.status(400).json({ error: err.message || "Failed to book equipment" });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["RESERVED", "DISPATCHED_ON_HIRE", "COMPLETED", "CANCELLED"].includes(status)) {
      return res.status(400).json({
        error: "Valid status ('RESERVED', 'DISPATCHED_ON_HIRE', 'COMPLETED', 'CANCELLED') is required"
      });
    }

    const booking = await FleetAvailabilityService.updateBookingStatus(id, status);

    return res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: booking
    });
  } catch (err: any) {
    console.error("[fleetAvailabilityController.updateBookingStatus] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to update booking status" });
  }
};

export const getFleetSchedule = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const schedule = await FleetAvailabilityService.getSchedule(
      startDate as string,
      endDate as string
    );

    return res.json({
      success: true,
      count: schedule.length,
      data: schedule
    });
  } catch (err: any) {
    console.error("[fleetAvailabilityController.getFleetSchedule] Error:", err);
    return res.status(500).json({ error: "Failed to retrieve fleet schedule", details: err.message });
  }
};
