/**
 * Sustainability Actions Firestore Repository
 * Collection: `users/{uid}/sustainabilityActions/{actionId}`
 */

import { BaseFirestoreRepository } from "./base.repository";
import { FieldValue } from "firebase-admin/firestore";
import { SustainabilityAction } from "@/types";
import { randomUUID } from "crypto";

export class SustainabilityRepository extends BaseFirestoreRepository {
  /**
   * Retrieves logged sustainability actions for an authenticated user.
   */
  async getActions(uid: string, limitCount = 50): Promise<SustainabilityAction[]> {
    if (!uid) return [];
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.sustainabilityActions[uid] || {};
      return Object.values(userStore).slice(0, limitCount) as SustainabilityAction[];
    }

    try {
      const snapshot = await db
        .collection("users")
        .doc(uid)
        .collection("sustainabilityActions")
        .orderBy("recordedAt", "desc")
        .limit(limitCount)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: uid,
          category: data.category,
          actionDescription: data.actionDescription,
          estimatedCo2SavedKg: data.estimatedCo2SavedKg ?? 0,
          estimatedParticulateAvoidedPct: data.estimatedParticulateAvoidedPct ?? 0,
          recordedAt: this.timestampToIso(data.recordedAt),
        } as SustainabilityAction;
      });
    } catch (err) {
      this.handleError("SustainabilityRepository", "Failed to get sustainability actions", err);
      return [];
    }
  }

  /**
   * Logs a new low-emission alternative action.
   */
  async addAction(
    uid: string,
    action: Omit<SustainabilityAction, "id" | "userId">
  ): Promise<{ success: boolean; data?: SustainabilityAction; error?: string }> {
    if (!uid) return { success: false, error: "UID required" };
    const actionId = randomUUID();
    const recordedAt = action.recordedAt || new Date().toISOString();
    const db = this.getDb();

    if (!db) {
      if (!BaseFirestoreRepository.mockStore.sustainabilityActions[uid]) {
        BaseFirestoreRepository.mockStore.sustainabilityActions[uid] = {};
      }
      const record: SustainabilityAction = {
        ...action,
        id: actionId,
        userId: uid,
        recordedAt,
      };
      BaseFirestoreRepository.mockStore.sustainabilityActions[uid][actionId] = record;
      return { success: true, data: record };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("sustainabilityActions")
        .doc(actionId);

      const payload = {
        id: actionId,
        userId: uid,
        category: action.category,
        actionDescription: action.actionDescription,
        estimatedCo2SavedKg: action.estimatedCo2SavedKg,
        estimatedParticulateAvoidedPct: action.estimatedParticulateAvoidedPct,
        recordedAt: FieldValue.serverTimestamp(),
      };

      await docRef.set(payload);

      return {
        success: true,
        data: {
          ...action,
          id: actionId,
          userId: uid,
          recordedAt,
        },
      };
    } catch (err) {
      return { success: false, error: this.handleError("SustainabilityRepository", "Failed to add action", err) };
    }
  }

  /**
   * Updates an action ensuring ownership.
   */
  async updateAction(
    uid: string,
    actionId: string,
    updates: Partial<Omit<SustainabilityAction, "id" | "userId">>
  ): Promise<{ success: boolean; error?: string }> {
    if (!uid || !actionId) return { success: false, error: "UID and actionId required" };
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.sustainabilityActions[uid];
      if (!userStore || !userStore[actionId]) {
        return { success: false, error: "Action not found or access forbidden" };
      }
      userStore[actionId] = {
        ...userStore[actionId],
        ...updates,
      };
      return { success: true };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("sustainabilityActions")
        .doc(actionId);

      const doc = await docRef.get();
      if (!doc.exists) {
        return { success: false, error: "Action not found or access forbidden" };
      }

      await docRef.update(updates);
      return { success: true };
    } catch (err) {
      return { success: false, error: this.handleError("SustainabilityRepository", "Failed to update action", err) };
    }
  }

  /**
   * Deletes an action ensuring ownership.
   */
  async deleteAction(uid: string, actionId: string): Promise<{ success: boolean; error?: string }> {
    if (!uid || !actionId) return { success: false, error: "UID and actionId required" };
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.sustainabilityActions[uid];
      if (!userStore || !userStore[actionId]) {
        return { success: false, error: "Action not found or access forbidden" };
      }
      delete userStore[actionId];
      return { success: true };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("sustainabilityActions")
        .doc(actionId);

      const doc = await docRef.get();
      if (!doc.exists) {
        return { success: false, error: "Action not found or access forbidden" };
      }

      await docRef.delete();
      return { success: true };
    } catch (err) {
      return { success: false, error: this.handleError("SustainabilityRepository", "Failed to delete action", err) };
    }
  }
}

export const sustainabilityRepository = new SustainabilityRepository();
