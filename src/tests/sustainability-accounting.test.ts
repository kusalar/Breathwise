import { describe, it, expect } from "vitest";
import {
  calculateCommuteSavings,
  calculateCompostingSavings,
  calculateCoolingSavings,
  SUSTAINABILITY_EMISSION_FACTORS,
} from "@/lib/sustainability/emissions";

describe("Phase 3 — Sustainability Accounting & Emission Factor Verification", () => {
  describe("Emission Factor Metadata & Authority Document Audit", () => {
    it("documents authoritative source documents and years for all factors", () => {
      const petrol = SUSTAINABILITY_EMISSION_FACTORS.petrol_car_commute;
      expect(petrol.sourceDocument).toContain("CRRI / CPCB");
      expect(petrol.sourceYear).toBe("2018");
      expect(petrol.baselineFactor).toBe(0.18);
      expect(petrol.unit).toBe("kg CO2 / km");

      const waste = SUSTAINABILITY_EMISSION_FACTORS.waste_open_burning;
      expect(waste.sourceDocument).toContain("NEERI");
      expect(waste.sourceYear).toBe("2016");
      expect(waste.baselineFactor).toBe(1.4);

      const grid = SUSTAINABILITY_EMISSION_FACTORS.residential_ac_displacement;
      expect(grid.sourceDocument).toContain("Central Electricity Authority");
      expect(grid.sourceYear).toBe("2024");
      expect(grid.baselineFactor).toBe(0.82);
    });

    it("explicitly labels uncertainty as an application-defined illustrative heuristic", () => {
      const petrol = SUSTAINABILITY_EMISSION_FACTORS.petrol_car_commute;
      expect(petrol.isEmpiricalHeuristic).toBe(true);
      expect(petrol.uncertaintyDescription).toContain("Application-defined illustrative uncertainty");

      const waste = SUSTAINABILITY_EMISSION_FACTORS.waste_open_burning;
      expect(waste.isEmpiricalHeuristic).toBe(true);
    });
  });

  describe("Commute Emission Calculations & Boundary Tests", () => {
    it("calculates accurate savings for 10 km standard urban commute via E-rickshaw", () => {
      // 10 km * (0.18 - 0.035) = 10 * 0.145 = 1.45 kg CO2
      const result = calculateCommuteSavings(10, "erickshaw");
      expect(result.co2SavedKg).toBe(1.45);
      expect(result.particulateAvoidedPct).toBe(45);
    });

    it("calculates accurate savings for metro transit and cycling", () => {
      const metro = calculateCommuteSavings(10, "metro");
      // 10 km * (0.18 - 0.02) = 1.6 kg CO2
      expect(metro.co2SavedKg).toBe(1.6);
      expect(metro.particulateAvoidedPct).toBe(60);

      const cycling = calculateCommuteSavings(10, "cycling");
      // 10 km * (0.18 - 0.0) = 1.8 kg CO2
      expect(cycling.co2SavedKg).toBe(1.8);
      expect(cycling.particulateAvoidedPct).toBe(70);
    });

    it("safely handles boundary, zero, negative, NaN, and Infinity distance inputs", () => {
      expect(calculateCommuteSavings(0).co2SavedKg).toBe(0);
      expect(calculateCommuteSavings(-10).co2SavedKg).toBe(0);
      expect(calculateCommuteSavings(NaN).co2SavedKg).toBe(0);
      expect(calculateCommuteSavings(Infinity).co2SavedKg).toBe(0);
    });
  });

  describe("Composting & Waste Diverted Calculations", () => {
    it("calculates accurate CO2e and particulate mass avoided by diverting biomass", () => {
      // 2.5 kg * 1.4 kg CO2e/kg = 3.5 kg CO2e
      const result = calculateCompostingSavings(2.5);
      expect(result.co2SavedKg).toBe(3.5);
      expect(result.particulateAvoidedPct).toBe(85);
      // 2.5 kg * 90g PM2.5/kg = 225g PM2.5 eliminated
      expect(result.particulateAvoidedGrams).toBe(225);
    });

    it("handles boundary values for waste composting", () => {
      expect(calculateCompostingSavings(0).co2SavedKg).toBe(0);
      expect(calculateCompostingSavings(-5).co2SavedKg).toBe(0);
      expect(calculateCompostingSavings(NaN).co2SavedKg).toBe(0);
    });
  });

  describe("Residential Energy Displacement Calculations", () => {
    it("calculates accurate grid emissions displaced from reducing AC runtime", () => {
      // 2.5 hours * 1.1 kW * 0.82 kg CO2/kWh = 2.255 -> 2.26 kg CO2
      const result = calculateCoolingSavings(2.5, 1.1);
      expect(result.co2SavedKg).toBe(2.26);
      expect(result.particulateAvoidedPct).toBe(30);
    });

    it("handles boundary values for cooling runtime", () => {
      expect(calculateCoolingSavings(0).co2SavedKg).toBe(0);
      expect(calculateCoolingSavings(-2).co2SavedKg).toBe(0);
      expect(calculateCoolingSavings(NaN).co2SavedKg).toBe(0);
    });
  });
});
