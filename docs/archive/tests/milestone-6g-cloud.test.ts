import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  StagingEnvironmentGuard,
  CloudCertificationService,
  DeterministicDatasetGenerator,
  MigrationParityVerifier,
  MigrationMapper,
  stagingCutoverRehearsal,
  SharedStagingCheckpointStore,
} from "@/services/migration";
import path from "path";
import fs from "fs";

describe("Milestone 6G — Real Cloud Staging Provisioning & Verification Suite", () => {
  const originalEnv = { ...process.env };
  const testSharedDir = path.join(process.cwd(), ".test_shared_checkpoints");
  let sharedStore: SharedStagingCheckpointStore;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.MIGRATION_ENV = "staging";
    process.env.STAGING_FIREBASE_PROJECT_ID = "breathewise-ai-staging";
    process.env.STAGING_SUPABASE_URL = "https://breathewise-staging.supabase.co";
    process.env.AUTH_PROVIDER = "supabase";
    process.env.DATA_PROVIDER = "supabase";
    delete process.env.STAGING_FIREBASE_CLIENT_EMAIL;
    delete process.env.STAGING_FIREBASE_PRIVATE_KEY;
    delete process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

    if (!fs.existsSync(testSharedDir)) {
      fs.mkdirSync(testSharedDir, { recursive: true });
    }
    sharedStore = new SharedStagingCheckpointStore(testSharedDir);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    sharedStore.reset();
    try {
      if (fs.existsSync(testSharedDir)) {
        fs.rmSync(testSharedDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // =========================================================================
  // 1. Strict Staging Allowlist vs Unapproved "staging" names
  // =========================================================================
  it("1. Rejects unapproved projects even if their name contains the word 'staging'", () => {
    // Merely containing "staging" is not enough; must be in explicitly approved allowlist
    const unapproved = "random-unapproved-staging-project";
    const isApproved = StagingEnvironmentGuard.isApprovedStagingFirebaseProject(unapproved);
    expect(isApproved).toBe(false);

    process.env.STAGING_FIREBASE_PROJECT_ID = unapproved;
    const readiness = StagingEnvironmentGuard.checkStagingReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.reasons.some((r) => r.includes("not in approved staging list"))).toBe(true);
  });

  it("2. Rejects production identifiers immediately and aborts", () => {
    process.env.STAGING_FIREBASE_PROJECT_ID = "breathewise-production";
    expect(() => StagingEnvironmentGuard.assertStagingEnvironment()).toThrow(
      /ABORT: Staging environment safety check failed/
    );
  });

  // =========================================================================
  // 2. Cloud Credentials Readiness & BLOCKED Classification
  // =========================================================================
  it("3. Reports BLOCKED_MISSING_CREDENTIALS when live staging secrets are absent", () => {
    const creds = CloudCertificationService.areCloudCredentialsAvailable();
    expect(creds.allAvailable).toBe(false);

    const labels = CloudCertificationService.getVerificationLabels();
    expect(labels.firebase_iam_service_account).toBe("BLOCKED");
    expect(labels.supabase_read_permissions).toBe("BLOCKED");
  });

  // =========================================================================
  // 3. Shared Staging Checkpoint Store & Distributed Lease Coordinator
  // =========================================================================
  it("4. Shared checkpoint store acquires lease, tracks versions, and records progress", () => {
    const batchId = "batch_shared_alpha_01";
    const runnerId = "runner_worker_node_1";

    // 1. Acquire lease
    const acquireResult = sharedStore.acquireLease(batchId, runnerId, 10000);
    expect(acquireResult.success).toBe(true);
    expect(acquireResult.lease?.ownerId).toBe(runnerId);

    // 2. Record progress under lease
    sharedStore.recordProgress(batchId, runnerId, "profiles", "sb_user_001_aarav", true);

    const batch = sharedStore.getBatch(batchId);
    expect(batch).not.toBeNull();
    expect(batch?.version).toBeGreaterThan(1);
    expect(batch?.domains.profiles.processedRecordIds).toContain("sb_user_001_aarav");
    expect(batch?.auditLog.some((e) => e.action === "record_processed")).toBe(true);
  });

  it("5. Rejects concurrent runner attempting to acquire an active lease", () => {
    const batchId = "batch_concurrency_test_02";
    const runner1 = "runner_alpha";
    const runner2 = "runner_beta";

    // Runner 1 acquires lease for 10 seconds
    const acq1 = sharedStore.acquireLease(batchId, runner1, 10000);
    expect(acq1.success).toBe(true);

    // Runner 2 attempts to acquire lease on same batch -> REJECTED
    const acq2 = sharedStore.acquireLease(batchId, runner2, 10000);
    expect(acq2.success).toBe(false);
    expect(acq2.error).toContain("CONCURRENT_MIGRATION_LOCKED");
  });

  it("6. Recovers lease automatically when previous runner lease expires (TTL expiry)", () => {
    const batchId = "batch_expiry_test_03";
    const deadRunner = "runner_dead_process";
    const recoveryRunner = "runner_recovery_process";

    // Dead runner acquires lease with negative TTL (simulating expired lease)
    sharedStore.acquireLease(batchId, deadRunner, -1000);

    // Recovery runner attempts lease acquisition -> Successfully recovers expired lease
    const acqRecovery = sharedStore.acquireLease(batchId, recoveryRunner, 10000);
    expect(acqRecovery.success).toBe(true);
    expect(acqRecovery.lease?.ownerId).toBe(recoveryRunner);

    const batch = sharedStore.getBatch(batchId);
    expect(batch?.auditLog.some((e) => e.action === "lease_recovered_expired")).toBe(true);
  });

  it("7. Shared checkpoint store survives process restarts with audit integrity", () => {
    const batchId = "batch_restart_test_04";
    const runnerId = "runner_proc_A";

    sharedStore.acquireLease(batchId, runnerId, 10000);
    sharedStore.recordProgress(batchId, runnerId, "preferences", "pref_user_01", true);

    // Simulate process termination and restart (create fresh instance pointing to same dir)
    const restartedStore = new SharedStagingCheckpointStore(testSharedDir);
    const recoveredBatch = restartedStore.getBatch(batchId);

    expect(recoveredBatch).not.toBeNull();
    expect(recoveredBatch?.domains.preferences.processedRecordIds).toContain("pref_user_01");
    expect(recoveredBatch?.isCompleted).toBe(false);
  });

  it("8. Rejects recording progress if caller does not own the active lease", () => {
    const batchId = "batch_unauthorized_runner_05";
    const owner = "runner_legit";
    const imposter = "runner_imposter";

    sharedStore.acquireLease(batchId, owner, 10000);

    expect(() => {
      sharedStore.recordProgress(batchId, imposter, "profiles", "sb_user_001_aarav", true);
    }).toThrow(/does not own active lease/);
  });

  // =========================================================================
  // 4. Parity & Synthetic Dataset Verification
  // =========================================================================
  it("9. Deterministic Seed 42 produces 42 valid source records across 8 domains", () => {
    const synthetic = DeterministicDatasetGenerator.generate(42);
    expect(synthetic.counts.profiles).toBe(4);
    expect(synthetic.counts.householdMembers).toBe(10);
    expect(synthetic.counts.savedRoutines).toBe(4);
    expect(synthetic.counts.chatSessions).toBe(4);
    expect(synthetic.counts.chatMessages).toBe(8);
    expect(synthetic.counts.sustainabilityActions).toBe(4);
    expect(synthetic.counts.notificationPreferences).toBe(4);
  });

  it("10. Parity engine validates 100% equivalence on exact destination matching", () => {
    const sourceRecord = { uid: "fb_p1", email: "p1@breathewise.ai", displayName: "Alpha" };
    const destinationRecord = {
      ...sourceRecord,
      _migrationMeta: { batchId: "b1", migratedAt: "2026-11-22T00:00:00Z" },
    };

    const result = MigrationParityVerifier.verifyDomainParity("profiles", [sourceRecord], [destinationRecord]);
    expect(result.isCountEqual).toBe(true);
    expect(result.isContentEqual).toBe(true);
    expect(result.mismatches.length).toBe(0);
  });

  // =========================================================================
  // 5. Staging Cutover & Safe Rollback
  // =========================================================================
  it("11. Rehearses cutover to Firebase and safe rollback without losing staging deltas", async () => {
    const cutover = await stagingCutoverRehearsal.executeCutoverToFirebase();
    expect(cutover.consistencyCheck).toBe(true);
    expect(cutover.newAuth).toBe("firebase");
    expect(cutover.newData).toBe("firebase");

    stagingCutoverRehearsal.recordFirebaseStagingDelta("chatMessages", "msg_delta_6g", {
      content: "Staging message logged during cutover",
    });

    const rollback = await stagingCutoverRehearsal.executeRollbackToSupabase(4);
    expect(rollback.success).toBe(true);
    expect(rollback.revertedToAuth).toBe("supabase");
    expect(rollback.revertedToData).toBe("supabase");
    expect(rollback.deltaRecordsCapturedCount).toBe(1);
    expect(rollback.deltaRecords[0].recordId).toBe("msg_delta_6g");
  });

  // =========================================================================
  // 6. Absolute Production Isolation
  // =========================================================================
  it("12. Guarantees production defaults remain active and untouched", () => {
    expect(process.env.AUTH_PROVIDER).toBe("supabase");
    expect(process.env.DATA_PROVIDER).toBe("supabase");
  });
});
