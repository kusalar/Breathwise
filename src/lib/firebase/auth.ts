/**
 * Firebase Client Authentication Helpers
 * Provides client-side helpers for authentication, token retrieval, and password reset.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type User,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";
import { logger } from "@/lib/observability/logger";

export interface ClientAuthResult {
  success: boolean;
  user?: User;
  idToken?: string;
  error?: string;
}

/**
 * Registers a new user via client SDK, sets display name, sends verification email,
 * and retrieves their ID token for session establishment.
 */
export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<ClientAuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, error: "Firebase Client Auth is not initialized" };
  }

  try {
    const cred: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    if (displayName) {
      try {
        await updateProfile(user, { displayName });
      } catch (profileErr) {
        logger.warn("ClientAuth", "Could not set display name during signup", {
          meta: { error: String(profileErr) },
        });
      }
    }

    try {
      await sendEmailVerification(user);
    } catch {
      // Catch mock/rate-limited email verification silently in non-production
    }

    const idToken = await user.getIdToken();
    return { success: true, user, idToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return { success: false, error: message };
  }
}

/**
 * Signs in an existing user with email and password and returns their ID token.
 */
export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<ClientAuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, error: "Firebase Client Auth is not initialized" };
  }

  try {
    const cred: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await cred.user.getIdToken();
    return { success: true, user: cred.user, idToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    return { success: false, error: message };
  }
}

/**
 * Signs in a user using Google OAuth popup provider and retrieves their ID token.
 */
export async function loginWithGoogle(): Promise<ClientAuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, error: "Firebase Client Auth is not initialized" };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred: UserCredential = await signInWithPopup(auth, provider);
    const idToken = await cred.user.getIdToken();
    return { success: true, user: cred.user, idToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google authentication failed";
    return { success: false, error: message };
  }
}

/**
 * Sends a password reset email to the specified address.
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, error: "Firebase Client Auth is not initialized" };
  }

  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password reset request failed";
    return { success: false, error: message };
  }
}

/**
 * Signs out the current client session.
 */
export async function logoutClient(): Promise<{ success: boolean; error?: string }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: true };
  }

  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign out failed";
    return { success: false, error: message };
  }
}

/**
 * Retrieves the currently signed-in client User instance.
 */
export function getCurrentClientUser(): User | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser || null;
}

/**
 * Retrieves a fresh ID token for the current user.
 */
export async function getClientIdToken(forceRefresh = false): Promise<string | null> {
  const user = getCurrentClientUser();
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}
