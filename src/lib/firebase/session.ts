/**
 * Firebase Secure Server-Side Session Management
 * Implements official Firebase session cookie architecture with HttpOnly, Secure, SameSite=Lax,
 * cryptographic verification, revocation tracking, and CSRF protection.
 * Target: Firebase Spark (No-Cost) Plan.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "./admin";
import type { DecodedIdToken } from "firebase-admin/auth";
import { logger } from "@/lib/observability/logger";

export const FIREBASE_SESSION_COOKIE_NAME = "breathewise_firebase_session";

// Firebase supports session cookie expiration between 5 minutes and 14 days
export const MIN_SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_SESSION_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
export const DEFAULT_SESSION_EXPIRY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days (432,000,000 ms)

export interface FirebaseSessionUser {
  id: string;
  email: string;
  fullName?: string;
  emailVerified: boolean;
}

export interface CsrfValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates request origin to protect against Cross-Site Request Forgery (CSRF).
 */
export function validateCsrfProtection(request: NextRequest): CsrfValidationResult {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // In test environments or server-to-server calls without origin/referer,
  // require a custom header if provided (e.g. X-Requested-With or X-CSRF-Protection)
  if (!origin && !referer) {
    const customHeader = request.headers.get("x-requested-with") || request.headers.get("x-csrf-protection");
    if (customHeader) {
      return { valid: true };
    }
    // Allow non-browser requests without origin in development/test
    if (process.env.NODE_ENV !== "production") {
      return { valid: true };
    }
    return { valid: false, reason: "Missing Origin and Referer headers" };
  }

  const checkUrl = origin || referer;
  if (!checkUrl) {
    return { valid: false, reason: "Unverifiable request origin" };
  }

  try {
    const parsed = new URL(checkUrl);
    // Origin must match the current host or configured app URL
    if (host && parsed.host !== host) {
      const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
        : null;

      if (!allowedOrigin || parsed.host !== allowedOrigin) {
        return {
          valid: false,
          reason: `Origin mismatch: ${parsed.host} does not match host ${host}`,
        };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "Malformed origin URL" };
  }
}

/**
 * Creates a cryptographically signed Firebase session cookie from a verified ID token.
 */
export async function createFirebaseSessionCookie(
  idToken: string,
  expiresInMs: number = DEFAULT_SESSION_EXPIRY_MS
): Promise<string | null> {
  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    logger.warn("FirebaseSession", "Admin Auth is not configured");
    return null;
  }

  // Validate bounds
  const boundedExpiry = Math.min(
    Math.max(expiresInMs, MIN_SESSION_EXPIRY_MS),
    MAX_SESSION_EXPIRY_MS
  );

  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: boundedExpiry,
    });
    return sessionCookie;
  } catch (error) {
    logger.error("FirebaseSession", "Failed to create session cookie", {
      errorCode: "AUTH_FORBIDDEN",
      meta: { error: error instanceof Error ? error.message : String(error) },
    });
    return null;
  }
}

/**
 * Verifies a Firebase session cookie and validates revocation status.
 */
export async function verifyFirebaseSessionCookie(
  sessionCookie: string,
  checkRevoked: boolean = true
): Promise<DecodedIdToken | null> {
  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, checkRevoked);
    return decoded;
  } catch (error) {
    logger.warn("FirebaseSession", "Session cookie verification failed", {
      errorCode: "AUTH_FORBIDDEN",
      meta: { error: error instanceof Error ? error.message : String(error) },
    });
    return null;
  }
}

/**
 * Revokes all active refresh tokens and session cookies for a given user UID.
 */
export async function revokeFirebaseUserSessions(uid: string): Promise<boolean> {
  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return false;
  }

  try {
    await adminAuth.revokeRefreshTokens(uid);
    logger.info("FirebaseSession", "Successfully revoked user sessions", {
      meta: { uid },
    });
    return true;
  } catch (error) {
    logger.error("FirebaseSession", "Failed to revoke user sessions", {
      errorCode: "AUTH_FORBIDDEN",
      meta: { uid, error: error instanceof Error ? error.message : String(error) },
    });
    return false;
  }
}

/**
 * Extracts and verifies the authenticated user from a Next.js request.
 * NEVER trusts client-supplied user IDs in headers or request bodies.
 */
export async function getFirebaseSessionUser(
  request: NextRequest
): Promise<FirebaseSessionUser | null> {
  const sessionCookie =
    request.cookies.get(FIREBASE_SESSION_COOKIE_NAME)?.value ||
    request.cookies.get("__session")?.value;

  if (!sessionCookie) {
    return null;
  }

  const decoded = await verifyFirebaseSessionCookie(sessionCookie, true);
  if (!decoded) {
    return null;
  }

  return {
    id: decoded.uid,
    email: decoded.email || "",
    fullName: decoded.name || (decoded as Record<string, unknown>).display_name as string | undefined,
    emailVerified: Boolean(decoded.email_verified),
  };
}

/**
 * Attaches the Firebase session cookie with strict security attributes to a NextResponse.
 */
export function setFirebaseSessionCookie(
  response: NextResponse,
  sessionCookie: string,
  expiresInMs: number = DEFAULT_SESSION_EXPIRY_MS
): void {
  const isProduction = process.env.NODE_ENV === "production";
  const maxAgeSeconds = Math.floor(expiresInMs / 1000);

  response.cookies.set({
    name: FIREBASE_SESSION_COOKIE_NAME,
    value: sessionCookie,
    maxAge: maxAgeSeconds,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Clears the Firebase session cookie on logout.
 */
export function clearFirebaseSessionCookie(response: NextResponse): void {
  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: FIREBASE_SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });

  // Also clear legacy/alternate __session cookie if present
  response.cookies.set({
    name: "__session",
    value: "",
    maxAge: 0,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
}
