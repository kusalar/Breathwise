import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import { validateCsrfProtection } from "@/lib/firebase/session";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { parseSafeJson, formatSafe500Response } from "@/lib/api-security";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Valid email required"),
});

export async function POST(request: NextRequest) {
  // CSRF validation
  const csrf = validateCsrfProtection(request);
  if (!csrf.valid) {
    return NextResponse.json(
      { error: "Forbidden: CSRF check failed", reason: csrf.reason },
      { status: 403 }
    );
  }

  // Rate limit: 5 password reset requests per minute per IP
  const clientIp = getClientIp(request.headers);
  const rateLimitStatus = rateLimiter.check(`auth:firebase:forgot-password:${clientIp}`, {
    intervalMs: 60_000,
    maxRequests: 5,
  });

  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        error: `Too many password reset attempts. Retry in ${rateLimitStatus.resetSeconds}s.`,
        code: "RATE_LIMIT_EXCEEDED",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitStatus.resetSeconds) },
      }
    );
  }

  const parsedBody = await parseSafeJson<unknown>(request, 16 * 1024);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const parsed = ForgotPasswordSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten(), requestId: parsedBody.requestId },
        { status: 400 }
      );
    }

    await firebaseAuthService.generatePasswordResetLink(parsed.data.email);

    // Generic response to prevent account enumeration
    return NextResponse.json(
      {
        success: true,
        message: "If an account associated with this email exists, a password reset email has been dispatched.",
        requestId: parsedBody.requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    return formatSafe500Response(error, "FirebaseAuthForgotPasswordRoute", parsedBody.requestId);
  }
}
