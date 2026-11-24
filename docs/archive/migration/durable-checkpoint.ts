/**
 * Durable Migration Checkpoint Store
 * Provides persistent, restart-safe checkpointing with file-based atomic serialization,
 * concurrency locking, and incomplete-batch guards to survive process terminations.
 */

import fs from "fs";
import path from "path";
import { MigrationDomain } from "./migration-types";
import { BatchCheckpoint, DomainCheckpoint } from "./migration-checkpoint";
import { logger } from "@/lib/observability/logger";

export interface DurableCheckpointMeta {
  isCompleted: boolean;
  lockedByProcessId?: number;
  lastPersistedAt: string;
}

export class DurableCheckpointStore {
  private baseDir: string;
  private activeLocks = new Set<string>();

  constructor(customDir?: string) {
    this.baseDir = customDir || path.join(process.cwd(), ".checkpoints");
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (err: any) {
      logger.warn("DurableCheckpointStore", `Failed to initialize checkpoint directory: ${err.message}`);
    }
  }

  /**
   * Acquires a concurrency lock on a batch to prevent concurrent runs.
   */
  acquireLock(batchId: string): boolean {
    const lockFile = path.join(this.baseDir, `${batchId}.lock`);
    if (this.activeLocks.has(batchId) || fs.existsSync(lockFile)) {
      return false; // Locked by another process or runner
    }
    try {
      fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, lockedAt: new Date().toISOString() }));
      this.activeLocks.add(batchId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Releases lock on batch completion or failure.
   */
  releaseLock(batchId: string): void {
    const lockFile = path.join(this.baseDir, `${batchId}.lock`);
    this.activeLocks.delete(batchId);
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch {
      // Ignore unlink errors on teardown
    }
  }

  /**
   * Persists batch state atomically using a temp file write + rename.
   */
  saveBatch(batch: BatchCheckpoint, isCompleted: boolean = false): void {
    this.ensureDirectory();
    const filePath = path.join(this.baseDir, `${batch.batchId}.json`);
    const tempPath = `${filePath}.tmp_${Date.now()}`;

    const dataToSave = {
      checkpoint: batch,
      meta: {
        isCompleted,
        lastPersistedAt: new Date().toISOString(),
      },
    };

    try {
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), "utf-8");
      fs.renameSync(tempPath, filePath);
    } catch (err: any) {
      logger.error("DurableCheckpointStore", `Failed to atomically persist checkpoint for ${batch.batchId}`, {
        errorCode: "INTERNAL_ERROR",
      });
      throw err;
    }
  }

  /**
   * Loads batch checkpoint from durable storage.
   */
  loadBatch(batchId: string): { checkpoint: BatchCheckpoint; meta: DurableCheckpointMeta } | null {
    const filePath = path.join(this.baseDir, `${batchId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    } catch (err: any) {
      logger.error("DurableCheckpointStore", `Failed to load checkpoint file for ${batchId}`, {
        errorCode: "INTERNAL_ERROR",
      });
      return null;
    }
  }

  /**
   * Cleans up all checkpoint files (used in test teardown).
   */
  reset(): void {
    try {
      if (fs.existsSync(this.baseDir)) {
        const files = fs.readdirSync(this.baseDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.baseDir, file));
        }
      }
    } catch {
      // Ignore cleanup error
    }
    this.activeLocks.clear();
  }
}

export class DurableMigrationCheckpointManager {
  private store: DurableCheckpointStore;
  private inMemoryCheckpoints = new Map<string, BatchCheckpoint>();
  private completedBatches = new Set<string>();

  constructor(customStore?: DurableCheckpointStore) {
    this.store = customStore || new DurableCheckpointStore();
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

  /**
   * Initializes or recovers batch checkpoint from durable disk storage.
   */
  getOrCreateBatch(batchId: string): BatchCheckpoint {
    // 1. Check in-memory cache
    if (this.inMemoryCheckpoints.has(batchId)) {
      return this.inMemoryCheckpoints.get(batchId)!;
    }

    // 2. Check durable disk store
    const loaded = this.store.loadBatch(batchId);
    if (loaded) {
      this.inMemoryCheckpoints.set(batchId, loaded.checkpoint);
      if (loaded.meta.isCompleted) {
        this.completedBatches.add(batchId);
      }
      return loaded.checkpoint;
    }

    // 3. Create fresh checkpoint
    const now = new Date().toISOString();
    const fresh: BatchCheckpoint = {
      batchId,
      startedAt: now,
      updatedAt: now,
      domains: {
        profiles: this.createEmptyDomainCheckpoint("profiles"),
        preferences: this.createEmptyDomainCheckpoint("preferences"),
        householdMembers: this.createEmptyDomainCheckpoint("householdMembers"),
        savedRoutines: this.createEmptyDomainCheckpoint("savedRoutines"),
        chatSessions: this.createEmptyDomainCheckpoint("chatSessions"),
        chatMessages: this.createEmptyDomainCheckpoint("chatMessages"),
        sustainabilityActions: this.createEmptyDomainCheckpoint("sustainabilityActions"),
        notificationPreferences: this.createEmptyDomainCheckpoint("notificationPreferences"),
      },
    };

    this.inMemoryCheckpoints.set(batchId, fresh);
    this.store.saveBatch(fresh, false);
    return fresh;
  }

  /**
   * Records progress and persists atomically.
   */
  recordProgress(batchId: string, domain: MigrationDomain, recordId: string, success: boolean): void {
    const batch = this.getOrCreateBatch(batchId);
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

      // Persist durable state
      this.store.saveBatch(batch, false);
    }
  }

  isRecordProcessed(batchId: string, domain: MigrationDomain, recordId: string): boolean {
    const batch = this.getOrCreateBatch(batchId);
    return batch.domains[domain]?.processedRecordIds.includes(recordId) ?? false;
  }

  markBatchComplete(batchId: string): void {
    const batch = this.getOrCreateBatch(batchId);
    this.completedBatches.add(batchId);
    this.store.saveBatch(batch, true);
    this.store.releaseLock(batchId);
  }

  isBatchComplete(batchId: string): boolean {
    return this.completedBatches.has(batchId);
  }

  acquireBatchLock(batchId: string): boolean {
    return this.store.acquireLock(batchId);
  }

  releaseBatchLock(batchId: string): void {
    this.store.releaseLock(batchId);
  }

  reset(): void {
    this.inMemoryCheckpoints.clear();
    this.completedBatches.clear();
    this.store.reset();
  }
}

export const durableMigrationCheckpoint = new DurableMigrationCheckpointManager();
