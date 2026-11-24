/**
 * User Preferences Firestore Repository
 * Document: `users/{uid}/preferences/main`
 */

import { BaseFirestoreRepository } from "./base.repository";
import { FieldValue } from "firebase-admin/firestore";
import { GeoLocation } from "@/types";

export interface UserPreferencesData {
  userId: string;
  defaultCity: string;
  defaultRegion: string;
  defaultCountry: string;
  defaultLatitude: number;
  defaultLongitude: number;
  morningCommuteTime?: string;
  eveningCommuteTime?: string;
  outdoorWorkHours?: string;
  schoolDropTime?: string;
  preferredAqiStandard?: string;
  theme?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class PreferencesRepository extends BaseFirestoreRepository {
  /**
   * Retrieves preferences for an authenticated user.
   */
  async getPreferences(uid: string): Promise<UserPreferencesData | null> {
    if (!uid) return null;
    const db = this.getDb();

    if (!db) {
      const mock = BaseFirestoreRepository.mockStore.preferences[uid];
      if (!mock) {
        return {
          userId: uid,
          defaultCity: "Siliguri",
          defaultRegion: "West Bengal",
          defaultCountry: "India",
          defaultLatitude: 26.7271,
          defaultLongitude: 88.3953,
          preferredAqiStandard: "CPCB_INDIA",
          theme: "system",
        };
      }
      return mock as UserPreferencesData;
    }

    try {
      const doc = await db
        .collection("users")
        .doc(uid)
        .collection("preferences")
        .doc("main")
        .get();

      if (!doc.exists) {
        return {
          userId: uid,
          defaultCity: "Siliguri",
          defaultRegion: "West Bengal",
          defaultCountry: "India",
          defaultLatitude: 26.7271,
          defaultLongitude: 88.3953,
          preferredAqiStandard: "CPCB_INDIA",
          theme: "system",
        };
      }

      const data = doc.data() || {};
      return {
        userId: uid,
        defaultCity: data.defaultCity || "Siliguri",
        defaultRegion: data.defaultRegion || "West Bengal",
        defaultCountry: data.defaultCountry || "India",
        defaultLatitude: data.defaultLatitude ?? 26.7271,
        defaultLongitude: data.defaultLongitude ?? 88.3953,
        morningCommuteTime: data.morningCommuteTime,
        eveningCommuteTime: data.eveningCommuteTime,
        outdoorWorkHours: data.outdoorWorkHours,
        schoolDropTime: data.schoolDropTime,
        preferredAqiStandard: data.preferredAqiStandard || "CPCB_INDIA",
        theme: data.theme || "system",
        createdAt: this.timestampToIso(data.createdAt),
        updatedAt: this.timestampToIso(data.updatedAt),
      };
    } catch (err) {
      this.handleError("PreferencesRepository", "Failed to get user preferences", err);
      return null;
    }
  }

  /**
   * Updates user preferences or location.
   */
  async saveLocation(
    uid: string,
    location: GeoLocation
  ): Promise<{ success: boolean; error?: string }> {
    return this.updatePreferences(uid, {
      defaultCity: location.name,
      defaultRegion: location.region,
      defaultCountry: location.country,
      defaultLatitude: location.latitude,
      defaultLongitude: location.longitude,
    });
  }

  /**
   * Updates partial preferences.
   */
  async updatePreferences(
    uid: string,
    updates: Partial<Omit<UserPreferencesData, "userId">>
  ): Promise<{ success: boolean; error?: string }> {
    if (!uid) return { success: false, error: "UID required" };
    const db = this.getDb();

    if (!db) {
      const existing = BaseFirestoreRepository.mockStore.preferences[uid] || {
        userId: uid,
        defaultCity: "Siliguri",
        defaultRegion: "West Bengal",
        defaultCountry: "India",
        defaultLatitude: 26.7271,
        defaultLongitude: 88.3953,
      };
      BaseFirestoreRepository.mockStore.preferences[uid] = {
        ...existing,
        ...updates,
        userId: uid,
        updatedAt: new Date().toISOString(),
      };
      return { success: true };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("preferences")
        .doc("main");

      const payload: Record<string, unknown> = {
        ...updates,
        userId: uid,
        updatedAt: FieldValue.serverTimestamp(),
      };

      await docRef.set(payload, { merge: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: this.handleError("PreferencesRepository", "Failed to update preferences", err) };
    }
  }
}

export const preferencesRepository = new PreferencesRepository();
