/**
 * Shared Staging Checkpoint Store & Distributed Lease Coordinator
 * Implements atomic state transitions, lease-based concurrency locking with TTL expiry,
 * orphaned runner recovery, batch-level progress auditing, and process restart survival.
 */

import fs from "fs";
import path from "path";
import { MigrationDomain } from "./migration-types";
import { DomainCheckpoint } from "./migration-checkpoint";
import { logger } from "@/lib/observability/logger";

export interface CheckpointLease {
  ownerId: string;
  acquiredAt: string;
  expiresAt: number; // epoch ms
  heartbeatAt: string;
  fenceToken: number; // Monotonically increasing lease generation / fencing token
}

export type CheckpointAuditAction =
  | "lease_acquired"
  | "lease_renewed"
  | "lease_released"
  | "lease_recovered_expired"
  | "batch_started"
  | "record_processed"
  | "stale_write_rejected"
  | "batch_completed"
  | "batch_failed";

export interface CheckpointAuditLogEntry {
  auditId: string;
  batchId: string;
  timestamp: string;
  action: CheckpointAuditAction;
  actor: string;
  details: Record<string, unknown>;
}

export interface SharedBatchCheckpoint {
  batchId: string;
  version: number;
  fenceTokenCounter: number; // Monotonic counter for fence tokens
  startedAt: string;
  updatedAt: string;
  isCompleted: boolean;
  lease: CheckpointLease | null;
  domains: Record<MigrationDomain, DomainCheckpoint>;
  auditLog: CheckpointAuditLogEntry[];
}

export interface SharedCheckpointBackendAudit {
  backendType: "single_host_filesystem";
  isDistributedCloud: false;
  persistenceScope: "single_node_shared_disk";
  supportsFencingTokens: true;
  supportsAtomicCAS: true;
  limitations: string[];
}

export class SharedStagingCheckpointStore {
  readonly backendClassification = "single_host_filesystem" as const;
  readonly isDistributedCloudCoordination = false as const;

  private baseDir: string;
  private inMemoryCache = new Map<string, SharedBatchCheckpoint>();
  static readonly DEFAULT_LEASE_TTL_MS = 30000; // 30 seconds

  constructor(customDir?: string) {
    this.baseDir = customDir || path.join(process.cwd(), ".shared_checkpoints");
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (err: any) {
      logger.warn("SharedStagingCheckpointStore", `Checkpoint directory init warning: ${err.message}`);
    }
  }

  private getFilePath(batchId: string): string {
    return path.join(this.baseDir, `${batchId}.shared.json`);
  }

  private logAudit(
    batch: SharedBatchCheckpoint,
    action: CheckpointAuditAction,
    actor: string,
    details: Record<string, unknown> = {}
  ): void {
    const entry: CheckpointAuditLogEntry = {
      auditId: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      batchId: batch.batchId,
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
    };
    batch.auditLog.push(entry);
  }

  /**
   * Loads batch checkpoint from disk or memory.
   */
  getBatch(batchId: string, forceDiskReload: boolean = true): SharedBatchCheckpoint | null {
    if (!forceDiskReload && this.inMemoryCache.has(batchId)) {
      return this.inMemoryCache.get(batchId)!;
    }

    const filePath = this.getFilePath(batchId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const loaded: SharedBatchCheckpoint = JSON.parse(raw);
      this.inMemoryCache.set(batchId, loaded);
      return loaded;
    } catch (err: any) {
      logger.error("SharedStagingCheckpointStore", `Failed to read shared checkpoint: ${err.message}`, {
        errorCode: "INTERNAL_ERROR",
      });
      return null;
    }
  }

  /**
   * Initializes a fresh batch checkpoint with an active lease.
   */
  private createBatch(batchId: string, ownerId: string, ttlMs: number): SharedBatchCheckpoint {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const emptyDomains: Record<MigrationDomain, DomainCheckpoint> = {
      profiles: this.createEmptyDomainCheckpoint("profiles"),
      preferences: this.createEmptyDomainCheckpoint("preferences"),
      householdMembers: this.createEmptyDomainCheckpoint("householdMembers"),
      savedRoutines: this.createEmptyDomainCheckpoint("savedRoutines"),
      chatSessions: this.createEmptyDomainCheckpoint("chatSessions"),
      chatMessages: this.createEmptyDomainCheckpoint("chatMessages"),
      sustainabilityActions: this.createEmptyDomainCheckpoint("sustainabilityActions"),
      notificationPreferences: this.createEmptyDomainCheckpoint("notificationPreferences"),
    };

    const batch: SharedBatchCheckpoint = {
      batchId,
      version: 1,
      fenceTokenCounter: 1,
      startedAt: nowIso,
      updatedAt: nowIso,
      isCompleted: false,
      lease: {
        ownerId,
        acquiredAt: nowIso,
        expiresAt: nowMs + ttlMs,
        heartbeatAt: nowIso,
        fenceToken: 1,
      },
      domains: emptyDomains,
      auditLog: [],
    };

    this.logAudit(batch, "batch_started", ownerId, { ttlMs, fenceToken: 1 });
    this.logAudit(batch, "lease_acquired", ownerId, { expiresAt: batch.lease?.expiresAt, fenceToken: 1 });
    this.saveBatch(batch);
    return batch;
  }

