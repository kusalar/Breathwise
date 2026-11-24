/**
 * Firebase Authentication Service
 * Unified service layer for Firebase Authentication, Session Cookie creation,
 * Profile initialization, and Session Revocation.
 */

import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  createFirebaseSessionCookie,
  verifyFirebaseSessionCookie,
  revokeFirebaseUserSessions,
  getFirebaseSessionUser,
  DEFAULT_SESSION_EXPIRY_MS,
  type FirebaseSessionUser,
} from "@/lib/firebase/session";
import {
  initializeFirebaseUserProfile,
  getFirebaseUserProfile,
  type FirebaseUserProfile,
} from "@/lib/firebase/user-profile";
import { logger } from "@/lib/observability/logger";

export interface FirebaseAuthServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class FirebaseAuthService {
  /**
   * Exchanges an authenticated Firebase ID token for a secure server session cookie,
   * while ensuring the user's Firestore profile is idempotently initialized.
   */
  async createSessionFromIdToken(
    idToken: string,
    expiresInMs: number = DEFAULT_SESSION_EXPIRY_MS
  ): Promise<
    FirebaseAuthServiceResult<{
      sessionCookie: string;
      user: FirebaseSessionUser;
      profile: FirebaseUserProfile;
      expiresInMs: number;
    }>
  > {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return {
        success: false,
        error: "Firebase Admin is not configured",
        code: "ADMIN_NOT_CONFIGURED",
      };
    }

    try {
      // 1. Verify the ID token to ensure authenticity before creating cookie
      const decoded = await adminAuth.verifyIdToken(idToken, true);

      // 2. Create the cryptographic session cookie
      const sessionCookie = await createFirebaseSessionCookie(idToken, expiresInMs);
      if (!sessionCookie) {
        return {
          success: false,
          error: "Failed to mint session cookie",
          code: "SESSION_CREATION_FAILED",
        };
      }

      // 3. Idempotently initialize the user profile in Firestore
      const profileResult = await initializeFirebaseUserProfile(decoded.uid, {
        email: decoded.email,
        displayName: decoded.name || (decoded as Record<string, unknown>).display_name as string | undefined,
        emailVerified: decoded.email_verified,
      });

      const user: FirebaseSessionUser = {
        id: decoded.uid,
        email: decoded.email || "",
        fullName: decoded.name || (decoded as Record<string, unknown>).display_name as string | undefined,
        emailVerified: Boolean(decoded.email_verified),
      };

      return {
        success: true,
        data: {
          sessionCookie,
          user,
          profile: profileResult.profile || {
            uid: decoded.uid,
            email: user.email,
            displayName: user.fullName || "",
            emailVerified: user.emailVerified,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          expiresInMs,
        },
      };
    } catch (error) {
      logger.warn("FirebaseAuthService", "ID token verification failed", {
        errorCode: "AUTH_FORBIDDEN",
        meta: { error: error instanceof Error ? error.message : String(error) },
      });

      return {
        success: false,
        error: "Invalid or expired Firebase ID token",
        code: "INVALID_TOKEN",
      };
    }
  }

  /**
   * Verifies an active session cookie, checking for token revocation.
   */
  async verifySession(sessionCookie: string): Promise<FirebaseAuthServiceResult<FirebaseSessionUser>> {
    const decoded = await verifyFirebaseSessionCookie(sessionCookie, true);
    if (!decoded) {
      return {
        success: false,
        error: "Session is invalid, expired, or revoked",
        code: "SESSION_INVALID",
      };
    }

    return {
      success: true,
      data: {
        id: decoded.uid,
        email: decoded.email || "",
        fullName: decoded.name || (decoded as Record<string, unknown>).display_name as string | undefined,
        emailVerified: Boolean(decoded.email_verified),
      },
    };
  }

  /**
   * Resolves the authenticated user from an incoming Next.js request.
   */
  async getUserFromRequest(request: NextRequest): Promise<FirebaseSessionUser | null> {
    return getFirebaseSessionUser(request);
  }

  /**
   * Revokes all active refresh tokens and sessions for a given user.
   */
  async revokeSessions(uid: string): Promise<boolean> {
    return revokeFirebaseUserSessions(uid);
  }

  /**
   * Generates a password reset link using the Admin SDK.
   */
  async generatePasswordResetLink(email: string): Promise<FirebaseAuthServiceResult<{ link?: string }>> {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return {
        success: false,
        error: "Firebase Admin is not configured",
        code: "ADMIN_NOT_CONFIGURED",
      };
    }

    try {
      const link = await adminAuth.generatePasswordResetLink(email);
      return { success: true, data: { link } };
    } catch (error) {
      logger.warn("FirebaseAuthService", "Failed to generate password reset link", {
        meta: { email, error: error instanceof Error ? error.message : String(error) },
      });
      // Return generic failure / success to prevent email enumeration
      return {
        success: false,
        error: "If an account with this email exists, a password reset link has been dispatched.",
        code: "PASSWORD_RESET_DISPATCHED",
      };
    }
  }

  /**
   * Retrieves a user profile from Firestore ensuring isolation.
   */
  async getProfile(callerUid: string, targetUid: string): Promise<FirebaseAuthServiceResult<FirebaseUserProfile>> {
    const res = await getFirebaseUserProfile(callerUid, targetUid);
    if (!res.success || !res.profile) {
      return { success: false, error: res.error, code: "PROFILE_FETCH_FAILED" };
    }
    return { success: true, data: res.profile };
  }
}

export const firebaseAuthService = new FirebaseAuthService();
