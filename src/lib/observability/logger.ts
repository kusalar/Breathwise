/**
 * Production Structured Logger for BreatheWise AI
 * Ensures zero credential leakage, standard correlation IDs,
 * error classification, and latency telemetry.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type ErrorClassification =
  | "NETWORK_TIMEOUT"
  | "RATE_LIMIT"
  | "VALIDATION_FAILED"
  | "AUTH_FORBIDDEN"
  | "UPSTREAM_SERVICE_ERROR"
  | "INTERNAL_ERROR";

export interface LogPayload {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  requestId?: string;
  durationMs?: number;
  cacheHit?: boolean;
  errorCode?: ErrorClassification;
  meta?: Record<string, unknown>;
}

// Redacted key fragments (credentials, tokens, personal identifiers & medical records)
const SENSITIVE_PATTERNS = [
  /api[-_]?key/i,
  /authorization/i,
  /bearer/i,
  /password/i,
  /secret/i,
  /token/i,
  /cookie/i,
  /respiratory[-_]?sensitiv/i,
  /health[-_]?note/i,
  /medical/i,
  /diagnosis/i,
  /prescription/i,
  /inhaler/i,
  /notes$/i,
];

export function sanitizeMetadata(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input !== "object") return input;

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeMetadata(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

class Logger {
  private formatLog(
    level: LogLevel,
    component: string,
    message: string,
    options?: {
      requestId?: string;
      durationMs?: number;
      cacheHit?: boolean;
      errorCode?: ErrorClassification;
      meta?: Record<string, unknown>;
    }
  ): LogPayload {
    return {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      requestId: options?.requestId,
      durationMs: options?.durationMs,
      cacheHit: options?.cacheHit,
      errorCode: options?.errorCode,
      meta: options?.meta ? (sanitizeMetadata(options.meta) as Record<string, unknown>) : undefined,
    };
  }

  info(
    component: string,
    message: string,
    options?: {
      requestId?: string;
      durationMs?: number;
      cacheHit?: boolean;
      meta?: Record<string, unknown>;
    }
  ): LogPayload {
    const log = this.formatLog("info", component, message, options);
    console.info(JSON.stringify(log));
    return log;
  }

  warn(
    component: string,
    message: string,
    options?: {
      requestId?: string;
      durationMs?: number;
      errorCode?: ErrorClassification;
      meta?: Record<string, unknown>;
    }
  ): LogPayload {
    const log = this.formatLog("warn", component, message, options);
    console.warn(JSON.stringify(log));
    return log;
  }

  error(
    component: string,
    message: string,
    options?: {
      requestId?: string;
      durationMs?: number;
      errorCode?: ErrorClassification;
      meta?: Record<string, unknown>;
    }
  ): LogPayload {
    const log = this.formatLog("error", component, message, {
      ...options,
      errorCode: options?.errorCode || "INTERNAL_ERROR",
    });
    console.error(JSON.stringify(log));
    return log;
  }
}

export const logger = new Logger();
