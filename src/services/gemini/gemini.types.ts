/**
 * Shared Gemini service type definitions.
 * Extracted to prevent circular imports between gemini.service.ts, gemini-insight.ts, and gemini-fallbacks.ts.
 */

import { GeoLocation, AirQualityReading, WeatherReading } from "@/types";

export interface AiChatMessagePayload {
  message: string;
  location: GeoLocation;
  reading?: AirQualityReading;
  weather?: WeatherReading;
  history?: Array<{ role: "user" | "model"; parts: string }>;
  householdPreferences?: {
    hasChildren?: boolean;
    hasElderly?: boolean;
    hasAsthma?: boolean;
  };
}

export interface AiChatResponse {
  reply: string;
  dataQualityIndicator: number;
  dataSource: string;
  timestamp: string;
  isDemoData: boolean;
  uncertaintyNotes?: string;
  modelUsed?: string;
  primaryModel?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  generationStatus?: "primary_success" | "fallback_success" | "deterministic_fallback";
  durationMs?: number;
}

export interface FailoverEligibility {
  eligible: boolean;
  reason: string;
  statusCode?: number;
}

export interface ParsedInsightPayload {
  headline?: string;
  explanation?: string;
  tailoredAction?: string;
  situationSummary?: string;
  recommendedActions?: string[];
  actionsToAvoid?: string[];
  practicalAlternatives?: string[];
  environmentalImpact?: string;
  uncertaintyNotes?: string;
}
