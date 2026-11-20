process.env.DATABASE_URL = "";
process.env.USE_SQLITE = "true";

import { sequelize, Account, Deal, CreditApplication, User } from "@nexus-crm/database";

async function seedCreditRecords() {
  await sequelize.authenticate();
  console.log("Seeding realistic Energia KYC & Credit Applications...");

  let director = await User.findOne({ where: { email: "admin@nexus.com" } });
  if (!director) {
    director = await User.create({
      id: "99999999-9999-4999-a999-999999999999",
      name: "Sophia Martinez",
      email: "admin@nexus.com",
      role: "admin",
      password: "password123"
    });
  }

  // 1. Account & Deal 1: Aramco Khurais (PENDING REVIEW)
  let aramco = await Account.findOne({ where: { name: "Saudi Aramco - Khurais Gas Operations" } });
  if (!aramco) {
    aramco = await Account.create({
      name: "Saudi Aramco - Khurais Gas Operations",
      accountType: "Customer",
      industry: "Oil & Gas / Energy",
      status: "Active"
    });
  }

  let deal1 = await Deal.findOne({ where: { name: "500 kVA Continuous Power Package - Aramco Khurais" } });
  if (!deal1) {
    deal1 = await Deal.create({
      name: "500 kVA Continuous Power Package - Aramco Khurais",
      title: "500 kVA Continuous Power Package - Aramco Khurais",
      accountId: aramco.id,
      stage: "Credit_KYC_Review",
      amount: 37740,
      dealValue: 37740,
      winProbability: 90
    });
  }

  // Clear existing to avoid duplicate
  await CreditApplication.destroy({ where: { dealId: deal1.id } });

  await CreditApplication.create({
    dealId: deal1.id,
    accountId: aramco.id,
    status: "PENDING_REVIEW",
    requestedCreditLimit: 150000,
    requestedPaymentTerms: "30_DAYS",
    tradeLicenseNumber: "TL-SA-2026-00412",
    commercialRegistrationNumber: "CR-2050119284",
    vatRegistrationNumber: "300182749200003",
    kycDocuments: JSON.stringify([
      { type: "commercial_registration", name: "Aramco_Vendor_CR2050119284.pdf", uploadedAt: new Date().toISOString() },
      { type: "vat_certificate", name: "ZATCA_Tax_Certificate_2026.pdf", uploadedAt: new Date().toISOString() }
    ]),
    notes: "Tier-1 Saudi Aramco operating entity. Site power needed for 30-day gas compressor overhaul at Khurais Site.",
    fallbackToAdvancePayment: false,
    advancePaymentReceived: false
  });

  // 2. Account & Deal 2: Al-Fanar (APPROVED CREDIT)
  let alfanar = await Account.findOne({ where: { name: "Al-Fanar Power Construction Ltd" } });
  if (!alfanar) {
    alfanar = await Account.create({
      name: "Al-Fanar Power Construction Ltd",
      accountType: "Customer",
      industry: "Power & Utilities",
      status: "Active"
    });
  }

  let deal2 = await Deal.findOne({ where: { name: "1000kVA Standby Power Rental - Jubail Project" } });
  if (!deal2) {
    deal2 = await Deal.create({
      name: "1000kVA Standby Power Rental - Jubail Project",
      title: "1000kVA Standby Power Rental - Jubail Project",
      accountId: alfanar.id,
      stage: "Contract",
      amount: 145000,
      dealValue: 145000,
      winProbability: 95
    });
  }

  await CreditApplication.destroy({ where: { dealId: deal2.id } });

  await CreditApplication.create({
    dealId: deal2.id,
    accountId: alfanar.id,
    status: "APPROVED",
    requestedCreditLimit: 300000,
    approvedCreditLimit: 500000,
    requestedPaymentTerms: "60_DAYS",
    approvedPaymentTerms: "60_DAYS",
    tradeLicenseNumber: "TL-2026-99120",
    commercialRegistrationNumber: "CR-2050119284",
    vatRegistrationNumber: "300182749200003",
    kycDocuments: JSON.stringify([
      { type: "commercial_registration", name: "AlFanar_CR_Validation.pdf", uploadedAt: new Date().toISOString() }
    ]),
    reviewedByUserId: director.id,
    reviewedAt: new Date(),
    notes: "Approved with high limit based on 5-year clean payment record with SEC and SABIC.",
    fallbackToAdvancePayment: false,
    advancePaymentReceived: false
  });

  // 3. Account & Deal 3: Red Sea Subcontractor (100% ADVANCE FALLBACK)
  let redsea = await Account.findOne({ where: { name: "Red Sea Coastal Works Subcontractor" } });
  if (!redsea) {
    redsea = await Account.create({
      name: "Red Sea Coastal Works Subcontractor",
      accountType: "Customer",
      industry: "Civil Works",
      status: "Active"
    });
  }

  let deal3 = await Deal.findOne({ where: { name: "250 kVA Island Jetty Dewatering Power" } });
  if (!deal3) {
    deal3 = await Deal.create({
      name: "250 kVA Island Jetty Dewatering Power",
      title: "250 kVA Island Jetty Dewatering Power",
      accountId: redsea.id,
      stage: "Credit_KYC_Review",
      amount: 28500,
      dealValue: 28500,
      winProbability: 70
    });
  }

  await CreditApplication.destroy({ where: { dealId: deal3.id } });

  await CreditApplication.create({
    dealId: deal3.id,
    accountId: redsea.id,
    status: "ADVANCE_PAYMENT_REQUIRED",
    requestedCreditLimit: 50000,
    approvedCreditLimit: 0,
    requestedPaymentTerms: "30_DAYS",
    approvedPaymentTerms: "100%_ADVANCE",
    tradeLicenseNumber: "TL-RED-0091",
    commercialRegistrationNumber: "CR-4030198271",
    vatRegistrationNumber: "310029381700003",
    kycDocuments: JSON.stringify([
      { type: "trade_license", name: "RedSea_TL_2026.pdf", uploadedAt: new Date().toISOString() }
    ]),
    reviewedByUserId: director.id,
    reviewedAt: new Date(),
    notes: "New entity with < 12 months financial statements. Credit terms locked; 100% advance deposit required prior to dispatch.",
    fallbackToAdvancePayment: true,
    advancePaymentReceived: false
  });

  console.log("✅ Seeded 3 representative credit applications (Pending, Approved, Advance Fallback)!");
}

seedCreditRecords().catch(console.error);

