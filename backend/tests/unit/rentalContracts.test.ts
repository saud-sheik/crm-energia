process.env.DATABASE_URL = "";
process.env.USE_SQLITE = "true";

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { RentalContractService } from "../../src/services/rentalContractService";
import { RentalContract, Deal, Account, User } from "@nexus-crm/database";

describe("Energia Rental Contracts & Legal SLAs Unit Tests", () => {
  let testDealId: string;
  let testAccountId: string;
  let testUserId: string;

  before(async () => {
    const account = await Account.create({
      name: "Saudi Aramco Offshore Rig Services",
      accountType: "Customer",
      status: "Active"
    });
    testAccountId = account.id;

    const deal = await Deal.create({
      name: "1250 kVA Grid-Tie Generator Hire - Tanura Port",
      title: "1250 kVA Grid-Tie Generator Hire - Tanura Port",
      accountId: testAccountId,
      stage: "Contract",
      dealValue: 145000,
      amount: 145000,
      winProbability: 90
    });
    testDealId = deal.id;

    const user = await User.create({
      name: "Tariq Al-Ghamdi",
      email: "legal.executive@energia.com",
      password: "hashedPassword123",
      firstName: "Tariq",
      lastName: "Al-Ghamdi",
      role: "director"
    });
    testUserId = user.id;
  });

  after(async () => {
    await RentalContract.destroy({ where: { dealId: testDealId } });
    await Deal.destroy({ where: { id: testDealId } });
    await Account.destroy({ where: { id: testAccountId } });
    await User.destroy({ where: { id: testUserId } });
  });

  describe("Contract Generation & SLA Terms", () => {
    it("should generate a rental contract with 2-hour breakdown response SLA and backup unit guarantee", async () => {
      const contract = await RentalContractService.generateContract({
        dealId: testDealId,
        accountId: testAccountId,
        contractStartDate: "2026-12-01",
        contractEndDate: "2027-02-28",
        totalContractValue: 145000,
        monthlyRecurringRate: 48333.33,
        securityDepositAmount: 20000,
        breakdownResponseSlaHours: 2,
        backupUnitCommitment: true,
        insuranceResponsibility: "CLIENT_COMPREHENSIVE",
        siteLocation: "Ras Tanura Port Berth 4",
        equipmentSummary: "1x 1250 kVA Cummins QSK50 Diesel Generator + 1x 5,000L External Fuel Tank"
      });

      assert.ok(contract.id, "Contract must have an ID");
      assert.ok(contract.contractNumber.startsWith("EN-RC-"), "Must follow Energia contract numbering");
      assert.equal(contract.status, "DRAFT");
      assert.equal(contract.breakdownResponseSlaHours, 2);
      assert.equal(contract.backupUnitCommitment, true);
      assert.equal(Number(contract.totalContractValue), 145000);
      assert.equal(Number(contract.securityDepositAmount), 20000);
    });
  });

  describe("Legal Review Workflow", () => {
    it("should transition contract to LEGAL_REVIEW", async () => {
      const contract = await RentalContract.findOne({ where: { dealId: testDealId } });
      assert.ok(contract, "Contract must exist");

      const submitted = await RentalContractService.submitForLegalReview(contract.id);
      assert.equal(submitted.status, "LEGAL_REVIEW");
    });

    it("should approve legal review and dispatch for client signature", async () => {
      const contract = await RentalContract.findOne({ where: { dealId: testDealId } });
      assert.ok(contract, "Contract must exist");

      const approved = await RentalContractService.approveLegalReview(contract.id, testUserId);
      assert.equal(approved.status, "AWAITING_CLIENT_SIGNATURE");
      assert.equal(approved.legalReviewedByUserId, testUserId);
      assert.ok(approved.legalReviewedAt);
    });
  });

  describe("Dual Digital E-Signature & Automated 100% Deal Won", () => {
    it("should record client digital signature", async () => {
      const contract = await RentalContract.findOne({ where: { dealId: testDealId } });
      assert.ok(contract, "Contract must exist");

      const clientSigned = await RentalContractService.recordClientSignature({
        contractId: contract.id,
        signatoryName: "Fahad Al-Qahtani",
        signatoryTitle: "Procurement Director",
        signatureData: "BASE64_DIGITAL_CLIENT_SIGNATURE_PROOF"
      });

      assert.equal(clientSigned.status, "AWAITING_COMPANY_SIGNATURE");
      assert.equal(clientSigned.clientSignatoryName, "Fahad Al-Qahtani");
      assert.equal(clientSigned.clientSignatoryTitle, "Procurement Director");
      assert.equal(clientSigned.termsAccepted, true);
      assert.ok(clientSigned.clientSignedAt);
    });

    it("should record company countersignature, activate contract, and automatically mark Deal as 100% Won", async () => {
      const contract = await RentalContract.findOne({ where: { dealId: testDealId } });
      assert.ok(contract, "Contract must exist");

      const fullyExecuted = await RentalContractService.recordCompanyCountersignature({
        contractId: contract.id,
        companyUserId: testUserId,
        signatureData: "BASE64_ENERGIA_EXECUTIVE_COUNTERSIGN"
      });

      assert.equal(fullyExecuted.status, "ACTIVE");
      assert.equal(fullyExecuted.companySignatoryUserId, testUserId);
      assert.ok(fullyExecuted.companySignedAt);

      // Verify the parent Deal was automatically bumped to 100% Won!
      const deal = await Deal.findByPk(testDealId);
      assert.ok(deal, "Deal must exist");
      assert.equal(deal.probability, 100, "Deal win probability must be 100%");
      assert.equal(deal.status, "WON", "Deal status must be WON");
      assert.ok(deal.wonAt, "Deal wonAt timestamp must be set");
    });
  });
});
