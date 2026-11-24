/**
 * Household Members Firestore Repository
 * Collection: `users/{uid}/householdMembers/{memberId}`
 */

import { BaseFirestoreRepository } from "./base.repository";
import { FieldValue } from "firebase-admin/firestore";
import { HouseholdMember } from "@/types";
import { randomUUID } from "crypto";

export class HouseholdRepository extends BaseFirestoreRepository {
  /**
   * Retrieves all household members for an authenticated user.
   */
  async getMembers(uid: string): Promise<HouseholdMember[]> {
    if (!uid) return [];
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.householdMembers[uid] || {};
      return Object.values(userStore) as HouseholdMember[];
    }

    try {
      const snapshot = await db
        .collection("users")
        .doc(uid)
        .collection("householdMembers")
        .orderBy("createdAt", "asc")
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: uid,
          name: data.name,
          relation: data.relation,
          ageYears: data.ageYears,
          vulnerabilityLevel: data.vulnerabilityLevel || "standard",
          respiratorySensitivity: Boolean(data.respiratorySensitivity),
          notes: data.notes,
          createdAt: this.timestampToIso(data.createdAt),
          updatedAt: this.timestampToIso(data.updatedAt),
        } as HouseholdMember;
      });
    } catch (err) {
      this.handleError("HouseholdRepository", "Failed to list household members", err);
      return [];
    }
  }

  /**
   * Adds a new household dependent under the user's isolated subcollection.
   */
  async addMember(
    uid: string,
    member: Omit<HouseholdMember, "id" | "userId" | "createdAt" | "updatedAt">
  ): Promise<{ success: boolean; data?: HouseholdMember; error?: string }> {
    if (!uid) return { success: false, error: "UID required" };
    const memberId = randomUUID();
    const nowIso = new Date().toISOString();
    const db = this.getDb();

    if (!db) {
      if (!BaseFirestoreRepository.mockStore.householdMembers[uid]) {
        BaseFirestoreRepository.mockStore.householdMembers[uid] = {};
      }
      const record: HouseholdMember = {
        ...member,
        id: memberId,
        userId: uid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      BaseFirestoreRepository.mockStore.householdMembers[uid][memberId] = record;
      return { success: true, data: record };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("householdMembers")
        .doc(memberId);

      const payload = {
        id: memberId,
        userId: uid,
        name: member.name,
        relation: member.relation,
        ageYears: member.ageYears ?? null,
        vulnerabilityLevel: member.vulnerabilityLevel || "standard",
        respiratorySensitivity: Boolean(member.respiratorySensitivity),
        notes: member.notes ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await docRef.set(payload);

      return {
        success: true,
        data: {
          ...member,
          id: memberId,
          userId: uid,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      };
    } catch (err) {
      return { success: false, error: this.handleError("HouseholdRepository", "Failed to add household member", err) };
    }
  }

  /**
   * Updates an existing household member ensuring ownership.
   */
  async updateMember(
    uid: string,
    memberId: string,
    updates: Partial<Omit<HouseholdMember, "id" | "userId">>
  ): Promise<{ success: boolean; error?: string }> {
    if (!uid || !memberId) return { success: false, error: "UID and memberId required" };
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.householdMembers[uid];
      if (!userStore || !userStore[memberId]) {
        return { success: false, error: "Household member not found or access forbidden" };
      }
      userStore[memberId] = {
        ...userStore[memberId],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { success: true };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("householdMembers")
        .doc(memberId);

      const doc = await docRef.get();
      if (!doc.exists) {
        return { success: false, error: "Household member not found or access forbidden" };
      }

      const payload: Record<string, unknown> = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      };

      await docRef.update(payload);
      return { success: true };
    } catch (err) {
      return { success: false, error: this.handleError("HouseholdRepository", "Failed to update household member", err) };
    }
  }

  /**
   * Deletes a household member ensuring ownership.
   */
  async deleteMember(uid: string, memberId: string): Promise<{ success: boolean; error?: string }> {
    if (!uid || !memberId) return { success: false, error: "UID and memberId required" };
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.householdMembers[uid];
      if (!userStore || !userStore[memberId]) {
        return { success: false, error: "Household member not found or access forbidden" };
      }
      delete userStore[memberId];
      return { success: true };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("householdMembers")
        .doc(memberId);

      const doc = await docRef.get();
      if (!doc.exists) {
        return { success: false, error: "Household member not found or access forbidden" };
      }

      await docRef.delete();
      return { success: true };
    } catch (err) {
      return { success: false, error: this.handleError("HouseholdRepository", "Failed to delete household member", err) };
    }
  }

  /**
   * Purges all household members for a user (privacy compliance).
   */
  async deleteAllMembers(uid: string): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    if (!uid) return { success: false, deletedCount: 0, error: "UID required" };
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.householdMembers[uid] || {};
      const count = Object.keys(userStore).length;
      BaseFirestoreRepository.mockStore.householdMembers[uid] = {};
      return { success: true, deletedCount: count };
    }

    try {
      const snapshot = await db
        .collection("users")
        .doc(uid)
        .collection("householdMembers")
        .get();

      if (snapshot.empty) {
        return { success: true, deletedCount: 0 };
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return { success: true, deletedCount: snapshot.size };
    } catch (err) {
      return { success: false, deletedCount: 0, error: this.handleError("HouseholdRepository", "Failed to purge household members", err) };
    }
  }
}

export const householdRepository = new HouseholdRepository();
