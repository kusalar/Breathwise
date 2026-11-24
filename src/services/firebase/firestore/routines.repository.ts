/**
 * Saved Routines Firestore Repository
 * Collection: `users/{uid}/savedRoutines/{routineId}`
 */

import { BaseFirestoreRepository } from "./base.repository";
import { FieldValue } from "firebase-admin/firestore";
import { SavedRoutine, RoutineItem } from "@/types";
import { randomUUID } from "crypto";

export class RoutinesRepository extends BaseFirestoreRepository {
  /**
   * Retrieves saved routines for a user with pagination limits.
   */
  async getRoutines(uid: string, limitCount = 50): Promise<SavedRoutine[]> {
    if (!uid) return [];
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.savedRoutines[uid] || {};
      return Object.values(userStore).slice(0, limitCount) as SavedRoutine[];
    }

    try {
      const snapshot = await db
        .collection("users")
        .doc(uid)
        .collection("savedRoutines")
        .orderBy("createdAt", "desc")
        .limit(limitCount)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: uid,
          title: data.title,
          targetDate: data.targetDate || new Date().toISOString().split("T")[0],
          routinePayload: (data.routinePayload || []) as RoutineItem[],
          isActive: Boolean(data.isActive ?? true),
          createdAt: this.timestampToIso(data.createdAt),
        } as SavedRoutine;
      });
    } catch (err) {
      this.handleError("RoutinesRepository", "Failed to list routines", err);
      return [];
    }
  }

  /**
   * Persists a newly generated pollution-adapted routine.
   */
  async saveRoutine(
    uid: string,
    title: string,
    routinePayload: RoutineItem[],
    targetDate?: string
  ): Promise<{ success: boolean; data?: SavedRoutine; error?: string }> {
    if (!uid) return { success: false, error: "UID required" };
    const routineId = randomUUID();
    const dateStr = targetDate || new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();
    const db = this.getDb();

    if (!db) {
      if (!BaseFirestoreRepository.mockStore.savedRoutines[uid]) {
        BaseFirestoreRepository.mockStore.savedRoutines[uid] = {};
      }
      const record: SavedRoutine = {
        id: routineId,
        userId: uid,
        title,
        targetDate: dateStr,
        routinePayload,
        isActive: true,
        createdAt: nowIso,
      };
      BaseFirestoreRepository.mockStore.savedRoutines[uid][routineId] = record;
      return { success: true, data: record };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("savedRoutines")
        .doc(routineId);

      const payload = {
        id: routineId,
        userId: uid,
        title,
        targetDate: dateStr,
        routinePayload,
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
      };

      await docRef.set(payload);

      return {
        success: true,
        data: {
          id: routineId,
          userId: uid,
          title,
          targetDate: dateStr,
          routinePayload,
          isActive: true,
          createdAt: nowIso,
        },
      };
    } catch (err) {
      return { success: false, error: this.handleError("RoutinesRepository", "Failed to save routine", err) };
    }
  }

  /**
   * Updates an existing routine ensuring ownership.
   */
  async updateRoutine(
    uid: string,
    routineId: string,
    updates: Partial<Omit<SavedRoutine, "id" | "userId">>
  ): Promise<{ success: boolean; error?: string }> {
    if (!uid || !routineId) return { success: false, error: "UID and routineId required" };
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.savedRoutines[uid];
      if (!userStore || !userStore[routineId]) {
        return { success: false, error: "Routine not found or access forbidden" };
      }
      userStore[routineId] = {
        ...userStore[routineId],
        ...updates,
      };
      return { success: true };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("savedRoutines")
        .doc(routineId);

      const doc = await docRef.get();
      if (!doc.exists) {
        return { success: false, error: "Routine not found or access forbidden" };
      }

      await docRef.update(updates);
      return { success: true };
    } catch (err) {
      return { success: false, error: this.handleError("RoutinesRepository", "Failed to update routine", err) };
    }
  }

  /**
   * Deletes a routine ensuring ownership.
   */
  async deleteRoutine(uid: string, routineId: string): Promise<{ success: boolean; error?: string }> {
    if (!uid || !routineId) return { success: false, error: "UID and routineId required" };
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.savedRoutines[uid];
      if (!userStore || !userStore[routineId]) {
        return { success: false, error: "Routine not found or access forbidden" };
      }
      delete userStore[routineId];
      return { success: true };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("savedRoutines")
        .doc(routineId);

      const doc = await docRef.get();
      if (!doc.exists) {
        return { success: false, error: "Routine not found or access forbidden" };
      }

      await docRef.delete();
      return { success: true };
    } catch (err) {
      return { success: false, error: this.handleError("RoutinesRepository", "Failed to delete routine", err) };
    }
  }
}

export const routinesRepository = new RoutinesRepository();