  /**
   * Atomically acquires a lease on a batch.
   * Handles concurrency rejection, fencing token generation, and expired lease recovery.
   */
  acquireLease(
    batchId: string,
    ownerId: string,
    ttlMs: number = SharedStagingCheckpointStore.DEFAULT_LEASE_TTL_MS
  ): { success: boolean; lease?: CheckpointLease; error?: string } {
    let batch = this.getBatch(batchId);
    const nowMs = Date.now();
    const nowIso = new Date().toISOString();

    if (!batch) {
      batch = this.createBatch(batchId, ownerId, ttlMs);
      return { success: true, lease: batch.lease! };
    }

    // Check if currently leased
    if (batch.lease) {
      // If already owned by same owner, refresh lease heartbeat
      if (batch.lease.ownerId === ownerId) {
        batch.lease.expiresAt = nowMs + ttlMs;
        batch.lease.heartbeatAt = nowIso;
        this.logAudit(batch, "lease_renewed", ownerId, {
          expiresAt: batch.lease.expiresAt,
          fenceToken: batch.lease.fenceToken,
        });
        this.saveBatch(batch);
        return { success: true, lease: batch.lease };
      }

      // Check if active lease has expired (orphaned runner recovery)
      if (nowMs > batch.lease.expiresAt) {
        const previousOwner = batch.lease.ownerId;
        batch.fenceTokenCounter = (batch.fenceTokenCounter || 0) + 1;
        batch.lease = {
          ownerId,
          acquiredAt: nowIso,
          expiresAt: nowMs + ttlMs,
          heartbeatAt: nowIso,
          fenceToken: batch.fenceTokenCounter,
        };
        this.logAudit(batch, "lease_recovered_expired", ownerId, {
          previousOwner,
          expiresAt: batch.lease.expiresAt,
          fenceToken: batch.lease.fenceToken,
        });
        this.saveBatch(batch);
        return { success: true, lease: batch.lease };
      }

      // Lease active and owned by another runner -> Reject
      return {
        success: false,
        error: `CONCURRENT_MIGRATION_LOCKED: Batch ${batchId} is actively leased by runner '${batch.lease.ownerId}' until ${new Date(
          batch.lease.expiresAt
        ).toISOString()}`,
      };
    }

    // Batch exists but has no active lease -> Acquire new lease with incremented fenceToken
    batch.fenceTokenCounter = (batch.fenceTokenCounter || 0) + 1;
    batch.lease = {
      ownerId,
      acquiredAt: nowIso,
      expiresAt: nowMs + ttlMs,
      heartbeatAt: nowIso,
      fenceToken: batch.fenceTokenCounter,
    };
    this.logAudit(batch, "lease_acquired", ownerId, {
      expiresAt: batch.lease.expiresAt,
      fenceToken: batch.lease.fenceToken,
    });
    this.saveBatch(batch);
    return { success: true, lease: batch.lease };
  }

  /**
   * Renews lease heartbeat.
   */
  renewLease(batchId: string, ownerId: string, ttlMs: number = SharedStagingCheckpointStore.DEFAULT_LEASE_TTL_MS): boolean {
    const batch = this.getBatch(batchId);
    if (!batch || !batch.lease || batch.lease.ownerId !== ownerId) {
      return false;
    }
    batch.lease.expiresAt = Date.now() + ttlMs;
    batch.lease.heartbeatAt = new Date().toISOString();
    this.logAudit(batch, "lease_renewed", ownerId, {
      expiresAt: batch.lease.expiresAt,
      fenceToken: batch.lease.fenceToken,
    });
    this.saveBatch(batch);
    return true;
  }

  /**
   * Releases lease on completion or graceful shutdown.
   */
  releaseLease(batchId: string, ownerId: string): void {
    const batch = this.getBatch(batchId);
    if (batch && batch.lease && batch.lease.ownerId === ownerId) {
      const fence = batch.lease.fenceToken;
      batch.lease = null;
      this.logAudit(batch, "lease_released", ownerId, { fenceToken: fence });
      this.saveBatch(batch);
    }
  }

