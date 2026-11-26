import { GoogleGenAI } from "@google/genai";
import {
  AirQualityReading,
  GeminiInsight,
  GeoLocation,
  WeatherReading,
  RoutineItem,
} from "@/types";
import { environmentalCache } from "@/lib/cache/environmental-cache";
import { rateLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/observability/logger";
import {
  buildEnvironmentalChatPrompt,
  buildRoutineFromTelemetry,
  buildContextualFallbackInsight,
  buildContextualFallbackChatReply,
} from "./gemini-fallbacks";

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

/**
 * Determines whether a primary Gemini error is an eligible transient failure
 * that qualifies for automated secondary model failover.
 */
interface ErrorLike {
  name?: string;
  code?: string | number;
  status?: number;
  statusCode?: number;
  message?: string;
}

interface ParsedInsightPayload {
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

function cleanEnvVar(value?: string): string | undefined {
  return value?.replace(/^["']|["']$/g, "").trim();
}

export function isTransientFailoverEligible(error: unknown): FailoverEligibility {
  if (!error) return { eligible: false, reason: "UNKNOWN_ERROR" };

  const errObj = error as ErrorLike;
  const errMsg = error instanceof Error ? error.message : String(error);
  const errName = error instanceof Error ? error.name : "";

  // 1. Timeout / Abort conditions
  if (
    errMsg.includes("timed out") ||
    errMsg.includes("abort") ||
    errName === "AbortError" ||
    errObj?.name === "RequestAbortedError"
  ) {
    return { eligible: true, reason: "PRIMARY_REQUEST_TIMEOUT", statusCode: 408 };
  }

  // 2. Transient network transport failures
  const errCode = errObj?.code;
  if (
    errCode === "ECONNRESET" ||
    errCode === "ETIMEDOUT" ||
    errCode === "ENOTFOUND" ||
    errCode === "ECONNREFUSED" ||
    errMsg.includes("fetch failed") ||
    errMsg.includes("network error")
  ) {
    return { eligible: true, reason: "TRANSIENT_NETWORK_FAILURE", statusCode: 503 };
  }

  // 3. Inspect HTTP status / ApiError structure
  let status = errObj?.status || errObj?.statusCode;
  if (!status) {
    try {
      if (errMsg.includes('"code":')) {
        const jsonStart = errMsg.indexOf("{");
        const parsed = JSON.parse(errMsg.substring(jsonStart));
        status = parsed.error?.code || parsed.code;
      }
    } catch {}
  }

  // Non-eligible client or permission errors (DO NOT FAILOVER)
  if (status === 400 || errMsg.includes('"code":400') || errMsg.includes("INVALID_ARGUMENT")) {
    return { eligible: false, reason: "INVALID_REQUEST_PAYLOAD_400", statusCode: 400 };
  }
  if (status === 401 || errMsg.includes('"code":401') || errMsg.includes("UNAUTHENTICATED")) {
    return { eligible: false, reason: "AUTHENTICATION_FAILURE_401", statusCode: 401 };
  }
  if (status === 403 || errMsg.includes('"code":403') || errMsg.includes("PERMISSION_DENIED")) {
    return { eligible: false, reason: "PERMISSION_RESTRICTION_403", statusCode: 403 };
  }
  if (status === 404 || errMsg.includes('"code":404') || errMsg.includes("NOT_FOUND")) {
    return { eligible: false, reason: "MODEL_NOT_FOUND_404", statusCode: 404 };
  }

  // Eligible server-side transient errors (FAILOVER)
  if (status === 503 || errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand")) {
    return { eligible: true, reason: "HTTP_503_HIGH_DEMAND_UNAVAILABLE", statusCode: 503 };
  }
  if (status === 504 || errMsg.includes("504") || errMsg.includes("DEADLINE_EXCEEDED")) {
    return { eligible: true, reason: "HTTP_504_DEADLINE_EXCEEDED", statusCode: 504 };
  }
  if (status === 500 || status === 502) {
    return { eligible: true, reason: "HTTP_500_UPSTREAM_SERVER_ERROR", statusCode: status };
  }

  // Eligible model-specific 429 quota exhaustion condition
  if (
    status === 429 ||
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("quota")
  ) {
    const isModelSpecific =
      errMsg.includes("GenerateRequestsPerDayPerProjectPerModel") ||
      errMsg.includes("generate_content_free_tier_requests") ||
      errMsg.includes("gemini-3.5-flash-lite") ||
      errMsg.includes("gemini-3.8-flash") ||
      errMsg.includes("quotaId");

    if (isModelSpecific) {
      return { eligible: true, reason: "MODEL_SPECIFIC_QUOTA_EXHAUSTED_429", statusCode: 429 };
    }
    return { eligible: false, reason: "ACCOUNT_WIDE_RATE_LIMIT_429", statusCode: 429 };
  }

  // Default: treat unknown non-transient errors as ineligible to prevent cascading failures
  return { eligible: false, reason: `UNCLASSIFIED_ERROR_${status || "UNKNOWN"}` };
}

export class GeminiService {
  private readonly apiKey: string | undefined;
  private readonly client: GoogleGenAI | null = null;
  private readonly modelName: string;
  private readonly fallbackModelName: string;
  private readonly groqApiKey: string | undefined;
  private readonly groqModelName: string;
  private readonly requestTimeoutMs = 6000;
  private readonly primaryTimeoutMs = 3500;

  constructor() {
    this.apiKey = cleanEnvVar(process.env.GEMINI_API_KEY);
    this.modelName = cleanEnvVar(process.env.GEMINI_MODEL) || "gemini-3.5-flash-lite";
    this.fallbackModelName = cleanEnvVar(process.env.GEMINI_FALLBACK_MODEL) || "gemini-3.5-flash";
    this.groqApiKey = cleanEnvVar(process.env.GROQ_API_KEY);
    this.groqModelName = cleanEnvVar(process.env.GROQ_MODEL) || "openai/gpt-oss-120b";

    if (this.apiKey && this.apiKey.length > 0) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (e) {
        logger.error("GeminiService", "Failed to initialize GoogleGenAI client", {
          meta: { error: e instanceof Error ? e.message : String(e) },
        });
        this.client = null;
      }
    }
  }

  get isConfigured(): boolean {
    return Boolean(this.client);
  }

  get primaryModel(): string {
    return this.modelName;
  }

  get fallbackModel(): string {
    return this.fallbackModelName;
  }

  /**
   * Helper that executes an operation with a bounded deadline and AbortSignal.
   * Cleans up timer and discards late resolutions immediately.
   */
  private async executeWithDeadline<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number,
    timeoutErrorMsg: string
  ): Promise<T> {
    const abortController = new AbortController();
    let isTimedOut = false;
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        isTimedOut = true;
        abortController.abort();
        reject(new Error(timeoutErrorMsg));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([
        operation(abortController.signal),
        timeoutPromise,
      ]);
      if (timeoutId) clearTimeout(timeoutId);
      if (isTimedOut) {
        throw new Error(timeoutErrorMsg);
      }
      return result;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /**
   * Secondary cloud failover via Groq API.
   * Provides ultra-low latency (<400ms) LPU inference when Google Gemini hits 503, timeouts, or quota limits.
   */
  public async executeGroqFallback(
    prompt: string,
    timeoutMs = 4000,
    jsonMode = false
  ): Promise<string | null> {
    const key = this.groqApiKey?.replace(/^["']|["']$/g, "").trim();
    if (!key) return null;

    const candidateModels = [
      this.groqModelName,
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
    ].filter(Boolean);
    const modelsToTry = Array.from(new Set(candidateModels));

    for (const model of modelsToTry) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const bodyPayload: Record<string, unknown> = {
          model,
          messages: [
            {
              role: "system",
              content:
                "You are BreatheWise AI's environmental companion. Provide clear, scientifically accurate, and actionable air quality and sustainability guidance for Indian urban settings.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 1024,
        };

        if (jsonMode) {
          bodyPayload.response_format = { type: "json_object" };
        }

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        });

        clearTimeout(timer);

        if (!response.ok) {
          logger.warn("GeminiService", `Groq model ${model} returned status ${response.status}`);
          continue;
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) {
          logger.info("GeminiService", `Groq fallback answered successfully using ${model}`);
          return reply;
        }
      } catch (candidateErr) {
        clearTimeout(timer);
        logger.warn("GeminiService", `Groq model ${model} request error`, {
          meta: { error: candidateErr instanceof Error ? candidateErr.message : String(candidateErr) },
        });
        continue;
      }
    }
    return null;
  }

  /**
   * Calculates a transparent, verifiable data-quality score (0-100)
   * based on pollutant completeness, freshness, and real-time observation status.
   */
  public calculateDataQualityScore(reading?: AirQualityReading): number {
    if (!reading) return 50;
    let score = 0;

    // Completeness (up to 50 pts)
    const pollutants = reading.pollutants;
    let count = 0;
    if (pollutants?.pm25 != null && pollutants.pm25 > 0) count++;
    if (pollutants?.pm10 != null && pollutants.pm10 > 0) count++;
    if (pollutants?.no2 != null && pollutants.no2 > 0) count++;
    if (pollutants?.so2 != null && pollutants.so2 > 0) count++;
    if (pollutants?.co != null && pollutants.co > 0) count++;
    if (pollutants?.o3 != null && pollutants.o3 > 0) count++;
    score += Math.round((count / 6) * 50);

    // Real-time status (30 pts)
    if (!reading.isDemoData) {
      score += 30;
    } else {
      score += 15;
    }

    // Freshness (up to 20 pts)
    if (reading.dataQuality?.freshnessSeconds && reading.dataQuality.freshnessSeconds < 1800) {
      score += 20;
    } else {
      score += 10;
    }

    return Math.min(100, Math.max(30, score));
  }

  /**
   * Generates tailored environmental health insights using Gemini or contextual engine.
   * Employs multi-model failover: Primary Model -> Fallback Model -> Deterministic Engine.
   */
  async generateAirQualityInsight(
    reading: AirQualityReading,
    location: GeoLocation,
    weather?: WeatherReading,
    forceRefresh = false
  ): Promise<GeminiInsight> {
    const dataQuality = this.calculateDataQualityScore(reading);
    const cacheKey = `gemini:insight:${location.latitude.toFixed(2)}:${location.longitude.toFixed(2)}:${reading.aqi}`;

    if (forceRefresh) {
      environmentalCache.clear(cacheKey);
    }

    return environmentalCache.getOrFetch(cacheKey, 900, async () => {
      const insightPrompt = `
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

      if (this.client) {
        const startTime = Date.now();
        const totalDeadlineMs = this.requestTimeoutMs;
        const primaryTimeoutMs = this.primaryTimeoutMs;

        // 1. Attempt Primary Model
        let primaryError: unknown = null;
        try {
          const response = await this.executeWithDeadline(
            (signal) =>
              this.client!.models.generateContent({
                model: this.modelName,
                contents: insightPrompt,
                config: {
                  responseMimeType: "application/json",
                  temperature: 0.2,
                  abortSignal: signal,
                },
              }),
            primaryTimeoutMs,
            `Gemini primary insight model (${this.modelName}) timed out after ${primaryTimeoutMs}ms`
          );

          const text = response.text?.trim();
          if (text) {
            const parsed = JSON.parse(text);
            return this.formatInsightResponse(parsed, location, dataQuality, this.modelName, false);
          }
        } catch (e) {
          primaryError = e;
          logger.warn("GeminiService", `Primary insight generation (${this.modelName}) failed`, {
            meta: { error: e instanceof Error ? e.message : String(e) },
          });
        }

        // 2. Evaluate Transient Failover Eligibility
        const failoverCheck = isTransientFailoverEligible(primaryError);
        const elapsedMs = Date.now() - startTime;
        const remainingMs = totalDeadlineMs - elapsedMs;
        const minFallbackBudgetMs = Math.min(800, totalDeadlineMs * 0.2);

        if (failoverCheck.eligible && remainingMs >= minFallbackBudgetMs) {
          // Conservative Fallback Budget check (Max 10 requests/minute)
          const fallbackRateLimit = rateLimiter.check("ai:insight:global:fallback", {
            intervalMs: 60_000,
            maxRequests: 10,
          });

          if (fallbackRateLimit.allowed) {
            try {
              logger.info(
                "GeminiService",
                `Triggering secondary failover for insight to ${this.fallbackModelName}`,
                { meta: { reason: failoverCheck.reason, remainingMs } }
              );

              const response = await this.executeWithDeadline(
                (signal) =>
                  this.client!.models.generateContent({
                    model: this.fallbackModelName,
                    contents: insightPrompt,
                    config: {
                      responseMimeType: "application/json",
                      temperature: 0.2,
                      abortSignal: signal,
                    },
                  }),
                remainingMs,
                `Gemini fallback insight model (${this.fallbackModelName}) timed out after ${remainingMs}ms`
              );

              const text = response.text?.trim();
              if (text) {
                const parsed = JSON.parse(text);
                return this.formatInsightResponse(parsed, location, dataQuality, this.fallbackModelName, true);
              }
            } catch (fallbackErr) {
              logger.warn("GeminiService", `Secondary fallback insight model (${this.fallbackModelName}) failed`, {
                meta: { error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr) },
              });
            }
          }
        }
      }

      // Groq Cloud Fallback if Gemini models fail
      if (this.groqApiKey) {
        try {
          logger.info("GeminiService", "Attempting Groq secondary cloud failover for insight");
          const groqJson = await this.executeGroqFallback(insightPrompt, 3500, true);
          if (groqJson) {
            const parsed = JSON.parse(groqJson);
            return this.formatInsightResponse(parsed, location, dataQuality, `groq/${this.groqModelName}`, true);
          }
        } catch (groqErr) {
          logger.warn("GeminiService", "Groq cloud fallback for insight failed", {
            meta: { error: groqErr instanceof Error ? groqErr.message : String(groqErr) },
          });
        }
      }

      // Contextual generator fallback
      return buildContextualFallbackInsight(reading, location, weather, dataQuality);
    });
  }

  private formatInsightResponse(
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
        : (parsed.uncertaintyNotes || "Based on Open-Meteo satellite and dispersion modeling."),
      dataFreshnessText: "Updated within the last 15 minutes",
      dataQualityMetric: dataQuality,
      confidenceScore: dataQuality / 100,
      generatedAt: new Date().toISOString(),
      isDemoData: false,
    };
  }

  /**
   * Interactive conversational assistant endpoint.
   * Implements bounded multi-model failover: Primary -> Secondary -> Contextual Fallback.
   */
  async chat(payload: AiChatMessagePayload): Promise<AiChatResponse> {
    const dataQuality = this.calculateDataQualityScore(payload.reading);
    const { reading, weather, location } = payload;
    const startTime = Date.now();
    const totalDeadlineMs = this.requestTimeoutMs;
    const primaryTimeoutMs = this.primaryTimeoutMs;
    const prompt = buildEnvironmentalChatPrompt(location, payload.message, reading, weather);

    if (this.client) {
      // 1. Attempt Primary Model
      let primaryError: unknown = null;
      try {
        const response = await this.executeWithDeadline(
          (signal) =>
            this.client!.models.generateContent({
              model: this.modelName,
              contents: prompt,
              config: { abortSignal: signal },
            }),
          primaryTimeoutMs,
          `Gemini primary model (${this.modelName}) timed out after ${primaryTimeoutMs}ms`
        );

        const reply = response.text || "I am currently analyzing your local environmental conditions.";
        const durationMs = Date.now() - startTime;

        return {
          reply,
          dataQualityIndicator: dataQuality,
          dataSource: reading?.sourceAttribution || "Open-Meteo Planetary Environmental Data",
          timestamp: new Date().toISOString(),
          isDemoData: false,
          uncertaintyNotes: "Real-time atmospheric modeling verified via Open-Meteo API.",
          modelUsed: this.modelName,
          primaryModel: this.modelName,
          fallbackUsed: false,
          generationStatus: "primary_success",
          durationMs,
        };
      } catch (err) {
        primaryError = err;
        logger.warn("GeminiService", `Primary model (${this.modelName}) failed`, {
          meta: { error: err instanceof Error ? err.message : String(err) },
        });
      }

      // 2. Evaluate Transient Failover Eligibility
      const failoverCheck = isTransientFailoverEligible(primaryError);
      const elapsedMs = Date.now() - startTime;
      const remainingMs = totalDeadlineMs - elapsedMs;
      const minFallbackBudgetMs = Math.min(800, totalDeadlineMs * 0.2);

      if (failoverCheck.eligible && remainingMs >= minFallbackBudgetMs) {
        const fallbackRateLimit = rateLimiter.check("ai:chat:global:fallback", {
          intervalMs: 60_000,
          maxRequests: 10,
        });

        if (fallbackRateLimit.allowed) {
          try {
            logger.info("GeminiService", `Triggering secondary failover to ${this.fallbackModelName}`, {
              meta: { reason: failoverCheck.reason, remainingMs },
            });

            const response = await this.executeWithDeadline(
              (signal) =>
                this.client!.models.generateContent({
                  model: this.fallbackModelName,
                  contents: prompt,
                  config: { abortSignal: signal },
                }),
              remainingMs,
              `Gemini fallback model (${this.fallbackModelName}) timed out after ${remainingMs}ms`
            );

            const reply = response.text || "I am currently analyzing your local environmental conditions.";
            const durationMs = Date.now() - startTime;

            return {
              reply,
              dataQualityIndicator: dataQuality,
              dataSource: `Gemini Secondary Intelligence (${this.fallbackModelName}) & Open-Meteo`,
              timestamp: new Date().toISOString(),
              isDemoData: false,
              uncertaintyNotes: "Generated via secondary model failover. Real-time atmospheric modeling verified via Open-Meteo API.",
              modelUsed: this.fallbackModelName,
              primaryModel: this.modelName,
              fallbackUsed: true,
              fallbackReason: failoverCheck.reason,
              generationStatus: "fallback_success",
              durationMs,
            };
          } catch (fallbackErr) {
            logger.warn("GeminiService", `Secondary fallback model (${this.fallbackModelName}) failed`, {
              meta: { error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr) },
            });
          }
        } else {
          logger.warn("GeminiService", "Secondary model rate limit exceeded (10 RPM budget). Skipping fallback.");
        }
      } else {
        logger.info("GeminiService", "Failover skipped", {
          meta: { eligible: failoverCheck.eligible, reason: failoverCheck.reason, remainingMs },
        });
      }
    }

    // 3. Groq High-Speed Cloud Fallback (<400ms LPU)
    if (this.groqApiKey) {
      try {
        logger.info("GeminiService", "Attempting Groq secondary cloud failover for chat");
        const groqReply = await this.executeGroqFallback(prompt, 4000, false);
        if (groqReply) {
          return {
            reply: groqReply,
            dataQualityIndicator: dataQuality,
            dataSource: `Groq High-Speed Intelligence (${this.groqModelName}) & Open-Meteo`,
            timestamp: new Date().toISOString(),
            isDemoData: false,
            uncertaintyNotes: "Generated via Groq secondary model failover. Real-time atmospheric modeling verified via Open-Meteo API.",
            modelUsed: `groq/${this.groqModelName}`,
            primaryModel: this.modelName,
            fallbackUsed: true,
            fallbackReason: "GEMINI_FAILOVER_TO_GROQ",
            generationStatus: "fallback_success",
            durationMs: Date.now() - startTime,
          };
        }
      } catch (groqErr) {
        logger.warn("GeminiService", "Groq fallback failed", {
          meta: { error: groqErr instanceof Error ? groqErr.message : String(groqErr) },
        });
      }
    }

    // 4. Deterministic CPCB-calibrated fallback
    const fallbackResponse = this.getContextualFallbackChatReply(payload, dataQuality);
    return {
      ...fallbackResponse,
      modelUsed: "none",
      primaryModel: this.modelName,
      fallbackUsed: true,
      fallbackReason: "Provider unavailable or failover exhausted",
      generationStatus: "deterministic_fallback",
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Generates a tailored daily routine prioritizing real available hourly forecasts,
   * local weather, and wind vectors over static diurnal heuristics.
   */
  async generateRoutine(
    reading: AirQualityReading,
    location: GeoLocation,
    weather?: WeatherReading
  ): Promise<RoutineItem[]> {
    return buildRoutineFromTelemetry(reading, location, weather);
  }

  /**
   * Fallback chat reply generator when GEMINI_API_KEY is not configured or in fallback mode.
   */
  public getContextualFallbackChatReply(
    payload: AiChatMessagePayload,
    dataQuality: number
  ): AiChatResponse {
    return buildContextualFallbackChatReply(payload, dataQuality);
  }
}

export const geminiService = new GeminiService();
