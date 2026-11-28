/**
 * User Profile Firestore Repository
 * Collection: `users/{uid}`
 */

import { BaseFirestoreRepository } from "./base.repository";
import { FieldValue } from "firebase-admin/firestore";

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UserRepository extends BaseFirestoreRepository {
  /**
   * Retrieves user profile by UID.
   */
  async getProfile(uid: string): Promise<UserProfileData | null> {
    if (!uid) return null;
    const db = this.getDb();

    if (!db) {
      const mock = BaseFirestoreRepository.mockStore.profiles[uid];
      if (!mock) return null;
      return {
        uid,
        email: typeof mock.email === "string" && mock.email ? mock.email : `${uid}@breathewise.ai`,
        displayName:
          (typeof mock.displayName === "string" && mock.displayName) ||
          (typeof mock.fullName === "string" && mock.fullName) ||
          "BreatheWise User",
        avatarUrl: typeof mock.avatarUrl === "string" ? mock.avatarUrl : undefined,
        emailVerified: Boolean(mock.emailVerified),
        createdAt: typeof mock.createdAt === "string" ? mock.createdAt : new Date().toISOString(),
        updatedAt: typeof mock.updatedAt === "string" ? mock.updatedAt : new Date().toISOString(),
      };
    }

    try {
      const doc = await db.collection("users").doc(uid).get();
      if (!doc.exists) return null;
      const data = doc.data() || {};
      return {
        uid,
        email: (data.email as string) || "",
        displayName: (data.displayName as string) || (data.full_name as string) || "",
        avatarUrl: data.avatarUrl as string | undefined,
        emailVerified: Boolean(data.emailVerified),
        createdAt: this.timestampToIso(data.createdAt),
        updatedAt: this.timestampToIso(data.updatedAt),
      };
    } catch (err) {
      this.handleError("UserRepository", "Failed to get user profile", err);
      return null;
    }
  }

  /**
   * Updates profile metadata (displayName, avatarUrl).
   */
  async updateProfile(
    uid: string,
    data: { fullName?: string; avatarUrl?: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (!uid) return { success: false, error: "UID required" };
    const db = this.getDb();

    if (!db) {
      const existing = BaseFirestoreRepository.mockStore.profiles[uid] || {};
      BaseFirestoreRepository.mockStore.profiles[uid] = {
        ...existing,
        ...data,
        displayName: data.fullName || existing.displayName,
        updatedAt: new Date().toISOString(),
      };
      return { success: true };
    }

    try {
      const docRef = db.collection("users").doc(uid);
      const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (data.fullName !== undefined) updates.displayName = data.fullName;
      if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;

      await docRef.set(updates, { merge: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: this.handleError("UserRepository", "Failed to update profile", err) };
    }
  }
}

export const userRepository = new UserRepository();
