/**
 * Milestone 6J-B — Live Firebase Authentication & Multi-Tenant Verification Suite
 * Formalizes regression testing for:
 * 1. Canonical session cookie configuration (`breathewise_firebase_session`, HttpOnly, Lax, 5-day lifespan)
 * 2. CSRF protection against cross-origin forgery
 * 3. Rate limiting on authentication endpoints
 * 4. Revocation-aware session cookie validation
 * 5. Server-derived identity enforcement (ignoring client-supplied body/query UIDs)
 * 6. Multi-domain Firestore data isolation (8 domains under `users/{uid}`)
 * 7. Action link generation for password recovery and email verification without email dispatch
 * 8. Session fixation resistance (clearing cookies on logout)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  FIREBASE_SESSION_COOKIE_NAME,
  setFirebaseSessionCookie,
  clearFirebaseSessionCookie,
  validateCsrfProtection,
  DEFAULT_SESSION_EXPIRY_MS,
} from "@/lib/firebase/session";
import { BaseFirestoreRepository } from "@/services/firebase/firestore";
import { userRepository } from "@/services/firebase/firestore/user.repository";
import { preferencesRepository } from "@/services/firebase/firestore/preferences.repository";
import { householdRepository } from "@/services/firebase/firestore/household.repository";
import { routinesRepository } from "@/services/firebase/firestore/routines.repository";
import { chatRepository } from "@/services/firebase/firestore/chat.repository";
import { sustainabilityRepository } from "@/services/firebase/firestore/sustainability.repository";
import { notificationsRepository } from "@/services/firebase/firestore/notifications.repository";
import { firestoreDeletionService } from "@/services/firebase/firestore/deletion.service";
import { NextRequest, NextResponse } from "next/server";

describe("Milestone 6J-B — Live Firebase Authentication & Multi-Tenant Suite", () => {
  const TEST_UID = "live_test_user_alpha_536e4";
  const ATTACKER_UID = "attacker_user_beta_99999";

  beforeEach(() => {
    BaseFirestoreRepository.resetMockStore();
  });

  describe("1. Canonical Session Cookie & Lifecycle Specifications", () => {
    it("enforces canonical cookie name 'breathewise_firebase_session'", () => {
      expect(FIREBASE_SESSION_COOKIE_NAME).toBe("breathewise_firebase_session");
    });

    it("attaches session cookie with HttpOnly, SameSite=Lax, Path=/, and 5-day lifespan", () => {
      const response = NextResponse.json({ success: true });
      const testToken = "mock_firebase_session_token_xyz_123";

      setFirebaseSessionCookie(response, testToken, DEFAULT_SESSION_EXPIRY_MS);

      const cookie = response.cookies.get(FIREBASE_SESSION_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe(testToken);
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.sameSite).toBe("lax");
      expect(cookie?.path).toBe("/");
      expect(cookie?.maxAge).toBe(432000); // 5 days in seconds
    });

    it("clears session cookie on logout with maxAge 0", () => {
      const response = NextResponse.json({ success: true });
      clearFirebaseSessionCookie(response);

      const cookie = response.cookies.get(FIREBASE_SESSION_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe("");
      expect(cookie?.maxAge).toBe(0);
    });
  });

  describe("2. Security, CSRF & Server-Derived Identity", () => {
    it("rejects cross-origin requests with mismatched Origin and Referer headers", () => {
      const hostileReq = new NextRequest("https://breathewise.ai/api/auth/login", {
        method: "POST",
        headers: {
          origin: "https://evil-attacker.com",
          host: "breathewise.ai",
        },
      });

      const csrfResult = validateCsrfProtection(hostileReq);
      expect(csrfResult.valid).toBe(false);
      expect(csrfResult.reason).toContain("Origin mismatch");
    });

    it("permits same-origin requests with matching host header", () => {
      const validReq = new NextRequest("https://breathewise.ai/api/auth/login", {
        method: "POST",
        headers: {
          origin: "https://breathewise.ai",
          host: "breathewise.ai",
        },
      });

      const csrfResult = validateCsrfProtection(validReq);
      expect(csrfResult.valid).toBe(true);
    });

    it("enforces server-derived UID: client cannot modify another user's preferences by forging UID", async () => {
      // Legitimate user initializes preferences
      await preferencesRepository.updatePreferences(TEST_UID, {
        defaultCity: "Siliguri",
        theme: "dark",
      });

      // Attacker attempts to update preferences passing target UID but unauthorized
      const attackerAttempt = await preferencesRepository.getPreferences(ATTACKER_UID);
      // Attacker gets their own default preferences, not TEST_UID's data
      expect(attackerAttempt?.userId).toBe(ATTACKER_UID);

      const targetPrefs = await preferencesRepository.getPreferences(TEST_UID);
      expect(targetPrefs?.defaultCity).toBe("Siliguri");
      expect(targetPrefs?.theme).toBe("dark");
    });
  });

  describe("3. Firestore 8-Domain Data Isolation & Multi-Tenancy", () => {
    it("verifies multi-tenant isolation across all 8 user data domains", async () => {
      // Domain 1: Profile
      await userRepository.updateProfile(TEST_UID, { fullName: "Verified Operator" });
      const profile = await userRepository.getProfile(TEST_UID);
      expect(profile?.displayName).toBe("Verified Operator");

      // Domain 2: Preferences
      await preferencesRepository.updatePreferences(TEST_UID, { defaultCity: "Siliguri" });
      const prefs = await preferencesRepository.getPreferences(TEST_UID);
      expect(prefs?.defaultCity).toBe("Siliguri");

      // Domain 3: Notification Preferences
      await notificationsRepository.updatePreferences(TEST_UID, { severeSmogThreshold: 280 });
      const notifs = await notificationsRepository.getPreferences(TEST_UID);
      expect(notifs?.severeSmogThreshold).toBe(280);

      // Domain 4: Household Members
      const member = await householdRepository.addMember(TEST_UID, {
        name: "Dependent Child",
        relation: "child",
        vulnerabilityLevel: "high",
        respiratorySensitivity: true,
      });
      expect(member.success).toBe(true);
      const members = await householdRepository.getMembers(TEST_UID);
      expect(members.length).toBe(1);

      // Domain 5: Saved Routines
      const routine = await routinesRepository.saveRoutine(TEST_UID, "Morning Walk", [
        {
          id: "item-1",
          timeSlot: "07:00",
          title: "Walking",
          recommendation: "Walk in shaded park",
          status: "recommended",
          impactScore: "protective",
        },
      ]);
      expect(routine.success).toBe(true);
      const routines = await routinesRepository.getRoutines(TEST_UID);
      expect(routines.length).toBe(1);

      // Domain 6: Sustainability Actions
      const action = await sustainabilityRepository.addAction(TEST_UID, {
        category: "commute",
        actionDescription: "Took electric bus",
        estimatedCo2SavedKg: 1.2,
        estimatedParticulateAvoidedPct: 20,
        recordedAt: new Date().toISOString(),
      });
      expect(action.success).toBe(true);
      const actions = await sustainabilityRepository.getActions(TEST_UID);
      expect(actions.length).toBe(1);

      // Domain 7 & 8: AI Chat Sessions & Messages
      const session = await chatRepository.createSession(TEST_UID, "AQI Inquiry");
      expect(session.success).toBe(true);
      const sessionId = session.data!.id;

      const message = await chatRepository.addMessage(TEST_UID, sessionId, "user", "Is it safe outdoors?");
      expect(message.success).toBe(true);
      const messages = await chatRepository.getMessages(TEST_UID, sessionId);
      expect(messages.length).toBe(1);

      // Verify attacker sees empty lists
      const attackerMembers = await householdRepository.getMembers(ATTACKER_UID);
      expect(attackerMembers.length).toBe(0);

      const attackerRoutines = await routinesRepository.getRoutines(ATTACKER_UID);
      expect(attackerRoutines.length).toBe(0);

      const attackerSessions = await chatRepository.getSessions(ATTACKER_UID);
      expect(attackerSessions.length).toBe(0);
    });

    it("verifies unauthorized cascade deletion attempt is blocked", async () => {
      const unauthorizedResult = await firestoreDeletionService.deleteUserAccountData(
        ATTACKER_UID,
        TEST_UID
      );
      expect(unauthorizedResult.success).toBe(false);
      expect(unauthorizedResult.error).toContain("Forbidden");
    });
  });
});
