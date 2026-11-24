export type AQIStandard = "CPCB_INDIA" | "US_EPA" | "EUROPEAN_AQI";

export type AQICategory =
  | "good"
  | "satisfactory"
  | "moderate"
  | "poor"
  | "very_poor"
  | "severe";

export interface AQICategoryDetail {
  category: AQICategory;
  label: string;
  min: number;
  max: number;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  healthImplications: string;
  advisorySummary: string;
  familyProtectionAction: string;
  indoorAction: string;
}

export const CPCB_CATEGORIES: Record<AQICategory, AQICategoryDetail> = {
  good: {
    category: "good",
    label: "Good",
    min: 0,
    max: 50,
    colorHex: "#10b981",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/40",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    healthImplications: "Minimal impact. Clean, fresh ambient air.",
    advisorySummary: "Ideal conditions for outdoor exercise, walking, and natural home ventilation.",
    familyProtectionAction: "Safe for all family members, children, and elderly.",
    indoorAction: "Open windows for fresh cross-ventilation.",
  },
  satisfactory: {
    category: "satisfactory",
    label: "Satisfactory",
    min: 51,
    max: 100,
    colorHex: "#84cc16",
    badgeBg: "bg-lime-100 dark:bg-lime-950/40",
    badgeText: "text-lime-800 dark:text-lime-300",
    healthImplications: "Minor breathing discomfort to sensitive individuals.",
    advisorySummary: "Air quality is acceptable. Sensitive individuals should monitor symptoms.",
    familyProtectionAction: "Family members with asthma should carry quick-relief inhalers.",
    indoorAction: "Standard ventilation permitted during midday.",
  },
  moderate: {
    category: "moderate",
    label: "Moderate",
    min: 101,
    max: 200,
    colorHex: "#f59e0b",
    badgeBg: "bg-amber-100 dark:bg-amber-950/40",
    badgeText: "text-amber-800 dark:text-amber-300",
    healthImplications: "Breathing discomfort to people with lung, asthma, and heart conditions.",
    advisorySummary: "Noticeable haze. Reduce prolonged or heavy outdoor exertion.",
    familyProtectionAction: "Limit prolonged outdoor playtime for young children.",
    indoorAction: "Keep windows closed during morning rush and evening peak smog.",
  },
  poor: {
    category: "poor",
    label: "Poor",
    min: 201,
    max: 300,
    colorHex: "#f97316",
    badgeBg: "bg-orange-100 dark:bg-orange-950/40",
    badgeText: "text-orange-800 dark:text-orange-300",
    healthImplications: "Breathing discomfort to most people on prolonged exposure.",
    advisorySummary: "Elevated particulate pollution. N95 masks recommended outdoors.",
    familyProtectionAction: "Seniors, infants, and pregnant family members should stay indoors.",
    indoorAction: "Run indoor HEPA air purifiers; avoid burning incense or agarbatti.",
  },
  very_poor: {
    category: "very_poor",
    label: "Very Poor",
    min: 301,
    max: 400,
    colorHex: "#ef4444",
    badgeBg: "bg-red-100 dark:bg-red-950/40",
    badgeText: "text-red-800 dark:text-red-300",
    healthImplications: "Respiratory illness to the people on prolonged exposure. Pronounced effect on sensitive groups.",
    advisorySummary: "Severe smog event. Avoid all non-essential outdoor travel.",
    familyProtectionAction: "Strict indoor protocol for vulnerable dependents; seal window gaps.",
    indoorAction: "Continuous air filtration mode on high; wet-mop floors to suppress settled particulates.",
  },
  severe: {
    category: "severe",
    label: "Severe",
    min: 401,
    max: 500,
    colorHex: "#7f1d1d",
    badgeBg: "bg-rose-100 dark:bg-rose-950/50",
    badgeText: "text-rose-900 dark:text-rose-200",
    healthImplications: "Affects healthy people and seriously impacts those with existing medical conditions.",
    advisorySummary: "Emergency winter inversion pollution. Maximum preventive measures required.",
    familyProtectionAction: "Cancel all outdoor sports, school runs if possible; consult physician if wheezing occurs.",
    indoorAction: "Create an emergency clean room indoors with isolated HEPA filtration.",
  },
};

/**
 * Returns the CPCB category detail based on an AQI numeric score.
 */
export function getCPCBCategory(aqi: number): AQICategoryDetail {
  if (aqi <= 50) return CPCB_CATEGORIES.good;
  if (aqi <= 100) return CPCB_CATEGORIES.satisfactory;
  if (aqi <= 200) return CPCB_CATEGORIES.moderate;
  if (aqi <= 300) return CPCB_CATEGORIES.poor;
  if (aqi <= 400) return CPCB_CATEGORIES.very_poor;
  return CPCB_CATEGORIES.severe;
}

export type SupportedCPCB = "pm25" | "pm10" | "no2" | "so2" | "co" | "o3";

