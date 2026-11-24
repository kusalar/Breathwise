/**
 * Production API Security & Error Sanitization Helpers
 * Enforces payload size limits, safe JSON decoding, and zero internal error leakage.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger, generateRequestId } from "./observability/logger";

const MAX_JSON_PAYLOAD_BYTES = 256 * 1024; // 256 KB max for normal API requests

export interface SafeJsonResult<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface SafeJsonError {
  success: false;
  response: NextResponse;
  requestId: string;
}

export async function parseSafeJson<T>(
  request: NextRequest,
  maxBytes: number = MAX_JSON_PAYLOAD_BYTES
): Promise<SafeJsonResult<T> | SafeJsonError> {
  const requestId = generateRequestId();
  const contentLength = request.headers.get("content-length");

  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    logger.warn("ApiSecurity", "Payload too large", {
      requestId,
      errorCode: "VALIDATION_FAILED",
      meta: { contentLength, maxBytes },
    });

    return {
      success: false,
      requestId,
      response: NextResponse.json(
        {
          error: "Payload too large. Maximum allowed size is 256KB.",
          code: "PAYLOAD_TOO_LARGE",
          requestId,
        },
        { status: 413 }
      ),
    };
  }

  try {
    const data = await request.json();
    return { success: true, data: data as T, requestId };
  } catch (err) {
    logger.warn("ApiSecurity", "Malformed JSON payload received", {
      requestId,
      errorCode: "VALIDATION_FAILED",
      meta: { error: err instanceof Error ? err.message : String(err) },
    });

    return {
      success: false,
      requestId,
      response: NextResponse.json(
        {
          error: "Malformed JSON request body.",
          code: "MALFORMED_JSON",
          requestId,
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Formats a production-safe 500 internal server error.
 * Ensures stack traces, SQL errors, and secrets are NEVER exposed to clients.
 */
export function formatSafe500Response(
  error: unknown,
  component: string,
  requestId: string = generateRequestId()
): NextResponse {
  logger.error(component, "Unhandled server error", {
    requestId,
    errorCode: "INTERNAL_ERROR",
    meta: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
  });

  const isProduction = process.env.NODE_ENV === "production";

  return NextResponse.json(
    {
      error: isProduction
        ? "An internal server error occurred. Please try again later."
        : error instanceof Error
        ? error.message
        : "Internal Server Error",
      code: "INTERNAL_SERVER_ERROR",
      requestId,
    },
    { status: 500 }
  );
}
