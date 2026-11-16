import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RentalCpqService } from "../../src/services/rentalCpqService";

describe("Energia Rental CPQ Engine Unit Tests", () => {
  describe("Catalog & Equipment Specifications", () => {
    it("should return the standard power equipment catalog with generators and fuel tanks", () => {
      const catalog = RentalCpqService.getCatalog();
      assert.ok(catalog.length >= 6, "Expected at least 6 catalog items");

      const gen500 = catalog.find((item) => item.id === "gen-500kva");
      assert.ok(gen500, "500kVA generator must exist");
      assert.equal(gen500?.kvaRating, 500);
      assert.equal(gen500?.category, "generator");
      assert.equal(gen500?.dailyRate, 1450);
      assert.equal(gen500?.weeklyMultiplier, 5);
      assert.equal(gen500?.monthlyMultiplier, 20);
      assert.equal(gen500?.minimumHireDays, 7);
    });

    it("should calculate effective days correctly across day, week, and month duration types", () => {
      assert.equal(RentalCpqService.computeDurationDays("day", 10), 10);
      assert.equal(RentalCpqService.computeDurationDays("week", 3), 21);
      assert.equal(RentalCpqService.computeDurationDays("month", 2), 60);
    });
  });

  describe("Rental Pricing & Multipliers", () => {
    it("should apply daily rate and enforce minimum hire period when requested days is lower", () => {
      // 500kVA generator has minimum hire of 7 days, daily rate is 1450
      const calculation = RentalCpqService.calculateRentalQuote({
        equipmentId: "gen-500kva",
        quantity: 1,
        durationType: "day",
        durationValue: 3, // Less than minimum 7 days
        includeMobDemob: false
      });

      assert.equal(calculation.minimumHireSatisfied, false);
      assert.ok(calculation.minimumHireWarning?.includes("mandatory minimum hire period (7 days)"));
      // Should bill 7 days minimum
      assert.equal(calculation.rentalDurationSubtotal, 7 * 1450);
    });

    it("should correctly compute weekly multiplier (5x Day Rate per week)", () => {
      // 250kVA daily rate = 850. 1 week multiplier = 5.
      // 2 weeks hire of 1 unit = 2 * (850 * 5) = 8,500
      const calculation = RentalCpqService.calculateRentalQuote({
        equipmentId: "gen-250kva",
        quantity: 1,
        durationType: "week",
        durationValue: 2,
        includeMobDemob: false
      });

      assert.equal(calculation.effectiveDays, 14);
      assert.equal(calculation.minimumHireSatisfied, true);
      assert.equal(calculation.appliedUnitRate, 850 * 5); // 4,250 per week
      assert.equal(calculation.rentalDurationSubtotal, 8500);
    });

    it("should correctly compute monthly multiplier (20x Day Rate per month)", () => {
      // 1000kVA daily rate = 2600. Monthly multiplier = 20.
      // 1 month hire = 1 * (2600 * 20) = 52,000
      const calculation = RentalCpqService.calculateRentalQuote({
        equipmentId: "gen-1000kva",
        quantity: 1,
        durationType: "month",
        durationValue: 1,
        includeMobDemob: false
      });

      assert.equal(calculation.effectiveDays, 30);
      assert.equal(calculation.appliedUnitRate, 2600 * 20); // 52,000 per month
      assert.equal(calculation.rentalDurationSubtotal, 52000);
    });
  });

  describe("Mobilisation, Demobilisation & Logistics", () => {
    it("should include standard default mobilisation and demobilisation fees", () => {
      const calculation = RentalCpqService.calculateRentalQuote({
        equipmentId: "gen-500kva",
        quantity: 1,
        durationType: "week",
        durationValue: 1,
        includeMobDemob: true
      });

      assert.equal(calculation.mobFee, 1400);
      assert.equal(calculation.demobFee, 1400);
      assert.equal(calculation.totalLogistics, 2800);
    });

    it("should allow custom mobilisation and demobilisation fees", () => {
      const calculation = RentalCpqService.calculateRentalQuote({
        equipmentId: "gen-500kva",
        quantity: 1,
        durationType: "week",
        durationValue: 1,
        includeMobDemob: true,
        customMobFee: 2000,
        customDemobFee: 1800
      });

      assert.equal(calculation.mobFee, 2000);
      assert.equal(calculation.demobFee, 1800);
      assert.equal(calculation.totalLogistics, 3800);
    });
  });

  describe("Ancillary Accessories & Certified Operator", () => {
    it("should compute auxiliary cable runs, external fuel tank, and operator shift attendance", () => {
      // 100kVA generator (Day rate 500, Mob 650, Demob 650)
      // 2 weeks hire (14 days = 2 weeks)
      // Equipment rental = 2 * (500 * 5) = 5,000
      // Logistics = 650 + 650 = 1,300
      // 50 meters cable at 4.5/meter/week * 2 weeks = 50 * 4.5 * 2 = 450
      // 2500L fuel tank (Day rate 90, Weekly multi 5) = 2 * (90 * 5) = 900
      // Certified operator single shift (250/day * 14 days) = 3,500
      const calculation = RentalCpqService.calculateRentalQuote({
        equipmentId: "gen-100kva",
        quantity: 1,
        durationType: "week",
        durationValue: 2,
        includeMobDemob: true,
        cableMeters: 50,
        fuelTankId: "tank-2500l",
        operatorRequirement: "single_shift",
        discountPercent: 10,
        taxPercent: 15
      });

      assert.equal(calculation.rentalDurationSubtotal, 5000);
      assert.equal(calculation.totalLogistics, 1300);
      assert.equal(calculation.cableCost, 450);
      assert.equal(calculation.fuelTankCost, 900);
      assert.equal(calculation.operatorCost, 3500);

      const expectedGross = 5000 + 1300 + 450 + 900 + 3500; // 11,150
      assert.equal(calculation.grossSubtotal, expectedGross);

      const expectedDiscount = parseFloat(((11150 * 10) / 100).toFixed(2)); // 1,115
      assert.equal(calculation.discountAmount, expectedDiscount);

      const expectedNet = expectedGross - expectedDiscount; // 10,035
      assert.equal(calculation.netBeforeTax, expectedNet);

      const expectedTax = parseFloat(((10035 * 15) / 100).toFixed(2)); // 1,505.25
      assert.equal(calculation.taxAmount, expectedTax);

      const expectedFinal = parseFloat((expectedNet + expectedTax).toFixed(2)); // 11,540.25
      assert.equal(calculation.finalTotalAmount, expectedFinal);
    });
  });
});
