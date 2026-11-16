process.env.DATABASE_URL = "";
process.env.USE_SQLITE = "true";

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { FleetAvailabilityService } from "../../src/services/fleetAvailabilityService";
import { Asset, AssetBooking, Account } from "@nexus-crm/database";

describe("Energia Fleet Availability & Booking Calendar Unit Tests", () => {
  let testAssetId: string;
  let testAccountId: string;

  before(async () => {
    const account = await Account.create({
      name: "Saudi Electricity Company (SEC) - Eastern Grid",
      accountType: "Customer",
      status: "Active"
    });
    testAccountId = account.id;

    const generator = await Asset.create({
      name: "1000 kVA Cummins Heavy Diesel Generator #4",
      type: "generator",
      serialNumber: "CUM-1000-SA-9904",
      assetNumber: "AST-GEN-1000-04",
      status: "Available",
      condition: "Excellent"
    });
    testAssetId = generator.id;
  });

  after(async () => {
    await AssetBooking.destroy({ where: { assetId: testAssetId } });
    await Asset.destroy({ where: { id: testAssetId } });
    await Account.destroy({ where: { id: testAccountId } });
  });

  describe("Availability Checking & Double-Booking Prevention", () => {
    it("should report asset as available when no bookings exist", async () => {
      const result = await FleetAvailabilityService.checkAssetAvailability(
        testAssetId,
        "2026-12-01",
        "2026-12-10"
      );

      assert.equal(result.isAvailable, true);
      assert.equal(result.conflictingBookings.length, 0);
    });

    it("should successfully create a reservation booking", async () => {
      const booking = await FleetAvailabilityService.createBooking({
        assetId: testAssetId,
        customerId: testAccountId,
        startDate: "2026-12-01",
        endDate: "2026-12-10",
        siteLocation: "Dammam 2nd Industrial City Substation",
        assignedOperatorName: "Khalid Al-Otaibi",
        notes: "Grid emergency backup during transformer maintenance"
      });

      assert.ok(booking.id);
      assert.equal(booking.bookingStatus, "RESERVED");
      assert.equal(booking.assetId, testAssetId);
    });

    it("should strictly reject an overlapping booking to prevent double-booking", async () => {
      // Overlaps with 2026-12-01 -> 2026-12-10
      await assert.rejects(
        async () => {
          await FleetAvailabilityService.createBooking({
            assetId: testAssetId,
            customerId: testAccountId,
            startDate: "2026-12-05", // Conflicts with existing Dec 1-10 booking
            endDate: "2026-12-15"
          });
        },
        /Double-booking conflict/
      );
    });

    it("should allow a consecutive non-overlapping booking on the same asset", async () => {
      // Starts after Dec 10
      const consecutiveBooking = await FleetAvailabilityService.createBooking({
        assetId: testAssetId,
        customerId: testAccountId,
        startDate: "2026-12-11",
        endDate: "2026-12-20",
        siteLocation: "Jubail Plant Expansion"
      });

      assert.ok(consecutiveBooking.id);
      assert.equal(consecutiveBooking.bookingStatus, "RESERVED");
    });
  });

  describe("Booking Status Lifecycle & Asset Sync", () => {
    it("should transition booking to DISPATCHED_ON_HIRE and update Asset status to In Use", async () => {
      const bookings = await AssetBooking.findAll({ where: { assetId: testAssetId }, order: [["startDate", "ASC"]] });
      assert.ok(bookings.length >= 1);
      const firstBooking = bookings[0];

      const updated = await FleetAvailabilityService.updateBookingStatus(
        firstBooking.id,
        "DISPATCHED_ON_HIRE"
      );

      assert.equal(updated.bookingStatus, "DISPATCHED_ON_HIRE");

      const asset = await Asset.findByPk(testAssetId);
      assert.equal(asset?.status, "In Use");
    });

    it("should complete booking and free asset to Available", async () => {
      const bookings = await AssetBooking.findAll({ where: { assetId: testAssetId }, order: [["startDate", "ASC"]] });
      const firstBooking = bookings[0];

      const completed = await FleetAvailabilityService.updateBookingStatus(
        firstBooking.id,
        "COMPLETED"
      );

      assert.equal(completed.bookingStatus, "COMPLETED");

      const asset = await Asset.findByPk(testAssetId);
      assert.equal(asset?.status, "Available");
    });
  });
});
