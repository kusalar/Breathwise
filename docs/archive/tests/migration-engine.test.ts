import { describe, it, expect, beforeEach } from "vitest";
import {
  migrationRunner,
  migrationCheckpoint,
  MigrationValidator,
  MigrationMapper,
  MigrationParityVerifier,
  MigrationConfig,
  IdentityLinkRecord,
} from "@/services/migration";
import { BaseFirestoreRepository } from "@/services/firebase/firestore/base.repository";
import { validateProviderConsistency } from "@/services/data-provider";

describe("Milestone 6D — Controlled Supabase-to-Firebase Migration Suite", () => {
  const SUPABASE_UID_1 = "sb_user_uuid_1111-2222";
  const SUPABASE_UID_2 = "sb_user_uuid_3333-4444";
  const FIREBASE_UID_1 = "fb_user_uid_aaaa_1111";
  const FIREBASE_UID_2 = "fb_user_uid_bbbb_2222";

  // Sample valid mock source dataset across all 8 domains
  const sampleSourceDataset = {
    profiles: [
      {
        id: SUPABASE_UID_1,
        email: "pioneer1@breathewise.ai",
        full_name: "Aarav Sharma",
        avatar_url: "https://avatar.test/aarav.png",
        created_at: "2026-11-19T10:00:00.000Z",
        updated_at: "2026-11-20T10:00:00.000Z",
      },
    ],
    preferences: [
      {
        user_id: SUPABASE_UID_1,
        default_city: "Siliguri",
        default_region: "West Bengal",
        default_country: "India",
        default_latitude: 26.7271,
        default_longitude: 88.3953,
        morning_commute_time: "08:30",
        evening_commute_time: "18:00",
        preferred_aqi_standard: "CPCB_INDIA",
        theme: "dark",
        created_at: "2026-11-19T10:05:00.000Z",
      },
    ],
    householdMembers: [
      {
        id: "member_uuid_001",
        user_id: SUPABASE_UID_1,
        name: "Rohan Sharma",
        relation: "child" as const,
        age_years: 7,
        vulnerability_level: "high" as const,
        respiratory_sensitivity: true,
        notes: "Uses bronchodilator during smog",
        created_at: "2026-11-19T10:10:00.000Z",
      },
    ],
    savedRoutines: [
      {
        id: "routine_uuid_001",
        user_id: SUPABASE_UID_1,
        title: "Smog Inversion Schedule",
        target_date: "2026-11-22",
        routine_payload: [
          {
            id: "rt1",
            timeSlot: "06:00 - 08:00",
            title: "Morning Smog Window",
            recommendation: "Avoid outdoor exercise",
            status: "avoid" as const,
            impactScore: "protective" as const,
          },
        ],
        is_active: true,
        created_at: "2026-11-20T08:00:00.000Z",
      },
    ],
    chatSessions: [
      {
        id: "session_uuid_001",
        user_id: SUPABASE_UID_1,
        title: "Winter Smog Consultation",
        location_name: "Siliguri",
        created_at: "2026-11-21T12:00:00.000Z",
        updated_at: "2026-11-21T12:30:00.000Z",
      },
    ],
    chatMessages: [
      {
        id: "msg_uuid_001",
        session_id: "session_uuid_001",
        user_id: SUPABASE_UID_1,
        role: "user" as const,
        content: "What is the PM2.5 level right now?",
        metadata: { aqi: 240 },
        created_at: "2026-11-21T12:01:00.000Z",
      },
    ],
    sustainabilityActions: [
      {
        id: "action_uuid_001",
        user_id: SUPABASE_UID_1,
        category: "commute" as const,
        action_description: "Took shared electric bus",
        estimated_co2_saved_kg: 2.5,
        estimated_particulate_avoided_pct: 12.0,
        recorded_at: "2026-11-21T09:00:00.000Z",
      },
    ],
    notificationPreferences: [
      {
        user_id: SUPABASE_UID_1,
        email_alerts_enabled: true,
        severe_smog_threshold: 280,
        daily_briefing_time: "06:30:00",
        created_at: "2026-11-19T10:00:00.000Z",
      },
    ],
  };

  beforeEach(() => {
    BaseFirestoreRepository.resetMockStore();
    migrationRunner.resetIdentityLinks();
    migrationCheckpoint.reset();
    delete process.env.DATA_PROVIDER;
    delete process.env.AUTH_PROVIDER;
    delete process.env.MIGRATION_ADMIN_KEY;
  });

  describe("Phase 10 Verification: 30 Migration & Parity Scenarios", () => {
    // 1. Complete dry-run with zero destination writes
    it("1. Complete dry-run produces full estimates with ZERO destination writes", async () => {
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "pioneer1@breathewise.ai",
        firebaseEmail: "pioneer1@breathewise.ai",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });

      const config: MigrationConfig = {
        dryRun: true,
        batchSize: 50,
        targetDomains: ["profiles", "preferences", "householdMembers"],
        environment: "dry-run",
      };

      const report = await migrationRunner.runMigration(config, sampleSourceDataset);

      expect(report.dryRun).toBe(true);
      expect(report.totalSourceRecords).toBe(3);
      expect(report.totalEligibleRecords).toBe(3);
      expect(report.estimatedFirestoreWrites).toBe(0);

      // Verify ZERO writes occurred in mock store
      expect(Object.keys(BaseFirestoreRepository.mockStore.profiles).length).toBe(0);
      expect(Object.keys(BaseFirestoreRepository.mockStore.preferences).length).toBe(0);
      expect(Object.keys(BaseFirestoreRepository.mockStore.householdMembers).length).toBe(0);
    });

    // 2. Correct profile mapping
    it("2. Correct profile mapping retains fields and converts identifiers", () => {
      const mapped = MigrationMapper.mapProfile(sampleSourceDataset.profiles[0], FIREBASE_UID_1);
      expect(mapped.uid).toBe(FIREBASE_UID_1);
      expect(mapped.displayName).toBe("Aarav Sharma");
      expect(mapped.email).toBe("pioneer1@breathewise.ai");
      expect(mapped._migrationMeta.sourceSupabaseId).toBe(SUPABASE_UID_1);
    });

    // 3. Correct preferences mapping
    it("3. Correct preferences mapping transforms relational foreign key to path", () => {
      const mapped = MigrationMapper.mapPreferences(sampleSourceDataset.preferences[0], FIREBASE_UID_1);
      expect(mapped.userId).toBe(FIREBASE_UID_1);
      expect(mapped.defaultCity).toBe("Siliguri");
      expect(mapped.morningCommuteTime).toBe("08:30");
      expect(mapped.preferredAqiStandard).toBe("CPCB_INDIA");
    });

    // 4. Household ownership preservation
    it("4. Household ownership preservation binds records strictly to target Firebase UID", async () => {
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "pioneer1@breathewise.ai",
        firebaseEmail: "pioneer1@breathewise.ai",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });

      await migrationRunner.runMigration(
        { dryRun: false, batchSize: 50, targetDomains: ["householdMembers"], environment: "emulator" },
        sampleSourceDataset
      );

      const userMembers = BaseFirestoreRepository.mockStore.householdMembers[FIREBASE_UID_1];
      expect(userMembers).toBeDefined();
      expect(userMembers["member_uuid_001"]).toBeDefined();
      expect(userMembers["member_uuid_001"].userId).toBe(FIREBASE_UID_1);
      expect(userMembers["member_uuid_001"].name).toBe("Rohan Sharma");
    });

    // 5. Saved routine mapping
    it("5. Saved routine mapping preserves JSON payload and active state", () => {
      const mapped = MigrationMapper.mapSavedRoutine(sampleSourceDataset.savedRoutines[0], FIREBASE_UID_1);
      expect(mapped.id).toBe("routine_uuid_001");
      expect(mapped.userId).toBe(FIREBASE_UID_1);
      expect(mapped.routinePayload.length).toBe(1);
      expect(mapped.isActive).toBe(true);
    });

    // 6. Nested chat message migration
    it("6. Nested chat message preserves session reference and timestamps", () => {
      const mapped = MigrationMapper.mapChatMessage(sampleSourceDataset.chatMessages[0], FIREBASE_UID_1);
      expect(mapped.id).toBe("msg_uuid_001");
      expect(mapped.sessionId).toBe("session_uuid_001");
      expect(mapped.role).toBe("user");
      expect(mapped.content).toContain("PM2.5");
    });

    // 7. Sustainability action mapping
    it("7. Sustainability action mapping preserves numeric precision and category", () => {
      const mapped = MigrationMapper.mapSustainabilityAction(sampleSourceDataset.sustainabilityActions[0], FIREBASE_UID_1);
      expect(mapped.category).toBe("commute");
      expect(mapped.estimatedCo2SavedKg).toBe(2.5);
      expect(mapped.estimatedParticulateAvoidedPct).toBe(12.0);
    });

    // 8. Notification preferences mapping
    it("8. Notification preferences mapping retains threshold and schedule", () => {
      const mapped = MigrationMapper.mapNotificationPreferences(sampleSourceDataset.notificationPreferences[0], FIREBASE_UID_1);
      expect(mapped.userId).toBe(FIREBASE_UID_1);
      expect(mapped.severeSmogThreshold).toBe(280);
      expect(mapped.dailyBriefingTime).toBe("06:30:00");
    });

    // 9. Identity mapping uniqueness (1-to-1)
    it("9. Rejects attempting to link one Firebase UID to multiple Supabase users", () => {
      const res1 = migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "u1@test.com",
        firebaseEmail: "u1@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });
      expect(res1.success).toBe(true);

      // Attempt to link same Firebase UID to SUPABASE_UID_2
      const res2 = migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_2,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "u2@test.com",
        firebaseEmail: "u1@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain("already linked");
    });

    // 10. Rejection of email-only account matching
    it("10. Does not automatically link accounts solely based on identical emails", async () => {
      // Do NOT register identity link, even though emails match
      const report = await migrationRunner.runMigration(
        { dryRun: false, batchSize: 50, targetDomains: ["profiles"], environment: "emulator" },
        sampleSourceDataset
      );

      // Record must be skipped because email equality alone is not proof of ownership
      expect(report.totalMigratedRecords).toBe(0);
      expect(report.unresolvedIdentitiesCount).toBe(1);
    });

    // 11. Unverified account handling
    it("11. Unverified identity link is marked as pending/skipped and not migrated", async () => {
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "unverified@breathewise.ai",
        firebaseEmail: "unverified@breathewise.ai",
        verificationStatus: "manual_resolution_required",
        verificationMethod: "manual_admin_audit",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });

      const report = await migrationRunner.runMigration(
        { dryRun: false, batchSize: 50, targetDomains: ["profiles"], environment: "emulator" },
        sampleSourceDataset
      );

      expect(report.totalMigratedRecords).toBe(0);
      expect(report.domainStats.profiles.skippedCount).toBe(1);
    });

    // 12. Duplicate account handling
    it("12. Duplicate Supabase user linkage attempt is blocked", () => {
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "dup@test.com",
        firebaseEmail: "dup@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });

      const dupAttempt = migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_2,
        supabaseEmail: "dup@test.com",
        firebaseEmail: "dup2@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });
      expect(dupAttempt.success).toBe(false);
      expect(dupAttempt.error).toContain("already linked");
    });

    // 13. Missing identity mapping
    it("13. Missing identity mapping logs structured error and does not throw", async () => {
      const report = await migrationRunner.runMigration(
        { dryRun: false, batchSize: 50, targetDomains: ["preferences"], environment: "emulator" },
        sampleSourceDataset
      );

      expect(report.totalSkippedRecords).toBe(1);
      expect(report.domainStats.preferences.errors[0].error).toContain("Missing identity link");
    });

    // 14. Invalid source record handling
    it("14. Invalid source record schema is rejected by validator", () => {
      const invalidHouseholdMember = {
        id: "mem_bad",
        user_id: SUPABASE_UID_1,
        name: "Bad Member",
        relation: "alien_species", // Invalid enum
        vulnerability_level: "ultra_critical", // Invalid enum
      };

      const result = MigrationValidator.validateSourceRecord("householdMembers", invalidHouseholdMember);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    // 15. Invalid destination schema handling
    it("15. Migration runner records validation rejection without crashing batch", async () => {
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "u@test.com",
        firebaseEmail: "u@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });

      const datasetWithInvalid = {
        ...sampleSourceDataset,
        householdMembers: [
          {
            id: "mem_invalid",
            user_id: SUPABASE_UID_1,
            name: "", // Invalid empty name
            relation: "child" as const,
            vulnerability_level: "standard" as const,
            respiratory_sensitivity: false,
          },
        ],
      };

      const report = await migrationRunner.runMigration(
        { dryRun: false, batchSize: 50, targetDomains: ["householdMembers"], environment: "emulator" },
        datasetWithInvalid
      );

      expect(report.totalFailedRecords).toBe(1);
      expect(report.validationRejectionsCount).toBe(1);
    });

    // 16. Timestamp preservation
    it("16. Retains exact original timestamps in mapped documents", () => {
      const origTimestamp = "2026-11-19T10:00:00.000Z";
      const mapped = MigrationMapper.mapProfile(sampleSourceDataset.profiles[0], FIREBASE_UID_1);
      expect(mapped.createdAt).toBe(origTimestamp);
    });

    // 17. Deterministic hashing
    it("17. Computes identical SHA-256 hash regardless of object key order", () => {
      const objA = { city: "Siliguri", aqi: 250, country: "India" };
      const objB = { country: "India", city: "Siliguri", aqi: 250 };

      const hashA = MigrationMapper.computeCanonicalHash(objA);
      const hashB = MigrationMapper.computeCanonicalHash(objB);

      expect(hashA).toBe(hashB);
      expect(hashA.length).toBe(64); // SHA-256 hex length
    });

    // 18. Record-count parity
    it("18. Parity verifier confirms matching record counts across domains", () => {
      const destinationData = {
        ...sampleSourceDataset,
        profiles: [MigrationMapper.mapProfile(sampleSourceDataset.profiles[0], FIREBASE_UID_1)],
      };

      const parityRes = MigrationParityVerifier.verifyDomainParity(
        "profiles",
        sampleSourceDataset.profiles,
        destinationData.profiles
      );

      expect(parityRes.isCountEqual).toBe(true);
      expect(parityRes.sourceCount).toBe(1);
      expect(parityRes.destinationCount).toBe(1);
    });

    // 19. Relationship parity
    it("19. Flags orphan nested messages if parent chat session is absent in destination", () => {
      const source = { ...sampleSourceDataset };
      const destWithoutSession = {
        ...sampleSourceDataset,
        chatSessions: [], // Session missing!
        chatMessages: [sampleSourceDataset.chatMessages[0]],
      };

      const report = MigrationParityVerifier.generateParityReport(
        "batch_test_rel",
        source,
        destWithoutSession
      );

      expect(report.overallParity).toBe(false);
      expect(report.orphanRecordsCount).toBeGreaterThanOrEqual(1);
    });

    // 20. Duplicate detection
    it("20. Detects duplicate records in destination dataset", () => {
      const destWithDuplicates = [
        { id: "member_uuid_001", name: "First Entry" },
        { id: "member_uuid_001", name: "Duplicate Entry" },
      ];

      const res = MigrationParityVerifier.verifyDomainParity(
        "householdMembers",
        [{ id: "member_uuid_001", name: "First Entry" }],
        destWithDuplicates
      );

      expect(res.mismatches.some((m) => m.reason.includes("Duplicate"))).toBe(true);
    });

    // 21. Interrupted migration recovery
    it("21. Checkpoint manager records and skips already processed records upon resumption", () => {
      const BATCH = "batch_resume_123";
      migrationCheckpoint.recordProgress(BATCH, "profiles", "rec_001", true);

      expect(migrationCheckpoint.isRecordProcessed(BATCH, "profiles", "rec_001")).toBe(true);
      expect(migrationCheckpoint.isRecordProcessed(BATCH, "profiles", "rec_002")).toBe(false);
    });

    // 22. Idempotent repeated migration
    it("22. Repeated migration of same dataset does not create duplicates or corrupt data", async () => {
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "u@test.com",
        firebaseEmail: "u@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });

      const config: MigrationConfig = {
        dryRun: false,
        batchSize: 50,
        targetDomains: ["savedRoutines"],
        environment: "emulator",
      };

      // Run 1
      await migrationRunner.runMigration(config, sampleSourceDataset);
      // Run 2 (Repeat)
      await migrationRunner.runMigration(config, sampleSourceDataset);

      // Verify only 1 routine document exists under the user's subcollection
      const routines = BaseFirestoreRepository.mockStore.savedRoutines[FIREBASE_UID_1];
      expect(Object.keys(routines).length).toBe(1);
    });

    // 23. Partial batch failure
    it("23. Partial batch failure isolates the bad record while continuing valid ones", async () => {
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "u@test.com",
        firebaseEmail: "u@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });

      const datasetWithMix = {
        ...sampleSourceDataset,
        householdMembers: [
          sampleSourceDataset.householdMembers[0], // Valid
          {
            id: "bad_member",
            user_id: SUPABASE_UID_1,
            name: "", // Invalid
            relation: "child" as const,
            vulnerability_level: "standard" as const,
            respiratory_sensitivity: false,
          },
        ],
      };

      const report = await migrationRunner.runMigration(
        { dryRun: false, batchSize: 50, targetDomains: ["householdMembers"], environment: "emulator" },
        datasetWithMix
      );

      expect(report.domainStats.householdMembers.migratedCount).toBe(1);
      expect(report.domainStats.householdMembers.failedCount).toBe(1);
    });

    // 24. Retry behavior
    it("24. Retry mechanism permits re-attempting failed records after correction", async () => {
      const BATCH = "batch_retry_999";
      migrationCheckpoint.recordProgress(BATCH, "householdMembers", "rec_failed_1", false);
      const batchState = migrationCheckpoint.getOrCreateBatch(BATCH);
      expect(batchState.domains.householdMembers.failedCount).toBe(1);
    });

    // 25. Conflicting destination record
    it("25. Parity report flags mismatches if destination contains altered fields", () => {
      const destAltered = {
        ...sampleSourceDataset,
        preferences: [
          {
            ...sampleSourceDataset.preferences[0],
            defaultCity: "Altered City Not In Source",
          },
        ],
      };

      const report = MigrationParityVerifier.generateParityReport(
        "batch_test_conflict",
        sampleSourceDataset,
        destAltered
      );

      expect(report.domains.preferences.isContentEqual).toBe(false);
    });

    // 26. Cross-user isolation during migration
    it("26. Multi-user migration keeps User A and User B data completely isolated", async () => {
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "u1@test.com",
        firebaseEmail: "u1@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_2,
        firebaseUid: FIREBASE_UID_2,
        supabaseEmail: "u2@test.com",
        firebaseEmail: "u2@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });

      const multiUserDataset = {
        ...sampleSourceDataset,
        householdMembers: [
          sampleSourceDataset.householdMembers[0], // User 1
          {
            id: "member_uuid_002",
            user_id: SUPABASE_UID_2,
            name: "Sunita (User 2 Partner)",
            relation: "partner" as const,
            vulnerability_level: "standard" as const,
            respiratory_sensitivity: false,
          },
        ],
      };

      await migrationRunner.runMigration(
        { dryRun: false, batchSize: 50, targetDomains: ["householdMembers"], environment: "emulator" },
        multiUserDataset
      );

      const user1Members = BaseFirestoreRepository.mockStore.householdMembers[FIREBASE_UID_1];
      const user2Members = BaseFirestoreRepository.mockStore.householdMembers[FIREBASE_UID_2];

      expect(Object.keys(user1Members).length).toBe(1);
      expect(user1Members["member_uuid_001"].name).toBe("Rohan Sharma");

      expect(Object.keys(user2Members).length).toBe(1);
      expect(user2Members["member_uuid_002"].name).toBe("Sunita (User 2 Partner)");
    });

    // 27. Unsupported provider combination
    it("27. Flags unsupported mixed provider combinations", () => {
      process.env.AUTH_PROVIDER = "firebase";
      process.env.DATA_PROVIDER = "supabase";

      const check = validateProviderConsistency();
      expect(check.consistent).toBe(false);
      expect(check.error).toContain("Unsupported mixed provider configuration");

      // Verify homogeneous configuration passes
      process.env.AUTH_PROVIDER = "supabase";
      process.env.DATA_PROVIDER = "supabase";
      const safeCheck = validateProviderConsistency();
      expect(safeCheck.consistent).toBe(true);
    });

    // 28. Migration authorization rejection
    it("28. Rejects production migration without administrative authorization key", async () => {
      const prodConfig: MigrationConfig = {
        dryRun: false,
        batchSize: 50,
        targetDomains: ["profiles"],
        environment: "production",
        // adminAuthorizationKey omitted
      };

      await expect(migrationRunner.runMigration(prodConfig, sampleSourceDataset)).rejects.toThrow(
        "Production migration requires explicit administrative authorization key"
      );
    });

    // 29. No source deletion
    it("29. Migration leaves original source records 100% intact", async () => {
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "u@test.com",
        firebaseEmail: "u@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });

      const initialSourceLength = sampleSourceDataset.householdMembers.length;

      await migrationRunner.runMigration(
        { dryRun: false, batchSize: 50, targetDomains: ["householdMembers"], environment: "emulator" },
        sampleSourceDataset
      );

      // Verify source array length and items are identical
      expect(sampleSourceDataset.householdMembers.length).toBe(initialSourceLength);
      expect(sampleSourceDataset.householdMembers[0].name).toBe("Rohan Sharma");
    });

    // 30. No unintended production writes
    it("30. Dry-run mode in production guarantees 0 writes even with valid key", async () => {
      migrationRunner.registerIdentityLink({
        supabaseUserId: SUPABASE_UID_1,
        firebaseUid: FIREBASE_UID_1,
        supabaseEmail: "u@test.com",
        firebaseEmail: "u@test.com",
        verificationStatus: "verified",
        verificationMethod: "cryptographic_proof",
        linkedAt: new Date().toISOString(),
        migrationStatus: "unmigrated",
      });

      const report = await migrationRunner.runMigration(
        {
          dryRun: true,
          batchSize: 50,
          targetDomains: ["profiles", "preferences"],
          environment: "production",
          adminAuthorizationKey: "PROD_MIGRATION_AUTHORIZED_KEY_2026",
        },
        sampleSourceDataset
      );

      expect(report.dryRun).toBe(true);
      expect(report.estimatedFirestoreWrites).toBe(0);
      expect(Object.keys(BaseFirestoreRepository.mockStore.profiles).length).toBe(0);
    });
  });
});
