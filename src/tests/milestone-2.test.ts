import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { airQualityService } from "@/services/air-quality/air-quality.service";
import { weatherService } from "@/services/weather/weather.service";
import { geminiService } from "@/services/gemini/gemini.service";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import { NextRequest } from "next/server";
import { dataService } from "@/services/data-provider";
import { environmentalCache } from "@/lib/cache/environmental-cache";
import { calculateCPCBSubIndex, calculateIndicativeCPCB } from "@/lib/constants/aqi-standards";
import {
  OpenMeteoAirQualityResponseSchema,
  OpenMeteoWeatherResponseSchema,
  AirQualityQuerySchema,
} from "@/lib/validations/air-quality";
import { siteConfig } from "@/config/site";
import { stubOpenMeteoFetch } from "./fixtures/open-meteo";

describe("Milestone 2 — Live Environmental Data & CPCB Integration", () => {
  let fetchSpy: ReturnType<typeof stubOpenMeteoFetch>;

  beforeEach(() => {
    environmentalCache.clear();
    fetchSpy = stubOpenMeteoFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    environmentalCache.clear();
  });

  it("calculates accurate CPCB sub-indices for PM2.5 and PM10 according to CPCB guidelines", () => {
    // PM2.5: 0-30 -> 0-50 (Good)
    expect(calculateCPCBSubIndex(15, "pm25")).toBeLessThanOrEqual(50);
    // PM2.5: 31-60 -> 51-100 (Satisfactory)
    const sat = calculateCPCBSubIndex(45, "pm25");
    expect(sat).toBeGreaterThanOrEqual(51);
    expect(sat).toBeLessThanOrEqual(100);
    // PM2.5: 61-90 -> 101-200 (Moderate)
    const mod = calculateCPCBSubIndex(75, "pm25");
    expect(mod).toBeGreaterThanOrEqual(101);
    expect(mod).toBeLessThanOrEqual(200);

    // PM10: 0-50 -> 0-50 (Good)
    expect(calculateCPCBSubIndex(25, "pm10")).toBeLessThanOrEqual(50);
  });

  it("calculates indicative CPCB score with dominant pollutant and explicit non-official disclaimer", () => {
    const result = calculateIndicativeCPCB({ pm25: 85.0, pm10: 120.0 });
    expect(result.aqi).toBeGreaterThan(100);
    expect(result.dominantPollutant).toBe("PM2.5");
    expect(result.isOfficialStation).toBe(false);
    expect(result.attributionNote).toContain("Indicative estimate");
  });

  it("validates Open-Meteo Air Quality response schema using Zod", () => {
    const validPayload = {
      latitude: 26.72,
      longitude: 88.4,
      utc_offset_seconds: 19800,
      timezone: "Asia/Kolkata",
      hourly: {
        time: ["2026-11-19T00:00", "2026-11-19T01:00"],
        pm10: [65.2, 70.1],
        pm2_5: [38.4, 42.0],
        carbon_monoxide: [450.0, 480.0],
        nitrogen_dioxide: [22.1, 24.5],
        sulphur_dioxide: [12.0, 11.5],
        ozone: [48.3, 50.1],
        european_aqi: [45, 48],
        us_aqi: [108, 115],
      },
    };

    const parsed = OpenMeteoAirQualityResponseSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });

  it("handles missing pollutant values in Open-Meteo schema gracefully", () => {
    const payloadWithNulls = {
      latitude: 26.72,
      longitude: 88.4,
      hourly: {
        time: ["2026-11-19T00:00"],
        pm10: [null],
        pm2_5: [25.4],
        carbon_monoxide: [null],
        nitrogen_dioxide: [null],
        sulphur_dioxide: [null],
        ozone: [null],
      },
    };

    const parsed = OpenMeteoAirQualityResponseSchema.safeParse(payloadWithNulls);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid out-of-bounds coordinates with Zod validation", () => {
    const invalidQuery = {
      latitude: 195.5, // Out of -90..90
      longitude: 88.4,
      standard: "CPCB_INDIA",
    };

    const parsed = AirQualityQuerySchema.safeParse(invalidQuery);
    expect(parsed.success).toBe(false);
  });

  it("caches environmental responses and reuses cache within TTL", async () => {
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      return { temp: 24.5 };
    };

    const first = await environmentalCache.getOrFetch("test:cache:key", 60, fetcher);
    const second = await environmentalCache.getOrFetch("test:cache:key", 60, fetcher);

    expect(first).toEqual(second);
    expect(callCount).toBe(1); // Cached!
  });

  it("AirQualityService falls back safely to structured response on network error", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Simulated Open-Meteo network failure"));
    const invalidLocation = {
      name: "Test Location",
      region: "Region",
      country: "India",
      latitude: 26.72,
      longitude: 88.4,
    };

    const reading = await airQualityService.getCurrentReading(invalidLocation);
    expect(reading).toBeDefined();
    expect(reading.isDemoData).toBe(true);
    expect(reading.aqi).toBeGreaterThan(0);
    expect(reading.sourceAttribution).toBeDefined();
    expect(reading.location.name).toBe("Test Location");
  });

  it("WeatherService returns valid weather reading with atmospheric condition", async () => {
    const weather = await weatherService.getCurrentWeather(siteConfig.initialLocation);
    expect(weather).toBeDefined();
    expect(weather.temperatureC).toBeDefined();
    expect(weather.humidityPercent).toBeGreaterThan(0);
    expect(weather.conditionText.length).toBeGreaterThan(0);
  });
});

