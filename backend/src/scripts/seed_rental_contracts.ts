import { RentalContract, Deal, Account, User } from "@nexus-crm/database";

async function main() {
  // 1. Update the existing draft to ACTIVE for Aramco
  const existing = await RentalContract.findOne({ where: { contractNumber: "EN-RC-2026-3807" } });
  if (existing) {
    await existing.update({
      status: "ACTIVE",
      clientSignatoryName: "Eng. Fahad Al-Qahtani",
      clientSignatoryTitle: "VP Procurement & Supply Chain",
      clientSignedAt: new Date("2026-03-01T10:00:00Z"),
      clientSignatureData: "VERIFIED_ARAMCO_DIGITAL_TOKEN_9021",
      companySignedAt: new Date("2026-03-01T11:30:00Z"),
      companySignatureData: "VERIFIED_ENERGIA_EXECUTIVE_COUNTERSIGN"
    });
    console.log("Updated EN-RC-2026-3807 to ACTIVE");
  }

  // 2. Add Active Contract for SABIC Jubail
  const jubailDeal = await Deal.findOne({ where: { name: "1000kVA Standby Power Rental - Jubail Project" } });
  if (jubailDeal) {
    const existingJubail = await RentalContract.findOne({ where: { contractNumber: "EN-RC-2026-4410" } });
    if (!existingJubail) {
      await RentalContract.create({
        contractNumber: "EN-RC-2026-4410",
        dealId: jubailDeal.id,
        accountId: jubailDeal.accountId,
        status: "ACTIVE",
        contractStartDate: new Date("2026-03-10T00:00:00Z"),
        contractEndDate: new Date("2026-06-10T00:00:00Z"),
        totalContractValue: 432000,
        monthlyRecurringRate: 144000,
        securityDepositAmount: 50000,
        breakdownResponseSlaHours: 2,
        backupUnitCommitment: true,
        insuranceResponsibility: "JOINT",
        damageLiabilityTerms: "Standard Aramco & SABIC approved industrial lease terms.",
        siteLocation: "SABIC Petrochemical Complex, Jubail Phase II",
        equipmentSummary: "1x 1,000 kVA MTU Containerized Generator + 5,000L External Fuel Tank + Dual Sync Switchgear",
        clientSignatoryName: "Dr. Tariq Al-Ghamdi",
        clientSignatoryTitle: "Maintenance & Turnaround Director",
        clientSignedAt: new Date("2026-03-08T09:15:00Z"),
        clientSignatureData: "VERIFIED_SABIC_DIGITAL_SIGNATURE",
        companySignedAt: new Date("2026-03-08T14:00:00Z"),
        companySignatureData: "VERIFIED_ENERGIA_EXEC_COUNTERSIGN"
      });
      console.log("Created SABIC contract EN-RC-2026-4410");
    }
  }

  // 3. Add Contract Awaiting Signature for Red Sea Global
  const redSeaDeal = await Deal.findOne({ where: { name: "250 kVA Island Jetty Dewatering Power" } });
  if (redSeaDeal) {
    const existingRSG = await RentalContract.findOne({ where: { contractNumber: "EN-RC-2026-5120" } });
    if (!existingRSG) {
      await RentalContract.create({
        contractNumber: "EN-RC-2026-5120",
        dealId: redSeaDeal.id,
        accountId: redSeaDeal.accountId,
        status: "AWAITING_CLIENT_SIGNATURE",
        contractStartDate: new Date("2026-04-01T00:00:00Z"),
        contractEndDate: new Date("2026-07-31T00:00:00Z"),
        totalContractValue: 152000,
        monthlyRecurringRate: 38000,
        securityDepositAmount: 20000,
        breakdownResponseSlaHours: 4,
        backupUnitCommitment: true,
        insuranceResponsibility: "CLIENT_COMPREHENSIVE",
        damageLiabilityTerms: "Red Sea Global environmental and containment compliance standards enforced.",
        siteLocation: "Southern Dunes Eco-Resort Microgrid (Cluster A)",
        equipmentSummary: "1x 250 kVA Perkins Soundproof Canopy Generator + 1,000L Fuel Tank",
        clientSignatoryName: null,
        clientSignatoryTitle: null,
        clientSignedAt: null,
        clientSignatureData: null
      });
      console.log("Created Red Sea Global contract EN-RC-2026-5120 (Awaiting Client Signature)");
    }
  }

  console.log("Seed complete!");
}

main().catch(console.error);

