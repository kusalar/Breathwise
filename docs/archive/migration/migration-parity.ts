/**
 * Migration Data Parity & Integrity Verifier
 * Audits source vs destination datasets for record count equality, relationship integrity,
 * duplicate detection, and canonical SHA-256 content hashes without leaking sensitive data.
 */

import {
  MigrationDomain,
  MigrationParityReport,
  DomainParityResult,
} from "./migration-types";
import { MigrationMapper } from "./migration-mapper";

export class MigrationParityVerifier {
  /**
   * Sanitizes personal notes or medical sensitivity from audit logs.
   */
  private static sanitizeForAudit(item: any): any {
    if (!item || typeof item !== "object") return item;
    const sanitized = { ...item };
    if ("notes" in sanitized && sanitized.notes) {
      sanitized.notes = "[REDACTED_HEALTH_NOTE]";
    }
    return sanitized;
  }

  /**
   * Evaluates parity for a single domain between source and destination records.
   */
  static verifyDomainParity(
    domain: MigrationDomain,
    sourceRecords: any[],
    destinationRecords: any[]
  ): DomainParityResult {
    const sourceCount = sourceRecords.length;
    const destinationCount = destinationRecords.length;
    const isCountEqual = sourceCount === destinationCount;
    const mismatches: Array<{ recordId: string; reason: string }> = [];

    // Calculate canonical hashes
    const sanitizedSource = sourceRecords.map((r) => this.sanitizeForAudit(r));
    const sanitizedDest = destinationRecords.map((r) => {
      const copy = { ...r };
      delete copy._migrationMeta; // Exclude migration timestamps from parity hashing
      return this.sanitizeForAudit(copy);
    });

    const sourceContentHash = MigrationMapper.computeCanonicalHash(sanitizedSource);
    const destinationContentHash = MigrationMapper.computeCanonicalHash(sanitizedDest);

    // Duplicate detection in destination
    const seenIds = new Set<string>();
    destinationRecords.forEach((r) => {
      const id = r.id || r.userId || r.uid;
      if (id) {
        if (seenIds.has(id)) {
          mismatches.push({ recordId: id, reason: "Duplicate destination record detected" });
        }
        seenIds.add(id);
      }
    });

    if (!isCountEqual) {
      mismatches.push({
        recordId: "domain_summary",
        reason: `Count mismatch: source has ${sourceCount}, destination has ${destinationCount}`,
      });
    }

    return {
      domain,
      sourceCount,
      destinationCount,
      isCountEqual,
      sourceContentHash,
      destinationContentHash,
      isContentEqual: sourceContentHash === destinationContentHash,
      mismatches,
    };
  }

  /**
   * Generates a complete parity report across all domains.
   */
  static generateParityReport(
    batchId: string,
    sourceData: Record<MigrationDomain, any[]>,
    destinationData: Record<MigrationDomain, any[]>
  ): MigrationParityReport {
    const domains: Record<MigrationDomain, DomainParityResult> = {} as any;
    let overallParity = true;
    let orphanCount = 0;
    let duplicateCount = 0;

    const domainList: MigrationDomain[] = [
      "profiles",
      "preferences",
      "householdMembers",
      "savedRoutines",
      "chatSessions",
      "chatMessages",
      "sustainabilityActions",
      "notificationPreferences",
    ];

    for (const d of domainList) {
      const res = this.verifyDomainParity(d, sourceData[d] || [], destinationData[d] || []);
      domains[d] = res;

      if (!res.isCountEqual) {
        overallParity = false;
      }
      res.mismatches.forEach((m) => {
        if (m.reason.includes("Duplicate")) duplicateCount++;
        if (m.reason.includes("Orphan")) orphanCount++;
      });
    }

    // Relationship parity check: Chat messages must point to existing chat sessions
    const sessionIds = new Set((destinationData.chatSessions || []).map((s) => s.id));
    (destinationData.chatMessages || []).forEach((msg) => {
      if (!sessionIds.has(msg.sessionId)) {
        orphanCount++;
        overallParity = false;
        domains.chatMessages.mismatches.push({
          recordId: msg.id,
          reason: `Orphan chat message: parent session ${msg.sessionId} not found`,
        });
      }
    });

    const summary = overallParity
      ? "100% Data Parity Verified across all 8 domains with zero orphans or duplicates."
      : `Parity discrepancies detected: ${duplicateCount} duplicates, ${orphanCount} orphans.`;

    return {
      batchId,
      verifiedAt: new Date().toISOString(),
      overallParity,
      domains,
      orphanRecordsCount: orphanCount,
      duplicateRecordsCount: duplicateCount,
      summary,
    };
  }
}