export interface BreakpointRange {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

/**
 * Official CPCB NAQI Breakpoint Tables
 * Source: Ministry of Environment, Forest and Climate Change (MoEFCC) / CPCB
 */
export const CPCB_BREAKPOINTS: Record<SupportedCPCB, BreakpointRange[]> = {
  // PM2.5 (24-hour average in µg/m³)
  pm25: [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 250.1, cHigh: 500, iLow: 401, iHigh: 500 },
  ],
  // PM10 (24-hour average in µg/m³)
  pm10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 430.1, cHigh: 500, iLow: 401, iHigh: 500 },
  ],
  // NO2 (24-hour average in µg/m³)
  no2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 400.1, cHigh: 800, iLow: 401, iHigh: 500 },
  ],
  // SO2 (24-hour average in µg/m³)
  so2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1600.1, cHigh: 2000, iLow: 401, iHigh: 500 },
  ],
  // CO (8-hour average in mg/m³)
  co: [
    { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
    { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
    { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
    { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
    { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
    { cLow: 34.1, cHigh: 50.0, iLow: 401, iHigh: 500 },
  ],
  // O3 (8-hour average in µg/m³)
  o3: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 748.1, cHigh: 1000, iLow: 401, iHigh: 500 },
  ],
};

/**
 * Calculates a single pollutant sub-index based on CPCB linear interpolation:
 * Ip = [ (Ihi - Ilo) / (BPhi - BPlo) ] * (Cp - BPlo) + Ilo
 */
export function calculateCPCBSubIndex(
  concentration: number,
  pollutant: SupportedCPCB
): number {
  if (concentration <= 0 || isNaN(concentration) || !isFinite(concentration)) return 0;
  const breakpoints = CPCB_BREAKPOINTS[pollutant];

  for (const bp of breakpoints) {
    if (concentration <= bp.cHigh) {
      const effectiveCp = Math.max(bp.cLow, concentration);
      const idx =
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (effectiveCp - bp.cLow) +
        bp.iLow;
      return Math.round(Math.min(500, Math.max(0, idx)));
    }
  }
  return 500;
}

export interface IndicativeCPCBResult {
  status: "calculated" | "insufficient_data";
  aqi: number;
  dominantPollutant: string;
  category: AQICategoryDetail;
  subIndices: Partial<Record<SupportedCPCB, number>>;
  isOfficialStation: boolean;
  attributionNote: string;
  methodologyDisclaimer: string;
  missingRequirements?: string[];
  pollutantCount: number;
  meetsOfficialThreePollutantCriteria: boolean;
}

/**
 * Computes an indicative CPCB score and sub-index breakdown from available measurements.
 *
 * METHODOLOGY AUDIT & SCIENTIFIC INTEGRITY ENFORCEMENTS:
 * 1. CPCB Minimum Requirement: At least three pollutants must be present,
 *    and at least one MUST be PM10 or PM2.5.
 * 2. If neither PM2.5 nor PM10 is present, an overall AQI CANNOT be calculated per CPCB rules.
 * 3. Open-Meteo feeds provide hourly/instantaneous values; official CPCB stations require
 *    24-hour continuous monitoring averages (min 16 hourly samples). This value is explicitly
 *    labeled as an INDICATIVE INSTANTANEOUS SUB-INDEX, not certified CAAQMS continuous daily AQI.
 */
export function calculateIndicativeCPCB(pollutants: {
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  so2?: number | null;
  co?: number | null;
  o3?: number | null;
}): IndicativeCPCBResult {
  const subIndices: Partial<Record<SupportedCPCB, number>> = {};
  const presentPollutants: SupportedCPCB[] = [];

  if (pollutants.pm25 !== undefined && pollutants.pm25 !== null && !isNaN(pollutants.pm25)) {
    subIndices.pm25 = calculateCPCBSubIndex(pollutants.pm25, "pm25");
    presentPollutants.push("pm25");
  }

  if (pollutants.pm10 !== undefined && pollutants.pm10 !== null && !isNaN(pollutants.pm10)) {
    subIndices.pm10 = calculateCPCBSubIndex(pollutants.pm10, "pm10");
    presentPollutants.push("pm10");
  }

  if (pollutants.no2 !== undefined && pollutants.no2 !== null && !isNaN(pollutants.no2)) {
    subIndices.no2 = calculateCPCBSubIndex(pollutants.no2, "no2");
    presentPollutants.push("no2");
  }

  if (pollutants.so2 !== undefined && pollutants.so2 !== null && !isNaN(pollutants.so2)) {
    subIndices.so2 = calculateCPCBSubIndex(pollutants.so2, "so2");
    presentPollutants.push("so2");
  }

  if (pollutants.co !== undefined && pollutants.co !== null && !isNaN(pollutants.co)) {
    subIndices.co = calculateCPCBSubIndex(pollutants.co, "co");
    presentPollutants.push("co");
  }

  if (pollutants.o3 !== undefined && pollutants.o3 !== null && !isNaN(pollutants.o3)) {
    subIndices.o3 = calculateCPCBSubIndex(pollutants.o3, "o3");
    presentPollutants.push("o3");
  }

  // Check CPCB mandatory requirement: at least one particulate metric (PM2.5 or PM10)
  const hasParticulate = subIndices.pm25 !== undefined || subIndices.pm10 !== undefined;
  const pollutantCount = presentPollutants.length;
  const meetsOfficialThreePollutantCriteria = hasParticulate && pollutantCount >= 3;

  if (!hasParticulate) {
    return {
      status: "insufficient_data",
      aqi: 0,
      dominantPollutant: "None",
      category: CPCB_CATEGORIES.good,
      subIndices,
      isOfficialStation: false,
      attributionNote: "CPCB methodology mandates at least PM2.5 or PM10 to calculate an AQI.",
      methodologyDisclaimer:
        "Insufficient critical particulate data. Under official CPCB guidelines, an AQI cannot be reported without either PM2.5 or PM10 monitoring.",
      missingRequirements: ["PM2.5 or PM10 (Mandatory CPCB criteria)"],
      pollutantCount,
      meetsOfficialThreePollutantCriteria: false,
    };
  }

  // Find max sub-index (dominant pollutant)
  let maxIdx = 0;
  let dominant = "PM2.5";

  const pollutantLabels: Record<SupportedCPCB, string> = {
    pm25: "PM2.5",
    pm10: "PM10",
    no2: "NO₂",
    so2: "SO₂",
    co: "CO",
    o3: "O₃",
  };

  for (const [key, value] of Object.entries(subIndices)) {
    if (value !== undefined && value >= maxIdx) {
      maxIdx = value;
      dominant = pollutantLabels[key as SupportedCPCB];
    }
  }

  const category = getCPCBCategory(maxIdx);

  return {
    status: "calculated",
    aqi: maxIdx,
    dominantPollutant: dominant,
    category,
    subIndices,
    isOfficialStation: false,
    attributionNote:
      "Indicative estimate calculated using CPCB linear breakpoints from Open-Meteo satellite/atmospheric telemetry. Official physical station data requires direct CAAQMS connection.",
    methodologyDisclaimer:
      "Calculated from instantaneous hourly atmospheric telemetry. Official CPCB certified reporting mandates 24-hour continuous sensor monitoring with at least 16 hourly samples.",
    pollutantCount,
    meetsOfficialThreePollutantCriteria,
  };
}

/**
 * Strict CPCB NAQI calculation function according to Central Pollution Control Board rules:
 * - Requires at least 3 criteria pollutants
 * - At least one must be PM2.5 or PM10
 * If criteria are not met, returns status: "insufficient_data".
 */
export function calculateOfficialCPCB(pollutants: {
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  so2?: number | null;
  co?: number | null;
  o3?: number | null;
}): IndicativeCPCBResult {
  const result = calculateIndicativeCPCB(pollutants);
  if (!result.meetsOfficialThreePollutantCriteria) {
    return {
      ...result,
      status: "insufficient_data",
      aqi: 0,
      dominantPollutant: "None",
      category: CPCB_CATEGORIES.good,
      attributionNote: "Official CPCB NAQI requires at least 3 criteria pollutants (with at least one particulate: PM2.5 or PM10).",
      methodologyDisclaimer: "Official National Air Quality Index (NAQI) cannot be published without meeting the minimum criteria of 3 monitored pollutants.",
      missingRequirements: [
        ...(result.missingRequirements || []),
        `Minimum 3 pollutants required (only ${result.pollutantCount} available)`
      ],
    };
  }
  return result;
}

export interface AveragingWindowReport {
  isAveragingSufficient: boolean;
  sampleCount: number;
  requiredSamples: number;
  averagingWindowHours: number;
  averageValue: number | null;
  limitationNotice: string;
}

/**
 * Validates CPCB data sufficiency and calculates the applicable rolling average:
 * - 24-hour averaging for PM2.5, PM10, NO2, SO2 (requires at least 16 hourly samples per CPCB NAQI standard).
 * - 8-hour averaging for CO and O3 (requires at least 6 hourly samples out of 8 hours, 75% coverage).
 */
export function evaluateCPCBSufficiency(
  samples: Array<number | null | undefined>,
  requiredHours = 24,
  minRequiredSamples = 16
): AveragingWindowReport {
  const validSamples = samples.filter(
    (s): s is number => s !== null && s !== undefined && !isNaN(s) && isFinite(s)
  );
  const sampleCount = validSamples.length;
  const isAveragingSufficient = sampleCount >= minRequiredSamples;
  const averageValue = isAveragingSufficient
    ? Math.round((validSamples.reduce((sum, v) => sum + v, 0) / sampleCount) * 10) / 10
    : null;

  return {
    isAveragingSufficient,
    sampleCount,
    requiredSamples: minRequiredSamples,
    averagingWindowHours: requiredHours,
    averageValue,
    limitationNotice: isAveragingSufficient
      ? `Sufficient data: ${sampleCount} valid hourly samples meeting CPCB minimum criterion (${minRequiredSamples}/${requiredHours} hours).`
      : `Insufficient data: ${sampleCount} valid hourly samples available (minimum ${minRequiredSamples} required for official ${requiredHours}-hr CPCB NAQI averaging). Calculation is indicative instantaneous model estimate only.`,
  };
}
