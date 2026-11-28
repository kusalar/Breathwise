import type { GoogleGenAI } from "@google/genai";
import { AirQualityReading, GeminiInsight, GeoLocation, WeatherReading } from "@/types";
import { rateLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/observability/logger";
import { buildContextualFallbackInsight } from "./gemini-fallbacks";
import type { FailoverEligibility, ParsedInsightPayload } from "./gemini.types";

export interface InsightSynthesisDeps {
  client: GoogleGenAI | null;
  modelName: string;
  fallbackModelName: string;
  groqApiKey?: string;
  groqModelName: string;
  requestTimeoutMs: number;
  primaryTimeoutMs: number;
  isTransientFailoverEligible: (error: unknown) => FailoverEligibility;
  executeWithDeadline: <T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number,
    timeoutErrorMsg: string
  ) => Promise<T>;
  executeGroqFallback: (
    prompt: string,
    timeoutMs?: number,
    jsonMode?: boolean
  ) => Promise<string | null>;
}

/**
 * Builds the structured environmental insight prompt for verified telemetry.
 */
export function buildInsightPrompt(
  reading: AirQualityReading,
  location: GeoLocation,
  weather?: WeatherReading
): string {
  return `
You are the Chief Environmental Health Intelligence Agent of BreatheWise AI.
Analyze the following verified atmospheric measurements for ${location.name}, ${location.region}, ${location.country}:

Current AQI (Indicative CPCB Standard): ${reading?.aqi ?? 142} (${(reading?.category ?? "MODERATE").toUpperCase()})
Dominant Pollutant: ${reading?.dominantPollutant ?? "PM2.5"}
PM2.5: ${reading?.pollutants?.pm25 ?? "N/A"} µg/m³
PM10: ${reading?.pollutants?.pm10 ?? "N/A"} µg/m³
Weather: ${weather?.temperatureC ?? "N/A"}°C, Humidity: ${weather?.humidityPercent ?? "N/A"}%, Wind Speed: ${weather?.windSpeedKmh ?? "N/A"} km/h (${weather?.conditionText ?? "N/A"})
Data Source: ${reading?.sourceAttribution ?? "Open-Meteo Environmental Telemetry"}

STRICT RELIABILITY RULES:
- Do not invent any numbers or pollutant values.
- Distinguish observations from predictions.
- Do not diagnose medical conditions.
- Do not guarantee that an outdoor activity is 100% safe.
- Focus on practical Indian urban realities (winter smog, temperature inversions, commute alternatives).

Provide response as a strict JSON object with:
{
  "headline": "Short punchy summary",
  "explanation": "Clear explanation of why pollution is at this level and what weather is doing",
  "tailoredAction": "Specific priority action for right now",
  "situationSummary": "1-2 sentence overview",
  "recommendedActions": ["action 1", "action 2", "action 3"],
  "actionsToAvoid": ["avoid 1", "avoid 2"],
  "practicalAlternatives": ["alternative 1", "alternative 2"],
  "environmentalImpact": "Avoided emissions estimate",
  "uncertaintyNotes": "Statement about data confidence"
}
`;
}

/**
 * Normalizes a parsed LLM JSON response into a typed GeminiInsight domain object.
 */
export function formatInsightResponse(
  parsed: ParsedInsightPayload,
  location: GeoLocation,
  dataQuality: number,
  modelName: string,
  fallbackUsed: boolean
): GeminiInsight {
  return {
    id: `gemini-${Date.now()}`,
    headline: parsed.headline || `Air Quality Summary for ${location.name}`,
    explanation: parsed.explanation || "Atmospheric inversion layer is active.",
    tailoredAction: parsed.tailoredAction || "Wear an N95 mask outdoors.",
    situationSummary: parsed.situationSummary,
    recommendedActions: parsed.recommendedActions || [],
    actionsToAvoid: parsed.actionsToAvoid || [],
    practicalAlternatives: parsed.practicalAlternatives || [],
    environmentalImpact: parsed.environmentalImpact,
    uncertaintyNotes: fallbackUsed
      ? `Synthesized using secondary AI model (${modelName}) following primary model failover.`
      : parsed.uncertaintyNotes || "Based on Open-Meteo satellite and dispersion modeling.",
    dataFreshnessText: "Updated within the last 15 minutes",
    dataQualityMetric: dataQuality,
    confidenceScore: dataQuality / 100,
    generatedAt: new Date().toISOString(),
    isDemoData: false,
  };
}

