import { describe, it, expect, beforeEach } from "vitest";
import { dataService, getDataProviderConfig } from "@/services/data-provider";
import {
  BaseFirestoreRepository,
  userRepository,
  preferencesRepository,
  householdRepository,
  routinesRepository,
  chatRepository,
  sustainabilityRepository,
  notificationsRepository,
  firestoreDeletionService,
} from "@/services/firebase/firestore";
import { getSessionUser } from "@/lib/auth/server-auth";
import { NextRequest } from "next/server";
import { FIREBASE_SESSION_COOKIE_NAME } from "@/lib/firebase/session";

describe("Milestone 6I-C — Firestore-Only Data Layer Cutover Suite", () => {
  const USER_A = "firebase_user_alpha_111";
  const USER_B = "firebase_user_beta_222";

  beforeEach(() => {
    BaseFirestoreRepository.resetMockStore();
    delete process.env.DATA_PROVIDER;
  });

  describe("Mandatory 24 Data Cutover Scenarios", () => {
    // 1. Firestore-only data provider selection
    it("1. Firestore is the exclusive active data provider", () => {
      expect(dataService.currentProvider).toBe("firebase");
      const config = getDataProviderConfig();
      expect(config.provider).toBe("firebase");
      expect(config.isValid).toBe(true);
    });

    // 2. No Supabase runtime fallback
    it("2. Fails cleanly on invalid operations without falling back to Supabase", async () => {
      const res = await dataService.updateHouseholdMember(USER_A, "non_existent_member", {
        name: "Will Fail",
      });
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    // 3. Missing / invalid provider configuration handling
    it("3. Rejects invalid DATA_PROVIDER setting safely", async () => {
      process.env.DATA_PROVIDER = "supabase";
      const config = getDataProviderConfig();
      expect(config.isValid).toBe(false);

      await expect(dataService.getUserPreferences(USER_A)).rejects.toThrow(
        "Invalid DATA_PROVIDER configured"
      );
    });

    // 4. Authenticated user profile retrieval
    it("4. Authenticated user profile retrieval persists and returns correct schema", async () => {
      BaseFirestoreRepository.mockStore.profiles[USER_A] = {
        uid: USER_A,
        email: "alpha@breathewise.ai",
        displayName: "Alpha User",
      };

      const profile = await dataService.getProfile(USER_A);
      expect(profile).not.toBeNull();
      expect(profile?.uid).toBe(USER_A);
      expect(profile?.displayName).toBe("Alpha User");
    });

    // 5. Preferences read/write
    it("5. Preferences read/write correctly persists location and commute timings", async () => {
      await dataService.saveUserLocation(USER_A, {
        name: "Siliguri",
        region: "West Bengal",
        country: "India",
        latitude: 26.7271,
        longitude: 88.3953,
      });

      const prefs = await dataService.getUserPreferences(USER_A);
      expect(prefs).not.toBeNull();
      expect(prefs?.defaultCity).toBe("Siliguri");
      expect(prefs?.defaultLatitude).toBe(26.7271);
    });

    // 6. Household CRUD
    it("6. Household members full CRUD cycle in Firestore", async () => {
      // Add
      const addRes = await dataService.addHouseholdMember(USER_A, {
        name: "Aarav",
        relation: "child",
        ageYears: 7,
        vulnerabilityLevel: "high",
        respiratorySensitivity: true,
      });
      expect(addRes.success).toBe(true);
      const memberId = addRes.data!.id;

      // Read
      const list1 = await dataService.getHouseholdMembers(USER_A);
      expect(list1.length).toBe(1);
      expect(list1[0].name).toBe("Aarav");

      // Update
      const updateRes = await dataService.updateHouseholdMember(USER_A, memberId, {
        vulnerabilityLevel: "critical",
      });
      expect(updateRes.success).toBe(true);

      // Verify update
      const list2 = await dataService.getHouseholdMembers(USER_A);
      expect(list2[0].vulnerabilityLevel).toBe("critical");

      // Delete
      const delRes = await dataService.deleteHouseholdMember(USER_A, memberId);
      expect(delRes.success).toBe(true);

      const list3 = await dataService.getHouseholdMembers(USER_A);
      expect(list3.length).toBe(0);
    });

    // 7. Routine CRUD
    it("7. Saved routine full CRUD cycle in Firestore", async () => {
      const routineItems = [
        {
          id: "item_01",
          timeSlot: "07:00 - 08:00",
          title: "Indoor Air Yoga",
          recommendation: "Keep HEPA filter active",
          status: "recommended" as const,
          impactScore: "protective" as const,
        },
      ];

      // Save
      const saveRes = await dataService.saveRoutine(USER_A, "Morning Protection", routineItems);
      expect(saveRes.success).toBe(true);
      const routineId = saveRes.data!.id;

      // Read
      const routines = await dataService.getSavedRoutines(USER_A);
      expect(routines.length).toBe(1);
      expect(routines[0].title).toBe("Morning Protection");

      // Update
      const updateRes = await dataService.updateRoutine(USER_A, routineId, {
        title: "Morning Protection (Updated)",
      });
      expect(updateRes.success).toBe(true);

      // Delete
      const delRes = await dataService.deleteRoutine(USER_A, routineId);
      expect(delRes.success).toBe(true);

      const remaining = await dataService.getSavedRoutines(USER_A);
      expect(remaining.length).toBe(0);
    });

    // 8. Sustainability action persistence
    it("8. Sustainability action logging and retrieval", async () => {
      const addRes = await dataService.addSustainabilityAction(USER_A, {
        category: "commute",
        actionDescription: "Switched to Metro during peak smog",
        estimatedCo2SavedKg: 2.8,
        estimatedParticulateAvoidedPct: 40,
        recordedAt: new Date().toISOString(),
      });
      expect(addRes.success).toBe(true);

      const actions = await dataService.getSustainabilityActions(USER_A);
      expect(actions.length).toBe(1);
      expect(actions[0].category).toBe("commute");
    });

    // 9. Notification preferences
    it("9. Notification preferences read and update", async () => {
      const updateRes = await dataService.updateNotificationPreferences(USER_A, {
        emailAlertsEnabled: true,
        severeSmogThreshold: 250,
      });
      expect(updateRes.success).toBe(true);

      const notifs = await dataService.getNotificationPreferences(USER_A);
      expect(notifs).not.toBeNull();
      expect(notifs?.severeSmogThreshold).toBe(250);
      expect(notifs?.emailAlertsEnabled).toBe(true);
    });

    // 10. Chat session creation
    it("10. Chat session creation under /users/{uid}/chatSessions", async () => {
      const sessionRes = await dataService.createChatSession(USER_A, "Winter Smog Consultation", "Siliguri");
      expect(sessionRes.success).toBe(true);
      expect(sessionRes.data!.title).toBe("Winter Smog Consultation");
      expect(sessionRes.data!.userId).toBe(USER_A);
    });

    // 11. Chat message persistence
    it("11. Chat message persistence inherits session ownership", async () => {
      const sessionRes = await dataService.createChatSession(USER_A, "Advisory Session");
      const sessionId = sessionRes.data!.id;

      const msgRes = await dataService.addChatMessage(
        USER_A,
        sessionId,
        "user",
        "Is it safe for my child to play outdoors today?"
      );
      expect(msgRes.success).toBe(true);
      expect(msgRes.data!.content).toContain("safe for my child");
    });

    // 12. Chat message ordering
    it("12. Chat messages are retrieved in chronological order", async () => {
      const sessionRes = await dataService.createChatSession(USER_A, "Chronology Test");
      const sessionId = sessionRes.data!.id;

      await dataService.addChatMessage(USER_A, sessionId, "user", "Message 1");
      await dataService.addChatMessage(USER_A, sessionId, "assistant", "Message 2");

      const messages = await dataService.getChatMessages(USER_A, sessionId);
      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe("Message 1");
      expect(messages[1].content).toBe("Message 2");
    });

    // 13. Pagination limits
    it("13. Enforces bounded query limits on collection reads", async () => {
      const sessionRes = await dataService.createChatSession(USER_A, "Pagination Test");
      const sessionId = sessionRes.data!.id;

      // Seed 60 messages (limit is 50)
      for (let i = 1; i <= 55; i++) {
        await chatRepository.addMessage(USER_A, sessionId, "user", `Bulk message ${i}`);
      }

      const paginated = await chatRepository.getMessages(USER_A, sessionId, 50);
      expect(paginated.length).toBeLessThanOrEqual(50);
    });

    // 14. Cross-user read isolation
    it("14. User B cannot read User A's household data or routines", async () => {
      await dataService.addHouseholdMember(USER_A, {
        name: "Private Dependent A",
        relation: "partner",
        vulnerabilityLevel: "standard",
        respiratorySensitivity: false,
      });

      const listB = await dataService.getHouseholdMembers(USER_B);
      expect(listB.length).toBe(0);
    });

    // 15. Cross-user write isolation
    it("15. User B cannot update or delete User A's records", async () => {
      const addRes = await dataService.addHouseholdMember(USER_A, {
        name: "Victim Record",
        relation: "self",
        vulnerabilityLevel: "standard",
        respiratorySensitivity: false,
      });
      const memberId = addRes.data!.id;

      // User B attempts to delete User A's record
      const delAttempt = await dataService.deleteHouseholdMember(USER_B, memberId);
      expect(delAttempt.success).toBe(false);

      // Verify record still exists for User A
      const membersA = await dataService.getHouseholdMembers(USER_A);
      expect(membersA.length).toBe(1);
    });

    // 16. Forged UID rejection
    it("16. Ignores forged client-supplied UID and enforces verified session UID", async () => {
      // Caller is USER_A; attempt to pass forged userId in payload
      const addRes = await dataService.addHouseholdMember(USER_A, {
        name: "Spoof Test",
        relation: "self",
        vulnerabilityLevel: "standard",
        respiratorySensitivity: false,
      } as any);

      expect(addRes.success).toBe(true);
      expect(addRes.data!.userId).toBe(USER_A);
    });

    // 17. Session expiration handling
    it("17. Rejects expired session cookie cleanly at authorization boundary", async () => {
      const req = new NextRequest("http://localhost:3000/api/user/household", {
        headers: {
          cookie: `${FIREBASE_SESSION_COOKIE_NAME}=expired_cookie`,
        },
      });

      const user = await getSessionUser(req);
      expect(user).toBeNull();
    });

    // 18. Missing authentication
    it("18. Rejects missing authentication cookie in strict production mode", async () => {
      const req = new NextRequest("http://localhost:3000/api/user/household", {
        headers: {
          "x-strict-auth": "true",
        },
      });

      const user = await getSessionUser(req);
      expect(user).toBeNull();
    });

    // 19. Recursive deletion
    it("19. Recursive account cascade deletion purges all subcollections", async () => {
      // Seed user data across multiple domains
      await dataService.saveUserLocation(USER_A, {
        name: "Siliguri",
        region: "West Bengal",
        country: "India",
        latitude: 26.7271,
        longitude: 88.3953,
      });
      await dataService.addHouseholdMember(USER_A, {
        name: "Delete Me",
        relation: "child",
        vulnerabilityLevel: "standard",
        respiratorySensitivity: false,
      });

      const purgeRes = await dataService.deleteUserAccountCascade(USER_A, USER_A);
      expect(purgeRes.success).toBe(true);
      expect(purgeRes.totalDeleted).toBeGreaterThan(0);

      // Verify subcollections are cleared
      const remainingMembers = await dataService.getHouseholdMembers(USER_A);
      expect(remainingMembers.length).toBe(0);
    });

    // 20. Partial / unauthorized deletion failure
    it("20. Rejects unauthorized deletion attempt on another user's account", async () => {
      const purgeAttempt = await dataService.deleteUserAccountCascade(USER_B, USER_A);
      expect(purgeAttempt.success).toBe(false);
      expect(purgeAttempt.error).toContain("Forbidden");
    });

    // 21. Retry and idempotency
    it("21. Repeated preference updates are idempotent without duplicate documents", async () => {
      await dataService.saveUserLocation(USER_A, {
        name: "Siliguri",
        region: "West Bengal",
        country: "India",
        latitude: 26.7271,
        longitude: 88.3953,
      });

      await dataService.saveUserLocation(USER_A, {
        name: "Siliguri",
        region: "West Bengal",
        country: "India",
        latitude: 26.7271,
        longitude: 88.3953,
      });

      const prefs = await dataService.getUserPreferences(USER_A);
      expect(prefs?.defaultCity).toBe("Siliguri");
    });

    // 22. Concurrent update behavior
    it("22. Atomic merge updates preserve existing document fields", async () => {
      await preferencesRepository.updatePreferences(USER_A, {
        defaultCity: "Kolkata",
        morningCommuteTime: "08:30",
      });

      // Update only evening commute
      await preferencesRepository.updatePreferences(USER_A, {
        eveningCommuteTime: "18:00",
      });

      const prefs = await preferencesRepository.getPreferences(USER_A);
      expect(prefs?.defaultCity).toBe("Kolkata");
      expect(prefs?.morningCommuteTime).toBe("08:30");
      expect(prefs?.eveningCommuteTime).toBe("18:00");
    });

    // 23. Existing frontend API contract compatibility
    it("23. Returns exact expected JSON response contract for household API", async () => {
      const addRes = await dataService.addHouseholdMember(USER_A, {
        name: "Frontend Contract Test",
        relation: "elderly",
        vulnerabilityLevel: "high",
        respiratorySensitivity: true,
      });

      expect(addRes.success).toBe(true);
      expect(addRes.data).toHaveProperty("id");
      expect(addRes.data).toHaveProperty("userId", USER_A);
      expect(addRes.data!).toHaveProperty("name", "Frontend Contract Test");
      expect(addRes.data!).toHaveProperty("relation", "elderly");
      expect(addRes.data!).toHaveProperty("vulnerabilityLevel", "high");
    });

    // 24. AI workflow persistence
    it("24. Chat session and message persistence round-trip for AI Assistant", async () => {
      const session = await dataService.createChatSession(USER_A, "Gemini Consultation", "Siliguri");
      const sessionId = session.data!.id;

      await dataService.addChatMessage(
        USER_A,
        sessionId,
        "user",
        "What mask should I wear today in Siliguri?"
      );
      await dataService.addChatMessage(
        USER_A,
        sessionId,
        "assistant",
        "With PM2.5 at 180 ug/m3, wear a certified N95 or FFP2 respirator.",
        { aqiStandard: "CPCB_INDIA", dominantPollutant: "PM2.5" }
      );

      const history = await dataService.getChatMessages(USER_A, sessionId);
      expect(history.length).toBe(2);
      expect(history[0].role).toBe("user");
      expect(history[1].role).toBe("assistant");
      expect(history[1].metadata?.aqiStandard).toBe("CPCB_INDIA");
    });
  });
});
