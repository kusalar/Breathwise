/**
 * Base Firestore Repository
 * Provides shared utilities for Admin Firestore access, in-memory mock store for test isolation,
 * timestamp conversions, and sanitized error mapping.
 */

import { getAdminFirestore } from "@/lib/firebase/admin";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { logger } from "@/lib/observability/logger";
import type { HouseholdMember, SavedRoutine, SustainabilityAction } from "@/types";
import type { ChatMessageData, ChatSessionData } from "./chat.repository";
import type { NotificationPreferencesData } from "./notifications.repository";
import type { UserPreferencesData } from "./preferences.repository";
import type { UserProfileData } from "./user.repository";

export interface MockFirestoreStore {
  profiles: Record<string, Partial<UserProfileData> & { fullName?: string }>;
  preferences: Record<string, UserPreferencesData>;
  householdMembers: Record<string, Record<string, HouseholdMember>>;
  savedRoutines: Record<string, Record<string, SavedRoutine>>;
  chatSessions: Record<string, Record<string, ChatSessionData>>;
  chatMessages: Record<string, ChatMessageData>; // keyed by sessionId_messageId
  sustainabilityActions: Record<string, Record<string, SustainabilityAction>>;
  notificationPreferences: Record<string, NotificationPreferencesData>;
}

export abstract class BaseFirestoreRepository {
  // In-memory mock store for deterministic test environments and offline demonstration
  public static mockStore: MockFirestoreStore = {
    profiles: {},
    preferences: {},
    householdMembers: {},
    savedRoutines: {},
    chatSessions: {},
    chatMessages: {},
    sustainabilityActions: {},
    notificationPreferences: {},
  };

  /**
   * Resets the mock store for test isolation.
   */
  public static resetMockStore(): void {
    BaseFirestoreRepository.mockStore = {
      profiles: {},
      preferences: {},
      householdMembers: {},
      savedRoutines: {},
      chatSessions: {},
      chatMessages: {},
      sustainabilityActions: {},
      notificationPreferences: {},
    };
  }

  /**
   * Returns whether the Admin Firestore instance is configured and active.
   */
  protected getDb(): Firestore | null {
    const db = getAdminFirestore();
    if (!db && process.env.NODE_ENV === "production") {
      // Never silently fall back to ephemeral in-memory storage in production.
      throw new Error(
        "Firestore Admin is not configured; refusing to use the in-memory store in production."
      );
    }
    return db;
  }

  /**
   * Sanitizes Timestamp to ISO string.
   */
  protected timestampToIso(value: unknown): string {
    if (value instanceof Timestamp) {
      return value.toDate().toISOString();
    }
    if (typeof value === "string") {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return new Date().toISOString();
  }

  /**
   * Logs and returns a standardized, sanitized error.
   */
  protected handleError(component: string, message: string, error: unknown): string {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(component, message, {
      errorCode: "INTERNAL_ERROR",
      meta: { error: errorMsg },
    });
    return message;
  }
}
