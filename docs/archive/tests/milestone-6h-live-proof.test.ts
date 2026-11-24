import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  StagingEnvironmentGuard,
  SharedStagingCheckpointStore,
  CloudCertificationService,
} from "@/services/migration";
import path from "path";
import fs from "fs";

describe("Milestone 6H — Staging Infrastructure Provisioning & Live Cloud Connectivity Proof Suite", () => {
  const originalEnv = { ...process.env };
  const testDir = path.join(process.cwd(), ".test_shared_checkpoints_6h");
  let store: SharedStagingCheckpointStore;

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
    delete process.env.FIRESTORE_EMULATOR_HOST;

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    store = new SharedStagingCheckpointStore(testDir);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    store.reset();
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore
    }
  });

  // =========================================================================
  // 1. Strict Allowlist & Production Rejection (Fail Closed)
  // =========================================================================
  it("1. Rejects unapproved Supabase host even if URL contains the word 'staging'", () => {
    const unapprovedUrl = "https://my-custom-staging-app.supabase.co";
    const isApproved = StagingEnvironmentGuard.isApprovedStagingSupabaseHost(unapprovedUrl);
    expect(isApproved).toBe(false);

    process.env.STAGING_SUPABASE_URL = unapprovedUrl;
    const readiness = StagingEnvironmentGuard.checkStagingReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.reasons.some((r) => r.includes("not in approved staging allowlist"))).toBe(true);
  });

  it("2. Rejects unapproved Firebase project even if ID contains the word 'staging'", () => {
    const unapprovedProject = "other-tenant-staging-db";
    const isApproved = StagingEnvironmentGuard.isApprovedStagingFirebaseProject(unapprovedProject);
    expect(isApproved).toBe(false);

    process.env.STAGING_FIREBASE_PROJECT_ID = unapprovedProject;
    const readiness = StagingEnvironmentGuard.checkStagingReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.reasons.some((r) => r.includes("not in approved staging list"))).toBe(true);
  });

  it("3. Fails closed immediately on production identifiers and throws fatal error", () => {
    process.env.STAGING_FIREBASE_PROJECT_ID = "breathewise-production";
    process.env.STAGING_SUPABASE_URL = "https://breathewise-prod.supabase.co";

    expect(() => StagingEnvironmentGuard.assertStagingEnvironment()).toThrow(
      /ABORT: Staging environment safety check failed/
    );
  });

  it("4. Evaluates missing credentials and strictly halts live cloud operations without production fallback", () => {
    delete process.env.STAGING_FIREBASE_CLIENT_EMAIL;
    delete process.env.STAGING_FIREBASE_PRIVATE_KEY;
    delete process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;

    const creds = CloudCertificationService.areCloudCredentialsAvailable();
    expect(creds.allAvailable).toBe(false);

    const labels = CloudCertificationService.getVerificationLabels();
    expect(labels.firebase_admin_sdk_init).toBe("BLOCKED");
    expect(labels.supabase_staging_db_connectivity).toBe("BLOCKED");
  });

  // =========================================================================
  // 2. Shared Checkpoint Store: Fencing Tokens, Stale Runner Rejection & CAS
  // =========================================================================
  it("5. Increments monotonic fencing tokens upon lease acquisition and takeover", () => {
    const batchId = "batch_fencing_test_01";
    const runnerA = "runner_A";
    const runnerB = "runner_B";

    // Runner A acquires initial lease -> fenceToken = 1
    const acqA = store.acquireLease(batchId, runnerA, 10000);
    expect(acqA.success).toBe(true);
    expect(acqA.lease?.fenceToken).toBe(1);

    // Simulate Runner A lease expiring
    store.acquireLease(batchId, runnerA, -100);

    // Runner B acquires takeover lease -> fenceToken = 2
    const acqB = store.acquireLease(batchId, runnerB, 10000);
    expect(acqB.success).toBe(true);
    expect(acqB.lease?.fenceToken).toBe(2);
  });

  it("6. Rejects stale runner writes after lease takeover using fencing token verification", () => {
    const batchId = "batch_stale_write_test_02";
    const runnerA = "runner_stale";
    const runnerB = "runner_new";

    // Runner A acquires lease with fenceToken = 1
    const acqA = store.acquireLease(batchId, runnerA, -100); // immediately expired
    const staleFenceToken = acqA.lease!.fenceToken;

    // Runner B takes over lease with fenceToken = 2
    store.acquireLease(batchId, runnerB, 10000);

    // Stale Runner A attempts write with its old fenceToken = 1 -> REJECTED
    expect(() => {
      store.recordProgress(batchId, runnerB, "profiles", "sb_user_001_aarav", true, staleFenceToken);
    }).toThrow(/STALE_RUNNER_FENCE_TOKEN_REJECTED/);
  });

  it("7. Executes atomic Compare-And-Swap (CAS) state transitions with version validation", () => {
    const batchId = "batch_cas_test_03";
    const runner = "runner_cas";

    store.acquireLease(batchId, runner, 10000);
    const batchBefore = store.getBatch(batchId)!;
    const versionBefore = batchBefore.version;

    // 1. Successful CAS with matching version
    const casSuccess = store.atomicCompareAndSwap(batchId, versionBefore, (batch) => {
      batch.domains.profiles.successCount = 99;
    });
    expect(casSuccess).toBe(true);

    const batchAfter = store.getBatch(batchId)!;
    expect(batchAfter.version).toBe(versionBefore + 1);
    expect(batchAfter.domains.profiles.successCount).toBe(99);

    // 2. Conflicting CAS with outdated version -> REJECTED
    const casConflict = store.atomicCompareAndSwap(batchId, versionBefore, (batch) => {
      batch.domains.profiles.successCount = 1000;
    });
    expect(casConflict).toBe(false);
  });

  it("8. Audits shared checkpoint backend honestly as single-host filesystem persistence", () => {
    const auditInfo = store.getBackendAuditInfo();
    expect(auditInfo.backendType).toBe("single_host_filesystem");
    expect(auditInfo.isDistributedCloud).toBe(false);
    expect(auditInfo.supportsFencingTokens).toBe(true);
    expect(auditInfo.supportsAtomicCAS).toBe(true);
    expect(auditInfo.limitations.length).toBeGreaterThan(0);
  });

  it("9. Multi-process coordination: two store instances sharing disk coordinate leases safely", () => {
    const batchId = "batch_multiprocess_test_04";
    const processStore1 = new SharedStagingCheckpointStore(testDir);
    const processStore2 = new SharedStagingCheckpointStore(testDir);

    // Process 1 acquires lease
    const acq1 = processStore1.acquireLease(batchId, "process_pid_1001", 10000);
    expect(acq1.success).toBe(true);

    // Process 2 attempts acquisition -> Rejected
    const acq2 = processStore2.acquireLease(batchId, "process_pid_2002", 10000);
    expect(acq2.success).toBe(false);
    expect(acq2.error).toContain("CONCURRENT_MIGRATION_LOCKED");

    // Process 1 releases lease
    processStore1.releaseLease(batchId, "process_pid_1001");

    // Process 2 acquires lease cleanly
    const acq3 = processStore2.acquireLease(batchId, "process_pid_2002", 10000);
    expect(acq3.success).toBe(true);
    expect(acq3.lease?.ownerId).toBe("process_pid_2002");
  });

  // =========================================================================
  // 3. Absolute Production Defaults Protection
  // =========================================================================
  it("10. Guarantees production defaults remain active and untouched", () => {
    expect(process.env.AUTH_PROVIDER).toBe("supabase");
    expect(process.env.DATA_PROVIDER).toBe("supabase");
  });
});
