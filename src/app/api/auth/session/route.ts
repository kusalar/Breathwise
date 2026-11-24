import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import {
  setFirebaseSessionCookie,
  clearFirebaseSessionCookie,
  validateCsrfProtection,
} from "@/lib/firebase/session";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { parseSafeJson, formatSafe500Response } from "@/lib/api-security";

const SessionCreateSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
  expiresInMs: z.number().int().positive().optional(),
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

  // Rate limit: 20 session exchanges per minute per IP
  const clientIp = getClientIp(request.headers);
  const rateLimitStatus = rateLimiter.check(`auth:session:${clientIp}`, {
    intervalMs: 60_000,
    maxRequests: 20,
  });

  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        error: `Too many session requests. Retry in ${rateLimitStatus.resetSeconds}s.`,
        code: "RATE_LIMIT_EXCEEDED",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitStatus.resetSeconds) },
      }
    );
  }

  const parsedBody = await parseSafeJson<unknown>(request, 32 * 1024);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const parsed = SessionCreateSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten(), requestId: parsedBody.requestId },
        { status: 400 }
      );
    }

    const result = await firebaseAuthService.createSessionFromIdToken(
      parsed.data.idToken,
      parsed.data.expiresInMs
    );

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error, code: result.code || "INVALID_TOKEN", requestId: parsedBody.requestId },
        { status: 401 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        user: result.data.user,
        profile: result.data.profile,
        requestId: parsedBody.requestId,
      },
      { status: 200 }
    );

    // Attach secure HttpOnly session cookie
    setFirebaseSessionCookie(
      response,
      result.data.sessionCookie,
      result.data.expiresInMs
    );

    return response;
  } catch (error) {
    return formatSafe500Response(error, "AuthSessionRoute", parsedBody.requestId);
  }
}

export async function GET(request: NextRequest) {
  const user = await firebaseAuthService.getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthenticated", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user,
    },
    { status: 200 }
  );
}

export async function DELETE(request: NextRequest) {
  // CSRF validation
  const csrf = validateCsrfProtection(request);
  if (!csrf.valid) {
    return NextResponse.json(
      { error: "Forbidden: CSRF check failed", reason: csrf.reason },
      { status: 403 }
    );
  }

  try {
    const user = await firebaseAuthService.getUserFromRequest(request);
    if (user) {
      await firebaseAuthService.revokeSessions(user.id);
    }

    const response = NextResponse.json(
      { success: true, message: "Session revoked successfully" },
      { status: 200 }
    );

    clearFirebaseSessionCookie(response);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { success: true, message: "Session ended" },
      { status: 200 }
    );
    clearFirebaseSessionCookie(response);
    return response;
  }
}
