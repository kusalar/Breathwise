/**
 * Controlled Supabase-to-Firebase Migration Types
 * Strict typing for identity mapping, validation, checkpointing, and parity auditing.
 */

export type MigrationDomain =
  | "profiles"
  | "preferences"
  | "householdMembers"
  | "savedRoutines"
  | "chatSessions"
  | "chatMessages"
  | "sustainabilityActions"
  | "notificationPreferences";

export type IdentityVerificationStatus =
  | "verified"
  | "pending_verification"
  | "manual_resolution_required"
  | "rejected";

export type MigrationRecordStatus = "unmigrated" | "in_progress" | "migrated" | "failed" | "rolled_back";

export interface IdentityLinkRecord {
  supabaseUserId: string;
  firebaseUid: string;
  supabaseEmail: string;
  firebaseEmail: string;
  verificationStatus: IdentityVerificationStatus;
  verificationMethod: "cryptographic_proof" | "authenticated_session_link" | "manual_admin_audit";
  linkedAt: string;
  migrationStatus: MigrationRecordStatus;
  batchId?: string;
  notes?: string;
}

export interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  targetDomains: MigrationDomain[];
  environment: "dry-run" | "emulator" | "staging" | "production";
  adminAuthorizationKey?: string;
}

export interface DomainMigrationStats {
  domain: MigrationDomain;
  sourceCount: number;
  eligibleCount: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: Array<{ recordId: string; error: string }>;
}

export interface MigrationRunReport {
  batchId: string;
  environment: "dry-run" | "emulator" | "staging" | "production";
  dryRun: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalSourceRecords: number;
  totalEligibleRecords: number;
  totalMigratedRecords: number;
  totalSkippedRecords: number;
  totalFailedRecords: number;
  estimatedFirestoreReads: number;
  estimatedFirestoreWrites: number;
  estimatedTotalBytes: number;
  domainStats: Record<MigrationDomain, DomainMigrationStats>;
  unresolvedIdentitiesCount: number;
  validationRejectionsCount: number;
}

export interface DomainParityResult {
  domain: MigrationDomain;
  sourceCount: number;
  destinationCount: number;
  isCountEqual: boolean;
  sourceContentHash: string;
  destinationContentHash: string;
  isContentEqual: boolean;
  mismatches: Array<{ recordId: string; reason: string }>;
}

export interface MigrationParityReport {
  batchId: string;
  verifiedAt: string;
  overallParity: boolean;
  domains: Record<MigrationDomain, DomainParityResult>;
  orphanRecordsCount: number;
  duplicateRecordsCount: number;
  summary: string;
}

// ==========================================
// MILESTONE 6E — STAGING & CUTOVER TYPES
// ==========================================

export type StagingRecordClassification =
  | "migrated"
  | "already_migrated"
  | "rejected"
  | "requires_manual_identity_resolution"
  | "failed_retryable"
  | "failed_non_retryable";

export type ConnectivityVerificationTier =
  | "cloud_verified"
  | "emulator_verified"
  | "mock_verified"
  | "blocked_missing_credentials";

export interface ServiceConnectivityResult {
  serviceName: string;
  targetEndpoint: string;
  tier: ConnectivityVerificationTier;
  connected: boolean;
  latencyMs: number;
  details: string;
  error?: string;
}

export interface StagingConnectivityReport {
  timestamp: string;
  environment: string;
  resolvedProjectId: string;
  services: Record<string, ServiceConnectivityResult>;
  allOperational: boolean;
}

export interface StagingReadinessReport {
  ready: boolean;
  environment: "staging" | "emulator" | "mock" | "invalid";
  supabaseUrl: string;
  firebaseProjectId: string;
  isStagingApproved: boolean;
  isProductionRejected: boolean;
  reasons: string[];
}

export interface StagingRecordDetail {
  recordId: string;
  domain: MigrationDomain;
  classification: StagingRecordClassification;
  reason?: string;
  retryCount?: number;
}

export interface StagingMigrationRunReport extends MigrationRunReport {
  classifiedRecords: StagingRecordDetail[];
  countsByClassification: Record<StagingRecordClassification, number>;
  retriedSuccessCount: number;
  stagingProjectId: string;
}

export interface FreeTierUsageMetrics {
  totalDocumentReads: number;
  totalDocumentWrites: number;
  totalDocumentDeletes: number;
  totalPayloadSizeBytes: number;
  averageDocumentSizeBytes: number;
  migrationDurationMs: number;
  retryOverheadCount: number;
  authOperationsCount: number;
  sparkDailyWriteLimit: number;
  sparkDailyReadLimit: number;
  sparkDailyWriteUsagePercent: number;
  sparkDailyReadUsagePercent: number;
}

// ==========================================
// MILESTONE 6F — CLOUD CERTIFICATION TYPES
// ==========================================

export type CloudVerificationLabel =
  | "CLOUD VERIFIED"
  | "EMULATOR VERIFIED"
  | "MOCK VERIFIED"
  | "BLOCKED";

export type CloudFailureType =
  | "permission_denied"
  | "supabase_connectivity_interrupted"
  | "invalid_credentials"
  | "expired_session"
  | "transient_network_failure"
  | "partial_batch_failure"
  | "checkpoint_write_failure"
  | "concurrent_migration_attempt"
  | "index_unavailable"
  | "quota_rate_limit";

export interface CloudFailureSimulationResult {
  failureType: CloudFailureType;
  description: string;
  handledSafely: boolean;
  resumable: boolean;
  retried: boolean;
  retryLimitExceeded: boolean;
  errorClassification: string;
  mitigationStrategy: string;
}

export interface CloudCertificationReport {
  timestamp: string;
  environment: string;
  overallGateStatus: "PASS" | "PASS WITH LIMITATIONS" | "BLOCKED";
  cloudCredentialsAvailable: boolean;
  labels: Record<string, CloudVerificationLabel>;
  failureSimulations: Record<CloudFailureType, CloudFailureSimulationResult>;
  summary: string;
}


