import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth } from "@/lib/firebase/admin";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import { setFirebaseSessionCookie, validateCsrfProtection } from "@/lib/firebase/session";
import { initializeFirebaseUserProfile } from "@/lib/firebase/user-profile";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { parseSafeJson, formatSafe500Response } from "@/lib/api-security";

const LoginSchema = z
  .object({
    idToken: z.string().optional(),
    email: z.string().email("Valid email required").optional(),
    password: z.string().min(1, "Password is required").optional(),
  })
  .refine((data) => data.idToken || (data.email && data.password), {
    message: "Either idToken or email and password must be provided",
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

  // Rate limit: 10 login attempts per minute per IP to mitigate brute force
  const clientIp = getClientIp(request.headers);
  const rateLimitStatus = rateLimiter.check(`auth:login:${clientIp}`, {
    intervalMs: 60_000,
    maxRequests: 10,
  });

  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        error: `Too many login attempts. Please wait ${rateLimitStatus.resetSeconds} seconds before retrying.`,
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
    const parsed = LoginSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten(), requestId: parsedBody.requestId },
        { status: 400 }
      );
    }

    const { idToken, email, password } = parsed.data;

    // Fast-path: Token exchange via Firebase ID Token
    if (idToken) {
      const result = await firebaseAuthService.createSessionFromIdToken(idToken);
      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error, code: result.code || "INVALID_TOKEN", requestId: parsedBody.requestId },
          { status: 401 }
        );
      }

      const response = NextResponse.json(
        { success: true, user: result.data.user, profile: result.data.profile, requestId: parsedBody.requestId },
        { status: 200 }
      );

      setFirebaseSessionCookie(response, result.data.sessionCookie, result.data.expiresInMs);
      return response;
    }

    // Direct email/password authentication via Identity Toolkit & session cookie minting
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Invalid email or password", code: "AUTH_FAILED", requestId: parsedBody.requestId },
        { status: 401 }
      );
    }

    try {
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      const signInData = await signInRes.json();
      if (!signInRes.ok || !signInData.idToken) {
        return NextResponse.json(
          { error: "Invalid email or password", code: "AUTH_FAILED", requestId: parsedBody.requestId },
          { status: 401 }
        );
      }

      const result = await firebaseAuthService.createSessionFromIdToken(signInData.idToken);
      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error, code: result.code || "SESSION_CREATION_FAILED", requestId: parsedBody.requestId },
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

      setFirebaseSessionCookie(response, result.data.sessionCookie, result.data.expiresInMs);
      return response;
    } catch {
      return NextResponse.json(
        { error: "Invalid email or password", code: "AUTH_FAILED", requestId: parsedBody.requestId },
        { status: 401 }
      );
    }
  } catch (error) {
    return formatSafe500Response(error, "AuthLoginRoute", parsedBody.requestId);
  }
}
