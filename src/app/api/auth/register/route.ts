import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth } from "@/lib/firebase/admin";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import { setFirebaseSessionCookie, validateCsrfProtection } from "@/lib/firebase/session";
import { initializeFirebaseUserProfile } from "@/lib/firebase/user-profile";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { parseSafeJson, formatSafe500Response } from "@/lib/api-security";

const RegisterSchema = z.object({
  idToken: z.string().optional(),
  email: z.string().email("Valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  fullName: z.string().optional(),
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

  // Rate limit: 10 registration attempts per minute per IP to prevent spam accounts
  const clientIp = getClientIp(request.headers);
  const rateLimitStatus = rateLimiter.check(`auth:register:${clientIp}`, {
    intervalMs: 60_000,
    maxRequests: 10,
  });

  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        error: `Too many registration attempts. Please wait ${rateLimitStatus.resetSeconds} seconds before retrying.`,
        code: "RATE_LIMIT_EXCEEDED",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitStatus.resetSeconds),
        },
      }
    );
  }

  const parsedBody = await parseSafeJson<unknown>(request, 32 * 1024);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const parsed = RegisterSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten(), requestId: parsedBody.requestId },
        { status: 400 }
      );
    }

    const { idToken, email, password, fullName } = parsed.data;

    // Fast-path: Client authenticated via Firebase Web SDK and supplies ID token
    if (idToken) {
      const result = await firebaseAuthService.createSessionFromIdToken(idToken);
      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error, code: result.code, requestId: parsedBody.requestId },
          { status: 400 }
        );
      }

      const response = NextResponse.json(
        { success: true, user: result.data.user, profile: result.data.profile, requestId: parsedBody.requestId },
        { status: 201 }
      );

      setFirebaseSessionCookie(response, result.data.sessionCookie, result.data.expiresInMs);
      return response;
    }

    // Server-side registration via Firebase Admin SDK
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json(
        { error: "Firebase Admin is not configured", code: "ADMIN_NOT_CONFIGURED", requestId: parsedBody.requestId },
        { status: 503 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password is required for server registration", code: "PASSWORD_REQUIRED", requestId: parsedBody.requestId },
        { status: 400 }
      );
    }

    try {
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: fullName,
        emailVerified: false,
      });

      // Idempotently initialize user profile in Cloud Firestore
      await initializeFirebaseUserProfile(userRecord.uid, {
        email: userRecord.email,
        displayName: userRecord.displayName || fullName,
        emailVerified: false,
      });

      return NextResponse.json(
        {
          success: true,
          user: {
            id: userRecord.uid,
            email: userRecord.email || email,
            fullName: userRecord.displayName || fullName,
            emailVerified: false,
          },
          requestId: parsedBody.requestId,
        },
        { status: 201 }
      );
    } catch (createErr: any) {
      if (createErr.code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "An account with this email already exists", code: "EMAIL_EXISTS", requestId: parsedBody.requestId },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: createErr.message || "Registration failed", code: "REGISTRATION_FAILED", requestId: parsedBody.requestId },
        { status: 400 }
      );
    }
  } catch (error) {
    return formatSafe500Response(error, "AuthRegisterRoute", parsedBody.requestId);
  }
}
