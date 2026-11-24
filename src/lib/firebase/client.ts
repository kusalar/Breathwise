/**
 * Firebase Client SDK Initialization
 * Singleton initialization with Next.js Fast Refresh guards and local emulator support.
 * Does not initialize or throw if environment variables are not configured.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFirebaseClientConfig } from "./config";

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;
let emulatorsConnected = false;

/**
 * Returns the initialized Firebase Client App singleton, or null if not configured.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp) {
    return cachedApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = getApp();
    return cachedApp;
  }

  const config = getFirebaseClientConfig();
  if (!config) {
    return null;
  }

  cachedApp = initializeApp(config);
  return cachedApp;
}

/**
 * Returns the Firebase Auth instance, attaching emulator if configured.
 */
export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  const auth = getAuth(app);

  if (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
    !emulatorsConnected
  ) {
    const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "http://127.0.0.1:9099";
    try {
      connectAuthEmulator(auth, authHost, { disableWarnings: true });
    } catch {
      // Ignore if already connected in Fast Refresh
    }
  }

  cachedAuth = auth;
  return cachedAuth;
}

/**
 * Returns the Cloud Firestore instance, attaching emulator if configured.
 */
export function getFirebaseFirestore(): Firestore | null {
  if (cachedFirestore) {
    return cachedFirestore;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  const db = getFirestore(app);

  if (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
    !emulatorsConnected
  ) {
    const firestoreHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
    const [host, portStr] = firestoreHost.split(":");
    const port = portStr ? parseInt(portStr, 10) : 8080;
    try {
      connectFirestoreEmulator(db, host || "127.0.0.1", port);
    } catch {
      // Ignore if already connected in Fast Refresh
    }
  }

  cachedFirestore = db;
  return cachedFirestore;
}

/**
 * Marks emulator connection state to prevent multiple connections in the same lifecycle.
 */
export function markEmulatorsConnected(): void {
  emulatorsConnected = true;
}