/**
 * Generates an environmental health insight with bounded multi-model failover:
 * Primary Gemini -> Secondary Gemini -> Groq Cloud -> Deterministic CPCB Fallback.
 */
export async function synthesizeAirQualityInsight(
  reading: AirQualityReading,
  location: GeoLocation,
  weather: WeatherReading | undefined,
  dataQuality: number,
  deps: InsightSynthesisDeps
): Promise<GeminiInsight> {
  const insightPrompt = buildInsightPrompt(reading, location, weather);
  const {
    client,
    modelName,
    fallbackModelName,
    groqApiKey,
    groqModelName,
    requestTimeoutMs,
    primaryTimeoutMs,
    isTransientFailoverEligible,
    executeWithDeadline,
    executeGroqFallback,
  } = deps;

  if (client) {
    const startTime = Date.now();
    let primaryError: unknown = null;

    // 1. Attempt Primary Gemini Model
    try {
      const response = await executeWithDeadline(
        (signal) =>
          client.models.generateContent({
            model: modelName,
            contents: insightPrompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.2,
              abortSignal: signal,
            },
          }),
        primaryTimeoutMs,
        `Gemini primary insight model (${modelName}) timed out after ${primaryTimeoutMs}ms`
      );

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text) as ParsedInsightPayload;
        return formatInsightResponse(parsed, location, dataQuality, modelName, false);
      }
    } catch (e) {
      primaryError = e;
      logger.warn("GeminiService", `Primary insight generation (${modelName}) failed`, {
        meta: { error: e instanceof Error ? e.message : String(e) },
      });
    }

    // 2. Evaluate Secondary Gemini Failover
    const failoverCheck = isTransientFailoverEligible(primaryError);
    const remainingMs = requestTimeoutMs - (Date.now() - startTime);
    const minFallbackBudgetMs = Math.min(800, requestTimeoutMs * 0.2);

    if (failoverCheck.eligible && remainingMs >= minFallbackBudgetMs) {
      const fallbackRateLimit = rateLimiter.check("ai:insight:global:fallback", {
        intervalMs: 60_000,
        maxRequests: 10,
      });

      if (fallbackRateLimit.allowed) {
        try {
          logger.info("GeminiService", `Triggering secondary failover for insight to ${fallbackModelName}`, {
            meta: { reason: failoverCheck.reason, remainingMs },
          });

          const response = await executeWithDeadline(
            (signal) =>
              client.models.generateContent({
                model: fallbackModelName,
                contents: insightPrompt,
                config: {
                  responseMimeType: "application/json",
                  temperature: 0.2,
                  abortSignal: signal,
                },
              }),
            remainingMs,
            `Gemini fallback insight model (${fallbackModelName}) timed out after ${remainingMs}ms`
          );

          const text = response.text?.trim();
          if (text) {
            const parsed = JSON.parse(text) as ParsedInsightPayload;
            return formatInsightResponse(parsed, location, dataQuality, fallbackModelName, true);
          }
        } catch (fallbackErr) {
          logger.warn("GeminiService", `Secondary fallback insight model (${fallbackModelName}) failed`, {
            meta: { error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr) },
          });
        }
      }
    }
  }

  // 3. Groq Cloud Failover
  if (groqApiKey) {
    try {
      logger.info("GeminiService", "Attempting Groq secondary cloud failover for insight");
      const groqJson = await executeGroqFallback(insightPrompt, 3500, true);
      if (groqJson) {
        const parsed = JSON.parse(groqJson) as ParsedInsightPayload;
        return formatInsightResponse(parsed, location, dataQuality, `groq/${groqModelName}`, true);
      }
    } catch (groqErr) {
      logger.warn("GeminiService", "Groq cloud fallback for insight failed", {
        meta: { error: groqErr instanceof Error ? groqErr.message : String(groqErr) },
      });
    }
  }

  // 4. Deterministic Fallback
  return buildContextualFallbackInsight(reading, location, weather, dataQuality);
}
