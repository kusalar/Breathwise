/**
 * Milestone 6J-G: Targeted AI Reliability Remediation Test Suite
 * Validates:
 * 1. Gemini Request Cancellation, Timeout & Late Response Discard
 * 2. Environmental Baseline Transparency (Explicit Labeling of AQI 142)
 * 3. Dual-Layer Rate Limiting (Per-IP Abuse + Global Provider Budget)
 * 4. Session Ownership & Authentication Verification on Chat Route
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { geminiService, GeminiService } from "@/services/gemini/gemini.service";
import { rateLimiter } from "@/lib/rate-limit";
import { POST } from "@/app/api/ai/chat/route";
import { NextRequest } from "next/server";
import { GeoLocation, AirQualityReading } from "@/types";

const mockLocation: GeoLocation = {
  name: "Siliguri",
  region: "West Bengal",
  country: "India",
  latitude: 26.7271,
  longitude: 88.4239,
};

describe("Milestone 6J-G — Targeted AI Reliability Remediation Suite", () => {
  beforeEach(() => {
    rateLimiter.reset();
    vi.restoreAllMocks();
  });

  describe("1. Gemini Request Cancellation, Timeout & Late-Response Discard", () => {
    it("safely activates contextual fallback and discards late response when Gemini request times out", async () => {
      const customService = new GeminiService();
      
      // Simulate configured client whose generateContent hangs longer than timeout
      let abortSignalReceived: AbortSignal | undefined;
      (customService as any).client = {
        models: {
          generateContent: vi.fn().mockImplementation((args: any) => {
            abortSignalReceived = args.config?.abortSignal;
            return new Promise((resolve) => {
              // Simulating a late response resolving after 100ms (we simulate shortened timeout)
              setTimeout(() => {
                resolve({ text: "Late response that should be discarded" });
              }, 100);
            });
          }),
        },
      };

      // Set request timeout to 15ms for test
      (customService as any).requestTimeoutMs = 15;
      (customService as any).primaryTimeoutMs = 10;

      const result = await customService.chat({
        message: "What is the air quality advice?",
        location: mockLocation,
      });

      // Must have passed abortSignal to the SDK
      expect(abortSignalReceived).toBeDefined();
      expect(abortSignalReceived?.aborted).toBe(true);

      // Result must be the contextual fallback, NOT the late response
      expect(result.reply).not.toContain("Late response that should be discarded");
      expect(result.isDemoData).toBe(true);
      expect(result.dataSource).toContain("BreatheWise Regional Baseline Model");
    });

    it("verifies generateAirQualityInsight passes AbortSignal and falls back on timeout", async () => {
      const customService = new GeminiService();
      let abortSignalReceived: AbortSignal | undefined;

      (customService as any).client = {
        models: {
          generateContent: vi.fn().mockImplementation((args: any) => {
            abortSignalReceived = args.config?.abortSignal;
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({ text: JSON.stringify({ headline: "Late Insight" }) });
              }, 80);
            });
          }),
        },
      };
      (customService as any).requestTimeoutMs = 15;
      (customService as any).primaryTimeoutMs = 10;

      const mockReading: AirQualityReading = {
        location: mockLocation,
        timestamp: new Date().toISOString(),
        aqi: 142,
        category: "moderate",
        dominantPollutant: "PM2.5",
        pollutants: { pm25: 55, pm10: 100, no2: 20, so2: 10, co: 1, o3: 30 },
        usAqi: 140,
        europeanAqi: 45,
        standardUsed: "CPCB_INDICATIVE",
        dataQuality: { completeness: 100, freshnessSeconds: 100, isRealTime: true, missingParameters: [], confidenceText: "High" },
        officialStationStatus: { available: true, message: "OK" },
        isDemoData: false,
        sourceAttribution: "Open-Meteo",
      };

      const insight = await customService.generateAirQualityInsight(mockReading, mockLocation);
      expect(abortSignalReceived).toBeDefined();
      expect(abortSignalReceived?.aborted).toBe(true);
      expect(insight.headline).not.toBe("Late Insight");
      expect(insight.id).toContain("fallback-insight");
    });
  });

  describe("2. Environmental Baseline Transparency (AQI 142)", () => {
    it("explicitly labels fallback response as illustrative regional baseline when live telemetry is missing", async () => {
      const response = await geminiService.chat({
        message: "Can I go jogging this morning?",
        location: mockLocation,
        // reading is omitted intentionally
      });

      // Must explicitly contain transparency banner
      expect(response.reply).toContain("Live physical atmospheric telemetry for Siliguri is currently unavailable");
      expect(response.reply).toContain("Displaying regional illustrative baseline [AQI 142 — MODERATE]");
      expect(response.reply).toContain("Illustrative Non-Live Model");

      // Metadata must clearly attribute illustrative status
      expect(response.isDemoData).toBe(true);
      expect(response.dataSource).toBe("BreatheWise Regional Baseline Model (Illustrative Demo Guidance)");
      expect(response.uncertaintyNotes).toContain("illustrative regional baseline (AQI 142 Moderate)");
    });

    it("explicitly labels fallback response as illustrative baseline when isDemoData is true", async () => {
      const demoReading: AirQualityReading = {
        location: mockLocation,
        timestamp: new Date().toISOString(),
        aqi: 142,
        category: "moderate",
        dominantPollutant: "PM2.5",
        pollutants: { pm25: 58.2, pm10: 112.6, no2: 34.5, so2: 12.8, co: 1.4, o3: 42.1 },
        usAqi: 138,
        europeanAqi: 42,
        standardUsed: "CPCB_INDICATIVE",
        dataQuality: { completeness: 100, freshnessSeconds: 0, isRealTime: false, missingParameters: [], confidenceText: "Fallback Active" },
        officialStationStatus: { available: false, message: "Offline" },
        isDemoData: true,
        sourceAttribution: "BreatheWise Fallback Engine — DEMO DATA",
      };

      const response = await geminiService.chat({
        message: "What is the general situation in the city?",
        location: mockLocation,
        reading: demoReading,
      });

      expect(response.reply).toContain("Notice: Live physical atmospheric telemetry for Siliguri is currently unavailable");
      expect(response.reply).toContain("regional illustrative baseline is **AQI 142** (MODERATE — Illustrative Baseline)");
      expect(response.isDemoData).toBe(true);
    });

    it("does NOT label reading as illustrative when verified live telemetry is provided", async () => {
      const liveReading: AirQualityReading = {
        location: mockLocation,
        timestamp: new Date().toISOString(),
        aqi: 165,
        category: "moderate",
        dominantPollutant: "PM2.5",
        pollutants: { pm25: 75, pm10: 130, no2: 40, so2: 15, co: 1.8, o3: 45 },
        usAqi: 160,
        europeanAqi: 50,
        standardUsed: "CPCB_INDICATIVE",
        dataQuality: { completeness: 100, freshnessSeconds: 300, isRealTime: true, missingParameters: [], confidenceText: "High" },
        officialStationStatus: { available: true, message: "Live" },
        isDemoData: false,
        sourceAttribution: "Open-Meteo Satellite Atmospheric Telemetry",
      };

      const response = await geminiService.chat({
        message: "Can I jog outdoors?",
        location: mockLocation,
        reading: liveReading,
      });

      // When live telemetry is provided, the illustrative baseline banner should NOT be present
      expect(response.reply).not.toContain("Live physical atmospheric telemetry for Siliguri is currently unavailable");
      expect(response.reply).toContain("Current Live AQI: 165 — MODERATE");
    });
  });

  describe("3. Dual-Layer Rate Limiting on POST /api/ai/chat", () => {
    it("Layer 1: Enforces per-IP abuse limit (Max 5 req/min per IP)", async () => {
      const ip = "192.168.1.100";
      const makeRequest = () =>
        new NextRequest("http://localhost:3000/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": ip,
          },
          body: JSON.stringify({
            message: "What is the air quality?",
            location: mockLocation,
          }),
        });

      // First 5 requests must succeed (200 OK)
      for (let i = 1; i <= 5; i++) {
        const res = await POST(makeRequest());
        expect(res.status).toBe(200);
        expect(res.headers.get("X-RateLimit-Limit-IP")).toBe("5");
        expect(res.headers.get("X-RateLimit-Remaining-IP")).toBe(String(5 - i));
      }

      // 6th request from the same IP must be blocked with HTTP 429
      const blockedRes = await POST(makeRequest());
      expect(blockedRes.status).toBe(429);
      const json = await blockedRes.json();
      expect(json.code).toBe("CLIENT_RATE_LIMIT_EXCEEDED");
      expect(json.layer).toBe("client_ip");
      expect(blockedRes.headers.get("Retry-After")).toBeDefined();
    });

    it("Layer 2: Enforces provider-aware global project budget (Max 12 req/min across all IPs)", async () => {
      rateLimiter.reset();

      // Send 1 request each from 12 distinct client IPs (Layer 1 per-IP limit of 5 is never breached)
      for (let i = 1; i <= 12; i++) {
        const req = new NextRequest("http://localhost:3000/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": `10.0.0.${i}`,
          },
          body: JSON.stringify({
            message: "Air quality query",
            location: mockLocation,
          }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("X-RateLimit-Limit-Global")).toBe("12");
      }

      // 13th request from a brand new IP (10.0.0.99) must be blocked by Layer 2 Global Budget
      const req13 = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.99",
        },
        body: JSON.stringify({
          message: "Air quality query",
          location: mockLocation,
        }),
      });

      const res13 = await POST(req13);
      expect(res13.status).toBe(429);
      const json13 = await res13.json();
      expect(json13.code).toBe("PROVIDER_BUDGET_EXCEEDED");
      expect(json13.layer).toBe("global_provider_budget");
      expect(json13.error).toContain("Global AI provider capacity reached");
      expect(res13.headers.get("Retry-After")).toBeDefined();
    });
  });

  describe("4. Chat Session Ownership & Authentication Verification", () => {
    it("rejects chat request with sessionId if user is not authenticated with valid session cookie", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "172.16.0.5",
        },
        body: JSON.stringify({
          message: "Save this advice to my session",
          location: mockLocation,
          sessionId: "unauthorized-session-id-999",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHORIZED_SESSION_ACCESS");
      expect(json.error).toContain("Authentication required");
    });
  });
});
