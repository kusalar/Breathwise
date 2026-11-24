/**
 * Notification Preferences Firestore Repository
 * Document: `users/{uid}/notificationPreferences/main`
 */

import { BaseFirestoreRepository } from "./base.repository";
import { FieldValue } from "firebase-admin/firestore";

export interface NotificationPreferencesData {
  userId: string;
  emailAlertsEnabled: boolean;
  severeSmogThreshold: number;
  dailyBriefingTime: string;
  createdAt?: string;
  updatedAt?: string;
}

export class NotificationsRepository extends BaseFirestoreRepository {
  /**
   * Retrieves notification preferences for a user.
   */
  async getPreferences(uid: string): Promise<NotificationPreferencesData | null> {
    if (!uid) return null;
    const db = this.getDb();

    if (!db) {
      const mock = BaseFirestoreRepository.mockStore.notificationPreferences[uid];
      if (!mock) {
        return {
          userId: uid,
          emailAlertsEnabled: true,
          severeSmogThreshold: 300,
          dailyBriefingTime: "07:00:00",
        };
      }
      return mock as NotificationPreferencesData;
    }

    try {
      const doc = await db
        .collection("users")
        .doc(uid)
        .collection("notificationPreferences")
        .doc("main")
        .get();

      if (!doc.exists) {
        return {
          userId: uid,
          emailAlertsEnabled: true,
          severeSmogThreshold: 300,
          dailyBriefingTime: "07:00:00",
        };
      }

      const data = doc.data() || {};
      return {
        userId: uid,
        emailAlertsEnabled: Boolean(data.emailAlertsEnabled ?? true),
        severeSmogThreshold: data.severeSmogThreshold ?? 300,
        dailyBriefingTime: data.dailyBriefingTime || "07:00:00",
        createdAt: this.timestampToIso(data.createdAt),
        updatedAt: this.timestampToIso(data.updatedAt),
      };
    } catch (err) {
      this.handleError("NotificationsRepository", "Failed to get notification preferences", err);
      return null;
    }
  }

  /**
   * Updates notification preferences for a user.
   */
  async updatePreferences(
    uid: string,
    updates: Partial<Omit<NotificationPreferencesData, "userId">>
  ): Promise<{ success: boolean; error?: string }> {
    if (!uid) return { success: false, error: "UID required" };
    const db = this.getDb();

    if (!db) {
      const existing = BaseFirestoreRepository.mockStore.notificationPreferences[uid] || {
        userId: uid,
        emailAlertsEnabled: true,
        severeSmogThreshold: 300,
        dailyBriefingTime: "07:00:00",
      };
      BaseFirestoreRepository.mockStore.notificationPreferences[uid] = {
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
        .collection("notificationPreferences")
        .doc("main");

      const payload = {
        ...updates,
        userId: uid,
        updatedAt: FieldValue.serverTimestamp(),
      };

      await docRef.set(payload, { merge: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: this.handleError("NotificationsRepository", "Failed to update notification preferences", err) };
    }
  }
}

export const notificationsRepository = new NotificationsRepository();
