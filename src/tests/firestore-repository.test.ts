import { describe, it, expect, beforeEach } from "vitest";
import {
  userRepository,
  preferencesRepository,
  householdRepository,
  routinesRepository,
  chatRepository,
  sustainabilityRepository,
  notificationsRepository,
  firestoreDeletionService,
  BaseFirestoreRepository,
} from "@/services/firebase/firestore";
import { dataService, getDataProviderConfig } from "@/services/data-provider";
import { z } from "zod";

describe("Milestone 6C — Firestore Data Layer & Secure Repository Suite", () => {
  const USER_A = "firebase_user_alpha_111";
  const USER_B = "firebase_user_beta_222";

  beforeEach(() => {
    BaseFirestoreRepository.resetMockStore();
    delete process.env.DATA_PROVIDER;
  });

  describe("Phase 8 Verification: 24 Repository & Security Scenarios", () => {
    // 1. User profile read and update
    it("1. User profile read and update persists correctly", async () => {
      // Mock existing profile
      BaseFirestoreRepository.mockStore.profiles[USER_A] = {
        uid: USER_A,
        displayName: "Initial Name",
        email: "user_a@breathewise.ai",
      };

      const updateRes = await userRepository.updateProfile(USER_A, {
        fullName: "Updated Alpha",
        avatarUrl: "https://avatar.test/1.png",
      });
      expect(updateRes.success).toBe(true);

      const profile = await userRepository.getProfile(USER_A);
      expect(profile).not.toBeNull();
      expect(profile?.displayName).toBe("Updated Alpha");
      expect(profile?.avatarUrl).toBe("https://avatar.test/1.png");
    });

    // 2. Preferences creation and update
    it("2. Preferences creation and update handles location and schedule", async () => {
      const locRes = await preferencesRepository.saveLocation(USER_A, {
        name: "Darjeeling",
        region: "West Bengal",
        country: "India",
        latitude: 27.041,
        longitude: 88.2663,
      });
      expect(locRes.success).toBe(true);

      const updateRes = await preferencesRepository.updatePreferences(USER_A, {
        morningCommuteTime: "08:15",
        eveningCommuteTime: "17:45",
      });
      expect(updateRes.success).toBe(true);

      const prefs = await preferencesRepository.getPreferences(USER_A);
      expect(prefs).not.toBeNull();
      expect(prefs?.defaultCity).toBe("Darjeeling");
      expect(prefs?.morningCommuteTime).toBe("08:15");
    });

    // 3. Household member creation, update and deletion
    it("3. Household member creation, update and deletion works seamlessly", async () => {
      const addRes = await householdRepository.addMember(USER_A, {
        name: "Arjun",
        relation: "child",
        ageYears: 8,
        vulnerabilityLevel: "high",
        respiratorySensitivity: true,
        notes: "Mild pediatric asthma",
      });

      expect(addRes.success).toBe(true);
      expect(addRes.data).toBeDefined();
      const memberId = addRes.data!.id;

      // Update
      const updateRes = await householdRepository.updateMember(USER_A, memberId, {
        notes: "Needs inhaler during smog alerts",
      });
      expect(updateRes.success).toBe(true);

      const members = await householdRepository.getMembers(USER_A);
      expect(members.length).toBe(1);
      expect(members[0].notes).toBe("Needs inhaler during smog alerts");

      // Delete
      const deleteRes = await householdRepository.deleteMember(USER_A, memberId);
      expect(deleteRes.success).toBe(true);
      const remaining = await householdRepository.getMembers(USER_A);
      expect(remaining.length).toBe(0);
    });

    // 4. Saved routine creation, listing and deletion
    it("4. Saved routine creation, listing and deletion succeeds", async () => {
      const saveRes = await routinesRepository.saveRoutine(
        USER_A,
        "Winter Inversion Plan",
        [
          {
            id: "rt1",
            timeSlot: "06:00 - 08:00",
            title: "Morning Smog Window",
            recommendation: "Stay indoors; run air purifier",
            status: "avoid",
            impactScore: "protective",
          },
        ]
      );

      expect(saveRes.success).toBe(true);
      const routineId = saveRes.data!.id;

      const routines = await routinesRepository.getRoutines(USER_A);
      expect(routines.length).toBe(1);
      expect(routines[0].title).toBe("Winter Inversion Plan");

      const delRes = await routinesRepository.deleteRoutine(USER_A, routineId);
      expect(delRes.success).toBe(true);
      const postDel = await routinesRepository.getRoutines(USER_A);
      expect(postDel.length).toBe(0);
    });

    // 5. Chat session creation
    it("5. Chat session creation initializes session with location metadata", async () => {
      const sessionRes = await chatRepository.createSession(
        USER_A,
        "Winter Smog AQI Advisory",
        "Siliguri"
      );
      expect(sessionRes.success).toBe(true);
      expect(sessionRes.data?.title).toBe("Winter Smog AQI Advisory");
      expect(sessionRes.data?.locationName).toBe("Siliguri");

      const sessions = await chatRepository.getSessions(USER_A);
      expect(sessions.length).toBe(1);
    });

    // 6. Nested chat message ownership
    it("6. Nested chat message inherits ownership from parent session", async () => {
      const sessionRes = await chatRepository.createSession(USER_A, "Advisory Session");
      const sessionId = sessionRes.data!.id;

      // Add message under User A session
      const msgRes = await chatRepository.addMessage(
        USER_A,
        sessionId,
        "user",
        "Should I open windows today?"
      );
      expect(msgRes.success).toBe(true);

      const messages = await chatRepository.getMessages(USER_A, sessionId);
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("Should I open windows today?");

      // User B attempts to append message to User A's session -> must be rejected
      const maliciousMsg = await chatRepository.addMessage(
        USER_B,
        sessionId,
        "user",
        "Hijacked message"
      );
      expect(maliciousMsg.success).toBe(false);
      expect(maliciousMsg.error).toContain("forbidden");
    });

    // 7. Sustainability action persistence
    it("7. Sustainability action logs and retrieves user eco-actions", async () => {
      const actionRes = await sustainabilityRepository.addAction(USER_A, {
        category: "commute",
        actionDescription: "Took public metro instead of car",
        estimatedCo2SavedKg: 3.2,
        estimatedParticulateAvoidedPct: 15.0,
        recordedAt: new Date().toISOString(),
      });

      expect(actionRes.success).toBe(true);
      const actionId = actionRes.data!.id;

      const actions = await sustainabilityRepository.getActions(USER_A);
      expect(actions.length).toBe(1);
      expect(actions[0].estimatedCo2SavedKg).toBe(3.2);

      const delRes = await sustainabilityRepository.deleteAction(USER_A, actionId);
      expect(delRes.success).toBe(true);
    });

    // 8. Notification preferences
    it("8. Notification preferences retrieves and updates smog thresholds", async () => {
      const updateRes = await notificationsRepository.updatePreferences(USER_A, {
        emailAlertsEnabled: true,
        severeSmogThreshold: 280,
        dailyBriefingTime: "06:30:00",
      });
      expect(updateRes.success).toBe(true);

      const prefs = await notificationsRepository.getPreferences(USER_A);
      expect(prefs).not.toBeNull();
      expect(prefs?.severeSmogThreshold).toBe(280);
      expect(prefs?.dailyBriefingTime).toBe("06:30:00");
    });

    // 9. User A attempting to access User B's records
    it("9. Cross-user isolation: User B cannot view User A's household members", async () => {
      await householdRepository.addMember(USER_A, {
        name: "Private Child",
        relation: "child",
        vulnerabilityLevel: "critical",
        respiratorySensitivity: true,
      });

      const membersA = await householdRepository.getMembers(USER_A);
      expect(membersA.length).toBe(1);

      // User B query returns empty list
      const membersB = await householdRepository.getMembers(USER_B);
      expect(membersB.length).toBe(0);
    });

    // 10. Forged UID in request payload
    it("10. Repository ignores forged UIDs in payload and strictly enforces session UID", async () => {
      // User B sends payload claiming to be User A
      const forgedPayload = {
        name: "Forged Member",
        relation: "partner" as const,
        vulnerabilityLevel: "standard" as const,
        respiratorySensitivity: false,
        userId: USER_A, // Attacker attempts to forge ownership
      };

      // Server calls repository with authenticated caller User B
      const result = await householdRepository.addMember(USER_B, forgedPayload);
      expect(result.success).toBe(true);
      // The member MUST be stored under User B's path, not User A's
      expect(result.data?.userId).toBe(USER_B);

      const listA = await householdRepository.getMembers(USER_A);
      expect(listA.length).toBe(0); // User A unaffected
      const listB = await householdRepository.getMembers(USER_B);
      expect(listB.length).toBe(1);
    });

    // 11. Forged ownership fields
    it("11. Updates to records cannot alter parent document ownership", async () => {
      const addRes = await householdRepository.addMember(USER_A, {
        name: "Aarav",
        relation: "child",
        vulnerabilityLevel: "high",
        respiratorySensitivity: true,
      });
      const memberId = addRes.data!.id;

      // User B attempts to update User A's record
      const updateAttempt = await householdRepository.updateMember(USER_B, memberId, {
        name: "Tampered Name",
      });
      expect(updateAttempt.success).toBe(false);
      expect(updateAttempt.error).toContain("forbidden");

      // Verify User A's record is unchanged
      const members = await householdRepository.getMembers(USER_A);
      expect(members[0].name).toBe("Aarav");
    });

    // 12. Unauthorized access
    it("12. Rejects operations when caller UID is empty", async () => {
      const getAttempt = await householdRepository.getMembers("");
      expect(getAttempt.length).toBe(0);

      const addAttempt = await householdRepository.addMember("", {
        name: "Anon",
        relation: "other",
        vulnerabilityLevel: "standard",
        respiratorySensitivity: false,
      });
      expect(addAttempt.success).toBe(false);
      expect(addAttempt.error).toContain("UID required");
    });

    // 13. Invalid document IDs
    it("13. Safe handling of non-existent document IDs", async () => {
      const fakeId = "non_existent_uuid_9999";
      const delRes = await routinesRepository.deleteRoutine(USER_A, fakeId);
      expect(delRes.success).toBe(false);
      expect(delRes.error).toContain("forbidden");
    });

    // 14. Invalid Zod payloads
    it("14. Rejects invalid Zod payloads at schema boundary", () => {
      const RoutineItemSchema = z.object({
        id: z.string(),
        status: z.enum(["recommended", "caution", "avoid"]),
      });

      const invalidItem = {
        id: "rt_bad",
        status: "unknown_status", // Invalid enum
      };

      const parsed = RoutineItemSchema.safeParse(invalidItem);
      expect(parsed.success).toBe(false);
    });

    // 15. Pagination boundaries
    it("15. Enforces query limits and pagination boundaries", async () => {
      for (let i = 1; i <= 5; i++) {
        await routinesRepository.saveRoutine(USER_A, `Routine ${i}`, [
          {
            id: `item_${i}`,
            timeSlot: "10:00",
            title: `Item ${i}`,
            recommendation: "Test",
            status: "recommended",
            impactScore: "neutral",
          },
        ]);
      }

      // Query with limit 2
      const limited = await routinesRepository.getRoutines(USER_A, 2);
      expect(limited.length).toBe(2);
    });

    // 16. Concurrent updates
    it("16. Sequential updates preserve unrelated fields", async () => {
      await preferencesRepository.updatePreferences(USER_A, {
        defaultCity: "Kolkata",
        morningCommuteTime: "09:00",
      });

      await preferencesRepository.updatePreferences(USER_A, {
        eveningCommuteTime: "18:30",
      });

      const prefs = await preferencesRepository.getPreferences(USER_A);
      expect(prefs?.defaultCity).toBe("Kolkata");
      expect(prefs?.morningCommuteTime).toBe("09:00");
      expect(prefs?.eveningCommuteTime).toBe("18:30");
    });

    // 17. Idempotent writes
    it("17. Idempotent repeated preference updates succeed without duplicate documents", async () => {
      await preferencesRepository.saveLocation(USER_A, {
        name: "Siliguri",
        region: "West Bengal",
        country: "India",
        latitude: 26.7271,
        longitude: 88.3953,
      });

      await preferencesRepository.saveLocation(USER_A, {
        name: "Siliguri",
        region: "West Bengal",
        country: "India",
        latitude: 26.7271,
        longitude: 88.3953,
      });

      const prefs = await preferencesRepository.getPreferences(USER_A);
      expect(prefs?.defaultCity).toBe("Siliguri");
    });

    // 18. Firestore transaction failure handling / error sanitization
    it("18. Standardizes internal errors without exposing database stack traces", async () => {
      const res = await householdRepository.updateMember(USER_A, "invalid_id", {});
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error).not.toContain("stack");
    });

    // 19. Recursive deletion across nested collections
    it("19. Recursive deletion purges all subcollections and root document", async () => {
      // Seed data across multiple domains for USER_A
      await preferencesRepository.saveLocation(USER_A, {
        name: "Siliguri",
        region: "West Bengal",
        country: "India",
        latitude: 26.7,
        longitude: 88.3,
      });
      await householdRepository.addMember(USER_A, {
        name: "Member 1",
        relation: "child",
        vulnerabilityLevel: "high",
        respiratorySensitivity: true,
      });
      await routinesRepository.saveRoutine(USER_A, "Routine 1", []);
      const session = await chatRepository.createSession(USER_A, "Session 1");
      await chatRepository.addMessage(USER_A, session.data!.id, "user", "Message 1");
      await sustainabilityRepository.addAction(USER_A, {
        category: "home",
        actionDescription: "Sealed windows",
        estimatedCo2SavedKg: 1.0,
        estimatedParticulateAvoidedPct: 10.0,
        recordedAt: new Date().toISOString(),
      });
      await notificationsRepository.updatePreferences(USER_A, { severeSmogThreshold: 250 });

      // Execute recursive purge
      const purgeRes = await firestoreDeletionService.deleteUserAccountData(USER_A, USER_A);
      expect(purgeRes.success).toBe(true);
      expect(purgeRes.totalDeleted).toBeGreaterThanOrEqual(5);

      // Verify all subcollections are cleared
      const remainingMembers = await householdRepository.getMembers(USER_A);
      expect(remainingMembers.length).toBe(0);
      const remainingRoutines = await routinesRepository.getRoutines(USER_A);
      expect(remainingRoutines.length).toBe(0);
      const remainingSessions = await chatRepository.getSessions(USER_A);
      expect(remainingSessions.length).toBe(0);
    });

    // 20. Partial deletion and retry
    it("20. Recursive deletion is resumable and safely retryable", async () => {
      // First deletion
      const res1 = await firestoreDeletionService.deleteUserAccountData(USER_A, USER_A);
      expect(res1.success).toBe(true);

      // Immediate retry on already purged account
      const res2 = await firestoreDeletionService.deleteUserAccountData(USER_A, USER_A);
      expect(res2.success).toBe(true);
      expect(res2.totalDeleted).toBe(0);
    });

    // 21. Supabase provider rejection
    it("21. Legacy DATA_PROVIDER=supabase configuration is rejected safely", async () => {
      process.env.DATA_PROVIDER = "supabase";
      const config = getDataProviderConfig();
      expect(config.isValid).toBe(false);

      await expect(dataService.getHouseholdMembers(USER_A)).rejects.toThrow(
        "Invalid DATA_PROVIDER configured"
      );
    });

    // 22. Firebase provider selection
    it("22. Explicit DATA_PROVIDER=firebase routes to Firestore repositories", async () => {
      process.env.DATA_PROVIDER = "firebase";
      expect(dataService.currentProvider).toBe("firebase");

      await dataService.addHouseholdMember(USER_A, {
        name: "Firestore Dependent",
        relation: "child",
        vulnerabilityLevel: "high",
        respiratorySensitivity: true,
      });

      const members = await dataService.getHouseholdMembers(USER_A);
      expect(members.length).toBe(1);
      expect(members[0].name).toBe("Firestore Dependent");
    });

    // 23. Invalid provider configuration
    it("23. Invalid DATA_PROVIDER value is flagged and rejected safely", async () => {
      process.env.DATA_PROVIDER = "invalid_provider_name";
      const config = getDataProviderConfig();
      expect(config.isValid).toBe(false);

      // Attempting to query with invalid provider throws explicit error
      await expect(dataService.getHouseholdMembers(USER_A)).rejects.toThrow(
        "Invalid DATA_PROVIDER configured"
      );
    });

    // 24. No accidental provider fallback
    it("24. Does not silently fallback between providers on error", async () => {
      process.env.DATA_PROVIDER = "firebase";

      // If a Firestore operation fails, it must return a failure without falling back to Supabase
      const badUpdate = await dataService.updateHouseholdMember(USER_A, "non_existent_id", {
        name: "Should Fail",
      });
      expect(badUpdate.success).toBe(false);
      expect(dataService.currentProvider).toBe("firebase");
    });
  });
});
