import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuth } from "@/lib/firebase/admin";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import { initializeFirebaseUserProfile } from "@/lib/firebase/user-profile";
import {
  setFirebaseSessionCookie,
  clearFirebaseSessionCookie,
  validateCsrfProtection,
} from "@/lib/firebase/session";
import { enforceRateLimit, parseSafeJson, formatSafe500Response } from "@/lib/api-security";
import type { RateLimitConfig } from "@/lib/rate-limit";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Valid email required"),
});

const SessionCreateSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
  expiresInMs: z.number().int().positive().optional(),
});

const RegisterSchema = z.object({
  idToken: z.string().optional(),
  email: z.string().email("Valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  fullName: z.string().optional(),
});

/**
 * Verifies CSRF protection and returns a sanitized 403 response on failure.
 */
export function guardCsrf(request: NextRequest): NextResponse | null {
  const csrf = validateCsrfProtection(request);
  if (csrf.valid) {
    return null;
  }

  return NextResponse.json(
    { error: "Forbidden: CSRF check failed", code: "CSRF_FAILED" },
    { status: 403 }
  );
}

/**
 * Combined CSRF + per-IP rate limit guard for auth endpoints.
 */
export function guardAuthMutation(
  request: NextRequest,
  rateLimitScope: string,
  rateLimitConfig: RateLimitConfig
): NextResponse | null {
  const csrfError = guardCsrf(request);
  if (csrfError) return csrfError;

  return enforceRateLimit(request, rateLimitScope, rateLimitConfig);
}

/**
 * Shared handler for POST /api/auth/forgot-password and /api/auth/firebase/forgot-password.
 */
export async function handleForgotPasswordPost(
  request: NextRequest,
  rateLimitScope: string,
  componentName: string
): Promise<NextResponse> {
  const blocked = guardAuthMutation(request, rateLimitScope, { intervalMs: 60_000, maxRequests: 5 });
  if (blocked) return blocked;

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

    return NextResponse.json(
      {
        success: true,
        message: "If an account associated with this email exists, a password reset email has been dispatched.",
        requestId: parsedBody.requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    return formatSafe500Response(error, componentName, parsedBody.requestId);
  }
}

/**
 * Shared handler for POST /api/auth/logout and /api/auth/firebase/logout.
 */
export async function handleLogoutPost(
  request: NextRequest,
  rateLimitScope: string
): Promise<NextResponse> {
  const csrfError = guardCsrf(request);
  if (csrfError) return csrfError;

  enforceRateLimit(request, rateLimitScope, { intervalMs: 60_000, maxRequests: 30 });

  try {
    const user = await firebaseAuthService.getUserFromRequest(request);
    if (user) {
      await firebaseAuthService.revokeSessions(user.id);
    }

    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );
    clearFirebaseSessionCookie(response);
    return response;
  } catch {
    const response = NextResponse.json(
      { success: true, message: "Logged out" },
      { status: 200 }
    );
    clearFirebaseSessionCookie(response);
    return response;
  }
}

/**
 * Shared handler for POST /api/auth/session and /api/auth/firebase/session.
 */
export async function handleSessionPost(
  request: NextRequest,
  rateLimitScope: string,
  componentName: string
): Promise<NextResponse> {
  const blocked = guardAuthMutation(request, rateLimitScope, { intervalMs: 60_000, maxRequests: 20 });
  if (blocked) return blocked;

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

    setFirebaseSessionCookie(response, result.data.sessionCookie, result.data.expiresInMs);
    return response;
  } catch (error) {
    return formatSafe500Response(error, componentName, parsedBody.requestId);
  }
}

/**
 * Shared handler for DELETE /api/auth/session and /api/auth/firebase/session.
 */
export async function handleSessionDelete(request: NextRequest): Promise<NextResponse> {
  const csrfError = guardCsrf(request);
  if (csrfError) return csrfError;

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
  } catch {
    const response = NextResponse.json(
      { success: true, message: "Session ended" },
      { status: 200 }
    );
    clearFirebaseSessionCookie(response);
    return response;
  }
}

/**
 * Shared handler for POST /api/auth/register and /api/auth/firebase/register.
 */
export async function handleRegisterPost(
  request: NextRequest,
  rateLimitScope: string,
  componentName: string
): Promise<NextResponse> {
  const blocked = guardAuthMutation(request, rateLimitScope, { intervalMs: 60_000, maxRequests: 10 });
  if (blocked) return blocked;

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
          message: "User registered successfully. Please sign in to establish a session.",
          requestId: parsedBody.requestId,
        },
        { status: 201 }
      );
    } catch (createErr: unknown) {
      const errObj = createErr as { code?: string; message?: string };
      if (errObj?.code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "An account with this email already exists.", code: "EMAIL_EXISTS", requestId: parsedBody.requestId },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error:
            errObj?.code === "auth/invalid-password" || errObj?.code === "auth/invalid-email"
              ? "The email or password does not meet requirements."
              : "Registration failed. Please try again.",
          code: "REGISTRATION_FAILED",
          requestId: parsedBody.requestId,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    return formatSafe500Response(error, componentName, parsedBody.requestId);
  }
}
