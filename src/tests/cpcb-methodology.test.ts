import { describe, it, expect } from "vitest";
import {
  calculateCPCBSubIndex,
  calculateIndicativeCPCB,
  calculateOfficialCPCB,
  evaluateCPCBSufficiency,
  getCPCBCategory,
  CPCB_CATEGORIES,
} from "@/lib/constants/aqi-standards";

describe("CPCB NAQI Methodology & Sub-Index Engine Tests", () => {
  describe("Pollutant Sub-Index Linear Interpolation & Breakpoints", () => {
    // PM2.5 Breakpoints:
    // 0-30 -> 0-50 (Good)
    // 31-60 -> 51-100 (Satisfactory)
    // 61-90 -> 101-200 (Moderate)
    // 91-120 -> 201-300 (Poor)
    // 121-250 -> 301-400 (Very Poor)
    // 250.1-500 -> 401-500 (Severe)
    it("correctly calculates PM2.5 boundary values", () => {
      expect(calculateCPCBSubIndex(0, "pm25")).toBe(0);
      expect(calculateCPCBSubIndex(30, "pm25")).toBe(50);
      expect(calculateCPCBSubIndex(31, "pm25")).toBe(51);
      expect(calculateCPCBSubIndex(60, "pm25")).toBe(100);
      expect(calculateCPCBSubIndex(61, "pm25")).toBe(101);
      expect(calculateCPCBSubIndex(90, "pm25")).toBe(200);
      expect(calculateCPCBSubIndex(91, "pm25")).toBe(201);
      expect(calculateCPCBSubIndex(120, "pm25")).toBe(300);
      expect(calculateCPCBSubIndex(121, "pm25")).toBe(301);
      expect(calculateCPCBSubIndex(250, "pm25")).toBe(400);
      expect(calculateCPCBSubIndex(375, "pm25")).toBe(450);
      expect(calculateCPCBSubIndex(500, "pm25")).toBe(500);
      // Beyond 500 caps at 500
      expect(calculateCPCBSubIndex(650, "pm25")).toBe(500);
    });

    // PM10 Breakpoints:
    // 0-50 -> 0-50
    // 51-100 -> 51-100
    // 101-250 -> 101-200
    // 251-350 -> 201-300
    // 351-430 -> 301-400
    // 430.1-500 -> 401-500
    it("correctly calculates PM10 boundary values", () => {
      expect(calculateCPCBSubIndex(0, "pm10")).toBe(0);
      expect(calculateCPCBSubIndex(50, "pm10")).toBe(50);
      expect(calculateCPCBSubIndex(100, "pm10")).toBe(100);
      expect(calculateCPCBSubIndex(250, "pm10")).toBe(200);
      expect(calculateCPCBSubIndex(350, "pm10")).toBe(300);
      expect(calculateCPCBSubIndex(430, "pm10")).toBe(400);
      expect(calculateCPCBSubIndex(500, "pm10")).toBe(500);
    });

    // NO2 Breakpoints:
    // 0-40 -> 0-50
    // 41-80 -> 51-100
    // 81-180 -> 101-200
    // 181-280 -> 201-300
    // 281-400 -> 301-400
    // 400.1-800 -> 401-500
    it("correctly calculates NO2 sub-index", () => {
      expect(calculateCPCBSubIndex(40, "no2")).toBe(50);
      expect(calculateCPCBSubIndex(80, "no2")).toBe(100);
      expect(calculateCPCBSubIndex(180, "no2")).toBe(200);
      expect(calculateCPCBSubIndex(280, "no2")).toBe(300);
      expect(calculateCPCBSubIndex(400, "no2")).toBe(400);
      expect(calculateCPCBSubIndex(800, "no2")).toBe(500);
    });

    // SO2 Breakpoints (µg/m³):
    // 0-40 -> 0-50
    // 41-80 -> 51-100
    // 81-380 -> 101-200
    // 381-800 -> 201-300
    // 801-1600 -> 301-400
    // 1600.1-2000 -> 401-500
    it("correctly calculates SO2 sub-index across all breakpoints", () => {
      expect(calculateCPCBSubIndex(40, "so2")).toBe(50);
      expect(calculateCPCBSubIndex(80, "so2")).toBe(100);
      expect(calculateCPCBSubIndex(380, "so2")).toBe(200);
      expect(calculateCPCBSubIndex(800, "so2")).toBe(300);
      expect(calculateCPCBSubIndex(1600, "so2")).toBe(400);
      expect(calculateCPCBSubIndex(2000, "so2")).toBe(500);
      expect(calculateCPCBSubIndex(2500, "so2")).toBe(500);
    });

    // CO Breakpoints (mg/m³):
    // 0-1.0 -> 0-50
    // 1.1-2.0 -> 51-100
    // 2.1-10.0 -> 101-200
    // 10.1-17.0 -> 201-300
    // 17.1-34.0 -> 301-400
    // 34.1-50.0 -> 401-500
    it("correctly calculates CO sub-index with fractional concentration inputs", () => {
      expect(calculateCPCBSubIndex(1.0, "co")).toBe(50);
      expect(calculateCPCBSubIndex(2.0, "co")).toBe(100);
      expect(calculateCPCBSubIndex(10.0, "co")).toBe(200);
      expect(calculateCPCBSubIndex(17.0, "co")).toBe(300);
      expect(calculateCPCBSubIndex(34.0, "co")).toBe(400);
      expect(calculateCPCBSubIndex(50.0, "co")).toBe(500);
    });

    // O3 Breakpoints:
    // 0-50 -> 0-50
    // 51-100 -> 51-100
    // 101-168 -> 101-200
    // 169-208 -> 201-300
    // 209-748 -> 301-400
    // 748.1-1000 -> 401-500
    it("correctly calculates O3 sub-index", () => {
      expect(calculateCPCBSubIndex(50, "o3")).toBe(50);
      expect(calculateCPCBSubIndex(100, "o3")).toBe(100);
      expect(calculateCPCBSubIndex(168, "o3")).toBe(200);
      expect(calculateCPCBSubIndex(208, "o3")).toBe(300);
      expect(calculateCPCBSubIndex(748, "o3")).toBe(400);
      expect(calculateCPCBSubIndex(1000, "o3")).toBe(500);
    });

    it("handles zero, negative, NaN, Infinity and non-numeric pollutant values safely", () => {
      expect(calculateCPCBSubIndex(0, "pm25")).toBe(0);
      expect(calculateCPCBSubIndex(-15, "pm25")).toBe(0);
      expect(calculateCPCBSubIndex(NaN, "pm25")).toBe(0);
      expect(calculateCPCBSubIndex(Infinity, "pm25")).toBe(0);
      expect(calculateCPCBSubIndex(-Infinity, "pm25")).toBe(0);
    });

    it("handles continuous floating point boundaries smoothly without underflow", () => {
      // 30.4 falls between interval 1 (0-30) and interval 2 (31-60)
      const subIdx = calculateCPCBSubIndex(30.4, "pm25");
      expect(subIdx).toBeGreaterThanOrEqual(50);
      expect(subIdx).toBeLessThanOrEqual(52);
    });
  });

  describe("CPCB Categories & Health Advisories", () => {
    it("maps numeric ranges to official CPCB categories", () => {
      expect(getCPCBCategory(30).category).toBe("good");
      expect(getCPCBCategory(50).category).toBe("good");
      expect(getCPCBCategory(51).category).toBe("satisfactory");
      expect(getCPCBCategory(100).category).toBe("satisfactory");
      expect(getCPCBCategory(101).category).toBe("moderate");
      expect(getCPCBCategory(200).category).toBe("moderate");
      expect(getCPCBCategory(201).category).toBe("poor");
      expect(getCPCBCategory(300).category).toBe("poor");
      expect(getCPCBCategory(301).category).toBe("very_poor");
      expect(getCPCBCategory(400).category).toBe("very_poor");
      expect(getCPCBCategory(401).category).toBe("severe");
      expect(getCPCBCategory(500).category).toBe("severe");
    });

    it("provides specific family and indoor protection advisories per category", () => {
      const poor = CPCB_CATEGORIES.poor;
      expect(poor.familyProtectionAction).toContain("Seniors, infants, and pregnant family members");
      expect(poor.indoorAction).toContain("Run indoor HEPA air purifiers");

      const severe = CPCB_CATEGORIES.severe;
      expect(severe.familyProtectionAction).toContain("Cancel all outdoor sports");
      expect(severe.indoorAction).toContain("emergency clean room");
    });
  });

  describe("CPCB Mandatory Requirements & Dominant Pollutant Determination", () => {
    it("enforces mandatory particulate availability (at least PM2.5 or PM10)", () => {
      // NO2, SO2, CO present, but NO PM2.5 or PM10
      const resultWithoutParticulate = calculateIndicativeCPCB({
        no2: 45,
        so2: 20,
        co: 1.5,
      });

      expect(resultWithoutParticulate.status).toBe("insufficient_data");
      expect(resultWithoutParticulate.aqi).toBe(0);
      expect(resultWithoutParticulate.missingRequirements).toContain(
        "PM2.5 or PM10 (Mandatory CPCB criteria)"
      );
      expect(resultWithoutParticulate.methodologyDisclaimer).toContain(
        "Insufficient critical particulate data"
      );
    });

    it("correctly identifies dominant pollutant when PM2.5 is highest", () => {
      const result = calculateIndicativeCPCB({
        pm25: 140, // sub-index ~ 316 (Very Poor)
        pm10: 80,  // sub-index ~ 80 (Satisfactory)
        no2: 30,   // sub-index ~ 38 (Good)
        so2: 15,
        co: 0.8,
      });

      expect(result.status).toBe("calculated");
      expect(result.dominantPollutant).toBe("PM2.5");
      expect(result.aqi).toBeGreaterThanOrEqual(301);
      expect(result.category.category).toBe("very_poor");
      expect(result.isOfficialStation).toBe(false);
      expect(result.attributionNote).toContain("Indicative estimate calculated using CPCB linear breakpoints");
    });

    it("correctly identifies dominant pollutant when PM10 is highest", () => {
      const result = calculateIndicativeCPCB({
        pm25: 25,  // sub-index ~ 42 (Good)
        pm10: 280, // sub-index ~ 230 (Poor)
        no2: 20,
      });

      expect(result.status).toBe("calculated");
      expect(result.dominantPollutant).toBe("PM10");
      expect(result.category.category).toBe("poor");
    });

    it("correctly identifies gaseous dominant pollutant when NO2 or SO2 exceeds particulate sub-index", () => {
      const result = calculateIndicativeCPCB({
        pm25: 20,  // sub-index ~ 33 (Good)
        pm10: 40,  // sub-index ~ 40 (Good)
        no2: 350,  // sub-index ~ 359 (Very Poor)
      });

      expect(result.status).toBe("calculated");
      expect(result.dominantPollutant).toBe("NO₂");
      expect(result.category.category).toBe("very_poor");
    });

    it("REGRESSION TEST (Milestone 4 bug): correctly detects O3 dominance when ozone sub-index exceeds particulates", () => {
      // In summer afternoon smog, photochemical ozone can surpass PM2.5/PM10
      const result = calculateIndicativeCPCB({
        pm25: 14.0, // sub-index 23 (Good)
        pm10: 16.5, // sub-index 17 (Good)
        no2: 2.0,   // sub-index 3 (Good)
        so2: 2.3,   // sub-index 3 (Good)
        co: 0.4,    // sub-index 20 (Good)
        o3: 126.0,  // sub-index ~ 138 (Moderate) - dominant!
      });

      expect(result.status).toBe("calculated");
      expect(result.dominantPollutant).toBe("O₃");
      expect(result.aqi).toBe(138);
      expect(result.category.category).toBe("moderate");
      expect(result.subIndices.o3).toBe(138);
    });

    it("REGRESSION TEST: handles missing secondary pollutants (SO2, CO) gracefully without throwing or corrupting AQI", () => {
      const result = calculateIndicativeCPCB({
        pm25: 58.2,
        pm10: 112.6,
        no2: 34.5,
        so2: null,
        co: undefined,
        o3: null,
      });

      expect(result.status).toBe("calculated");
      expect(result.pollutantCount).toBe(3);
      expect(result.meetsOfficialThreePollutantCriteria).toBe(true);
      expect(result.subIndices.so2).toBeUndefined();
      expect(result.subIndices.co).toBeUndefined();
      expect(result.aqi).toBeGreaterThan(0);
    });

    it("REGRESSION TEST: returns insufficient_data when all pollutant values are null or undefined", () => {
      const result = calculateIndicativeCPCB({
        pm25: null,
        pm10: null,
        no2: null,
        so2: null,
        co: null,
        o3: null,
      });

      expect(result.status).toBe("insufficient_data");
      expect(result.aqi).toBe(0);
      expect(result.dominantPollutant).toBe("None");
      expect(result.meetsOfficialThreePollutantCriteria).toBe(false);
    });

    it("includes transparent disclosures regarding instantaneous vs 24-hr averaging periods", () => {
      const result = calculateIndicativeCPCB({
        pm25: 45,
        pm10: 95,
      });

      expect(result.methodologyDisclaimer).toContain("instantaneous hourly atmospheric telemetry");
      expect(result.methodologyDisclaimer).toContain("24-hour continuous sensor monitoring");
      expect(result.pollutantCount).toBe(2);
      expect(result.meetsOfficialThreePollutantCriteria).toBe(false);
    });

    it("evaluates strict official 3-pollutant NAQI criteria via calculateOfficialCPCB", () => {
      // 2 pollutants only -> fails official 3-pollutant requirement
      const partialResult = calculateOfficialCPCB({
        pm25: 45,
        pm10: 95,
      });
      expect(partialResult.status).toBe("insufficient_data");
      expect(partialResult.missingRequirements?.some(r => r.includes("Minimum 3 pollutants"))).toBe(true);

      // 3 pollutants with PM2.5 -> satisfies official requirement
      const validResult = calculateOfficialCPCB({
        pm25: 45,
        pm10: 95,
        no2: 50,
      });
      expect(validResult.status).toBe("calculated");
      expect(validResult.meetsOfficialThreePollutantCriteria).toBe(true);
      expect(validResult.pollutantCount).toBe(3);
    });
  });

  describe("Phase 9.7 — Missing Pollutant Handling, Averaging Window Sufficiency & Data Integrity", () => {
    it("handles missing PM2.5 when PM10 is present without converting null to zero", () => {
      const result = calculateIndicativeCPCB({
        pm25: null,
        pm10: 160,
        no2: 45,
        so2: 25,
      });

      expect(result.status).toBe("calculated");
      expect(result.subIndices.pm25).toBeUndefined();
      expect(result.subIndices.pm10).toBeDefined();
      expect(result.dominantPollutant).toBe("PM10");
      expect(result.aqi).toBeGreaterThanOrEqual(101);
      expect(result.pollutantCount).toBe(3);
    });

    it("handles missing PM10 when PM2.5 is present", () => {
      const result = calculateIndicativeCPCB({
        pm25: 75,
        pm10: null,
        no2: 30,
        co: 1.2,
      });

      expect(result.status).toBe("calculated");
      expect(result.subIndices.pm10).toBeUndefined();
      expect(result.subIndices.pm25).toBeDefined();
      expect(result.dominantPollutant).toBe("PM2.5");
      expect(result.pollutantCount).toBe(3);
    });

    it("handles missing CO without corrupting remaining criteria pollutants", () => {
      const result = calculateIndicativeCPCB({
        pm25: 55,
        pm10: 95,
        no2: 40,
        so2: 20,
        co: null,
        o3: 45,
      });

      expect(result.status).toBe("calculated");
      expect(result.subIndices.co).toBeUndefined();
      expect(result.pollutantCount).toBe(5);
      expect(result.meetsOfficialThreePollutantCriteria).toBe(true);
    });

    it("handles multiple missing pollutants (only PM2.5 present)", () => {
      const result = calculateIndicativeCPCB({
        pm25: 85,
        pm10: null,
        no2: null,
        so2: null,
        co: null,
        o3: null,
      });

      expect(result.status).toBe("calculated");
      expect(result.pollutantCount).toBe(1);
      expect(result.meetsOfficialThreePollutantCriteria).toBe(false);
      expect(result.dominantPollutant).toBe("PM2.5");
      expect(result.aqi).toBeGreaterThanOrEqual(101);
    });

    it("enforces official failure when fewer than three valid pollutants are present", () => {
      const result = calculateOfficialCPCB({
        pm25: 85,
        pm10: 120,
        no2: null,
        so2: null,
        co: null,
        o3: null,
      });

      expect(result.status).toBe("insufficient_data");
      expect(result.aqi).toBe(0);
      expect(result.pollutantCount).toBe(2);
      expect(result.missingRequirements).toBeDefined();
    });

    it("enforces failure when three valid pollutants exist but neither PM2.5 nor PM10 is present", () => {
      const result = calculateOfficialCPCB({
        pm25: null,
        pm10: null,
        no2: 60,
        so2: 35,
        co: 1.8,
      });

      expect(result.status).toBe("insufficient_data");
      expect(result.aqi).toBe(0);
      expect(result.missingRequirements).toContain("PM2.5 or PM10 (Mandatory CPCB criteria)");
    });

    it("succeeds when three valid pollutants are present including PM2.5 or PM10", () => {
      const result = calculateOfficialCPCB({
        pm25: 45,
        pm10: null,
        no2: 50,
        so2: null,
        co: null,
        o3: 65,
      });

      expect(result.status).toBe("calculated");
      expect(result.pollutantCount).toBe(3);
      expect(result.meetsOfficialThreePollutantCriteria).toBe(true);
      expect(result.aqi).toBeGreaterThan(0);
    });

    it("evaluates insufficient averaging-window data (<16 hours for 24-hr window)", () => {
      const twelveHourlySamples = [35, 42, 50, 48, 55, 60, 52, 45, 40, 38, 44, 49];
      const evaluation = evaluateCPCBSufficiency(twelveHourlySamples, 24, 16);

      expect(evaluation.isAveragingSufficient).toBe(false);
      expect(evaluation.sampleCount).toBe(12);
      expect(evaluation.requiredSamples).toBe(16);
      expect(evaluation.averageValue).toBeNull();
      expect(evaluation.limitationNotice).toContain("Insufficient data: 12 valid hourly samples available");
    });

    it("evaluates sufficient 16-hour data for 24-hour CPCB averaging", () => {
      const eighteenHourlySamples = [
        30, 32, 35, 40, 45, 50, 55, 52, 48, 44, 40, 38, 36, 34, 32, 30, 28, 26,
      ];
      const evaluation = evaluateCPCBSufficiency(eighteenHourlySamples, 24, 16);

      expect(evaluation.isAveragingSufficient).toBe(true);
      expect(evaluation.sampleCount).toBe(18);
      expect(evaluation.averageValue).toBeGreaterThan(0);
      expect(evaluation.limitationNotice).toContain("Sufficient data: 18 valid hourly samples");
    });

    it("calculates 8-hour averaging window for CO and O3 with minimum 6 samples", () => {
      // 8-hour window requires at least 6 valid samples (75% coverage)
      const coSamples = [1.2, 1.4, 1.5, null, 1.6, 1.8, 1.7, null];
      const evaluation = evaluateCPCBSufficiency(coSamples, 8, 6);

      expect(evaluation.isAveragingSufficient).toBe(true);
      expect(evaluation.sampleCount).toBe(6);
      expect(evaluation.averageValue).toBe(1.5);
    });

    it("rejects 8-hour averaging window for CO when fewer than 6 samples are present", () => {
      const sparseCoSamples = [1.2, 1.4, null, null, null, 1.8, 1.7, null];
      const evaluation = evaluateCPCBSufficiency(sparseCoSamples, 8, 6);

      expect(evaluation.isAveragingSufficient).toBe(false);
      expect(evaluation.sampleCount).toBe(4);
      expect(evaluation.averageValue).toBeNull();
    });
  });
});

