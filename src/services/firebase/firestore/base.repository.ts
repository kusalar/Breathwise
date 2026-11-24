/**
 * Base Firestore Repository
 * Provides shared utilities for Admin Firestore access, in-memory mock store for test isolation,
 * timestamp conversions, and sanitized error mapping.
 */

import { getAdminFirestore } from "@/lib/firebase/admin";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { logger } from "@/lib/observability/logger";

export interface MockFirestoreStore {
  profiles: Record<string, Record<string, any>>;
  preferences: Record<string, Record<string, any>>;
  householdMembers: Record<string, Record<string, any>>;
  savedRoutines: Record<string, Record<string, any>>;
  chatSessions: Record<string, Record<string, any>>;
  chatMessages: Record<string, Record<string, any>>; // keyed by sessionId_messageId
  sustainabilityActions: Record<string, Record<string, any>>;
  notificationPreferences: Record<string, Record<string, any>>;
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
    return getAdminFirestore();
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
