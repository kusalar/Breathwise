/**
 * Staging Migration Runner & Orchestrator
 * Executes the 10-step staging migration pipeline with strict environment isolation,
 * durable checkpointing, granular 6-tier record classification, retry safety,
 * and sensitive health note privacy protection.
 */

import {
  MigrationConfig,
  MigrationDomain,
  StagingMigrationRunReport,
  StagingRecordClassification,
  StagingRecordDetail,
  IdentityLinkRecord,
} from "./migration-types";
import { StagingEnvironmentGuard } from "./staging-guard";
import { MigrationValidator } from "./migration-validator";
import { MigrationMapper } from "./migration-mapper";
import { durableMigrationCheckpoint } from "./durable-checkpoint";
import { stagingUsageTracker } from "./usage-tracker";
import { BaseFirestoreRepository } from "../firebase/firestore/base.repository";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { logger } from "@/lib/observability/logger";
import crypto from "crypto";

export class StagingMigrationRunner {
  private identityLinks = new Map<string, IdentityLinkRecord>();
  private firebaseUidLinks = new Map<string, string>();

  registerIdentityLink(link: IdentityLinkRecord): { success: boolean; error?: string } {
    if (!link.supabaseUserId || !link.firebaseUid) {
      return { success: false, error: "Both supabaseUserId and firebaseUid are required" };
    }
    const existingForSupabase = this.identityLinks.get(link.supabaseUserId);
    if (existingForSupabase && existingForSupabase.firebaseUid !== link.firebaseUid) {
      return {
        success: false,
        error: `Supabase user ${link.supabaseUserId} is already linked to Firebase UID ${existingForSupabase.firebaseUid}`,
      };
    }
    this.identityLinks.set(link.supabaseUserId, link);
    this.firebaseUidLinks.set(link.firebaseUid, link.supabaseUserId);
    return { success: true };
  }

  reset(): void {
    this.identityLinks.clear();
    this.firebaseUidLinks.clear();
    durableMigrationCheckpoint.reset();
    stagingUsageTracker.reset();
  }

  /**
   * Internal sensitive note HMAC comparison to avoid blindness while keeping audit logs redacted.
   */
  static computeInternalSensitiveHash(rawNote: string | null | undefined): string {
    if (!rawNote) return "EMPTY_NOTE";
    return crypto.createHmac("sha256", "BREATHEWISE_AUDIT_SALT_2026").update(rawNote).digest("hex");
  }

