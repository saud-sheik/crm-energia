import { chromium } from "playwright";
import path from "path";

async function run() {
  const artifactDir = "/Users/saud/.gemini/antigravity/brain/5d894f3b-1336-4519-892e-44798039a7c3";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5173...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  
  if (page.url().includes("/login")) {
    console.log("On login page, logging in as Admin...");
    await page.click('button:has-text("Admin (admin@nexus.com)")');
    await page.click('button:has-text("Sign In")');
    await page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  // Set localStorage to expanded and sky blue theme initially
  await page.evaluate(() => {
    localStorage.setItem("sidebar_collapsed", "false");
    localStorage.setItem("sidebar_theme", "sky");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Take screenshot with Sky Blue theme (expanded)
  console.log("Capturing Sky Blue expanded state...");
  await page.screenshot({ path: path.join(artifactDir, "test_theme_sky_expanded.png") });

  // 2. Click Velvet Maroon switcher button
  console.log("Switching to Velvet Maroon...");
  const velvetBtn = page.getByRole("button", { name: /Velvet Maroon/i });
  await velvetBtn.click();
  await page.waitForTimeout(600);
  console.log("Capturing Velvet Maroon expanded state...");
  await page.screenshot({ path: path.join(artifactDir, "test_theme_velvet_expanded.png") });

  // 3. Switch back to Sky Blue
  console.log("Switching back to Sky Blue...");
  const skyBtn = page.getByRole("button", { name: /Sky Blue/i });
  await skyBtn.click();
  await page.waitForTimeout(600);

  // 4. Test Collapse Sidebar
  console.log("Testing Collapse Sidebar in Sky Blue...");
  const collapseBtn = page.getByTitle("Collapse sidebar");
  await collapseBtn.click();
  await page.waitForTimeout(600);
  console.log("Capturing Sky Blue collapsed state...");
  await page.screenshot({ path: path.join(artifactDir, "test_theme_sky_collapsed.png") });

  // 5. Test Theme Toggle in Collapsed state
  console.log("Testing Theme Toggle in Collapsed state (Palette icon)...");
  const paletteBtn = page.locator('button[title*="Theme Switcher"]');
  await paletteBtn.click();
  await page.waitForTimeout(600);
  console.log("Capturing Velvet Maroon collapsed state...");
  await page.screenshot({ path: path.join(artifactDir, "test_theme_velvet_collapsed.png") });

  // Toggle back to Sky Blue in Collapsed state
  await paletteBtn.click();
  await page.waitForTimeout(600);

  // Expand sidebar again
  const expandBtn = page.getByTitle("Expand sidebar");
  await expandBtn.click();
  await page.waitForTimeout(600);

  // 6. Test Navigation to Leads
  console.log("Testing Navigation to 1. Inbound Leads...");
  const leadsLink = page.getByRole("link", { name: /1\. Inbound Leads/i });
  await leadsLink.click();
  await page.waitForTimeout(1000);
  console.log("Capturing Leads navigated page in Sky Blue...");
  await page.screenshot({ path: path.join(artifactDir, "test_theme_sky_leads_navigated.png") });

  console.log("All verifications passed perfectly!");
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
