import { describe, it, expect, beforeEach } from "vitest";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { parseSafeJson, formatSafe500Response } from "@/lib/api-security";
import { sanitizeMetadata } from "@/lib/observability/logger";
import { dataService } from "@/services/data-provider";
import { BaseFirestoreRepository } from "@/services/firebase/firestore";
import { NextRequest } from "next/server";

describe("Phase 2 & Phase 5 — API Security Hardening & Privacy Verification", () => {
  beforeEach(() => {
    rateLimiter.reset();
    BaseFirestoreRepository.resetMockStore();
  });

  describe("Sliding Window Rate Limiter", () => {
    it("allows requests up to the configured limit and blocks excess requests", () => {
      const key = "test-client-ip";
      const config = { intervalMs: 10_000, maxRequests: 3 };

      // 1st request -> allowed
      const r1 = rateLimiter.check(key, config);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      // 2nd request -> allowed
      const r2 = rateLimiter.check(key, config);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      // 3rd request -> allowed
      const r3 = rateLimiter.check(key, config);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request -> blocked (rate limit exceeded)
      const r4 = rateLimiter.check(key, config);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.resetSeconds).toBeGreaterThan(0);
    });

    it("extracts client IP from x-forwarded-for or x-real-ip headers accurately", () => {
      const headersWithForwarded = new Headers({
        "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
      });
      expect(getClientIp(headersWithForwarded)).toBe("203.0.113.195");

      const headersWithRealIp = new Headers({
        "x-real-ip": "198.51.100.22",
      });
      expect(getClientIp(headersWithRealIp)).toBe("198.51.100.22");

      const emptyHeaders = new Headers();
      expect(getClientIp(emptyHeaders)).toBe("127.0.0.1");
    });
  });

  describe("API Payload Size & Malformed Request Protection", () => {
    it("safely accepts normal sized JSON requests", async () => {
      const payload = { message: "What is the PM2.5 level?", city: "Siliguri" };
      const req = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(JSON.stringify(payload).length),
        },
        body: JSON.stringify(payload),
      });

      const parsed = await parseSafeJson<typeof payload>(req, 1024);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.city).toBe("Siliguri");
        expect(parsed.requestId).toMatch(/^req_/);
      }
    });

    it("rejects oversized request payloads with HTTP 413 Payload Too Large", async () => {
      const hugeData = "A".repeat(2048);
      const req = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "2048",
        },
        body: JSON.stringify({ hugeData }),
      });

      // Max allowed 1024 bytes
      const parsed = await parseSafeJson(req, 1024);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.response.status).toBe(413);
      }
    });

    it("handles malformed JSON payloads gracefully with HTTP 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "15",
        },
        body: "{ malformed json",
      });

      const parsed = await parseSafeJson(req, 1024);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.response.status).toBe(400);
      }
    });
  });

  describe("Production Error Sanitization (Zero Stack Trace Leakage)", () => {
    it("sanitizes 500 responses in production to prevent leaking SQL errors or internal paths", async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = "production";
        const sensitiveError = new Error("FATAL: Database connection to pgsql://admin:secretPass@10.0.0.1 failed");

        const response = formatSafe500Response(sensitiveError, "TestComponent", "req_test_abc");
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.code).toBe("INTERNAL_SERVER_ERROR");
        expect(json.requestId).toBe("req_test_abc");
        // Must NEVER leak the internal password or connection string
        expect(json.error).not.toContain("secretPass");
        expect(json.error).not.toContain("pgsql://");
        expect(json.error).toContain("An internal server error occurred");
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });
  });

  describe("Personal Health & Medical Data Scrubbing in Observability Logger", () => {
    it("automatically scrubs sensitive medical and dependent health fields from log metadata", () => {
      const rawMetadata = {
        userId: "usr-12345",
        dependentName: "Aarav",
        respiratorySensitivity: true,
        healthNotes: "Severe asthma, uses budesonide inhaler daily",
        medicalDiagnosis: "Chronic Bronchitis",
        inhalerType: "Salbutamol",
        normalCity: "Siliguri",
      };

      const sanitized = sanitizeMetadata(rawMetadata) as any;

      expect(sanitized.userId).toBe("usr-12345");
      expect(sanitized.normalCity).toBe("Siliguri");
      // Medical and sensitivity fields MUST be redacted
      expect(sanitized.respiratorySensitivity).toBe("[REDACTED]");
      expect(sanitized.healthNotes).toBe("[REDACTED]");
      expect(sanitized.medicalDiagnosis).toBe("[REDACTED]");
      expect(sanitized.inhalerType).toBe("[REDACTED]");
    });
  });

  describe("Household Data Purge (User Privacy & Right to Be Forgotten)", () => {
    it("allows a user to purge all their household member data in a single workflow", async () => {
      const USER_1 = "usr-purge-1";
      const USER_2 = "usr-purge-2";

      // Add members for User 1
      await dataService.addHouseholdMember(USER_1, {
        name: "Child Aarav",
        relation: "child",
        ageYears: 6,
        vulnerabilityLevel: "high",
        respiratorySensitivity: true,
      });
      await dataService.addHouseholdMember(USER_1, {
        name: "Grandmother",
        relation: "elderly",
        ageYears: 75,
        vulnerabilityLevel: "critical",
        respiratorySensitivity: false,
      });

      // Add member for User 2 (to verify isolation)
      await dataService.addHouseholdMember(USER_2, {
        name: "User 2 Partner",
        relation: "partner",
        vulnerabilityLevel: "standard",
        respiratorySensitivity: false,
      });

      expect((await dataService.getHouseholdMembers(USER_1)).length).toBe(2);
      expect((await dataService.getHouseholdMembers(USER_2)).length).toBe(1);

      // User 1 executes full privacy purge via cascade deletion
      const purgeResult = await dataService.deleteUserAccountCascade(USER_1, USER_1);
      expect(purgeResult.success).toBe(true);

      // User 1 records are now empty
      expect((await dataService.getHouseholdMembers(USER_1)).length).toBe(0);

      // User 2 records remain intact
      expect((await dataService.getHouseholdMembers(USER_2)).length).toBe(1);
    });
  });
});
