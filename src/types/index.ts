import { AQICategory, AQIStandard } from "@/lib/constants/aqi-standards";

export interface GeoLocation {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  isDemo?: boolean;
}

export interface PollutantValues {
  pm25: number | null;       // µg/m³ (null if unavailable)
  pm10: number | null;       // µg/m³ (null if unavailable)
  no2: number | null;        // µg/m³ (null if unavailable)
  so2: number | null;        // µg/m³ (null if unavailable)
  co: number | null;         // mg/m³ (null if unavailable)
  o3: number | null;         // µg/m³ (null if unavailable)
  dust?: number | null;      // µg/m³ Saharan/mineral dust
  uvIndex?: number | null;   // UV radiation index
}

export interface HourlyTrendPoint {
  timestamp: string;
  timeLabel: string;
  pm25: number | null;
  pm10: number | null;
  aqi: number;
  usAqi?: number;
}

export interface DataQualityReport {
  completeness: number; // 0 to 100
  freshnessSeconds: number;
  confidenceText: string;
  isRealTime: boolean;
  missingParameters: string[];
}

export interface OfficialStationStatus {
  available: boolean;
  message: string;
  stationName?: string;
}

export interface AirQualityReading {
  location: GeoLocation;
  timestamp: string;
  aqi: number;
  category: AQICategory;
  dominantPollutant: string;
  pollutants: PollutantValues;
  usAqi?: number;
  europeanAqi?: number;
  standardUsed?: AQIStandard | "CPCB_INDICATIVE";
  dataQuality?: DataQualityReport;
  officialStationStatus?: OfficialStationStatus;
  hourlyForecast?: HourlyTrendPoint[];
  isDemoData: boolean;
  sourceAttribution: string;
}

export interface WeatherReading {
  temperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  windDirectionDegrees: number;
  uvIndex: number;
  conditionText: string;
  apparentTemperatureC?: number;
  precipitationMm?: number;
  weatherCode?: number;
  timestamp?: string;
  isDemoData: boolean;
}

export interface RoutineItem {
  id: string;
  timeSlot: string;
  title: string;
  recommendation: string;
  status: "recommended" | "caution" | "avoid";
  impactScore: "low_emission" | "protective" | "neutral";
}

export interface IndoorAirAdvice {
  id: string;
  title: string;
  summary: string;
  actionType: "ventilation" | "filtration" | "source_control" | "humidity";
  urgency: "immediate" | "moderate" | "advisory";
  practicalTip: string;
}

export interface SustainableChoice {
  id: string;
  category: "commute" | "energy" | "waste" | "lifestyle";
  title: string;
  traditionalWay: string;
  ecoAlternative: string;
  emissionReductionPercent: number;
  healthBenefit: string;
}

export interface FamilyProfile {
  id: string;
  name: string;
  relation: "self" | "child" | "elderly" | "partner" | "infant";
  age: number;
  healthConditions: string[];
  vulnerabilityLevel: "standard" | "high" | "critical";
  activeAdvisory: string;
}

export interface GeminiInsight {
  id: string;
  headline: string;
  explanation: string;
  tailoredAction: string;
  situationSummary?: string;
  recommendedActions?: string[];
  actionsToAvoid?: string[];
  practicalAlternatives?: string[];
  environmentalImpact?: string;
  uncertaintyNotes?: string;
  dataFreshnessText?: string;
  dataQualityMetric?: number; // transparent percentage (e.g. 85%), not hardcoded fake 94%
  confidenceScore: number;
  generatedAt: string;
  isDemoData: boolean;
}

export interface HouseholdMember {
  id: string;
  userId: string;
  name: string;
  relation: "self" | "child" | "elderly" | "partner" | "other";
  ageYears?: number;
  vulnerabilityLevel: "standard" | "high" | "critical";
  respiratorySensitivity: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSchedule {
  morningCommuteTime?: string;
  eveningCommuteTime?: string;
  outdoorWorkHours?: string;
  schoolDropTime?: string;
}

export interface SavedRoutine {
  id: string;
  userId: string;
  title: string;
  targetDate: string;
  routinePayload: RoutineItem[];
  isActive: boolean;
  createdAt?: string;
}

export interface SustainabilityAction {
  id: string;
  userId: string;
  category: "commute" | "waste" | "energy" | "home";
  actionDescription: string;
  estimatedCo2SavedKg: number;
  estimatedParticulateAvoidedPct: number;
  recordedAt: string;
}
