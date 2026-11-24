import { describe, it, expect, beforeEach } from "vitest";
import { dataService } from "@/services/data-provider";
import { BaseFirestoreRepository } from "@/services/firebase/firestore";
import fs from "fs";
import path from "path";

describe("Phase 3 & Milestone 6I-D — Multi-Tenant Security & Cross-User Isolation", () => {
  const USER_A = "user-a-uuid-1111";
  const USER_B = "user-b-uuid-2222";

  beforeEach(() => {
    BaseFirestoreRepository.resetMockStore();
  });

  describe("Household Members Isolation (User A vs User B)", () => {
    it("ensures User B cannot read User A's household members", async () => {
      // User A adds a vulnerable dependent (child with asthma)
      const resA = await dataService.addHouseholdMember(USER_A, {
        name: "Aarav",
        relation: "child",
        ageYears: 7,
        vulnerabilityLevel: "high",
        respiratorySensitivity: true,
        notes: "Uses salbutamol inhaler during peak winter smog",
      });

      expect(resA.success).toBe(true);
      expect(resA.data?.name).toBe("Aarav");

      // User A reads their household
      const listA = await dataService.getHouseholdMembers(USER_A);
      expect(listA.length).toBe(1);
      expect(listA[0].name).toBe("Aarav");

      // User B reads their household -> must be completely isolated (empty)
      const listB = await dataService.getHouseholdMembers(USER_B);
      expect(listB.length).toBe(0);
    });

    it("prevents User B from updating User A's household member", async () => {
      const resA = await dataService.addHouseholdMember(USER_A, {
        name: "Grandmother",
        relation: "elderly",
        ageYears: 76,
        vulnerabilityLevel: "critical",
        respiratorySensitivity: true,
      });

      const memberId = resA.data!.id;

      // User B attempts to overwrite User A's family record
      const maliciousUpdate = await dataService.updateHouseholdMember(USER_B, memberId, {
        name: "Hacked Record",
        vulnerabilityLevel: "standard",
      });

      expect(maliciousUpdate.success).toBe(false);

      // Verify User A's record remains pristine and untampered
      const verifiedList = await dataService.getHouseholdMembers(USER_A);
      expect(verifiedList[0].name).toBe("Grandmother");
      expect(verifiedList[0].vulnerabilityLevel).toBe("critical");
    });

    it("prevents User B from deleting User A's household member", async () => {
      const resA = await dataService.addHouseholdMember(USER_A, {
        name: "Priya",
        relation: "partner",
        vulnerabilityLevel: "standard",
        respiratorySensitivity: false,
      });

      const memberId = resA.data!.id;

      // User B attempts to delete User A's record
      const maliciousDelete = await dataService.deleteHouseholdMember(USER_B, memberId);
      expect(maliciousDelete.success).toBe(false);

      // Verify User A's record still exists
      const listA = await dataService.getHouseholdMembers(USER_A);
      expect(listA.length).toBe(1);
      expect(listA[0].id).toBe(memberId);
    });
  });

  describe("Saved Routines Isolation (User A vs User B)", () => {
    it("ensures User B cannot read User A's saved daily routines", async () => {
      await dataService.saveRoutine(USER_A, "Siliguri Smog Plan", [
        {
          id: "r1",
          timeSlot: "06:00 - 08:00",
          title: "Morning Routine",
          recommendation: "Avoid jogging; exercise indoors",
          status: "avoid",
          impactScore: "protective",
        },
      ]);

      const routinesA = await dataService.getSavedRoutines(USER_A);
      expect(routinesA.length).toBe(1);
      expect(routinesA[0].title).toBe("Siliguri Smog Plan");

      // User B must see nothing
      const routinesB = await dataService.getSavedRoutines(USER_B);
      expect(routinesB.length).toBe(0);
    });

    it("prevents User B from modifying or deleting User A's routine", async () => {
      const res = await dataService.saveRoutine(USER_A, "High Smog Alert Plan", [
        {
          id: "r1",
          timeSlot: "09:00 - 10:00",
          title: "Commute",
          recommendation: "Wear N95",
          status: "caution",
          impactScore: "protective",
        },
      ]);

      const routineId = res.data!.id;

      // User B tries to update
      const updateAttempt = await dataService.updateRoutine(USER_B, routineId, {
        title: "Malicious Routine Hijack",
      });
      expect(updateAttempt.success).toBe(false);

      // User B tries to delete
      const deleteAttempt = await dataService.deleteRoutine(USER_B, routineId);
      expect(deleteAttempt.success).toBe(false);

      // User A still owns their routine intact
      const routinesA = await dataService.getSavedRoutines(USER_A);
      expect(routinesA.length).toBe(1);
      expect(routinesA[0].title).toBe("High Smog Alert Plan");
    });
  });

  describe("Sustainability Actions Isolation (User A vs User B)", () => {
    it("ensures User B cannot read User A's logged eco-actions", async () => {
      await dataService.addSustainabilityAction(USER_A, {
        category: "commute",
        actionDescription: "Took E-rickshaw instead of petrol cab along Sevoke Road",
        estimatedCo2SavedKg: 2.4,
        estimatedParticulateAvoidedPct: 35,
        recordedAt: new Date().toISOString(),
      });

      const actionsA = await dataService.getSustainabilityActions(USER_A);
      expect(actionsA.length).toBe(1);
      expect(actionsA[0].estimatedCo2SavedKg).toBe(2.4);

      // User B must see nothing
      const actionsB = await dataService.getSustainabilityActions(USER_B);
      expect(actionsB.length).toBe(0);
    });

    it("prevents User B from editing or deleting User A's eco-action", async () => {
      const res = await dataService.addSustainabilityAction(USER_A, {
        category: "waste",
        actionDescription: "Composted kitchen organic scraps instead of open burning",
        estimatedCo2SavedKg: 5.0,
        estimatedParticulateAvoidedPct: 60,
        recordedAt: new Date().toISOString(),
      });

      const actionId = res.data!.id;

      // User B attempts to tamper
      const updateAttempt = await dataService.updateSustainabilityAction(USER_B, actionId, {
        estimatedCo2SavedKg: 0,
      });
      expect(updateAttempt.success).toBe(false);

      const deleteAttempt = await dataService.deleteSustainabilityAction(USER_B, actionId);
      expect(deleteAttempt.success).toBe(false);

      // Verify User A still has action
      const actionsA = await dataService.getSustainabilityActions(USER_A);
      expect(actionsA.length).toBe(1);
      expect(actionsA[0].estimatedCo2SavedKg).toBe(5.0);
    });
  });

  describe("Profiles Isolation (User A vs User B)", () => {
    it("ensures User A and User B have separate profile spaces", async () => {
      await dataService.updateProfile(USER_A, { fullName: "Aarav Sharma" });
      await dataService.updateProfile(USER_B, { fullName: "Bikash Roy" });

      const profA = await dataService.getProfile(USER_A);
      const profB = await dataService.getProfile(USER_B);

      expect(profA?.displayName).toBe("Aarav Sharma");
      expect(profB?.displayName).toBe("Bikash Roy");
      expect(profA?.uid).toBe(USER_A);
      expect(profB?.uid).toBe(USER_B);
    });
  });

  describe("User Preferences Isolation (User A vs User B)", () => {
    it("ensures User B's location preference does not bleed into User A's", async () => {
      await dataService.saveUserLocation(USER_A, {
        name: "Siliguri",
        region: "West Bengal",
        country: "India",
        latitude: 26.7271,
        longitude: 88.3953,
      });

      await dataService.saveUserLocation(USER_B, {
        name: "New Delhi",
        region: "Delhi",
        country: "India",
        latitude: 28.6139,
        longitude: 77.209,
      });

      const prefsA = await dataService.getUserPreferences(USER_A);
      const prefsB = await dataService.getUserPreferences(USER_B);

      expect(prefsA?.defaultCity).toBe("Siliguri");
      expect(prefsB?.defaultCity).toBe("New Delhi");
      expect(prefsA?.defaultLatitude).toBe(26.7271);
      expect(prefsB?.defaultLatitude).toBe(28.6139);
    });
  });

  describe("Chat Sessions and Messages Isolation (User A vs User B)", () => {
    it("prevents User B from viewing or accessing User A's chat sessions", async () => {
      const sessionA = await dataService.createChatSession(
        USER_A,
        "Smog Inversion Consultation",
        "Siliguri"
      );
      expect(sessionA.success).toBe(true);
      const sessIdA = sessionA.data!.id;

      // User A reads sessions -> finds 1
      const listA = await dataService.getChatSessions(USER_A);
      expect(listA.length).toBe(1);
      expect(listA[0].id).toBe(sessIdA);

      // User B reads sessions -> sees 0
      const listB = await dataService.getChatSessions(USER_B);
      expect(listB.length).toBe(0);
    });

    it("prevents User B from injecting messages into User A's chat session", async () => {
      const sessionA = await dataService.createChatSession(
        USER_A,
        "Family Advisory",
        "Siliguri"
      );
      const sessIdA = sessionA.data!.id;

      // User A adds message
      const msgA = await dataService.addChatMessage(
        USER_A,
        sessIdA,
        "user",
        "How do I protect my asthmatic toddler today?"
      );
      expect(msgA.success).toBe(true);

      // User B attempts to inject a message into User A's session
      const maliciousMsg = await dataService.addChatMessage(
        USER_B,
        sessIdA,
        "user",
        "Injected malicious payload"
      );
      expect(maliciousMsg.success).toBe(false);

      // User B tries to read messages of User A's session -> receives empty array
      const leakedMsgs = await dataService.getChatMessages(USER_B, sessIdA);
      expect(leakedMsgs.length).toBe(0);

      // User A reads their messages intact
      const authenticMsgs = await dataService.getChatMessages(USER_A, sessIdA);
      expect(authenticMsgs.length).toBe(1);
      expect(authenticMsgs[0].content).toContain("asthmatic toddler");
    });
  });

  describe("Notification Preferences Isolation (User A vs User B)", () => {
    it("ensures User A and User B maintain separate notification thresholds", async () => {
      await dataService.updateNotificationPreferences(USER_A, {
        severeSmogThreshold: 200,
        emailAlertsEnabled: true,
      });

      await dataService.updateNotificationPreferences(USER_B, {
        severeSmogThreshold: 350,
        emailAlertsEnabled: false,
      });

      const prefsA = await dataService.getNotificationPreferences(USER_A);
      const prefsB = await dataService.getNotificationPreferences(USER_B);

      expect(prefsA?.severeSmogThreshold).toBe(200);
      expect(prefsA?.emailAlertsEnabled).toBe(true);

      expect(prefsB?.severeSmogThreshold).toBe(350);
      expect(prefsB?.emailAlertsEnabled).toBe(false);
    });
  });

  describe("Security Model Audit", () => {
    it("verifies Cloud Firestore security rules strictly enforce server mediation", () => {
      const rulesPath = path.join(process.cwd(), "firestore.rules");
      const rules = fs.readFileSync(rulesPath, "utf-8");

      expect(rules).toContain("rules_version = '2';");
      expect(rules).toContain("allow read, write: if false;");
    });

    it("verifies archived historical Supabase schema has RLS policies documented", () => {
      const archivePath = path.join(
        process.cwd(),
        "docs/archive/supabase/migrations/20261119000000_initial_schema.sql"
      );
      const sql = fs.readFileSync(archivePath, "utf-8");

      expect(sql).toContain("ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("auth.uid() = user_id");
    });
  });
});
