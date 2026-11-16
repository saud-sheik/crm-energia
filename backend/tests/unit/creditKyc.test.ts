process.env.DATABASE_URL = "";
process.env.USE_SQLITE = "true";

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { CreditKycService } from "../../src/services/creditKycService";
import { CreditApplication, Deal, Account, sequelize } from "@nexus-crm/database";

describe("Energia Credit Check & KYC Due Diligence Unit Tests", () => {
  let testDealId: string;
  let testAccountId: string;

  before(async () => {
    // Ensure test account and deal exist
    const account = await Account.create({
      name: "Al-Fanar Power Construction Ltd",
      accountType: "Customer",
      status: "Active"
    });
    testAccountId = account.id;

    const deal = await Deal.create({
      name: "1000kVA Standby Power Rental - Jubail Project",
      title: "1000kVA Standby Power Rental - Jubail Project",
      accountId: testAccountId,
      stage: "Contract",
      dealValue: 75000,
      amount: 75000,
      winProbability: 90
    });
    testDealId = deal.id;
  });

  after(async () => {
    await CreditApplication.destroy({ where: { dealId: testDealId } });
    await Deal.destroy({ where: { id: testDealId } });
    await Account.destroy({ where: { id: testAccountId } });
  });

  describe("Application Submission at 90% PO Stage", () => {
    it("should create a credit application with Trade License, CR, and requested credit terms", async () => {
      const application = await CreditKycService.submitApplication({
        dealId: testDealId,
        accountId: testAccountId,
        requestedCreditLimit: 100000,
        requestedPaymentTerms: "60_DAYS",
        tradeLicenseNumber: "TL-2026-99120",
        commercialRegistrationNumber: "CR-2050119284",
        vatRegistrationNumber: "300182749200003",
        kycDocuments: [
          {
            type: "trade_license",
            name: "AlFanar_Trade_License_2026.pdf",
            uploadedAt: new Date().toISOString()
          },
          {
            type: "commercial_registration",
            name: "AlFanar_CR_Validation.pdf",
            uploadedAt: new Date().toISOString()
          }
        ],
        notes: "Major contractor in Jubail with verified Aramco vendor status."
      });

      assert.ok(application.id, "Credit application must have an ID");
      assert.equal(application.status, "PENDING_REVIEW");
      assert.equal(Number(application.requestedCreditLimit), 100000);
      assert.equal(application.requestedPaymentTerms, "60_DAYS");
      assert.equal(application.commercialRegistrationNumber, "CR-2050119284");
      assert.ok(application.kycDocuments?.includes("AlFanar_CR_Validation.pdf"));
    });

    it("should update the existing application if resubmitted", async () => {
      const updated = await CreditKycService.submitApplication({
        dealId: testDealId,
        requestedCreditLimit: 120000,
        requestedPaymentTerms: "30_DAYS",
        notes: "Updated credit limit request based on revised rental duration."
      });

      assert.equal(Number(updated.requestedCreditLimit), 120000);
      assert.equal(updated.requestedPaymentTerms, "30_DAYS");
      assert.equal(updated.status, "PENDING_REVIEW");
    });
  });

  describe("Credit Underwriting Review Decision", () => {
    it("should enforce mandatory decline reason when credit is declined", async () => {
      const app = await CreditApplication.findOne({ where: { dealId: testDealId } });
      assert.ok(app, "Application must exist");

      await assert.rejects(
        async () => {
          await CreditKycService.reviewApplication(app.id, {
            status: "DECLINED",
            declineReason: "" // Missing reason
          });
        },
        /specific decline reason is mandatory/
      );
    });

    it("should enforce approved credit limit > 0 when credit is approved", async () => {
      const app = await CreditApplication.findOne({ where: { dealId: testDealId } });
      assert.ok(app, "Application must exist");

      await assert.rejects(
        async () => {
          await CreditKycService.reviewApplication(app.id, {
            status: "APPROVED",
            approvedCreditLimit: 0 // Invalid limit
          });
        },
        /approved credit limit greater than 0/
      );
    });

    it("should successfully approve credit with underwriting limit and payment terms", async () => {
      const app = await CreditApplication.findOne({ where: { dealId: testDealId } });
      assert.ok(app, "Application must exist");

      const reviewed = await CreditKycService.reviewApplication(app.id, {
        status: "APPROVED",
        approvedCreditLimit: 100000,
        approvedPaymentTerms: "30_DAYS_NET",
        notes: "SIMAH credit report clear. Verified credit limit of 100,000 SAR approved."
      });

      assert.equal(reviewed.status, "APPROVED");
      assert.equal(Number(reviewed.approvedCreditLimit), 100000);
      assert.equal(reviewed.approvedPaymentTerms, "30_DAYS_NET");
      assert.ok(reviewed.reviewedAt);
    });
  });

  describe("100% Advance Payment Fallback Branch", () => {
    it("should allow activating 100% Advance Payment fallback branch when credit terms cannot be granted", async () => {
      const app = await CreditApplication.findOne({ where: { dealId: testDealId } });
      assert.ok(app, "Application must exist");

      const fallbackApp = await CreditKycService.activateAdvancePaymentFallback(
        app.id,
        "Customer has insufficient trade credit history. 100% advance deposit required prior to equipment dispatch."
      );

      assert.equal(fallbackApp.status, "ADVANCE_PAYMENT_REQUIRED");
      assert.equal(fallbackApp.fallbackToAdvancePayment, true);
      assert.equal(fallbackApp.approvedPaymentTerms, "100%_ADVANCE");
    });

    it("should confirm 100% advance deposit and unblock rental contract execution", async () => {
      const app = await CreditApplication.findOne({ where: { dealId: testDealId } });
      assert.ok(app, "Application must exist");

      const clearedApp = await CreditKycService.confirmAdvancePaymentReceived(app.id);

      assert.equal(clearedApp.status, "APPROVED");
      assert.equal(clearedApp.advancePaymentReceived, true);
      assert.equal(clearedApp.approvedPaymentTerms, "100%_ADVANCE_PAID");
    });
  });
});
