import "dotenv/config";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createServer } from "./server";
import { Database, sequelize } from "@nexus-crm/database";
import { checkOverdueTasks } from "./src/services/notificationService";
import { processScheduledEmails, processQuoteFollowUps } from "./src/services/emailService";

const PORT = parseInt(process.env.PORT || "5506", 10);

const app = createServer();

// Start HTTP server immediately so cloud platforms (Render, Railway, etc.) detect open port right away without port scan timeouts
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[STARTUP] Nexus CRM backend successfully listening on 0.0.0.0:${PORT}`);
});

server.on("error", (err: any) => {
  console.error(`[STARTUP ERROR] Server failed to bind to port ${PORT}:`, err);
  process.exit(1);
});

async function ensureDatabaseInitialized() {
  // 1. Sync User table first and ensure admin exists so login ALWAYS works immediately
  try {
    const UserModel = sequelize.models.User;
    if (UserModel) {
      await UserModel.sync().catch(e => console.warn("[STARTUP] User.sync warning:", e));
      const existingAdmin = await UserModel.findOne({ where: { email: "admin@nexus.com" } }).catch(() => null);
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash("password123", 10);
        await UserModel.create({
          id: crypto.randomUUID(),
          name: "Sophia Martinez",
          email: "admin@nexus.com",
          password: hashedPassword,
          role: "admin",
          department: "Executive Management",
          territory: "Global Headquarters",
          isAvailable: true,
          maxOpenLeads: 100
        });
        await UserModel.create({
          id: crypto.randomUUID(),
          name: "Sales Rep 1",
          email: "salesperson1@nexus.com",
          password: hashedPassword,
          role: "sales_rep",
          department: "Sales",
          territory: "Riyadh",
          isAvailable: true,
          maxOpenLeads: 50
        });
        await UserModel.create({
          id: crypto.randomUUID(),
          name: "Sales Rep 2",
          email: "salesperson2@nexus.com",
          password: hashedPassword,
          role: "sales_rep",
          department: "Sales",
          territory: "Jubail",
          isAvailable: true,
          maxOpenLeads: 50
        });
        console.log("[STARTUP] ✓ Verified and created default accounts: admin@nexus.com, salesperson1@nexus.com, salesperson2@nexus.com");
      } else {
        console.log("[STARTUP] ✓ Admin account verified: admin@nexus.com");
      }

      // Ensure Field Inspector account exists for mobile demo
      const existingInspector = await UserModel.findOne({ where: { email: "site_manager@nexus.com" } }).catch(() => null);
      if (!existingInspector) {
        const hashedPassword = await bcrypt.hash("password123", 10);
        await UserModel.create({
          id: "7fbfe9a4-c292-4ac6-88d3-273032c319a3",
          name: "Zaid Al-Harbi (Field Inspector)",
          email: "site_manager@nexus.com",
          password: hashedPassword,
          role: "site_manager",
          department: "Field Feasibility & Survey",
          territory: "Eastern Province & Riyadh",
          isAvailable: true,
          maxOpenLeads: 50
        });
        console.log("[STARTUP] ✓ Verified and created Field Inspector: site_manager@nexus.com");
      }

      // Ensure demo SiteInspection exists and is assigned to the Field Inspector
      const SiteInspectionModel = sequelize.models.SiteInspection;
      if (SiteInspectionModel) {
        await SiteInspectionModel.sync().catch(e => console.warn("[STARTUP] SiteInspection.sync warning:", e));
        const existingInspection = await SiteInspectionModel.findOne({ where: { inspectionNumber: "SI-2026-0001" } }).catch(() => null);
        if (!existingInspection) {
          await SiteInspectionModel.create({
            id: "25abe91d-d14d-4aed-b6ac-b677d9a2cf20",
            inspectionNumber: "SI-2026-0001",
            status: "REQUESTED",
            assignmentState: "ASSIGNED",
            assignedToId: "7fbfe9a4-c292-4ac6-88d3-273032c319a3",
            clientOrganization: "Aramco Khurais PKG-4 & Utilities",
            siteName: "Khurais Oilfield Substation & Wellhead Cluster 9",
            siteAreaName: "Eastern Province - Khurais",
            siteAddress: "Khurais Main Gate 3, Eastern Province",
            clientRepName: "Eng. Mansoor Al-Ghamdi",
            clientRepPhone: "+966551234567",
            latitude: 25.08,
            longitude: 48.02,
            priority: "URGENT",
            scopeSummary: "Site Electrical Feasibility, Inrush Multiplier, and Megger Earth Ground Audit"
          });
          console.log("[STARTUP] ✓ Seeded demo site inspection SI-2026-0001 assigned to site_manager@nexus.com");
        }
      }
    }
  } catch (err) {
    console.error("[STARTUP] User initialization error:", err);
  }

  // 2. Sync Fleet Assets
  try {
    const AssetModel = sequelize.models.Asset;
    if (AssetModel) {
      await AssetModel.sync().catch(e => console.warn("[STARTUP] Asset.sync warning:", e));
      const assetsToSeed = [
        { id: 'gen-500-01', name: 'Caterpillar C15 Heavy Soundproof (500 kVA)', type: 'Generator', serialNumber: 'CAT-8891', status: 'Available', condition: 'Excellent' },
        { id: 'gen-500-02', name: 'Caterpillar C15 Prime Power (500 kVA)', type: 'Generator', serialNumber: 'CAT-8892', status: 'Available', condition: 'Excellent' },
        { id: 'gen-1000-04', name: 'MTU Mega 16V2000 Containerized (1000 kVA)', type: 'Generator', serialNumber: 'MTU-104', status: 'Available', condition: 'Excellent' },
        { id: 'gen-1000-05', name: 'MTU Mega 16V2000 Containerized (1000 kVA)', type: 'Generator', serialNumber: 'MTU-105', status: 'Available', condition: 'Good' },
        { id: 'gen-250-18', name: 'Perkins 1506A Soundproof Canopy (250 kVA)', type: 'Generator', serialNumber: 'PRK-218', status: 'Available', condition: 'Excellent' },
        { id: 'gen-250-19', name: 'Perkins 1506A Soundproof Canopy (250 kVA)', type: 'Generator', serialNumber: 'PRK-219', status: 'Available', condition: 'Excellent' },
        { id: 'gen-60-44', name: 'Cummins 4BTA Trailer Auxiliary (60 kVA)', type: 'Generator', serialNumber: 'CUM-644', status: 'Available', condition: 'Excellent' },
        { id: 'gen-500-09', name: 'Caterpillar C15 Heavy Soundproof (500 kVA)', type: 'Generator', serialNumber: 'CAT-8909', status: 'Available', condition: 'Good' }
      ];
      for (const a of assetsToSeed) {
        await AssetModel.findOrCreate({
          where: { id: a.id },
          defaults: a
        });
      }
      console.log("[STARTUP] ✓ Verified and seeded generator fleet assets.");
    }
  } catch (err) {
    console.error("[STARTUP] Asset initialization error:", err);
  }

  // 3. Sync remaining models
  try {
    console.log("[STARTUP] Syncing full database schema...");
    await sequelize.sync().catch(err => console.warn("[STARTUP] Schema sync warning:", err));
    console.log("[STARTUP] Full schema sync completed.");
  } catch (err) {
    console.error("[STARTUP] Schema sync error:", err);
  }
}

const startServer = async () => {
  try {
    await Database.createConnection();
    await ensureDatabaseInitialized();
    // Models are synced via Sequelize migrations. Safely sync tables if needed.
    if (sequelize.models.WhatsAppLog) {
      await sequelize.models.WhatsAppLog.sync().catch(err => console.error("Failed to sync WhatsAppLog model:", err));
    }
    if (sequelize.models.ServiceResource) {
      await sequelize.models.ServiceResource.sync().catch(err => console.warn("ServiceResource sync warning:", err));
    }
    if (sequelize.models.ResourceAbsence) {
      await sequelize.models.ResourceAbsence.sync().catch(err => console.warn("ResourceAbsence sync warning:", err));
    }
    if (sequelize.models.SiteInspectorProfile) {
      await sequelize.models.SiteInspectorProfile.sync().catch(err => console.warn("SiteInspectorProfile sync warning:", err));
    }
    if (sequelize.models.SiteHoliday) {
      await sequelize.models.SiteHoliday.sync().catch(err => console.warn("SiteHoliday sync warning:", err));
    }
    if (sequelize.models.UserAttendance) {
      await sequelize.models.UserAttendance.sync().catch(err => console.warn("UserAttendance sync warning:", err));
    }
    if (sequelize.models.TeamBreakPolicy) {
      await sequelize.models.TeamBreakPolicy.sync().catch(err => console.warn("TeamBreakPolicy sync warning:", err));
    }
    await sequelize.query('ALTER TABLE "UserAttendances" ADD COLUMN IF NOT EXISTS "currentBreakStart" TIMESTAMP;').catch(() => {});
    await sequelize.query('ALTER TABLE "UserAttendances" ADD COLUMN IF NOT EXISTS "totalBreakMinutes" INTEGER DEFAULT 0;').catch(() => {});
    await sequelize.query('ALTER TABLE "UserAttendances" ADD COLUMN IF NOT EXISTS "netDurationMinutes" INTEGER;').catch(() => {});
    await sequelize.query('ALTER TABLE UserAttendances ADD COLUMN currentBreakStart DATETIME;').catch(() => {});
    await sequelize.query('ALTER TABLE UserAttendances ADD COLUMN totalBreakMinutes INTEGER DEFAULT 0;').catch(() => {});
    await sequelize.query('ALTER TABLE UserAttendances ADD COLUMN netDurationMinutes INTEGER;').catch(() => {});
    await sequelize.query("ALTER TABLE Deals ADD COLUMN originalOwnerId TEXT;").catch(() => {});
    await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "teamType" VARCHAR(255);').catch(() => {});
    await sequelize.query('ALTER TABLE Users ADD COLUMN teamType TEXT;').catch(() => {});
    console.log("Database connection established successfully.");
    
    // Seed default message templates if not exists
    const { seedDefaultMessageTemplates } = require("./src/services/communicationService");
    await seedDefaultMessageTemplates();

    // Recover any campaign sends interrupted during previous server shutdown
    const { recoverStuckCampaignSends, getCampaignWhatsAppConfig } = require("./src/services/campaignMessageService");
    await recoverStuckCampaignSends();

    // Log resolved WhatsApp campaign safety config at WARN level on startup
    const waConfig = getCampaignWhatsAppConfig();
    console.warn(
      `[WhatsApp Campaign Config] DRY_RUN=${waConfig.dryRun} | MAX_RECIPIENTS=${waConfig.maxRecipients} | ALLOWLIST_ACTIVE=${waConfig.allowlistActive} (${waConfig.allowlist.length} numbers) | BATCH_SIZE=${waConfig.batchSize} | BATCH_DELAY_MS=${waConfig.batchDelayMs}`
    );

    // Check and log inbound email webhook security config warning if unconfigured
    const { logInboundAuthStartupWarning } = require("./src/controllers/emailController");
    logInboundAuthStartupWarning();

    // Setup simple cron job for checking overdue tasks every hour
    // (Using 1 hour = 3600000 ms)
    setInterval(() => {
      checkOverdueTasks().catch(console.error);
      processScheduledEmails().catch(console.error);
      processQuoteFollowUps().catch(console.error);
    }, 3600000);

    // Start Quote Expiry Scheduler
    const { startExpiryScheduler } = require("./src/services/expiryScheduler");
    startExpiryScheduler();
    
    // Start Scheduled Weekly Snapshot Reports
    const { startReportScheduler } = require("./src/services/scheduledReportService");
    startReportScheduler();

    // Start Lead Connector Scheduler
    const { startConnectorScheduler } = require("./src/services/connectorScheduler");
    startConnectorScheduler();

    // Start Temperature Scheduler
    const { startTemperatureScheduler } = require("./src/services/temperatureScheduler");
    startTemperatureScheduler();

    // Start Campaign Message Scheduler
    const { startCampaignMessageScheduler } = require("./src/services/campaignMessageScheduler");
    startCampaignMessageScheduler();

    // Start Site Inspection Stage B Automation Scanner
    const { startAutomationScheduler } = require("./src/services/siteInspectionAutomationScanner");
    startAutomationScheduler();

    // Start Work Order Notification Poller Scheduler (60s)
    const { startWorkOrderNotificationScheduler, validateWorkOrderNotificationConfigOnStartup } = require("./src/services/workOrderNotificationService");
    validateWorkOrderNotificationConfigOnStartup();
    startWorkOrderNotificationScheduler();
  } catch (error) {
    console.error("Failed during background startup tasks:", error);
  }
};

startServer();
