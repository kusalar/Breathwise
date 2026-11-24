import { test, expect } from "@playwright/test";

test.describe("BreatheWise AI — Milestone 2 User Journeys", () => {
  test("landing page renders successfully and navigates to dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Breathe Smarter.");

    // Click Launch Interactive Demo
    await page.click("text=Launch Interactive Demo");
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=Air Quality for Siliguri")).toBeVisible();
  });

  test("dashboard displays air quality and switches cities", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("text=Primary Environmental Metric")).toBeVisible({ timeout: 15000 });

    // Open location selector
    const locationBtn = page.locator("button[aria-haspopup='listbox']");
    await locationBtn.click();
    await expect(page.locator("role=listbox")).toBeVisible();

    // Select Delhi
    await page.click("text=Delhi");
    await expect(page.locator("text=Delhi").first()).toBeVisible();
  });

  test("AI assistant interface sends a question and receives guidance", async ({ page }) => {
    await page.goto("/dashboard/ai-assistant");
    await expect(page.locator("text=BreatheWise Gemini Assistant")).toBeVisible();

    // Click a suggested question
    await page.click("text=Should I exercise outdoors today or postpone it?");
    await expect(page.locator("text=/exercise outdoors|outdoor exercise/i").first()).toBeVisible({ timeout: 25000 });
  });
});

