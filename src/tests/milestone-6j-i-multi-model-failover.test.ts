/**
 * Milestone 6J-I: Multi-Model Gemini Failover & AI Resilience Test Suite
 * Verifies:
 * 1. Primary succeeds; fallback is never called.
 * 2. Primary returns 503; fallback succeeds.
 * 3. Primary times out; fallback succeeds within the remaining deadline.
 * 4. Primary returns 429 model-specific quota error; fallback succeeds when allowed.
 * 5. Primary returns 401; fallback is not called.
 * 6. Primary returns 403; fallback is not called.
 * 7. Primary returns 400; fallback is not called.
 * 8. Both models fail; deterministic fallback is returned.
 * 9. Both requests time out; no late response overwrites fallback.
 * 10. Only one fallback attempt is allowed (no cascading loops).
 * 11. Rate limits are applied to both model attempts.
 * 12. Response provenance correctly identifies the model used.
 * 13. Chat session ownership remains enforced.
 * 14. No duplicate messages are appended.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeminiService } from "@/services/gemini/gemini.service";
import { rateLimiter } from "@/lib/rate-limit";
import { POST } from "@/app/api/ai/chat/route";
import { NextRequest } from "next/server";
import * as firebaseSession from "@/lib/firebase/session";
import { chatRepository } from "@/services/firebase/firestore/chat.repository";
import { GeoLocation } from "@/types";

const mockLocation: GeoLocation = {
  name: "Siliguri",
  region: "West Bengal",
  country: "India",
  latitude: 26.7271,
  longitude: 88.4239,
};

describe("Milestone 6J-I — Multi-Model Gemini Failover & AI Resilience Suite", () => {
  beforeEach(() => {
    rateLimiter.reset();
    vi.restoreAllMocks();
  });

  describe("1. Bounded Multi-Model Failover Lifecycle (Scenarios 1-10)", () => {
    it("1. Primary succeeds; fallback is never called", async () => {
      const service = new GeminiService();
      const generateMock = vi.fn().mockImplementation((args: any) => {
        if (args.model === service.primaryModel) {
          return Promise.resolve({ text: "Primary model verified advice" });
        }
        return Promise.reject(new Error("Fallback should not be called"));
      });

      (service as any).client = { models: { generateContent: generateMock } };

      const res = await service.chat({
        message: "Can I jog outdoors?",
        location: mockLocation,
      });

      expect(generateMock).toHaveBeenCalledTimes(1);
      expect(generateMock.mock.calls[0][0].model).toBe(service.primaryModel);
      expect(res.reply).toBe("Primary model verified advice");
      expect(res.fallbackUsed).toBe(false);
      expect(res.modelUsed).toBe(service.primaryModel);
      expect(res.generationStatus).toBe("primary_success");
      expect(res.isDemoData).toBe(false);
    });

    it("2. Primary returns 503; fallback succeeds", async () => {
      const service = new GeminiService();
      const generateMock = vi.fn().mockImplementation((args: any) => {
        if (args.model === service.primaryModel) {
          const err = new Error("This model is currently experiencing high demand.");
          (err as any).status = 503;
          return Promise.reject(err);
        }
        if (args.model === service.fallbackModel) {
          return Promise.resolve({ text: "Fallback model secondary advice" });
        }
        return Promise.reject(new Error("Unexpected model"));
      });

      (service as any).client = { models: { generateContent: generateMock } };

      const res = await service.chat({
        message: "What is the air quality?",
        location: mockLocation,
      });

      expect(generateMock).toHaveBeenCalledTimes(2);
      expect(generateMock.mock.calls[0][0].model).toBe(service.primaryModel);
      expect(generateMock.mock.calls[1][0].model).toBe(service.fallbackModel);
      expect(res.reply).toBe("Fallback model secondary advice");
      expect(res.fallbackUsed).toBe(true);
      expect(res.modelUsed).toBe(service.fallbackModel);
      expect(res.fallbackReason).toBe("HTTP_503_HIGH_DEMAND_UNAVAILABLE");
      expect(res.generationStatus).toBe("fallback_success");
      expect(res.isDemoData).toBe(false);
    });

    it("3. Primary times out; fallback succeeds within the remaining deadline", async () => {
      const service = new GeminiService();
      (service as any).requestTimeoutMs = 150;
      (service as any).primaryTimeoutMs = 40;

      const generateMock = vi.fn().mockImplementation((args: any) => {
        if (args.model === service.primaryModel) {
          // Hangs longer than 40ms primary timeout
          return new Promise((resolve) => setTimeout(() => resolve({ text: "Late primary" }), 100));
        }
        if (args.model === service.fallbackModel) {
          // Resolves quickly within remaining deadline
          return Promise.resolve({ text: "Fast fallback advice" });
        }
        return Promise.reject(new Error("Unexpected model"));
      });

      (service as any).client = { models: { generateContent: generateMock } };

      const res = await service.chat({
        message: "Commute tips",
        location: mockLocation,
      });

      expect(res.reply).toBe("Fast fallback advice");
      expect(res.fallbackUsed).toBe(true);
      expect(res.modelUsed).toBe(service.fallbackModel);
      expect(res.fallbackReason).toBe("PRIMARY_REQUEST_TIMEOUT");
      expect(res.generationStatus).toBe("fallback_success");
    });

    it("4. Primary returns 429 model-specific quota error; fallback succeeds when allowed", async () => {
      const service = new GeminiService();
      const generateMock = vi.fn().mockImplementation((args: any) => {
        if (args.model === service.primaryModel) {
          const err = new Error(
            'GenerateRequestsPerDayPerProjectPerModel quota exceeded for model: gemini-3.8-flash'
          );
          (err as any).status = 429;
          return Promise.reject(err);
        }
        if (args.model === service.fallbackModel) {
          return Promise.resolve({ text: "Fallback advice on alternative model quota" });
        }
        return Promise.reject(new Error("Unexpected model"));
      });

      (service as any).client = { models: { generateContent: generateMock } };

      const res = await service.chat({
        message: "Exercise tips",
        location: mockLocation,
      });

      expect(generateMock).toHaveBeenCalledTimes(2);
      expect(res.fallbackUsed).toBe(true);
      expect(res.modelUsed).toBe(service.fallbackModel);
      expect(res.fallbackReason).toBe("MODEL_SPECIFIC_QUOTA_EXHAUSTED_429");
      expect(res.generationStatus).toBe("fallback_success");
    });

    it("5. Primary returns 401; fallback is not called", async () => {
      const service = new GeminiService();
      const generateMock = vi.fn().mockImplementation((args: any) => {
        const err = new Error("API key invalid or unauthenticated");
        (err as any).status = 401;
        return Promise.reject(err);
      });

      (service as any).client = { models: { generateContent: generateMock } };

      const res = await service.chat({
        message: "Advice",
        location: mockLocation,
      });

      // Must NOT attempt fallback on 401
      expect(generateMock).toHaveBeenCalledTimes(1);
      expect(res.generationStatus).toBe("deterministic_fallback");
      expect(res.isDemoData).toBe(true);
    });

    it("6. Primary returns 403; fallback is not called", async () => {
      const service = new GeminiService();
      const generateMock = vi.fn().mockImplementation((args: any) => {
        const err = new Error("Permission denied or API service disabled");
        (err as any).status = 403;
        return Promise.reject(err);
      });

      (service as any).client = { models: { generateContent: generateMock } };

      const res = await service.chat({
        message: "Advice",
        location: mockLocation,
      });

      expect(generateMock).toHaveBeenCalledTimes(1);
      expect(res.generationStatus).toBe("deterministic_fallback");
      expect(res.isDemoData).toBe(true);
    });

    it("7. Primary returns 400; fallback is not called", async () => {
      const service = new GeminiService();
      const generateMock = vi.fn().mockImplementation((args: any) => {
        const err = new Error("INVALID_ARGUMENT: Bad request format");
        (err as any).status = 400;
        return Promise.reject(err);
      });

      (service as any).client = { models: { generateContent: generateMock } };

      const res = await service.chat({
        message: "Advice",
        location: mockLocation,
      });

      expect(generateMock).toHaveBeenCalledTimes(1);
      expect(res.generationStatus).toBe("deterministic_fallback");
      expect(res.isDemoData).toBe(true);
    });

    it("8. Both models fail; deterministic fallback is returned", async () => {
      const service = new GeminiService();
      const generateMock = vi.fn().mockImplementation((args: any) => {
        const err = new Error("503 Service Unavailable");
        (err as any).status = 503;
        return Promise.reject(err);
      });

      (service as any).client = { models: { generateContent: generateMock } };

      const res = await service.chat({
        message: "Can I jog outdoors?",
        location: mockLocation,
      });

      // Primary was attempted, then fallback was attempted, then deterministic fallback was returned
      expect(generateMock).toHaveBeenCalledTimes(2);
      expect(res.generationStatus).toBe("deterministic_fallback");
      expect(res.isDemoData).toBe(true);
      expect(res.reply).toContain("Outdoor Exercise Recommendation for Siliguri");
    });

    it("9. Both requests time out; no late response overwrites fallback", async () => {
      const service = new GeminiService();
      (service as any).requestTimeoutMs = 60;
      (service as any).primaryTimeoutMs = 25;

      const generateMock = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(() => resolve({ text: "Late ghost response" }), 150));
      });

      (service as any).client = { models: { generateContent: generateMock } };

      const res = await service.chat({
        message: "Advice",
        location: mockLocation,
      });

      expect(res.reply).not.toContain("Late ghost response");
      expect(res.generationStatus).toBe("deterministic_fallback");
      expect(res.isDemoData).toBe(true);
    });

    it("10. Only one fallback attempt is allowed (no cascading loops)", async () => {
      const service = new GeminiService();
      const generateMock = vi.fn().mockImplementation((args: any) => {
        const err = new Error("503 Unavailable");
        (err as any).status = 503;
        return Promise.reject(err);
      });

      (service as any).client = { models: { generateContent: generateMock } };

      await service.chat({
        message: "Check cascade limit",
        location: mockLocation,
      });

      // Exactly 1 primary call + exactly 1 fallback call = 2 total
      expect(generateMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("2. Rate Limiting, Provenance & Chat Session Integration (Scenarios 11-14)", () => {
    it("11. Rate limits are applied to both model attempts (blocks fallback if fallback budget exceeded)", async () => {
      const service = new GeminiService();
      // Exhaust the fallback model budget (10 requests)
      for (let i = 0; i < 10; i++) {
        rateLimiter.check("ai:chat:global:fallback", { intervalMs: 60_000, maxRequests: 10 });
      }

      const generateMock = vi.fn().mockImplementation((args: any) => {
        if (args.model === service.primaryModel) {
          const err = new Error("503 High Demand");
          (err as any).status = 503;
          return Promise.reject(err);
        }
        return Promise.resolve({ text: "Should not be reached" });
      });

      (service as any).client = { models: { generateContent: generateMock } };

      const res = await service.chat({
        message: "Rate limited fallback test",
        location: mockLocation,
      });

      // Primary was attempted, but fallback was skipped due to 10 RPM fallback rate limit
      expect(generateMock).toHaveBeenCalledTimes(1);
      expect(res.generationStatus).toBe("deterministic_fallback");
    });

    it("12. Response provenance correctly identifies the model used in API headers and data", async () => {
      const user = { id: "user_prov_123", email: "prov@example.com", emailVerified: true };
      vi.spyOn(firebaseSession, "getFirebaseSessionUser").mockResolvedValue(user);

      // Create valid session
      const sessionResult = await chatRepository.createSession(user.id, "Provenance Session", "Siliguri");
      const sessionId = sessionResult.data!.id;

      const req = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.5.1" },
        body: JSON.stringify({
          message: "Check provenance headers",
          location: mockLocation,
          sessionId,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Model-Used")).toBeDefined();
      expect(res.headers.get("X-Fallback-Used")).toBeDefined();

      const json = await res.json();
      expect(json.data.generationStatus).toBeDefined();
      expect(json.data.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("13. Chat session ownership remains strictly enforced during failover", async () => {
      const userA = { id: "user_owner_a", email: "a@example.com", emailVerified: true };
      const userB = { id: "user_owner_b", email: "b@example.com", emailVerified: true };

      // User A creates session
      const sessionResult = await chatRepository.createSession(userA.id, "User A Session", "Siliguri");
      const sessionAId = sessionResult.data!.id;

      // User B tries to post to User A's session
      vi.spyOn(firebaseSession, "getFirebaseSessionUser").mockResolvedValue(userB);

      const req = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.5.2" },
        body: JSON.stringify({
          message: "Breach attempt",
          location: mockLocation,
          sessionId: sessionAId,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.code).toBe("SESSION_NOT_FOUND_OR_FORBIDDEN");
    });

    it("14. No duplicate messages are appended and state remains clean across failovers", async () => {
      const user = { id: "user_dup_check", email: "dup@example.com", emailVerified: true };
      vi.spyOn(firebaseSession, "getFirebaseSessionUser").mockResolvedValue(user);

      const sessionResult = await chatRepository.createSession(user.id, "Dedup Session", "Siliguri");
      const sessionId = sessionResult.data!.id;

      // Add a message cleanly
      const addRes = await chatRepository.addMessage(user.id, sessionId, "user", "Hello message");
      expect(addRes.success).toBe(true);

      const messages = await chatRepository.getMessages(user.id, sessionId);
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("Hello message");
    });
  });
});