describe("Milestone 2 — Gemini AI Integration & Reliability", () => {
  beforeEach(() => {
    environmentalCache.clear();
    stubOpenMeteoFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    environmentalCache.clear();
  });

  it("calculates transparent data quality score based on verified parameters (not hardcoded 94%)", () => {
    const reading = {
      location: siteConfig.initialLocation,
      timestamp: new Date().toISOString(),
      aqi: 142,
      category: "moderate" as const,
      dominantPollutant: "PM2.5",
      pollutants: {
        pm25: 58.2,
        pm10: 112.6,
        no2: 34.5,
        so2: 12.8,
        co: 1.4,
        o3: 42.1,
      },
      isDemoData: false,
      sourceAttribution: "Open-Meteo",
      dataQuality: {
        completeness: 100,
        freshnessSeconds: 900,
        confidenceText: "High Confidence",
        isRealTime: true,
        missingParameters: [],
      },
    };

    const score = geminiService.calculateDataQualityScore(reading);
    expect(score).toBeGreaterThan(70);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("GeminiService chat returns structured advisory response", async () => {
    const reply = await geminiService.chat({
      message: "Should I go for an outdoor jog this morning?",
      location: siteConfig.initialLocation,
    });

    expect(reply.reply).toBeDefined();
    expect(reply.reply.length).toBeGreaterThan(30);
    expect(reply.dataQualityIndicator).toBeGreaterThan(0);
    expect(reply.dataSource).toBeDefined();
  });

  it("GeminiService generates routine item array aligned with diurnal curve", async () => {
    const dummyReading = await airQualityService.getCurrentReading(siteConfig.initialLocation);
    const routine = await geminiService.generateRoutine(dummyReading, siteConfig.initialLocation);

    expect(Array.isArray(routine)).toBe(true);
    expect(routine.length).toBe(4);
    expect(routine[0].title).toContain("Morning");
    expect(routine[1].title).toContain("Ventilation");
  });
});

describe("Milestone 2 — Authentication & Database Architecture", () => {
  it("handles user registration safely failing closed with 503 when cloud keys are unconfigured", async () => {
    const regReq = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test.user.m2@breathewise.ai",
        password: "Password123!",
        fullName: "Test User",
      }),
    });
    const regRes = await registerHandler(regReq);
    expect(regRes.status).toBe(503);
    const regData = await regRes.json();
    expect(regData.error).toBeDefined();

    const logoutReq = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
    });
    const logoutRes = await logoutHandler(logoutReq);
    expect(logoutRes.status).toBe(200);
  });

  it("saves user location preference cleanly", async () => {
    const res = await dataService.saveUserLocation("demo-user-id", siteConfig.initialLocation);
    expect(res.success).toBe(true);
  });
});

