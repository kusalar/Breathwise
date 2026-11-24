/**
 * Deterministic Synthetic Dataset Generator
 * Generates reproducible, realistic test datasets across all 8 BreatheWise AI domains
 * with strict non-real health notes, edge cases, invalid records for rejection testing,
 * and deterministic seeding. Never uses real production or medical data.
 */

import { MigrationDomain, IdentityLinkRecord } from "./migration-types";

export interface SyntheticDataset {
  seed: number;
  generatedAt: string;
  counts: Record<MigrationDomain, number>;
  invalidRecordsCount: number;
  data: Record<MigrationDomain, any[]>;
  identityLinks: IdentityLinkRecord[];
  invalidRecords: Array<{ domain: MigrationDomain; record: any; reason: string }>;
}

export class DeterministicDatasetGenerator {
  /**
   * Simple Mulberry32 pseudo-random number generator for deterministic reproducibility.
   */
  private static mulberry32(seed: number) {
    return () => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Generates a complete deterministic dataset for staging tests.
   * Default seed: 42.
   */
  static generate(seed: number = 42): SyntheticDataset {
    const prng = this.mulberry32(seed);

    // 4 Primary users
    const users = [
      {
        supabaseId: "sb_user_001_aarav",
        firebaseUid: "fb_user_001_aarav",
        email: "aarav.sharma@example-synthetic.com",
        name: "Aarav Sharma",
        verified: true,
      },
      {
        supabaseId: "sb_user_002_priya",
        firebaseUid: "fb_user_002_priya",
        email: "priya.patel@example-synthetic.com",
        name: "Priya Patel",
        verified: true,
      },
      {
        supabaseId: "sb_user_003_vikram",
        firebaseUid: "fb_user_003_vikram",
        email: "vikram.mehta@example-synthetic.com",
        name: "Vikram Mehta",
        verified: true,
      },
      {
        supabaseId: "sb_user_004_unlinked",
        firebaseUid: "fb_user_004_unlinked",
        email: "unlinked.guest@example-synthetic.com",
        name: "Unlinked Guest",
        verified: false, // Testing identity linking rejection
      },
    ];

    const profiles: any[] = [];
    const preferences: any[] = [];
    const householdMembers: any[] = [];
    const savedRoutines: any[] = [];
    const chatSessions: any[] = [];
    const chatMessages: any[] = [];
    const sustainabilityActions: any[] = [];
    const notificationPreferences: any[] = [];
    const identityLinks: IdentityLinkRecord[] = [];
    const invalidRecords: Array<{ domain: MigrationDomain; record: any; reason: string }> = [];

    // Historical base timestamp
    const baseEpoch = 1731974400000; // Nov 19, 2024

    users.forEach((u, uIdx) => {
      const createdAt = new Date(baseEpoch + uIdx * 86400000).toISOString();
      const updatedAt = new Date(baseEpoch + (uIdx + 1) * 86400000).toISOString();

      // 1. Profile
      profiles.push({
        id: u.supabaseId,
        email: u.email,
        full_name: u.name,
        avatar_url: `https://avatars.example.com/${u.name.toLowerCase().replace(" ", "_")}.png`,
        created_at: createdAt,
        updated_at: updatedAt,
      });

      // Identity link record
      identityLinks.push({
        supabaseUserId: u.supabaseId,
        firebaseUid: u.firebaseUid,
        supabaseEmail: u.email,
        firebaseEmail: u.email,
        verificationStatus: u.verified ? "verified" : "manual_resolution_required",
        verificationMethod: u.verified ? "cryptographic_proof" : "manual_admin_audit",
        linkedAt: createdAt,
        migrationStatus: "unmigrated",
      });

      // 2. Preferences (with optional and nullable fields)
      preferences.push({
        user_id: u.supabaseId,
        default_city: uIdx === 0 ? "Delhi" : uIdx === 1 ? "Mumbai" : "Bengaluru",
        default_region: uIdx === 0 ? "Delhi NCT" : uIdx === 1 ? "Maharashtra" : "Karnataka",
        default_country: "India",
        default_latitude: 28.6139 + prng() * 0.05,
        default_longitude: 77.209 + prng() * 0.05,
        morning_commute_time: uIdx % 2 === 0 ? "08:15" : null, // nullable testing
        evening_commute_time: "17:45",
        preferred_aqi_standard: uIdx % 2 === 0 ? "CPCB_INDIA" : "US_EPA",
        theme: "dark",
        created_at: createdAt,
      });

      // 3. Household Members (including synthetic vulnerable profiles)
      const memberCount = (uIdx % 2) + 2; // 2 or 3 members
      for (let m = 0; m < memberCount; m++) {
        const isVulnerable = m === 0;
        householdMembers.push({
          id: `member_${u.supabaseId}_00${m + 1}`,
          user_id: u.supabaseId,
          name: m === 0 ? `${u.name.split(" ")[0]} Jr` : `Elder ${m}`,
          relation: m === 0 ? "child" : "elderly",
          age_years: m === 0 ? 6 : 68,
          vulnerability_level: isVulnerable ? "high" : "standard",
          respiratory_sensitivity: isVulnerable,
          // Synthetic, explicitly fictitious health note
          notes: isVulnerable
            ? "Synthetic test: Mild winter seasonal wheeze, advised HEPA filtration indoors"
            : null,
          created_at: createdAt,
        });
      }

      // 4. Saved Routines
      savedRoutines.push({
        id: `routine_${u.supabaseId}_001`,
        user_id: u.supabaseId,
        title: "Morning Smog Mitigation",
        routine_payload: [
          {
            id: `item_${u.supabaseId}_1`,
            timeSlot: "07:00",
            title: "Morning Smog Mitigation",
            recommendation: "Inspect AQI sensor and seal window drafts",
            status: "recommended",
            impactScore: "protective",
          },
        ],
        is_active: true,
        created_at: createdAt,
      });

      // 5. Chat Sessions & Messages
      const sessionId = `session_${u.supabaseId}_001`;
      chatSessions.push({
        id: sessionId,
        user_id: u.supabaseId,
        title: "Winter Smog Defense Query",
        summary: "Discussion on PM2.5 levels in Delhi NCR and school trip precautions",
        created_at: createdAt,
        updated_at: updatedAt,
      });

      chatMessages.push({
        id: `msg_${sessionId}_001`,
        session_id: sessionId,
        user_id: u.supabaseId,
        role: "user",
        content: "What is the expected PM2.5 spike tomorrow morning between 7 AM and 9 AM?",
        metadata: { client: "web-dashboard" },
        created_at: createdAt,
      });

      chatMessages.push({
        id: `msg_${sessionId}_002`,
        session_id: sessionId,
        user_id: u.supabaseId,
        role: "assistant",
        content: "Based on CPCB data and thermal inversion patterns, PM2.5 will likely reach 280-320 ug/m3.",
        metadata: { model: "gemini-2.0-flash", citations: ["CPCB", "Open-Meteo"] },
        created_at: new Date(new Date(createdAt).getTime() + 60000).toISOString(),
      });

      // 6. Sustainability Actions
      sustainabilityActions.push({
        id: `action_${u.supabaseId}_001`,
        user_id: u.supabaseId,
        category: "commute",
        action_description: "Metro Commute instead of Car",
        estimated_co2_saved_kg: 3.4,
        estimated_particulate_avoided_pct: 15,
        recorded_at: createdAt,
      });

      // 7. Notification Preferences
      notificationPreferences.push({
        user_id: u.supabaseId,
        email_alerts_enabled: true,
        severe_smog_threshold: 200,
        daily_briefing_time: "07:00:00",
        created_at: createdAt,
      });
    });

    // 8. Controlled Rejection Testing Records (Invalid payloads)
    invalidRecords.push({
      domain: "profiles",
      record: {
        id: "sb_user_invalid_email",
        email: "not-an-email-address", // Invalid email regex
        full_name: "Invalid User",
        created_at: new Date().toISOString(),
      },
      reason: "Malformed email address fails Zod schema validation",
    });

    invalidRecords.push({
      domain: "chatMessages",
      record: {
        id: "msg_orphan_999",
        session_id: "session_non_existent_999", // Orphan check
        user_id: "sb_user_001_aarav",
        role: "user",
        content: "Orphan message without parent session",
        created_at: new Date().toISOString(),
      },
      reason: "Missing parent chat session violates relational integrity",
    });

    invalidRecords.push({
      domain: "sustainabilityActions",
      record: {
        id: "action_invalid_co2",
        user_id: "sb_user_001_aarav",
        category: "transit",
        action_name: "Negative savings test",
        impact_score: -10, // Invalid negative score
        co2_saved_kg: -5.0,
        logged_at: new Date().toISOString(),
      },
      reason: "Negative CO2 savings and impact score violates domain constraints",
    });

    const counts: Record<MigrationDomain, number> = {
      profiles: profiles.length,
      preferences: preferences.length,
      householdMembers: householdMembers.length,
      savedRoutines: savedRoutines.length,
      chatSessions: chatSessions.length,
      chatMessages: chatMessages.length,
      sustainabilityActions: sustainabilityActions.length,
      notificationPreferences: notificationPreferences.length,
    };

    return {
      seed,
      generatedAt: new Date().toISOString(),
      counts,
      invalidRecordsCount: invalidRecords.length,
      data: {
        profiles,
        preferences,
        householdMembers,
        savedRoutines,
        chatSessions,
        chatMessages,
        sustainabilityActions,
        notificationPreferences,
      },
      identityLinks,
      invalidRecords,
    };
  }
}
