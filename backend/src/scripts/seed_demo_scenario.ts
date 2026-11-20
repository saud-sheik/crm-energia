process.env.USE_SQLITE = "true";

import { sequelize, Account, Lead, Asset, AssetBooking, CreditApplication, RentalContract, User, SiteInspection } from "@nexus-crm/database";

export async function seedDemoScenario() {
  await sequelize.authenticate();
  console.log("Database connected for demo seeding...");

  // 1. Ensure Account exists
  let account = await Account.findOne({ where: { name: "Red Sea Global - Amaala Project" } });
  if (!account) {
    account = await Account.create({
      name: "Red Sea Global - Amaala Project",
      accountType: "Customer",
      industry: "Hospitality & Healthcare Infrastructure",
      status: "Active"
    });
  }

  // 2. Ensure Generator exists & is Available
  let gen = await Asset.findOne({ where: { serialNumber: "CUM-500-REDSEA-01" } });
  if (!gen) {
    gen = await Asset.create({
      name: "500 kVA Cummins Heavy Prime Generator (Tier 3 Low-Emission)",
      type: "generator",
      serialNumber: "CUM-500-REDSEA-01",
      assetNumber: "AST-GEN-500-RSG",
      status: "Available",
      condition: "Excellent"
    });
  } else {
    await gen.update({ status: "Available" });
  }

  // Clear existing bookings for this asset
  await AssetBooking.destroy({ where: { assetId: gen.id } });

  // 3. Create clean Lead ready for Step 1
  // Delete any prior demo lead with this specific email to prevent duplicates
  await Lead.destroy({ where: { email: "tariq.ghamdi@redseaglobal.com" } });

  const lead = await Lead.create({
    firstName: "Eng. Tariq",
    lastName: "Al-Ghamdi",
    email: "tariq.ghamdi@redseaglobal.com",
    phone: "+966 55 987 6543",
    company: "Red Sea Global - Amaala Hospital & Utilities",
    status: "Contacted",
    source: "Website",
    industry: "Healthcare / Critical Infrastructure",
    budgetRange: "SAR 150,000",
    notes: "Requires 500 kVA prime soundproof power for emergency medical center and HVAC chiller units during Amaala Phase 1 grid connection.",
    requiresSiteInspection: true,
    siteInspectionStatus: "NOT_REQUESTED"
  });

  console.log("=========================================================================");
  console.log("🎉 DEMO SCENARIO LEAD CREATED SUCCESSFULLY!");
  console.log("   • Lead ID:", lead.id);
  console.log("   • Company:", lead.company);
  console.log("   • Contact:", lead.firstName, lead.lastName);
  console.log("   • URL:", `http://localhost:5173/leads/${lead.id}`);
  console.log("=========================================================================");
  return lead;
}

if (require.main === module) {
  seedDemoScenario()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error seeding demo:", err);
      process.exit(1);
    });
}

