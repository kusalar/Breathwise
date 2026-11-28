import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { isDemoAuthDisabled, getSessionUser } from "@/lib/auth/server-auth";
import { EnvironmentalCache } from "@/lib/cache/environmental-cache";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { enforceRateLimit, formatSafe500Response } from "@/lib/api-security";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { householdRepository } from "@/services/firebase/firestore/household.repository";
import { airQualityService } from "@/services/air-quality/air-quality.service";
import { weatherService } from "@/services/weather/weather.service";
import { geminiService } from "@/services/gemini/gemini.service";
import { buildOpenMeteoAirQualityFixture, buildOpenMeteoWeatherFixture } from "./fixtures/open-meteo";

describe("Security, Bounded Storage, and Server Telemetry Hardening", () => {
  beforeEach(() => {
    rateLimiter.reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    rateLimiter.reset();
  });

  describe("Fail-closed auth & Firestore production guards", () => {
    it("disables demo fallback authentication when NODE_ENV=production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(isDemoAuthDisabled()).toBe(true);

      const req = new NextRequest("https://breathewise-ai-cyan.vercel.app/api/user/household", {
        headers: { "x-user-id": "user-123" },
      });
      const user = await getSessionUser(req);
      expect(user).toBeNull();
    });

    it("disables demo fallback authentication when NEXT_PUBLIC_APP_ENV=production", () => {
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");
      expect(isDemoAuthDisabled()).toBe(true);
    });

    it("rejects malformed x-user-id headers even in non-production", async () => {
      vi.stubEnv("NODE_ENV", "test");
      const req = new NextRequest("http://localhost:3000/api/user/household", {
        headers: { "x-user-id": "../admin/override" },
      });
      const user = await getSessionUser(req);
      expect(user?.id).toBe("demo-user-id");
    });

    it("refuses in-memory Firestore mock fallback when NODE_ENV=production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      await expect(householdRepository.getMembers("prod-uid")).rejects.toThrow(
        /Firestore Admin is not configured/i
      );
    });
  });

  describe("Bounded cache & rate limiter protection", () => {
    it("evicts oldest entries once EnvironmentalCache exceeds maxEntries", async () => {
      const cache = new EnvironmentalCache(2);
      await cache.getOrFetch("k1", 60, async () => "v1");
      await cache.getOrFetch("k2", 60, async () => "v2");
      await cache.getOrFetch("k3", 60, async () => "v3");

      let fetchedK1Again = false;
      const v1 = await cache.getOrFetch("k1", 60, async () => {
        fetchedK1Again = true;
        return "v1-refetched";
      });
      expect(fetchedK1Again).toBe(true);
      expect(v1).toBe("v1-refetched");
    });

    it("supports shorter TTL functions for demo/fallback cache entries", async () => {
      vi.useFakeTimers();
      try {
        const cache = new EnvironmentalCache(10);
        let calls = 0;
        await cache.getOrFetch(
          "fallback-key",
          (val) => (val.isDemo ? 1 : 60),
          async () => {
            calls += 1;
            return { isDemo: true };
          }
        );
        vi.advanceTimersByTime(1500);
        await cache.getOrFetch(
          "fallback-key",
          (val) => (val.isDemo ? 1 : 60),
          async () => {
            calls += 1;
            return { isDemo: false };
          }
        );
        expect(calls).toBe(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it("prefers trusted platform edge headers over spoofable x-forwarded-for", () => {
      const headers = new Headers({
        "x-forwarded-for": "198.51.100.99",
        "x-vercel-forwarded-for": "203.0.113.10",
      });
      expect(getClientIp(headers)).toBe("203.0.113.10");

      const cfHeaders = new Headers({
        "x-forwarded-for": "198.51.100.99",
        "cf-connecting-ip": "203.0.113.42",
      });
      expect(getClientIp(cfHeaders)).toBe("203.0.113.42");
    });

    it("caps tracked rate-limit keys and returns Retry-After 429 when limit exceeded", async () => {
      for (let i = 0; i < 10_002; i++) {
        rateLimiter.check(`flood-${i}`, { intervalMs: 60_000, maxRequests: 1 });
      }
      // flood-0 should have been evicted after exceeding MAX_TRACKED_KEYS (10,000)
      const recycled = rateLimiter.check("flood-0", { intervalMs: 60_000, maxRequests: 1 });
      expect(recycled.allowed).toBe(true);

      const req = new NextRequest("http://localhost:3000/api/routines", {
        headers: { "x-vercel-forwarded-for": "203.0.113.55" },
      });
      expect(enforceRateLimit(req, "test-scope", { intervalMs: 60_000, maxRequests: 1 })).toBeNull();
      const blocked = enforceRateLimit(req, "test-scope", { intervalMs: 60_000, maxRequests: 1 });
      expect(blocked?.status).toBe(429);
      expect(blocked?.headers.get("Retry-After")).toBe("60");
    });
  });

  describe("Error sanitization, CSP builder, and server-side chat telemetry", () => {
    it("redacts internal error messages in formatSafe500Response when NODE_ENV=production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const res = formatSafe500Response(
        new Error("ECONNREFUSED secret-internal-host:5432"),
        "TestRoute",
        "req-123"
      );
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("An internal server error occurred. Please try again later.");
      expect(body.error).not.toContain("secret-internal-host");
      expect(body.requestId).toBe("req-123");
    });

    it("generates nonce-strict CSP without unsafe-inline or production unsafe-eval", () => {
      const prodCsp = buildContentSecurityPolicy("abc123nonce", false);
      expect(prodCsp).toContain("'nonce-abc123nonce'");
      expect(prodCsp).not.toContain("'unsafe-inline'");
      expect(prodCsp).not.toContain("'unsafe-eval'");
      expect(prodCsp).toContain("frame-ancestors 'none'");

      const devCsp = buildContentSecurityPolicy("abc123nonce", true);
      expect(devCsp).toContain("'unsafe-eval'");
    });

    it("POST /api/ai/chat fetches environmental telemetry server-side instead of trusting client reading", async () => {
      const aqiSpy = vi
        .spyOn(airQualityService, "getCurrentReading")
        .mockResolvedValue({
          location: { name: "Siliguri", region: "West Bengal", country: "India", latitude: 26.72, longitude: 88.39 },
          aqi: 92,
          category: "satisfactory",
          dominantPollutant: "PM2.5",
          pollutants: { pm25: 55, pm10: 95, no2: 24, so2: 10, co: 0.7, o3: 40 },
          standardUsed: "CPCB_INDICATIVE",
          sourceAttribution: "Open-Meteo Air Quality API",
          timestamp: new Date().toISOString(),
          isDemoData: false,
        });
      const weatherSpy = vi
        .spyOn(weatherService, "getCurrentWeather")
        .mockResolvedValue({
          temperatureC: 25,
          humidityPercent: 60,
          windSpeedKmh: 8,
          windDirectionDegrees: 145,
          uvIndex: 4,
          conditionText: "Clear sky",
          isDemoData: false,
        });
      const chatSpy = vi.spyOn(geminiService, "chat").mockResolvedValue({
        reply: "Air quality in Siliguri is satisfactory (AQI 92).",
        dataQualityIndicator: 90,
        dataSource: "Open-Meteo",
        fallbackUsed: false,
        modelUsed: "gemini-2.5-flash",
        generationStatus: "primary_success",
        timestamp: new Date().toISOString(),
        isDemoData: false,
      });

      const { POST } = await import("@/app/api/ai/chat/route");
      const req = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-vercel-forwarded-for": "198.51.100.25",
        },
        body: JSON.stringify({
          message: "Can I jog outdoors?",
          location: { name: "Siliguri", region: "West Bengal", country: "India", latitude: 26.72, longitude: 88.39 },
          reading: { aqi: 999, category: "severe", dominantPollutant: "POISON" },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(aqiSpy).toHaveBeenCalledTimes(1);
      expect(weatherSpy).toHaveBeenCalledTimes(1);
      expect(chatSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reading: expect.objectContaining({ aqi: 92 }),
        })
      );

      // Smoke-check fixture shapes match Open-Meteo validation expectations
      expect(buildOpenMeteoAirQualityFixture().hourly.pm2_5?.length).toBe(48);
      expect(buildOpenMeteoWeatherFixture().current?.temperature_2m).toBe(26.4);
    });
  });
});
