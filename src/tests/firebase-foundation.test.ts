import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  FirebaseClientConfigSchema,
  FirebaseAdminConfigSchema,
  isFirebaseClientConfigured,
  getFirebaseClientConfig,
  isFirebaseAdminConfigured,
  getFirebaseAdminConfig,
} from "@/lib/firebase/config";
import { getFirebaseApp, getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase/client";
import { getAdminApp, getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

describe("Firebase Foundation & Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("FirebaseClientConfigSchema", () => {
    it("validates valid client configuration", () => {
      const validConfig = {
        apiKey: "AIzaSyFakeApiKeyForTesting123456789",
        authDomain: "breathewise-ai.firebaseapp.com",
        projectId: "breathewise-ai",
        storageBucket: "breathewise-ai.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:abcdef123456",
      };

      const result = FirebaseClientConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it("fails validation when required fields are missing", () => {
      const invalidConfig = {
        apiKey: "",
        projectId: "breathewise-ai",
      };

      const result = FirebaseClientConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe("FirebaseAdminConfigSchema", () => {
    it("validates valid admin configuration", () => {
      const validAdmin = {
        projectId: "breathewise-ai",
        clientEmail: "firebase-adminsdk-test@breathewise-ai.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----\n",
      };

      const result = FirebaseAdminConfigSchema.safeParse(validAdmin);
      expect(result.success).toBe(true);
    });

    it("rejects invalid email formats", () => {
      const invalidAdmin = {
        projectId: "breathewise-ai",
        clientEmail: "not-an-email",
        privateKey: "some-key",
      };

      const result = FirebaseAdminConfigSchema.safeParse(invalidAdmin);
      expect(result.success).toBe(false);
    });
  });

  describe("Environment variable checks and safe getters", () => {
    it("returns false for isFirebaseClientConfigured when env vars are unset", () => {
      delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

      expect(isFirebaseClientConfigured()).toBe(false);
      expect(getFirebaseClientConfig()).toBeNull();
    });

    it("returns true and parses configuration when env vars are set", () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test-api-key";
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "test-project.firebaseapp.com";
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:123456:web:abcdef";

      expect(isFirebaseClientConfigured()).toBe(true);
      const config = getFirebaseClientConfig();
      expect(config).not.toBeNull();
      expect(config?.projectId).toBe("test-project");
      expect(config?.apiKey).toBe("test-api-key");
    });

    it("replaces literal escaped newlines in private key", () => {
      process.env.FIREBASE_PROJECT_ID = "test-project";
      process.env.FIREBASE_CLIENT_EMAIL = "admin@test-project.iam.gserviceaccount.com";
      process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBA\\n-----END PRIVATE KEY-----\\n";

      const adminConfig = getFirebaseAdminConfig();
      expect(adminConfig).not.toBeNull();
      expect(adminConfig?.privateKey).toContain("\n");
      expect(adminConfig?.privateKey).not.toContain("\\n");
    });

    it("detects emulator environment correctly for admin configuration", () => {
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;
      process.env.FIREBASE_PROJECT_ID = "test-project";
      process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

      expect(isFirebaseAdminConfigured()).toBe(true);
    });
  });

  describe("Client & Admin SDK Singleton initialization guards", () => {
    it("returns null safely without throwing when client env is unconfigured", () => {
      delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

      expect(getFirebaseApp()).toBeNull();
      expect(getFirebaseAuth()).toBeNull();
      expect(getFirebaseFirestore()).toBeNull();
    });

    it("returns null safely without throwing when admin env is unconfigured", () => {
      delete process.env.FIREBASE_PROJECT_ID;
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;
      delete process.env.FIRESTORE_EMULATOR_HOST;
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

      expect(getAdminApp()).toBeNull();
      expect(getAdminAuth()).toBeNull();
      expect(getAdminFirestore()).toBeNull();
    });
  });
});
