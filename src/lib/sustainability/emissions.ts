/**
 * BreatheWise AI — Sustainability Accounting Engine
 * Defensible Indian Urban Emission Factors & Methodologies
 *
 * References:
 * 1. Central Road Research Institute (CRRI) / CPCB Urban Commute Emission Baselines (2018)
 * 2. National Environmental Engineering Research Institute (NEERI) Waste Open Burning Model (2016)
 * 3. Central Electricity Authority (CEA) CO2 Baseline Database for the Indian Power Sector (Ver 19, 2024)
 * 4. Bureau of Energy Efficiency (BEE) Eco-Niwas Samhita Residential Energy Guidelines (2021)
 */

export interface EmissionFactorMetadata {
  sourceDocument: string;
  sourceYear: string;
  baselineFactor: number;
  unit: string;
  assumptions: string;
  uncertaintyDescription: string;
  isEmpiricalHeuristic: boolean;
}

export const SUSTAINABILITY_EMISSION_FACTORS: Record<string, EmissionFactorMetadata> = {
  petrol_car_commute: {
    sourceDocument: "CRRI / CPCB Urban Commute Emission Baseline & ARAI Emission Database",
    sourceYear: "2018",
    baselineFactor: 0.18, // kg CO2 per vehicle-km
    unit: "kg CO2 / km",
    assumptions: "Assumes average urban fuel economy of 12 km/L in stop-and-go Indian city traffic (2.31 kg CO2/L petrol).",
    uncertaintyDescription: "Application-defined illustrative uncertainty (±15%) reflecting traffic speed variations (8–25 km/h) and vehicle maintenance.",
    isEmpiricalHeuristic: true,
  },
  erickshaw_commute: {
    sourceDocument: "BEE / CRRI Electric Three-Wheeler Energy Index",
    sourceYear: "2020",
    baselineFactor: 0.035, // kg CO2 per passenger-km equivalent on Indian grid
    unit: "kg CO2 / km",
    assumptions: "Assumes 0.05 kWh/km battery consumption with average grid intensity of 0.71 kg CO2/kWh and 3-passenger shared occupancy.",
    uncertaintyDescription: "Illustrative heuristic (±15%) based on battery state-of-health and local charging grid source.",
    isEmpiricalHeuristic: true,
  },
  waste_open_burning: {
    sourceDocument: "NEERI Municipal Solid Waste Assessment & IPCC Waste Combustion Factors",
    sourceYear: "2016",
    baselineFactor: 1.4, // kg CO2e per kg biomass burned
    unit: "kg CO2e / kg waste",
    assumptions: "Assumes garden leaves, twigs, and municipal refuse with 35% moisture content. Eliminates ~90g PM2.5/kg burned.",
    uncertaintyDescription: "Varies by ±20% depending on organic moisture content and smoldering vs flaming combustion phase.",
    isEmpiricalHeuristic: true,
  },
  residential_ac_displacement: {
    sourceDocument: "Central Electricity Authority (CEA) CO2 Baseline Database Ver 19 & BEE",
    sourceYear: "2024",
    baselineFactor: 0.82, // kg CO2 per kWh displaced
    unit: "kg CO2 / kWh",
    assumptions: "Weighted average grid emission factor for the National Grid of India. 1.5-ton 3-star AC draws ~1.1 kW.",
    uncertaintyDescription: "Application-defined assumption (±10%) based on regional grid generation mix (thermal vs hydro/solar share).",
    isEmpiricalHeuristic: true,
  },
};

/**
 * Calculates net CO2 saved (kg) by switching from personal fossil transit to shared electric transit or cycling.
 * Formula: distanceKm * (petrolFactor - evFactor)
 */
export function calculateCommuteSavings(
  distanceKm: number,
  mode: "erickshaw" | "metro" | "cycling" = "erickshaw"
): { co2SavedKg: number; particulateAvoidedPct: number } {
  if (distanceKm <= 0 || isNaN(distanceKm) || !isFinite(distanceKm)) {
    return { co2SavedKg: 0, particulateAvoidedPct: 0 };
  }

  const petrolFactor = SUSTAINABILITY_EMISSION_FACTORS.petrol_car_commute.baselineFactor;
  let alternativeFactor = 0;
  let particulatePct = 45;

  if (mode === "erickshaw") {
    alternativeFactor = SUSTAINABILITY_EMISSION_FACTORS.erickshaw_commute.baselineFactor;
    particulatePct = 45;
  } else if (mode === "metro") {
    alternativeFactor = 0.02; // Mass transit electric per passenger-km
    particulatePct = 60;
  } else if (mode === "cycling") {
    alternativeFactor = 0.0;
    particulatePct = 70;
  }

  const netSavingsPerKm = Math.max(0, petrolFactor - alternativeFactor);
  const totalSaved = Math.round(distanceKm * netSavingsPerKm * 100) / 100;

  return {
    co2SavedKg: totalSaved,
    particulateAvoidedPct: particulatePct,
  };
}

/**
 * Calculates net CO2e saved (kg) and particulate plume eliminated by diverting biomass from open burning to composting.
 * Formula: wasteKg * NEERI open burning emission factor (1.4 kg CO2e/kg)
 */
export function calculateCompostingSavings(wasteKg: number): {
  co2SavedKg: number;
  particulateAvoidedPct: number;
  particulateAvoidedGrams: number;
} {
  if (wasteKg <= 0 || isNaN(wasteKg) || !isFinite(wasteKg)) {
    return { co2SavedKg: 0, particulateAvoidedPct: 0, particulateAvoidedGrams: 0 };
  }

  const factor = SUSTAINABILITY_EMISSION_FACTORS.waste_open_burning.baselineFactor;
  const totalCo2 = Math.round(wasteKg * factor * 100) / 100;
  const totalPmGrams = Math.round(wasteKg * 90 * 10) / 10; // 90g PM2.5 per kg burned

  return {
    co2SavedKg: totalCo2,
    particulateAvoidedPct: 85,
    particulateAvoidedGrams: totalPmGrams,
  };
}

/**
 * Calculates net CO2 saved (kg) by displacing active AC cooling with natural ventilation and earthen clay cooling.
 * Formula: hoursDisplaced * (acPowerKw * gridEmissionFactor)
 */
export function calculateCoolingSavings(
  hoursDisplaced: number,
  acPowerKw: number = 1.1
): { co2SavedKg: number; particulateAvoidedPct: number } {
  if (hoursDisplaced <= 0 || isNaN(hoursDisplaced) || !isFinite(hoursDisplaced)) {
    return { co2SavedKg: 0, particulateAvoidedPct: 0 };
  }

  const gridFactor = SUSTAINABILITY_EMISSION_FACTORS.residential_ac_displacement.baselineFactor;
  const totalSaved = Math.round(hoursDisplaced * acPowerKw * gridFactor * 100) / 100;

  return {
    co2SavedKg: totalSaved,
    particulateAvoidedPct: 30,
  };
}
