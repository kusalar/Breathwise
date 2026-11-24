import { test, expect } from "@playwright/test";

test.describe("BreatheWise AI — Milestone 3 Production User Journeys", () => {
  test("Daily Planner creates, customizes, and persists pollution-aware routines", async ({ page }) => {
    await page.goto("/dashboard/daily-planner");
    await expect(page.locator("h1")).toContainText("Pollution-Aware Daily Routine Planner");

    // Verify diurnal curve context banner
    await expect(page.locator("text=Current Atmospheric Context")).toBeVisible();

    // Verify time blocks are visible
    await expect(page.locator("input[value*='Morning Smog Inversion Window']")).toBeVisible();

    // Click "Add Another Schedule Block"
    await page.click("text=Add Another Schedule Block");
    await expect(page.locator("input[value*='Custom Activity']")).toBeVisible();

    // Save routine
    await page.click("text=Save to My Routines");
    await expect(page.locator("text=Stored in PostgreSQL with user-isolated RLS.")).toBeVisible();
  });

  test("Family Protection manages vulnerable dependents with RLS privacy disclosures", async ({ page }) => {
    await page.goto("/dashboard/family-protection");
    await expect(page.locator("h1")).toContainText("Family Protection & Vulnerability Profiles");

    // Verify privacy guarantee banner
    await expect(page.locator("text=Privacy Guarantee:")).toBeVisible();

    // Open add family member form
    await page.click("text=Add Family Member");
    await expect(page.locator("text=Register Dependent Profile")).toBeVisible();

    // Fill form
    await page.fill("input[placeholder*='e.g. Aarav']", "Aarav (Child)");
    await page.selectOption("select >> nth=0", "child");
    await page.fill("input[type='number']", "7");

    // Submit
    await page.click("button:has-text('Register Member')");

    // Verify member card appears
    await expect(page.locator("text=Aarav (Child)").first()).toBeVisible();
    await expect(page.locator("text=HIGH RISK").first()).toBeVisible();
  });

  test("Sustainable Choices logs actionable alternatives into Impact Tracker with verified factors", async ({ page }) => {
    await page.goto("/dashboard/sustainable-choices");
    await expect(page.locator("h1")).toContainText("Sustainable Alternatives & Low-Emission Living");

    // Verify defensible factors alert
    await expect(page.locator("text=Defensible Environmental Factors:")).toBeVisible();

    // Log the E-rickshaw action
    const logButton = page.locator("button:has-text('Log This Action')").first();
    await logButton.click();
    await expect(page.locator("text=Logged to Your Impact Record!")).toBeVisible();

    // Navigate to Impact Tracker
    await page.click("text=View My Logged Impact");
    await expect(page).toHaveURL(/.*impact-tracker/);
    await expect(page.locator("h1")).toContainText("Personal Sustainability & Carbon Impact Tracker");

    // Verify KPI cards and methodology disclosure
    await expect(page.locator("text=Total CO₂ Emissions Avoided")).toBeVisible();
    await expect(page.locator("text=Methodology & Uncertainty Disclosures")).toBeVisible();
  });

  test("Settings configures user base location and diurnal commute timings", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.locator("h1")).toContainText("User Preferences & Schedule Configuration");

    // Verify base city selector
    await expect(page.locator("text=Select Base City")).toBeVisible();

    // Change commute time
    const morningInput = page.locator("input[type='time']").first();
    await morningInput.fill("09:15");

    // Save preferences
    await page.click("button:has-text('Save Preferences')");
    await expect(page.locator("text=Preferences saved successfully!")).toBeVisible();
  });
});
