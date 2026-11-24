/**
 * Migration Data Mapper & Canonical Hasher
 * Maps Supabase PostgreSQL entities to Cloud Firestore document structures
 * and produces deterministic canonical hashes for parity auditing.
 */

import { createHash } from "crypto";
import { MigrationDomain } from "./migration-types";

export class MigrationMapper {
  /**
   * Deterministically canonicalizes an object by sorting keys, then computes SHA-256 hash.
   */
  static computeCanonicalHash(data: unknown): string {
    const canonicalJson = JSON.stringify(data, (key, value) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.keys(value)
          .sort()
          .reduce((sorted: Record<string, unknown>, k) => {
            sorted[k] = value[k];
            return sorted;
          }, {});
      }
      return value;
    });

    return createHash("sha256").update(canonicalJson).digest("hex");
  }

  /**
   * 1. Profiles: maps to users/{uid}
   */
  static mapProfile(source: any, firebaseUid: string) {
    const nowIso = new Date().toISOString();
    return {
      uid: firebaseUid,
      email: source.email,
      displayName: source.full_name || "BreatheWise User",
      avatarUrl: source.avatar_url || undefined,
      emailVerified: true, // Accounts verified through identity mapping
      createdAt: source.created_at || nowIso,
      updatedAt: source.updated_at || nowIso,
      _migrationMeta: {
        sourceSupabaseId: source.id,
        migratedAt: nowIso,
      },
    };
  }

  /**
   * 2. Preferences: maps to users/{uid}/preferences/main
   */
  static mapPreferences(source: any, firebaseUid: string) {
    const nowIso = new Date().toISOString();
    return {
      userId: firebaseUid,
      defaultCity: source.default_city || "Siliguri",
      defaultRegion: source.default_region || "West Bengal",
      defaultCountry: source.default_country || "India",
      defaultLatitude: source.default_latitude ?? 26.7271,
      defaultLongitude: source.default_longitude ?? 88.3953,
      morningCommuteTime: source.morning_commute_time || undefined,
      eveningCommuteTime: source.evening_commute_time || undefined,
      outdoorWorkHours: source.outdoor_work_hours || undefined,
      schoolDropTime: source.school_drop_time || undefined,
      preferredAqiStandard: source.preferred_aqi_standard || "CPCB_INDIA",
      theme: source.theme || "system",
      createdAt: source.created_at || nowIso,
      updatedAt: source.updated_at || nowIso,
      _migrationMeta: {
        sourceSupabaseUserId: source.user_id,
        migratedAt: nowIso,
      },
    };
  }

  /**
   * 3. Household Members: maps to users/{uid}/householdMembers/{memberId}
   */
  static mapHouseholdMember(source: any, firebaseUid: string) {
    const nowIso = new Date().toISOString();
    return {
      id: source.id,
      userId: firebaseUid,
      name: source.name,
      relation: source.relation,
      ageYears: source.age_years ?? undefined,
      vulnerabilityLevel: source.vulnerability_level || "standard",
      respiratorySensitivity: Boolean(source.respiratory_sensitivity),
      notes: source.notes ?? undefined,
      createdAt: source.created_at || nowIso,
      updatedAt: source.updated_at || nowIso,
      _migrationMeta: {
        sourceSupabaseId: source.id,
        sourceSupabaseUserId: source.user_id,
        migratedAt: nowIso,
      },
    };
  }

  /**
   * 4. Saved Routines: maps to users/{uid}/savedRoutines/{routineId}
   */
  static mapSavedRoutine(source: any, firebaseUid: string) {
    const nowIso = new Date().toISOString();
    return {
      id: source.id,
      userId: firebaseUid,
      title: source.title,
      targetDate: source.target_date || nowIso.split("T")[0],
      routinePayload: source.routine_payload || [],
      isActive: Boolean(source.is_active ?? true),
      createdAt: source.created_at || nowIso,
      _migrationMeta: {
        sourceSupabaseId: source.id,
        sourceSupabaseUserId: source.user_id,
        migratedAt: nowIso,
      },
    };
  }

  /**
   * 5. Chat Sessions: maps to users/{uid}/chatSessions/{sessionId}
   */
  static mapChatSession(source: any, firebaseUid: string) {
    const nowIso = new Date().toISOString();
    return {
      id: source.id,
      userId: firebaseUid,
      title: source.title || "Environmental Health Session",
      locationName: source.location_name || "Siliguri",
      createdAt: source.created_at || nowIso,
      updatedAt: source.updated_at || nowIso,
      _migrationMeta: {
        sourceSupabaseId: source.id,
        sourceSupabaseUserId: source.user_id,
        migratedAt: nowIso,
      },
    };
  }

  /**
   * 6. Chat Messages: maps to users/{uid}/chatSessions/{sessionId}/messages/{messageId}
   */
  static mapChatMessage(source: any, firebaseUid: string) {
    const nowIso = new Date().toISOString();
    return {
      id: source.id,
      sessionId: source.session_id,
      userId: firebaseUid,
      role: source.role,
      content: source.content,
      metadata: source.metadata || {},
      createdAt: source.created_at || nowIso,
      _migrationMeta: {
        sourceSupabaseId: source.id,
        sourceSupabaseSessionId: source.session_id,
        sourceSupabaseUserId: source.user_id,
        migratedAt: nowIso,
      },
    };
  }

  /**
   * 7. Sustainability Actions: maps to users/{uid}/sustainabilityActions/{actionId}
   */
  static mapSustainabilityAction(source: any, firebaseUid: string) {
    const nowIso = new Date().toISOString();
    return {
      id: source.id,
      userId: firebaseUid,
      category: source.category,
      actionDescription: source.action_description,
      estimatedCo2SavedKg: source.estimated_co2_saved_kg ?? 0,
      estimatedParticulateAvoidedPct: source.estimated_particulate_avoided_pct ?? 0,
      recordedAt: source.recorded_at || nowIso,
      _migrationMeta: {
        sourceSupabaseId: source.id,
        sourceSupabaseUserId: source.user_id,
        migratedAt: nowIso,
      },
    };
  }

  /**
   * 8. Notification Preferences: maps to users/{uid}/notificationPreferences/main
   */
  static mapNotificationPreferences(source: any, firebaseUid: string) {
    const nowIso = new Date().toISOString();
    return {
      userId: firebaseUid,
      emailAlertsEnabled: Boolean(source.email_alerts_enabled ?? true),
      severeSmogThreshold: source.severe_smog_threshold ?? 300,
      dailyBriefingTime: source.daily_briefing_time || "07:00:00",
      createdAt: source.created_at || nowIso,
      updatedAt: source.updated_at || nowIso,
      _migrationMeta: {
        sourceSupabaseUserId: source.user_id,
        migratedAt: nowIso,
      },
    };
  }

  /**
   * Generic router mapping by domain.
   */
  static mapRecord(domain: MigrationDomain, source: any, firebaseUid: string) {
    switch (domain) {
      case "profiles":
        return this.mapProfile(source, firebaseUid);
      case "preferences":
        return this.mapPreferences(source, firebaseUid);
      case "householdMembers":
        return this.mapHouseholdMember(source, firebaseUid);
      case "savedRoutines":
        return this.mapSavedRoutine(source, firebaseUid);
      case "chatSessions":
        return this.mapChatSession(source, firebaseUid);
      case "chatMessages":
        return this.mapChatMessage(source, firebaseUid);
      case "sustainabilityActions":
        return this.mapSustainabilityAction(source, firebaseUid);
      case "notificationPreferences":
        return this.mapNotificationPreferences(source, firebaseUid);
      default:
        throw new Error(`Unsupported domain for mapping: ${domain}`);
    }
  }
}
