/**
 * Migration Checkpoint Manager
 * Tracks migration progress per batch and domain to support safe interruption and resumption.
 */

import { MigrationDomain } from "./migration-types";

export interface DomainCheckpoint {
  domain: MigrationDomain;
  lastProcessedId: string | null;
  processedRecordIds: string[];
  successCount: number;
  failedCount: number;
  updatedAt: string;
}

export interface BatchCheckpoint {
  batchId: string;
  startedAt: string;
  updatedAt: string;
  domains: Record<MigrationDomain, DomainCheckpoint>;
}

export class MigrationCheckpointManager {
  private checkpoints = new Map<string, BatchCheckpoint>();

  /**
   * Initializes or retrieves an existing batch checkpoint.
   */
  getOrCreateBatch(batchId: string): BatchCheckpoint {
    let checkpoint = this.checkpoints.get(batchId);
    if (!checkpoint) {
      const now = new Date().toISOString();
      checkpoint = {
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
      this.checkpoints.set(batchId, checkpoint);
    }
    return checkpoint;
  }

  /**
   * Records progress for a specific record.
   */
  recordProgress(
    batchId: string,
    domain: MigrationDomain,
    recordId: string,
    success: boolean
  ): void {
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
    }
  }

  /**
   * Checks whether a record has already been processed in this batch.
   */
  isRecordProcessed(batchId: string, domain: MigrationDomain, recordId: string): boolean {
    const batch = this.checkpoints.get(batchId);
    if (!batch) return false;
    return batch.domains[domain]?.processedRecordIds.includes(recordId) ?? false;
  }

  /**
   * Resets all checkpoint state (used for testing).
   */
  reset(): void {
    this.checkpoints.clear();
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

export const migrationCheckpoint = new MigrationCheckpointManager();
