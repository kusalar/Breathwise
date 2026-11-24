/**
 * Firebase User Profile Initialization & Persistence
 * Manages user profile documents under `users/{uid}` in Cloud Firestore.
 * Idempotent: Never overwrites existing preferences, household data, or routines on repeated logins.
 */

import { getAdminFirestore } from "./admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "@/lib/observability/logger";

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileInitOptions {
  email?: string;
  displayName?: string;
  emailVerified?: boolean;
}

/**
 * Idempotently initializes or updates a user profile document in Firestore.
 * Does not overwrite existing personal preferences, routines, or subcollections.
 */
export async function initializeFirebaseUserProfile(
  uid: string,
  data: ProfileInitOptions = {}
): Promise<{ success: boolean; profile?: FirebaseUserProfile; error?: string }> {
  if (!uid || typeof uid !== "string") {
    return { success: false, error: "Invalid user UID provided" };
  }

  const db = getAdminFirestore();
  if (!db) {
    logger.warn("UserProfile", "Admin Firestore is not configured; running in mock/demo fallback mode");
    return {
      success: true,
      profile: {
        uid,
        email: data.email || "",
        displayName: data.displayName || "BreatheWise User",
        emailVerified: Boolean(data.emailVerified),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const userDocRef = db.collection("users").doc(uid);
    const existingDoc = await userDocRef.get();

    const nowIso = new Date().toISOString();

    if (!existingDoc.exists) {
      // First-time initialization
      const initialProfile = {
        uid,
        email: data.email || "",
        displayName: data.displayName || "",
        emailVerified: Boolean(data.emailVerified),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await userDocRef.set(initialProfile);

      return {
        success: true,
        profile: {
          uid,
          email: data.email || "",
          displayName: data.displayName || "",
          emailVerified: Boolean(data.emailVerified),
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      };
    } else {
      // Existing profile: update only updatedAt and emailVerified if changed, preserve all other attributes
      const existingData = existingDoc.data() || {};
      const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (data.emailVerified !== undefined && data.emailVerified !== existingData.emailVerified) {
        updates.emailVerified = data.emailVerified;
      }
      if (data.displayName && !existingData.displayName) {
        updates.displayName = data.displayName;
      }

      await userDocRef.set(updates, { merge: true });

      const createdAtStr =
        existingData.createdAt instanceof Timestamp
          ? existingData.createdAt.toDate().toISOString()
          : (existingData.createdAt as string) || nowIso;

      return {
        success: true,
        profile: {
          uid,
          email: (existingData.email as string) || data.email || "",
          displayName: (existingData.displayName as string) || data.displayName || "",
          emailVerified: Boolean(updates.emailVerified ?? existingData.emailVerified),
          createdAt: createdAtStr,
          updatedAt: nowIso,
        },
      };
    }
  } catch (error) {
    logger.error("UserProfile", "Failed to initialize user profile in Firestore", {
      errorCode: "INTERNAL_ERROR",
      meta: { uid, error: error instanceof Error ? error.message : String(error) },
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Profile initialization failed",
    };
  }
}

/**
 * Retrieves a user profile by UID with strict authorization verification.
 * Caller UID must match target UID to prevent cross-user profile reading.
 */
export async function getFirebaseUserProfile(
  callerUid: string,
  targetUid: string
): Promise<{ success: boolean; profile?: FirebaseUserProfile; error?: string }> {
  if (!callerUid || !targetUid) {
    return { success: false, error: "Caller and target UID are required" };
  }

  // Cross-user isolation enforcement
  if (callerUid !== targetUid) {
    logger.warn("UserProfile", "Unauthorized cross-user profile access attempt blocked", {
      errorCode: "AUTH_FORBIDDEN",
      meta: { callerUid, targetUid },
    });
    return { success: false, error: "Forbidden: You cannot access another user's profile" };
  }

  const db = getAdminFirestore();
  if (!db) {
    return {
      success: true,
      profile: {
        uid: targetUid,
        email: `${targetUid}@breathewise.ai`,
        displayName: "BreatheWise User",
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const doc = await db.collection("users").doc(targetUid).get();
    if (!doc.exists) {
      return { success: false, error: "Profile not found" };
    }

    const data = doc.data() || {};
    const createdAtStr =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) || new Date().toISOString();

    const updatedAtStr =
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : (data.updatedAt as string) || new Date().toISOString();

    return {
      success: true,
      profile: {
        uid: targetUid,
        email: (data.email as string) || "",
        displayName: (data.displayName as string) || "",
        emailVerified: Boolean(data.emailVerified),
        createdAt: createdAtStr,
        updatedAt: updatedAtStr,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch profile",
    };
  }
}
