/**
 * Firebase Configuration & Validation (Client & Admin)
 * Validates environment variables with Zod without leaking secret values.
 * Compatible with Spark (No-Cost) Plan.
 */

import { z } from "zod";

export const FirebaseClientConfigSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  authDomain: z.string().min(1, "Auth Domain is required"),
  projectId: z.string().min(1, "Project ID is required"),
  storageBucket: z.string().optional(),
  messagingSenderId: z.string().optional(),
  appId: z.string().min(1, "App ID is required"),
  measurementId: z.string().optional(),
});

export type FirebaseClientConfig = z.infer<typeof FirebaseClientConfigSchema>;

export const FirebaseAdminConfigSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  clientEmail: z.string().email("Valid client email required").optional(),
  privateKey: z.string().min(1, "Private key is required").optional(),
});

export type FirebaseAdminConfig = z.infer<typeof FirebaseAdminConfigSchema>;

/**
 * Returns whether client-side Firebase environment variables are defined.
 */
export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID &&
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("placeholder")
  );
}

/**
 * Retrieves and validates client-side Firebase configuration.
 * Returns null if not configured or validation fails.
 */
export function getFirebaseClientConfig(): FirebaseClientConfig | null {
  const raw = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  const parsed = FirebaseClientConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

/**
 * Returns whether server-side Firebase Admin credentials are configured.
 */
export function isFirebaseAdminConfigured(): boolean {
  // If running with local emulator, admin credentials are not required
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return Boolean(
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );
  }

  return Boolean(
    (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY &&
    !process.env.FIREBASE_PRIVATE_KEY.includes("placeholder")
  );
}

/**
 * Retrieves and validates server-side Firebase Admin configuration.
 * Formats escaped newlines in private keys.
 */
export function getFirebaseAdminConfig(): FirebaseAdminConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Replace literal escaped \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const raw = {
    projectId,
    clientEmail,
    privateKey,
  };

  const parsed = FirebaseAdminConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}
