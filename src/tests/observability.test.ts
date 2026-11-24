import { describe, it, expect } from "vitest";
import { logger, sanitizeMetadata, generateRequestId } from "@/lib/observability/logger";

describe("Phase 8 — Observability & Error Handling", () => {
  it("generates structured request correlation IDs with prefix", () => {
    const reqId = generateRequestId();
    expect(reqId).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/);
  });

  it("redacts sensitive fields like passwords, tokens, and API keys", () => {
    const raw = {
      username: "pioneer",
      apiKey: "AIzaSySecretKey12345",
      user_token: "jwt.secret.payload",
      nested: {
        password: "MySuperSecretPassword",
        normalField: "public-data",
      },
    };

    const sanitized = sanitizeMetadata(raw) as any;
    expect(sanitized.username).toBe("pioneer");
    expect(sanitized.apiKey).toBe("[REDACTED]");
    expect(sanitized.user_token).toBe("[REDACTED]");
    expect(sanitized.nested.password).toBe("[REDACTED]");
    expect(sanitized.nested.normalField).toBe("public-data");
  });

  it("formats structured info log with duration and cache status", () => {
    const log = logger.info("AirQualityService", "Fetched Open-Meteo cache entry", {
      requestId: "req_test_123",
      durationMs: 4.2,
      cacheHit: true,
      meta: { city: "Siliguri" },
    });

    expect(log.level).toBe("info");
    expect(log.component).toBe("AirQualityService");
    expect(log.cacheHit).toBe(true);
    expect(log.durationMs).toBe(4.2);
    expect(log.meta?.city).toBe("Siliguri");
  });

  it("formats structured error log with classified error code", () => {
    const log = logger.error("OpenMeteoClient", "Request timed out after 5000ms", {
      requestId: "req_timeout_999",
      errorCode: "NETWORK_TIMEOUT",
      durationMs: 5002,
    });

    expect(log.level).toBe("error");
    expect(log.errorCode).toBe("NETWORK_TIMEOUT");
    expect(log.component).toBe("OpenMeteoClient");
  });
});
