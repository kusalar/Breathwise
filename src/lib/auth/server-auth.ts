import { NextRequest } from "next/server";
import {
  getFirebaseSessionUser,
  FIREBASE_SESSION_COOKIE_NAME,
  type FirebaseSessionUser,
} from "@/lib/firebase/session";
import { logger } from "@/lib/observability/logger";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName?: string;
  authProvider: "firebase" | "demo";
}

const SAFE_TEST_USER_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Demo/test fallback identities are strictly prohibited in production builds on any host.
 */
export function isDemoAuthDisabled(): boolean {
  return process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_APP_ENV === "production";
}

/**
 * Resolves the authenticated user from the request session.
 * Protects against spoofed user_id in request bodies, query params, or headers.
 * Uses Firebase server-side session cookies as the exclusive production authentication provider.
 * Never falls back to Supabase.
 */
export async function getSessionUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  // 1. Primary & Exclusive: Verify cryptographically signed Firebase Session Cookie
  try {
    const firebaseUser: FirebaseSessionUser | null = await getFirebaseSessionUser(request);
    if (firebaseUser) {
      return {
        id: firebaseUser.id,
        email: firebaseUser.email,
        fullName: firebaseUser.fullName,
        authProvider: "firebase",
      };
    }
  } catch (error) {
    logger.warn("ServerAuth", "Firebase session cookie verification failed", {
      meta: { error: error instanceof Error ? error.message : String(error) },
    });
    return null;
  }

  // If a session cookie was provided but was invalid, expired, or revoked, fail closed immediately
  if (request.cookies.has(FIREBASE_SESSION_COOKIE_NAME) || request.cookies.has("__session")) {
    return null;
  }

  // 2. Fail closed in production environments regardless of hosting provider
  if (isDemoAuthDisabled() || request.headers.get("x-strict-auth") === "true") {
    return null;
  }

  // 3. Demonstration & Testing Mode (Offline dev / unit tests without mock session cookies)
  const testUserId = request.headers.get("x-user-id");
  if (testUserId && SAFE_TEST_USER_ID.test(testUserId)) {
    return {
      id: testUserId,
      email: `${testUserId}@breathewise.ai`,
      fullName: `User ${testUserId.substring(0, 6)}`,
      authProvider: "demo",
    };
  }

  // Fallback demo user for local UI exploration
  return {
    id: "demo-user-id",
    email: "demo.user@breathewise.ai",
    fullName: "BreatheWise Pioneer",
    authProvider: "demo",
  };
}