  /**
   * Runs the complete 10-step staging migration.
   */
  async runStagingMigration(
    config: MigrationConfig,
    sourceDataset: Record<MigrationDomain, any[]>,
    allowStagingWrite: boolean = false
  ): Promise<StagingMigrationRunReport> {
    const startedAt = new Date().toISOString();
    const batchId = `staging_batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    stagingUsageTracker.reset();

    // STEP 1: Verify Staging Project Identity & Isolation Guard
    const stagingReadiness = StagingEnvironmentGuard.assertStagingEnvironment();

    // STEP 2 & 5: Authorization Gate
    if (!config.dryRun && !allowStagingWrite) {
      throw new Error("ABORT: Staging execution requires explicit 'allowStagingWrite: true' parameter.");
    }

    // Acquire batch lock
    const lockAcquired = durableMigrationCheckpoint.acquireBatchLock(batchId);
    if (!lockAcquired) {
      throw new Error(`ABORT: Concurrent migration detected for batch ${batchId} or lock held.`);
    }

    logger.info("StagingMigrationRunner", "Starting staging migration workflow", {
      meta: { batchId, dryRun: config.dryRun, stagingProject: stagingReadiness.firebaseProjectId },
    });

    const classifiedRecords: StagingRecordDetail[] = [];
    const countsByClassification: Record<StagingRecordClassification, number> = {
      migrated: 0,
      already_migrated: 0,
      rejected: 0,
      requires_manual_identity_resolution: 0,
      failed_retryable: 0,
      failed_non_retryable: 0,
    };

    const domainStats: any = {};
    let totalEligible = 0;
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let retriedSuccessCount = 0;

    try {
      for (const domain of config.targetDomains) {
        domainStats[domain] = {
          domain,
          sourceCount: sourceDataset[domain]?.length || 0,
          eligibleCount: 0,
          migratedCount: 0,
          skippedCount: 0,
          failedCount: 0,
          errors: [],
        };

        const records = sourceDataset[domain] || [];

        for (const item of records) {
          const recordId = item.id || item.user_id || `rec_${Math.random()}`;

          // Check if already processed in this batch (idempotency check)
          if (durableMigrationCheckpoint.isRecordProcessed(batchId, domain, recordId)) {
            classifiedRecords.push({
              recordId,
              domain,
              classification: "already_migrated",
            });
            countsByClassification.already_migrated++;
            domainStats[domain].skippedCount++;
            totalSkipped++;
            continue;
          }

          // Pre-flight source validation
          const validation = MigrationValidator.validateSourceRecord(domain, item);
          if (!validation.valid) {
            classifiedRecords.push({
              recordId,
              domain,
              classification: "rejected",
              reason: `Validation failed: ${validation.error || "Unknown validation error"}`,
            });
            countsByClassification.rejected++;
            domainStats[domain].skippedCount++;
            domainStats[domain].errors.push({ recordId, error: validation.error || "Validation error" });
            totalSkipped++;
            continue;
          }

          // Identity check: must have a registered and verified 1-to-1 link
          const sourceUserId = item.user_id || item.id;
          const link = this.identityLinks.get(sourceUserId);

          if (!link) {
            classifiedRecords.push({
              recordId,
              domain,
              classification: "requires_manual_identity_resolution",
              reason: "No identity link record found for source user",
            });
            countsByClassification.requires_manual_identity_resolution++;
            domainStats[domain].skippedCount++;
            totalSkipped++;
            continue;
          }

          if (link.verificationStatus !== "verified") {
            classifiedRecords.push({
              recordId,
              domain,
              classification: "requires_manual_identity_resolution",
              reason: `User identity status is '${link.verificationStatus}'`,
            });
            countsByClassification.requires_manual_identity_resolution++;
            domainStats[domain].skippedCount++;
            totalSkipped++;
            continue;
          }

          domainStats[domain].eligibleCount++;
          totalEligible++;

          // Map record to Firestore format
          const mappedData: any = MigrationMapper.mapRecord(domain, item, link.firebaseUid);

          // Health notes comparison integrity
          if (domain === "householdMembers" && item.notes) {
            mappedData._sensitiveHash = StagingMigrationRunner.computeInternalSensitiveHash(item.notes);
          }

          // In dry-run mode, simulate without Firestore writes
          if (config.dryRun) {
            classifiedRecords.push({
              recordId,
              domain,
              classification: "migrated",
            });
            countsByClassification.migrated++;
            domainStats[domain].migratedCount++;
            totalMigrated++;
            stagingUsageTracker.recordRead(1);
            continue;
          }

          // Live staging write execution with retry mechanism
          let attempt = 0;
          let writeSuccess = false;
          let lastError = "";

          while (attempt < 2 && !writeSuccess) {
            attempt++;
            try {
              stagingUsageTracker.recordWrite(mappedData);
              await this.writeToStagingFirestore(domain, mappedData, link.firebaseUid, recordId);
              writeSuccess = true;
              if (attempt > 1) {
                retriedSuccessCount++;
              }
            } catch (err: any) {
              lastError = err.message;
              stagingUsageTracker.recordRetry();
            }
          }

          if (writeSuccess) {
            durableMigrationCheckpoint.recordProgress(batchId, domain, recordId, true);
            classifiedRecords.push({
              recordId,
              domain,
              classification: "migrated",
            });
            countsByClassification.migrated++;
            domainStats[domain].migratedCount++;
            totalMigrated++;
          } else {
            durableMigrationCheckpoint.recordProgress(batchId, domain, recordId, false);
            classifiedRecords.push({
              recordId,
              domain,
              classification: "failed_retryable",
              reason: lastError,
              retryCount: attempt,
            });
            countsByClassification.failed_retryable++;
            domainStats[domain].failedCount++;
            domainStats[domain].errors.push({ recordId, error: lastError });
            totalFailed++;
          }
        }
      }

      // Mark batch completed in durable store if no unhandled crashes
      if (!config.dryRun) {
        durableMigrationCheckpoint.markBatchComplete(batchId);
      }
    } finally {
      durableMigrationCheckpoint.releaseBatchLock(batchId);
      stagingUsageTracker.finish();
    }

    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    const usage = stagingUsageTracker.getMetrics();

    return {
      batchId,
      environment: config.environment,
      dryRun: config.dryRun,
      startedAt,
      completedAt,
      durationMs,
      totalSourceRecords: Object.values(sourceDataset).reduce((acc, r) => acc + (r?.length || 0), 0),
      totalEligibleRecords: totalEligible,
      totalMigratedRecords: totalMigrated,
      totalSkippedRecords: totalSkipped,
      totalFailedRecords: totalFailed,
      estimatedFirestoreReads: usage.totalDocumentReads,
      estimatedFirestoreWrites: usage.totalDocumentWrites,
      estimatedTotalBytes: usage.totalPayloadSizeBytes,
      domainStats,
      unresolvedIdentitiesCount: countsByClassification.requires_manual_identity_resolution,
      validationRejectionsCount: countsByClassification.rejected,
      classifiedRecords,
      countsByClassification,
      retriedSuccessCount,
      stagingProjectId: stagingReadiness.firebaseProjectId,
    };
  }

  private async writeToStagingFirestore(
    domain: MigrationDomain,
    data: any,
    firebaseUid: string,
    recordId: string
  ): Promise<void> {
    const mock = BaseFirestoreRepository.mockStore;
    const db = getAdminFirestore();

    // 1. In-memory mock store persistence (always maintained for test isolation)
    switch (domain) {
      case "profiles":
        mock.profiles[firebaseUid] = data;
        break;
      case "preferences":
        mock.preferences[firebaseUid] = data;
        break;
      case "householdMembers":
        if (!mock.householdMembers[firebaseUid]) mock.householdMembers[firebaseUid] = {};
        mock.householdMembers[firebaseUid][recordId] = data;
        break;
      case "savedRoutines":
        if (!mock.savedRoutines[firebaseUid]) mock.savedRoutines[firebaseUid] = {};
        mock.savedRoutines[firebaseUid][recordId] = data;
        break;
      case "chatSessions":
        if (!mock.chatSessions[firebaseUid]) mock.chatSessions[firebaseUid] = {};
        mock.chatSessions[firebaseUid][recordId] = data;
        break;
      case "chatMessages":
        mock.chatMessages[`${data.sessionId}_${recordId}`] = data;
        break;
      case "sustainabilityActions":
        if (!mock.sustainabilityActions[firebaseUid]) mock.sustainabilityActions[firebaseUid] = {};
        mock.sustainabilityActions[firebaseUid][recordId] = data;
        break;
      case "notificationPreferences":
        mock.notificationPreferences[firebaseUid] = data;
        break;
    }

    // 2. Real Firestore Cloud/Emulator persistence if admin DB is available
    if (db) {
      const docId = data.id || recordId || "default";
      switch (domain) {
        case "profiles":
          await db.collection("users").doc(firebaseUid).set(data);
          break;
        case "preferences":
          await db.collection("users").doc(firebaseUid).collection("preferences").doc("default").set(data);
          break;
        case "householdMembers":
          await db.collection("users").doc(firebaseUid).collection("householdMembers").doc(docId).set(data);
          break;
        case "savedRoutines":
          await db.collection("users").doc(firebaseUid).collection("savedRoutines").doc(docId).set(data);
          break;
        case "chatSessions":
          await db.collection("users").doc(firebaseUid).collection("chatSessions").doc(docId).set(data);
          break;
        case "chatMessages":
          await db
            .collection("users")
            .doc(firebaseUid)
            .collection("chatSessions")
            .doc(data.sessionId)
            .collection("messages")
            .doc(docId)
            .set(data);
          break;
        case "sustainabilityActions":
          await db.collection("users").doc(firebaseUid).collection("sustainabilityActions").doc(docId).set(data);
          break;
        case "notificationPreferences":
          await db.collection("users").doc(firebaseUid).collection("notificationPreferences").doc("default").set(data);
          break;
      }
    }
  }
}

export const stagingMigrationRunner = new StagingMigrationRunner();