  /**
   * Records record progress under active lease ownership.
   * Protects against stale runners by verifying fencing tokens.
   */
  recordProgress(
    batchId: string,
    ownerId: string,
    domain: MigrationDomain,
    recordId: string,
    success: boolean,
    runnerFenceToken?: number
  ): void {
    const batch = this.getBatch(batchId);
    if (!batch) {
      throw new Error(`Cannot record progress: Batch ${batchId} does not exist`);
    }

    if (!batch.lease || batch.lease.ownerId !== ownerId) {
      throw new Error(`Cannot record progress: Runner '${ownerId}' does not own active lease on batch ${batchId}`);
    }

    // Fencing token verification (stale runner write rejection)
    if (runnerFenceToken !== undefined && runnerFenceToken < batch.lease.fenceToken) {
      this.logAudit(batch, "stale_write_rejected", ownerId, {
        domain,
        recordId,
        runnerFenceToken,
        activeFenceToken: batch.lease.fenceToken,
      });
      this.saveBatch(batch);
      throw new Error(
        `STALE_RUNNER_FENCE_TOKEN_REJECTED: Runner fencing token ${runnerFenceToken} is older than active lease fence token ${batch.lease.fenceToken}. Write rejected.`
      );
    }

    const domainCheckpoint = batch.domains[domain];
    if (!domainCheckpoint.processedRecordIds.includes(recordId)) {
      domainCheckpoint.processedRecordIds.push(recordId);
      domainCheckpoint.lastProcessedId = recordId;
      if (success) {
        domainCheckpoint.successCount++;
      } else {
        domainCheckpoint.failedCount++;
      }
      domainCheckpoint.updatedAt = new Date().toISOString();
      batch.updatedAt = domainCheckpoint.updatedAt;

      this.logAudit(batch, "record_processed", ownerId, {
        domain,
        recordId,
        success,
        fenceToken: batch.lease.fenceToken,
      });
      this.saveBatch(batch);
    }
  }

  /**
   * Atomic Compare-And-Swap (CAS) state transition.
   */
  atomicCompareAndSwap(
    batchId: string,
    expectedVersion: number,
    updateFn: (batch: SharedBatchCheckpoint) => void
  ): boolean {
    const batch = this.getBatch(batchId);
    if (!batch) return false;

    if (batch.version !== expectedVersion) {
      return false; // CAS conflict
    }

    updateFn(batch);
    this.saveBatch(batch);
    return true;
  }

  /**
   * Returns authoritative architectural classification of this storage backend.
   */
  getBackendAuditInfo(): SharedCheckpointBackendAudit {
    return {
      backendType: "single_host_filesystem",
      isDistributedCloud: false,
      persistenceScope: "single_node_shared_disk",
      supportsFencingTokens: true,
      supportsAtomicCAS: true,
      limitations: [
        "Single-host persistence: coordinates processes sharing local or mounted block storage only",
        "Does not provide distributed multi-region quorum or consensus",
        "Requires shared filesystem mount (NFS/EFS) for multi-worker container clusters",
        "In-memory caches require file modification polling across distinct OS processes without kernel inotify",
      ],
    };
  }

  /**
   * Marks batch completed and releases lease.
   */
  markBatchComplete(batchId: string, ownerId: string): void {
    const batch = this.getBatch(batchId);
    if (!batch) return;

    batch.isCompleted = true;
    batch.lease = null;
    batch.updatedAt = new Date().toISOString();
    this.logAudit(batch, "batch_completed", ownerId);
    this.saveBatch(batch);
  }

  isRecordProcessed(batchId: string, domain: MigrationDomain, recordId: string): boolean {
    const batch = this.getBatch(batchId);
    if (!batch) return false;
    return batch.domains[domain]?.processedRecordIds.includes(recordId) ?? false;
  }

  /**
   * Persists batch state atomically using a temp file write + rename.
   */
  private saveBatch(batch: SharedBatchCheckpoint): void {
    this.ensureDirectory();
    batch.version++;
    batch.updatedAt = new Date().toISOString();

    const filePath = this.getFilePath(batch.batchId);
    const tempPath = `${filePath}.tmp_${Date.now()}`;

    try {
      fs.writeFileSync(tempPath, JSON.stringify(batch, null, 2), "utf-8");
      fs.renameSync(tempPath, filePath);
      this.inMemoryCache.set(batch.batchId, batch);
    } catch (err: any) {
      logger.error("SharedStagingCheckpointStore", `Atomic save failed for ${batch.batchId}: ${err.message}`, {
        errorCode: "INTERNAL_ERROR",
      });
      throw err;
    }
  }

  reset(): void {
    this.inMemoryCache.clear();
    try {
      if (fs.existsSync(this.baseDir)) {
        const files = fs.readdirSync(this.baseDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.baseDir, file));
        }
      }
    } catch {
      // Ignore
    }
  }

  private createEmptyDomainCheckpoint(domain: MigrationDomain): DomainCheckpoint {
    return {
      domain,
      lastProcessedId: null,
      processedRecordIds: [],
      successCount: 0,
      failedCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const sharedStagingCheckpointStore = new SharedStagingCheckpointStore();
