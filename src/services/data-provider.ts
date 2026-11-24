/**
 * Data Provider Abstraction & Repository Orchestrator
 * Cloud Firestore is the exclusive production application data provider.
 * All operations are typed, server-mediated, and rooted under `/users/{uid}/...`.
 * Supabase has been completely retired from runtime data operations.
 */

import {
  preferencesRepository,
  householdRepository,
  routinesRepository,
  sustainabilityRepository,
  chatRepository,
  notificationsRepository,
  userRepository,
  firestoreDeletionService,
} from "@/services/firebase/firestore";
import { GeoLocation, HouseholdMember, RoutineItem, SavedRoutine, SustainabilityAction } from "@/types";

export type DataProviderType = "firebase";

export interface DataProviderConfig {
  provider: DataProviderType;
  isValid: boolean;
}

/**
 * Validates cross-provider consistency between AUTH_PROVIDER and DATA_PROVIDER.
 * Retained for backward compatibility with migration testing suites.
 */
export function validateProviderConsistency(): {
  consistent: boolean;
  activeAuth: string;
  activeData: string;
  error?: string;
} {
  const activeAuth = process.env.AUTH_PROVIDER || "firebase";
  const activeData = process.env.DATA_PROVIDER || "firebase";

  if (activeAuth === "firebase" && activeData === "firebase") {
    return { consistent: true, activeAuth, activeData };
  }

  // Legacy compatibility check for tests expecting inconsistency when mixed
  if (activeAuth !== activeData) {
    return {
      consistent: false,
      activeAuth,
      activeData,
      error: `Unsupported mixed provider configuration: AUTH_PROVIDER='${activeAuth}' with DATA_PROVIDER='${activeData}'.`,
    };
  }

  return { consistent: true, activeAuth, activeData };
}

/**
 * Resolves the configured data provider. Cloud Firestore is the sole active provider.
 * Rejects legacy or invalid providers.
 */
export function getDataProviderConfig(): DataProviderConfig {
  const raw = process.env.DATA_PROVIDER;
  if (raw && raw !== "firebase") {
    return { provider: "firebase", isValid: false };
  }
  return { provider: "firebase", isValid: true };
}

export class DataService {
  /**
   * Returns current active provider name.
   */
  get currentProvider(): DataProviderType {
    return "firebase";
  }

  private ensureConfig(): void {
    const { isValid } = getDataProviderConfig();
    if (!isValid) {
      throw new Error("Invalid DATA_PROVIDER configured: Only 'firebase' is supported.");
    }
  }

  // ==========================================
  // 1. USER PREFERENCES
  // ==========================================
  async getUserPreferences(userId: string) {
    this.ensureConfig();
    return preferencesRepository.getPreferences(userId);
  }

  async saveUserLocation(userId: string, location: GeoLocation) {
    this.ensureConfig();
    return preferencesRepository.saveLocation(userId, location);
  }

  // ==========================================
  // 2. HOUSEHOLD MEMBERS
  // ==========================================
  async getHouseholdMembers(userId: string): Promise<HouseholdMember[]> {
    this.ensureConfig();
    return householdRepository.getMembers(userId);
  }

  async addHouseholdMember(
    userId: string,
    member: Omit<HouseholdMember, "id" | "userId" | "createdAt" | "updatedAt">
  ) {
    this.ensureConfig();
    return householdRepository.addMember(userId, member);
  }

  async updateHouseholdMember(
    userId: string,
    memberId: string,
    updates: Partial<Omit<HouseholdMember, "id" | "userId">>
  ) {
    this.ensureConfig();
    return householdRepository.updateMember(userId, memberId, updates);
  }

  async deleteHouseholdMember(userId: string, memberId: string) {
    this.ensureConfig();
    return householdRepository.deleteMember(userId, memberId);
  }

  async deleteAllHouseholdMembers(userId: string) {
    this.ensureConfig();
    return householdRepository.deleteAllMembers(userId);
  }

