/**
 * Free-Tier Usage & Quota Measurement Tracker
 * Instruments Firestore and Authentication operations to measure exact usage,
 * payload sizes, operation latencies, and daily Spark plan quota consumption.
 */

import { FreeTierUsageMetrics } from "./migration-types";

export class StagingUsageTracker {
  private reads: number = 0;
  private writes: number = 0;
  private deletes: number = 0;
  private totalPayloadBytes: number = 0;
  private authOperations: number = 0;
  private retryOverhead: number = 0;
  private startTime: number = Date.now();
  private endTime: number = Date.now();

  // Firebase Spark (No-Cost) Daily Free Limits
  static readonly SPARK_DAILY_WRITES = 20000;
  static readonly SPARK_DAILY_READS = 50000;
  static readonly SPARK_DAILY_DELETES = 20000;
  static readonly SPARK_STORAGE_BYTES = 1024 * 1024 * 1024; // 1 GiB

  reset(): void {
    this.reads = 0;
    this.writes = 0;
    this.deletes = 0;
    this.totalPayloadBytes = 0;
    this.authOperations = 0;
    this.retryOverhead = 0;
    this.startTime = Date.now();
    this.endTime = Date.now();
  }

  recordRead(count: number = 1): void {
    this.reads += count;
  }

  recordWrite(payload: any, count: number = 1): void {
    this.writes += count;
    if (payload) {
      try {
        const bytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
        this.totalPayloadBytes += bytes * count;
      } catch {
        this.totalPayloadBytes += 256 * count; // Conservative estimate
      }
    }
  }

  recordDelete(count: number = 1): void {
    this.deletes += count;
  }

  recordAuthOperation(count: number = 1): void {
    this.authOperations += count;
  }

  recordRetry(): void {
    this.retryOverhead++;
  }

  finish(): void {
    this.endTime = Date.now();
  }

  getMetrics(): FreeTierUsageMetrics {
    const durationMs = Math.max(this.endTime - this.startTime, 1);
    const avgSizeBytes = this.writes > 0 ? Math.round(this.totalPayloadBytes / this.writes) : 0;

    const writePercent = Number(((this.writes / StagingUsageTracker.SPARK_DAILY_WRITES) * 100).toFixed(2));
    const readPercent = Number(((this.reads / StagingUsageTracker.SPARK_DAILY_READS) * 100).toFixed(2));

    return {
      totalDocumentReads: this.reads,
      totalDocumentWrites: this.writes,
      totalDocumentDeletes: this.deletes,
      totalPayloadSizeBytes: this.totalPayloadBytes,
      averageDocumentSizeBytes: avgSizeBytes,
      migrationDurationMs: durationMs,
      retryOverheadCount: this.retryOverhead,
      authOperationsCount: this.authOperations,
      sparkDailyWriteLimit: StagingUsageTracker.SPARK_DAILY_WRITES,
      sparkDailyReadLimit: StagingUsageTracker.SPARK_DAILY_READS,
      sparkDailyWriteUsagePercent: writePercent,
      sparkDailyReadUsagePercent: readPercent,
    };
  }
}

export const stagingUsageTracker = new StagingUsageTracker();
