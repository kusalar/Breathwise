/**
 * Firebase Admin SDK Initialization (Server-Side Only)
 * Singleton initialization with Next.js hot-reload safety and emulator awareness.
 * Compatible with Spark (No-Cost) Plan.
 */

import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getFirebaseAdminConfig, isFirebaseAdminConfigured } from "./config";

let cachedAdminApp: App | null = null;
let cachedAdminAuth: Auth | null = null;
let cachedAdminFirestore: Firestore | null = null;

/**
 * Returns the Firebase Admin App singleton, or null if not configured.
 */
export function getAdminApp(): App | null {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedAdminApp = getApp();
    return cachedAdminApp;
  }

  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const config = getFirebaseAdminConfig();
  if (!config) {
    return null;
  }

  // If local Firestore or Auth emulator is active, credentials are not required
  const isEmulator = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
  );

  if (isEmulator) {
    cachedAdminApp = initializeApp({
      projectId: config.projectId,
    });
  } else if (config.clientEmail && config.privateKey) {
    cachedAdminApp = initializeApp({
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
      projectId: config.projectId,
    });
  } else {
    cachedAdminApp = initializeApp({
      projectId: config.projectId,
    });
  }

  return cachedAdminApp;
}

/**
 * Returns the Firebase Admin Auth instance, or null if Admin SDK is not configured.
 */
export function getAdminAuth(): Auth | null {
  if (cachedAdminAuth) {
    return cachedAdminAuth;
  }

  const app = getAdminApp();
  if (!app) {
    return null;
  }

  cachedAdminAuth = getAuth(app);
  return cachedAdminAuth;
}

/**
 * Returns the Firebase Admin Firestore instance, or null if Admin SDK is not configured.
 */
export function getAdminFirestore(): Firestore | null {
  if (cachedAdminFirestore) {
    return cachedAdminFirestore;
  }

  const app = getAdminApp();
  if (!app) {
    return null;
  }

  cachedAdminFirestore = getFirestore(app);
  return cachedAdminFirestore;
}