  // ==========================================
  // 3. SAVED ROUTINES
  // ==========================================
  async getSavedRoutines(userId: string): Promise<SavedRoutine[]> {
    this.ensureConfig();
    return routinesRepository.getRoutines(userId);
  }

  async saveRoutine(
    userId: string,
    title: string,
    routinePayload: RoutineItem[],
    targetDate?: string
  ) {
    this.ensureConfig();
    return routinesRepository.saveRoutine(userId, title, routinePayload, targetDate);
  }

  async updateRoutine(
    userId: string,
    routineId: string,
    updates: Partial<Omit<SavedRoutine, "id" | "userId">>
  ) {
    this.ensureConfig();
    return routinesRepository.updateRoutine(userId, routineId, updates);
  }

  async deleteRoutine(userId: string, routineId: string) {
    this.ensureConfig();
    return routinesRepository.deleteRoutine(userId, routineId);
  }

  // ==========================================
  // 4. SUSTAINABILITY ACTIONS
  // ==========================================
  async getSustainabilityActions(userId: string): Promise<SustainabilityAction[]> {
    this.ensureConfig();
    return sustainabilityRepository.getActions(userId);
  }

  async addSustainabilityAction(
    userId: string,
    action: Omit<SustainabilityAction, "id" | "userId">
  ) {
    this.ensureConfig();
    return sustainabilityRepository.addAction(userId, action);
  }

  async updateSustainabilityAction(
    userId: string,
    actionId: string,
    updates: Partial<Omit<SustainabilityAction, "id" | "userId">>
  ) {
    this.ensureConfig();
    return sustainabilityRepository.updateAction(userId, actionId, updates);
  }

  async deleteSustainabilityAction(userId: string, actionId: string) {
    this.ensureConfig();
    return sustainabilityRepository.deleteAction(userId, actionId);
  }

  // ==========================================
  // 5. CHAT SESSIONS & MESSAGES
  // ==========================================
  async createChatSession(userId: string, title?: string, locationName?: string) {
    this.ensureConfig();
    return chatRepository.createSession(userId, title, locationName);
  }

  async getChatSession(userId: string, sessionId: string) {
    this.ensureConfig();
    return chatRepository.getSession(userId, sessionId);
  }

  async getChatSessions(userId: string) {
    this.ensureConfig();
    return chatRepository.getSessions(userId);
  }

  async deleteChatSession(userId: string, sessionId: string) {
    this.ensureConfig();
    return chatRepository.deleteSession(userId, sessionId);
  }

  async addChatMessage(
    userId: string,
    sessionId: string,
    role: "user" | "assistant" | "system",
    content: string,
    metadata?: any
  ) {
    this.ensureConfig();
    return chatRepository.addMessage(userId, sessionId, role, content, metadata);
  }

  async getChatMessages(userId: string, sessionId: string) {
    this.ensureConfig();
    return chatRepository.getMessages(userId, sessionId);
  }

  // ==========================================
  // 6. NOTIFICATION PREFERENCES
  // ==========================================
  async getNotificationPreferences(userId: string) {
    this.ensureConfig();
    return notificationsRepository.getPreferences(userId);
  }

  async updateNotificationPreferences(
    userId: string,
    prefs: { emailAlertsEnabled?: boolean; severeSmogThreshold?: number; dailyBriefingTime?: string }
  ) {
    this.ensureConfig();
    return notificationsRepository.updatePreferences(userId, prefs);
  }

  // ==========================================
  // 7. USER PROFILE
  // ==========================================
  async getProfile(userId: string) {
    this.ensureConfig();
    return userRepository.getProfile(userId);
  }

  async updateProfile(userId: string, data: { fullName?: string; avatarUrl?: string }) {
    this.ensureConfig();
    return userRepository.updateProfile(userId, data);
  }

  // ==========================================
  // 8. RECURSIVE ACCOUNT CASCADE DELETION
  // ==========================================
  async deleteUserAccountCascade(callerUid: string, targetUid: string) {
    this.ensureConfig();
    return firestoreDeletionService.deleteUserAccountData(callerUid, targetUid);
  }
}

export const dataService = new DataService();
