/**
 * Migration Zod Schemas & Record Validator
 * Validates source Supabase records and destination Firestore payloads.
 */

import { z } from "zod";
import { MigrationDomain } from "./migration-types";

// ==========================================
// SOURCE SUPABASE SCHEMAS
// ==========================================

export const SourceProfileSchema = z.object({
  id: z.string().min(1, "Profile ID required"),
  email: z.string().email("Valid email required"),
  full_name: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const SourcePreferencesSchema = z.object({
  user_id: z.string().min(1, "User ID required"),
  default_city: z.string().min(1),
  default_region: z.string().default("West Bengal"),
  default_country: z.string().default("India"),
  default_latitude: z.number(),
  default_longitude: z.number(),
  preferred_aqi_standard: z.string().default("CPCB_INDIA"),
  theme: z.string().default("system"),
  morning_commute_time: z.string().optional().nullable(),
  evening_commute_time: z.string().optional().nullable(),
  outdoor_work_hours: z.string().optional().nullable(),
  school_drop_time: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const SourceHouseholdMemberSchema = z.object({
  id: z.string().min(1, "Member ID required"),
  user_id: z.string().min(1, "User ID required"),
  name: z.string().min(1, "Name required"),
  relation: z.enum(["self", "child", "elderly", "partner", "other"]),
  age_years: z.number().int().min(0).max(120).optional().nullable(),
  vulnerability_level: z.enum(["standard", "high", "critical"]).default("standard"),
  respiratory_sensitivity: z.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const SourceRoutineItemSchema = z.object({
  id: z.string(),
  timeSlot: z.string(),
  title: z.string(),
  recommendation: z.string(),
  status: z.enum(["recommended", "caution", "avoid"]),
  impactScore: z.enum(["low_emission", "protective", "neutral"]),
});

export const SourceSavedRoutineSchema = z.object({
  id: z.string().min(1, "Routine ID required"),
  user_id: z.string().min(1, "User ID required"),
  title: z.string().min(1, "Title required"),
  target_date: z.string().optional().nullable(),
  routine_payload: z.array(SourceRoutineItemSchema),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
});

export const SourceChatSessionSchema = z.object({
  id: z.string().min(1, "Session ID required"),
  user_id: z.string().min(1, "User ID required"),
  title: z.string().default("Environmental Health Session"),
  location_name: z.string().default("Siliguri"),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const SourceChatMessageSchema = z.object({
  id: z.string().min(1, "Message ID required"),
  session_id: z.string().min(1, "Session ID required"),
  user_id: z.string().min(1, "User ID required"),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Content required"),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
  created_at: z.string().optional(),
});

export const SourceSustainabilityActionSchema = z.object({
  id: z.string().min(1, "Action ID required"),
  user_id: z.string().min(1, "User ID required"),
  category: z.enum(["commute", "waste", "energy", "home"]),
  action_description: z.string().min(1, "Description required"),
  estimated_co2_saved_kg: z.number().min(0),
  estimated_particulate_avoided_pct: z.number().min(0).max(100).default(0),
  recorded_at: z.string().optional(),
});

export const SourceNotificationPreferencesSchema = z.object({
  user_id: z.string().min(1, "User ID required"),
  email_alerts_enabled: z.boolean().default(true),
  severe_smog_threshold: z.number().int().min(50).max(500).default(300),
  daily_briefing_time: z.string().default("07:00:00"),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// ==========================================
// VALIDATOR UTILITY
// ==========================================

export class MigrationValidator {
  /**
   * Validates a source Supabase record according to domain rules.
   */
  static validateSourceRecord(
    domain: MigrationDomain,
    data: unknown
  ): { valid: boolean; data?: any; error?: string } {
    let schema: z.ZodSchema;

    switch (domain) {
      case "profiles":
        schema = SourceProfileSchema;
        break;
      case "preferences":
        schema = SourcePreferencesSchema;
        break;
      case "householdMembers":
        schema = SourceHouseholdMemberSchema;
        break;
      case "savedRoutines":
        schema = SourceSavedRoutineSchema;
        break;
      case "chatSessions":
        schema = SourceChatSessionSchema;
        break;
      case "chatMessages":
        schema = SourceChatMessageSchema;
        break;
      case "sustainabilityActions":
        schema = SourceSustainabilityActionSchema;
        break;
      case "notificationPreferences":
        schema = SourceNotificationPreferencesSchema;
        break;
      default:
        return { valid: false, error: `Unknown migration domain: ${domain}` };
    }

    const result = schema.safeParse(data);
    if (!result.success) {
      return {
        valid: false,
        error: result.error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join(", "),
      };
    }

    return { valid: true, data: result.data };
  }
}
