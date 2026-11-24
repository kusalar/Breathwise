/**
 * Staging Environment Isolation Guard
 * Enforces strict environment separation between staging and production.
 * Rejects production project IDs, verifies approved staging identifiers,
 * and prevents client-side override or credential leakage.
 */

import { StagingReadinessReport } from "./migration-types";
import { logger } from "@/lib/observability/logger";

export const APPROVED_STAGING_FIREBASE_PROJECTS = [
  "breathewise-ai-staging",
  "breathewise-staging",
  "breathewise-staging-emulator",
  "demo-breathewise-staging",
];

export const APPROVED_STAGING_SUPABASE_HOSTS = [
  "staging.supabase.co",
  "breathewise-staging.supabase.co",
  "127.0.0.1:54321",
  "localhost:54321",
];

export const PRODUCTION_PROJECT_PATTERNS = [
  "breathewise-ai-prod",
  "breathewise-production",
  "breathewise-prod",
  "production",
  "-prod",
];

export class StagingEnvironmentGuard {
  /**
   * Sanitizes a URL or project identifier for safe logging without exposing secrets.
   */
  static sanitizeIdentifier(identifier: string | undefined): string {
    if (!identifier) return "[UNDEFINED]";
    try {
      if (identifier.startsWith("http://") || identifier.startsWith("https://")) {
        const parsed = new URL(identifier);
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch {
      // Not a valid URL, treat as project ID
    }
    return identifier.replace(/([a-zA-Z0-9]{3})[a-zA-Z0-9]+([a-zA-Z0-9]{2})/g, "$1***$2");
  }

  /**
   * Verifies if a given Firebase Project ID is an explicitly approved staging project.
   */
  static isApprovedStagingFirebaseProject(projectId: string | undefined): boolean {
    if (!projectId) return false;
    const lower = projectId.toLowerCase().trim();
    // Immediate rejection of production keywords
    if (this.isProductionIdentifier(lower)) {
      return false;
    }
    return APPROVED_STAGING_FIREBASE_PROJECTS.some((approved) => lower.includes(approved));
  }

  /**
   * Verifies if a given Supabase URL or Host is an explicitly approved staging host.
   */
  static isApprovedStagingSupabaseHost(hostOrUrl: string | undefined): boolean {
    if (!hostOrUrl) return false;
    let host = hostOrUrl.toLowerCase().trim();
    try {
      if (host.startsWith("http://") || host.startsWith("https://")) {
        host = new URL(host).host;
      }
    } catch {
      // raw host
    }
    if (this.isProductionIdentifier(host)) {
      return false;
    }
    return APPROVED_STAGING_SUPABASE_HOSTS.some((approved) => host.includes(approved));
  }

  /**
   * Checks whether an identifier carries production signatures.
   */
  static isProductionIdentifier(identifier: string | undefined): boolean {
    if (!identifier) return false;
    const lower = identifier.toLowerCase().trim();
    return PRODUCTION_PROJECT_PATTERNS.some((pat) => lower.includes(pat));
  }

  /**
   * Evaluates the complete staging environment readiness.
   * Server-side only: never trusts client overrides.
   */
  static checkStagingReadiness(): StagingReadinessReport {
    const rawFirebaseProject =
      process.env.STAGING_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      "breathewise-staging-emulator";

    const rawSupabaseUrl =
      process.env.STAGING_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "http://127.0.0.1:54321";

    const isEmulator =
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" ||
      Boolean(process.env.FIRESTORE_EMULATOR_HOST);

    const reasons: string[] = [];
    let isStagingApproved = true;
    let isProductionRejected = true;

    // Check Firebase project ID
    if (this.isProductionIdentifier(rawFirebaseProject)) {
      isProductionRejected = false;
      isStagingApproved = false;
      reasons.push(`Target Firebase Project ID '${rawFirebaseProject}' matches production blacklist.`);
    } else if (!this.isApprovedStagingFirebaseProject(rawFirebaseProject) && !isEmulator) {
      isStagingApproved = false;
      reasons.push(
        `Firebase Project ID '${rawFirebaseProject}' is not in approved staging list: [${APPROVED_STAGING_FIREBASE_PROJECTS.join(
          ", "
        )}]`
      );
    }

    // Check Supabase URL
    if (this.isProductionIdentifier(rawSupabaseUrl)) {
      isProductionRejected = false;
      isStagingApproved = false;
      reasons.push(`Target Supabase URL '${this.sanitizeIdentifier(rawSupabaseUrl)}' contains production pattern.`);
    } else if (!this.isApprovedStagingSupabaseHost(rawSupabaseUrl) && !isEmulator) {
      isStagingApproved = false;
      reasons.push(
        `Target Supabase host '${this.sanitizeIdentifier(rawSupabaseUrl)}' is not in approved staging allowlist: [${APPROVED_STAGING_SUPABASE_HOSTS.join(
          ", "
        )}]`
      );
    }

    // Check environment ambiguity
    const appEnv = process.env.NODE_ENV;
    const migrationEnv = process.env.MIGRATION_ENV;
    if (migrationEnv === "production" && appEnv === "production") {
      isStagingApproved = false;
      isProductionRejected = false;
      reasons.push("MIGRATION_ENV is set to 'production' while staging run requested.");
    }

    const ready = isStagingApproved && isProductionRejected && reasons.length === 0;

    let environmentType: StagingReadinessReport["environment"] = "staging";
    if (isEmulator) environmentType = "emulator";
    if (!ready) environmentType = "invalid";

    return {
      ready,
      environment: environmentType,
      supabaseUrl: this.sanitizeIdentifier(rawSupabaseUrl),
      firebaseProjectId: rawFirebaseProject,
      isStagingApproved,
      isProductionRejected,
      reasons,
    };
  }

  /**
   * Asserts that staging environment is valid and strictly isolated.
   * Throws an error immediately if production target or unapproved staging project is detected.
   */
  static assertStagingEnvironment(): StagingReadinessReport {
    const report = this.checkStagingReadiness();
    if (!report.ready) {
      logger.error("StagingEnvironmentGuard", "Staging environment guard failed", {
        meta: { reasons: report.reasons, project: report.firebaseProjectId },
      });
      throw new Error(
        `ABORT: Staging environment safety check failed. Production hazard detected or unapproved target: ${report.reasons.join(
          " | "
        )}`
      );
    }
    return report;
  }
}
