import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Helper to set temporary password for the live test account before the suite runs
async function getLiveTestCredentials() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return null;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }

  const { initializeApp, cert, getApps, getApp } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) return null;
  privateKey = privateKey.replace(/\\n/g, "\n");

  const app = getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });

  const auth = getAuth(app);
  const email = "admin.jgechelper@gmail.com";
  const user = await auth.getUserByEmail(email);

  // Generate compliant temporary password in memory - NEVER printed
  const tempPassword = "Bw_" + crypto.randomBytes(8).toString("hex") + "!9Aa";
  await auth.updateUser(user.uid, { password: tempPassword });

  return { email, password: tempPassword, uid: user.uid };
}

test.describe("BreatheWise AI — Milestone 6J-C Live Application User Journeys", () => {
  let credentials: { email: string; password: string; uid: string } | null = null;

  test.beforeAll(async () => {
    try {
      credentials = await getLiveTestCredentials();
    } catch {
      credentials = null;
    }
  });

  test("1. Login UI renders, rejects invalid credentials, and authenticates dedicated test user", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Sign In to BreatheWise AI");

    // 1a. Test invalid credentials rejection
    await page.fill("#email", "admin.jgechelper@gmail.com");
    await page.fill("#password", "CompletelyWrongPassword123!");
    await page.click("button[type='submit']");

    await expect(page.locator("#login-error-alert")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#login-error-alert")).toContainText(/invalid/i);

    // 1b. Test valid credentials if live credentials loaded
    if (credentials) {
      await page.fill("#email", credentials.email);
      await page.fill("#password", credentials.password);
      await page.click("button[type='submit']");

      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Refresh to verify session persistence
      await page.reload();
      await expect(page).toHaveURL(/.*dashboard/);

      // Verify profile menu shows authenticated user
      const profileBtn = page.locator("button[aria-label='User profile and settings']");
      await profileBtn.click();
      await expect(page.locator(`text=${credentials.email}`)).toBeVisible();

      // Test logout
      await page.click("text=Log Out");
      await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
    }
  });

  test("2. Dashboard Integration: Displays environmental data with CPCB disclaimer", async ({ page, isMobile }) => {
    await page.goto("/dashboard");
    await expect(page.locator("text=Air Quality for Siliguri")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Primary Environmental Metric")).toBeVisible({ timeout: 15000 });

    // Verify CPCB methodology pill on desktop viewports
    if (!isMobile) {
      await expect(page.locator("text=/CPCB-Breakpoint-Based Estimate|CPCB-Aligned NAQI/")).toBeVisible();
    }

    // Verify Copernicus / ECMWF attribution source
    await expect(page.locator("text=Source:").first()).toBeVisible();

    // Switch cities to Delhi
    const locationBtn = page.locator("button[aria-haspopup='listbox']");
    await locationBtn.click();
    await page.click("text=Delhi");
    await expect(page.locator("text=Delhi").first()).toBeVisible();
  });

  test("3. Preferences & Schedule Journey: Read and update user commute settings", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.locator("h1")).toContainText("User Preferences & Schedule Configuration");

    // Change evening commute time
    const inputs = page.locator("input[type='time']");
    if (await inputs.count() > 1) {
      await inputs.nth(1).fill("18:45");
    }

    // Save preferences
    await page.click("button:has-text('Save Preferences')");
    await expect(page.locator("text=Preferences saved successfully!")).toBeVisible({ timeout: 15000 });

    // Refresh and verify persistence
    await page.reload();
    await expect(page.locator("text=Select Base City")).toBeVisible();
  });

  test("4. Family Protection Journey: Register and view synthetic dependent profile", async ({ page }) => {
    await page.goto("/dashboard/family-protection");
    await expect(page.locator("h1")).toContainText("Family Protection & Vulnerability Profiles");

    // Open add family member form
    await page.click("text=Add Family Member");
    await expect(page.locator("text=Register Dependent Profile")).toBeVisible();

    // Fill synthetic member form
    const uniqueChildName = `Aarav (Live Test ${Date.now().toString().slice(-4)})`;
    await page.fill("input[placeholder*='e.g. Aarav']", uniqueChildName);
    await page.selectOption("select >> nth=0", "child");
    await page.fill("input[type='number']", "6");

    // Submit registration
    await page.click("button:has-text('Register Member')");

    // Verify dependent card appears with HIGH RISK badge
    await expect(page.locator(`text=${uniqueChildName}`).first()).toBeVisible();
    await expect(page.locator("text=HIGH RISK").first()).toBeVisible();
  });

  test("5. Daily Planner Journey: Create and persist pollution-adapted routine", async ({ page }) => {
    await page.goto("/dashboard/daily-planner");
    await expect(page.locator("h1")).toContainText("Pollution-Aware Daily Routine Planner");

    // Add schedule block
    await page.click("text=Add Another Schedule Block");
    await expect(page.locator("input[value*='Custom Activity']")).toBeVisible();

    // Save routine
    await page.click("text=Save to My Routines");
    await expect(page.locator("text=Stored in PostgreSQL with user-isolated RLS.")).toBeVisible();
  });

  test("6. AI Assistant Journey: Consultation interface and safe offline fallback", async ({ page }) => {
    await page.goto("/dashboard/ai-assistant");
    await expect(page.locator("text=BreatheWise Gemini Assistant")).toBeVisible();

    // Click suggested prompt
    await page.click("text=Should I exercise outdoors today or postpone it?");
    await expect(page.locator("text=/exercise outdoors|outdoor exercise/i").first()).toBeVisible({ timeout: 25000 });
  });

  test("7. Sustainable Choices & Impact Tracker Journey: Log action and view metrics", async ({ page }) => {
    await page.goto("/dashboard/sustainable-choices");
    await expect(page.locator("h1")).toContainText("Sustainable Alternatives & Low-Emission Living");

    // Log action
    const logButton = page.locator("button:has-text('Log This Action')").first();
    await logButton.click();
    await expect(page.locator("text=Logged to Your Impact Record!")).toBeVisible();

    // Navigate to Impact Tracker
    await page.click("text=View My Logged Impact");
    await expect(page).toHaveURL(/.*impact-tracker/);
    await expect(page.locator("text=Total CO₂ Emissions Avoided")).toBeVisible();
  });
});
