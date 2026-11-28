import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { DailyPlannerView } from "@/components/dashboard/daily-planner-view";
import { FamilyProtectionView } from "@/components/dashboard/family-protection-view";
import { SustainabilityView } from "@/components/dashboard/sustainability-view";
import { ImpactTrackerView } from "@/components/dashboard/impact-tracker-view";
import { SettingsView } from "@/components/dashboard/settings-view";

// Mock fetch globally for component tests
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/air-quality")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              location: { name: "Siliguri", latitude: 26.7271, longitude: 88.3953 },
              aqi: 168,
              category: "moderate",
              dominantPollutant: "PM2.5",
              pollutants: { pm25: 88, pm10: 145, no2: 32, so2: 12, co: 0.9, o3: 45 },
            }),
        });
      }
      if (url.includes("/api/routines")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ routines: [] }),
        });
      }
      if (url.includes("/api/user/household")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              members: [
                {
                  id: "m-1",
                  name: "Aarav",
                  relation: "child",
                  ageYears: 7,
                  vulnerabilityLevel: "high",
                  respiratorySensitivity: true,
                  notes: "Asthma inhaler active",
                },
              ],
            }),
        });
      }
      if (url.includes("/api/sustainability")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              actions: [
                {
                  id: "act-1",
                  userId: "test-user",
                  category: "commute",
                  actionDescription: "E-rickshaw commute",
                  estimatedCo2SavedKg: 1.8,
                  estimatedParticulateAvoidedPct: 45,
                  recordedAt: new Date().toISOString(),
                },
              ],
            }),
        });
      }
      if (url.includes("/api/user/preferences")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    })
  );
});

describe("Milestone 3 — Production Views & Interactive Features", () => {
  describe("DailyPlannerView", () => {
    it("renders diurnal atmospheric context and initial schedule blocks", async () => {
      render(<DailyPlannerView />);
      expect(
        screen.getByRole("heading", { name: /Pollution-Aware Daily Routine Planner/i })
      ).toBeInTheDocument();

      // Check context card
      expect(screen.getByText(/Current Atmospheric Context/i)).toBeInTheDocument();

      // Check default inversion window
      expect(screen.getByDisplayValue(/Morning Smog Inversion Window/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save to My Routines/i })).toBeInTheDocument();
      expect(screen.getByText(/Add Another Schedule Block/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/168/)).toBeInTheDocument();
      });
    });
  });

  describe("FamilyProtectionView", () => {
    it("renders RLS privacy guarantee and dependent profiles with risk badges", async () => {
      render(<FamilyProtectionView />);
      expect(
        screen.getByRole("heading", { name: /Family Protection & Vulnerability Profiles/i })
      ).toBeInTheDocument();

      // RLS privacy guarantee
      expect(screen.getByText(/Privacy Guarantee:/i)).toBeInTheDocument();

      // Dependent card loaded from mock API
      expect(await screen.findByText("Aarav")).toBeInTheDocument();
      expect(screen.getByText(/HIGH RISK/i)).toBeInTheDocument();
      expect(screen.getByText(/Respiratory Sensitive/i)).toBeInTheDocument();

      // Physiological impact matrix
      expect(screen.getByText(/Physiological Smog Impact Matrix/i)).toBeInTheDocument();
    });
  });

  describe("SustainabilityView", () => {
    it("displays science-backed alternatives with defensible carbon factor disclosures", () => {
      render(<SustainabilityView />);
      expect(
        screen.getByRole("heading", { name: /Sustainable Alternatives & Low-Emission Living/i })
      ).toBeInTheDocument();

      expect(screen.getByText(/Defensible Environmental Factors:/i)).toBeInTheDocument();
      expect(screen.getByText(/Electric Rickshaw \/ Metro Commute/i)).toBeInTheDocument();
      expect(screen.getByText(/Aerobic Kitchen Composting & Mulching/i)).toBeInTheDocument();
      expect(screen.getByText(/View My Logged Impact/i)).toBeInTheDocument();
    });
  });

  describe("ImpactTrackerView", () => {
    it("renders aggregated KPI metrics and uncertainty disclosures", async () => {
      render(<ImpactTrackerView />);
      expect(
        screen.getByRole("heading", { name: /Personal Sustainability & Carbon Impact Tracker/i })
      ).toBeInTheDocument();

      expect(screen.getByText(/Total CO₂ Emissions Avoided/i)).toBeInTheDocument();
      expect(screen.getByText(/Avg. Particulate Avoided/i)).toBeInTheDocument();
      expect(screen.getByText(/Methodology & Uncertainty Disclosures/i)).toBeInTheDocument();

      // Action record from API
      expect(await screen.findByText(/E-rickshaw commute/i)).toBeInTheDocument();
    });
  });

  describe("SettingsView", () => {
    it("renders configuration controls for base monitoring location and commute timings", () => {
      render(<SettingsView />);
      expect(
        screen.getByRole("heading", { name: /User Preferences & Schedule Configuration/i })
      ).toBeInTheDocument();

      expect(screen.getByText(/Default Monitoring Location/i)).toBeInTheDocument();
      expect(screen.getByText(/Daily Routine Schedule Timings/i)).toBeInTheDocument();
      expect(screen.getByText(/Morning Commute Departure/i)).toBeInTheDocument();
      expect(screen.getByText(/Smog Alert & Advisory Thresholds/i)).toBeInTheDocument();
    });
  });
});
