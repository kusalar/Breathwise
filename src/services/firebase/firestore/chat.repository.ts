/**
 * Chat Sessions & Messages Firestore Repository
 * Path:
 *  - Session: `users/{uid}/chatSessions/{sessionId}`
 *  - Messages: `users/{uid}/chatSessions/{sessionId}/messages/{messageId}`
 */

import { BaseFirestoreRepository } from "./base.repository";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

export interface ChatSessionData {
  id: string;
  userId: string;
  title: string;
  locationName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageData {
  id: string;
  sessionId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export class ChatRepository extends BaseFirestoreRepository {
  /**
   * Creates a new AI chat conversation session.
   */
  async createSession(
    uid: string,
    title = "Environmental Health Session",
    locationName = "Siliguri"
  ): Promise<{ success: boolean; data?: ChatSessionData; error?: string }> {
    if (!uid) return { success: false, error: "UID required" };
    const sessionId = randomUUID();
    const nowIso = new Date().toISOString();
    const db = this.getDb();

    if (!db) {
      if (!BaseFirestoreRepository.mockStore.chatSessions[uid]) {
        BaseFirestoreRepository.mockStore.chatSessions[uid] = {};
      }
      const record: ChatSessionData = {
        id: sessionId,
        userId: uid,
        title,
        locationName,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      BaseFirestoreRepository.mockStore.chatSessions[uid][sessionId] = record;
      return { success: true, data: record };
    }

    try {
      const docRef = db
        .collection("users")
        .doc(uid)
        .collection("chatSessions")
        .doc(sessionId);

      const payload = {
        id: sessionId,
        userId: uid,
        title,
        locationName,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await docRef.set(payload);

      return {
        success: true,
        data: {
          id: sessionId,
          userId: uid,
          title,
          locationName,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      };
    } catch (err) {
      return { success: false, error: this.handleError("ChatRepository", "Failed to create chat session", err) };
    }
  }

  /**
   * Retrieves a specific chat session for a user, verifying ownership.
   */
  async getSession(uid: string, sessionId: string): Promise<ChatSessionData | null> {
    if (!uid || !sessionId) return null;
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.chatSessions[uid] || {};
      return (userStore[sessionId] as ChatSessionData) || null;
    }

    try {
      const doc = await db
        .collection("users")
        .doc(uid)
        .collection("chatSessions")
        .doc(sessionId)
        .get();

      if (!doc.exists) return null;
      const data = doc.data()!;
      return {
        id: doc.id,
        userId: uid,
        title: data.title,
        locationName: data.locationName,
        createdAt: this.timestampToIso(data.createdAt),
        updatedAt: this.timestampToIso(data.updatedAt),
      };
    } catch (err) {
      this.handleError("ChatRepository", "Failed to get chat session", err);
      return null;
    }
  }

  /**
   * Lists chat sessions for a user with pagination limit.
   */
  async getSessions(uid: string, limitCount = 30): Promise<ChatSessionData[]> {
    if (!uid) return [];
    const db = this.getDb();

    if (!db) {
      const userStore = BaseFirestoreRepository.mockStore.chatSessions[uid] || {};
      return Object.values(userStore).slice(0, limitCount) as ChatSessionData[];
    }

    try {
      const snapshot = await db
        .collection("users")
        .doc(uid)
        .collection("chatSessions")
        .orderBy("updatedAt", "desc")
        .limit(limitCount)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: uid,
          title: data.title,
          locationName: data.locationName,
          createdAt: this.timestampToIso(data.createdAt),
          updatedAt: this.timestampToIso(data.updatedAt),
        } as ChatSessionData;
      });
    } catch (err) {
      this.handleError("ChatRepository", "Failed to list chat sessions", err);
      return [];
    }
  }

  /**
   * Appends a chat message to a session, verifying session ownership.
   */
  async addMessage(
    uid: string,
    sessionId: string,
    role: "user" | "assistant" | "system",
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<{ success: boolean; data?: ChatMessageData; error?: string }> {
    if (!uid || !sessionId) return { success: false, error: "UID and sessionId required" };
    const messageId = randomUUID();
    const nowIso = new Date().toISOString();
    const db = this.getDb();

    if (!db) {
      const userSessions = BaseFirestoreRepository.mockStore.chatSessions[uid];
      if (!userSessions || !userSessions[sessionId]) {
        return { success: false, error: "Chat session not found or forbidden" };
      }
      const record: ChatMessageData = {
        id: messageId,
        sessionId,
        userId: uid,
        role,
        content,
        metadata,
        createdAt: nowIso,
      };
      const key = `${sessionId}_${messageId}`;
      BaseFirestoreRepository.mockStore.chatMessages[key] = record;
      return { success: true, data: record };
    }

    try {
      const sessionRef = db
        .collection("users")
        .doc(uid)
        .collection("chatSessions")
        .doc(sessionId);

      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists) {
        return { success: false, error: "Chat session not found or forbidden" };
      }

      const messageRef = sessionRef.collection("messages").doc(messageId);
      const payload = {
        id: messageId,
        sessionId,
        userId: uid,
        role,
        content,
        metadata,
        createdAt: FieldValue.serverTimestamp(),
      };

      await messageRef.set(payload);
      await sessionRef.update({ updatedAt: FieldValue.serverTimestamp() });

      return {
        success: true,
        data: {
          id: messageId,
          sessionId,
          userId: uid,
          role,
          content,
          metadata,
          createdAt: nowIso,
        },
      };
    } catch (err) {
      return { success: false, error: this.handleError("ChatRepository", "Failed to add message", err) };
    }
  }

  /**
   * Retrieves messages for a session ordered by creation time.
   */
  async getMessages(uid: string, sessionId: string, limitCount = 50): Promise<ChatMessageData[]> {
    if (!uid || !sessionId) return [];
    const db = this.getDb();

    if (!db) {
      const userSessions = BaseFirestoreRepository.mockStore.chatSessions[uid];
      if (!userSessions || !userSessions[sessionId]) {
        return [];
      }
      const results: ChatMessageData[] = [];
      for (const [key, msg] of Object.entries(BaseFirestoreRepository.mockStore.chatMessages)) {
        if (key.startsWith(`${sessionId}_`)) {
          results.push(msg as ChatMessageData);
        }
      }
      return results.slice(0, limitCount);
    }

    try {
      const snapshot = await db
        .collection("users")
        .doc(uid)
        .collection("chatSessions")
        .doc(sessionId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .limit(limitCount)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          sessionId,
          userId: uid,
          role: data.role,
          content: data.content,
          metadata: data.metadata,
          createdAt: this.timestampToIso(data.createdAt),
        } as ChatMessageData;
      });
    } catch (err) {
      this.handleError("ChatRepository", "Failed to get messages", err);
      return [];
    }
  }

  /**
   * Deletes a chat session and its subcollection messages.
   */
  async deleteSession(uid: string, sessionId: string): Promise<{ success: boolean; error?: string }> {
    if (!uid || !sessionId) return { success: false, error: "UID and sessionId required" };
    const db = this.getDb();

    if (!db) {
      const userSessions = BaseFirestoreRepository.mockStore.chatSessions[uid];
      if (!userSessions || !userSessions[sessionId]) {
        return { success: false, error: "Session not found or forbidden" };
      }
      delete userSessions[sessionId];
      for (const key of Object.keys(BaseFirestoreRepository.mockStore.chatMessages)) {
        if (key.startsWith(`${sessionId}_`)) {
          delete BaseFirestoreRepository.mockStore.chatMessages[key];
        }
      }
      return { success: true };
    }

    try {
      const sessionRef = db
        .collection("users")
        .doc(uid)
        .collection("chatSessions")
        .doc(sessionId);

      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists) {
        return { success: false, error: "Session not found or forbidden" };
      }

      // Delete subcollection messages in batch
      const messagesSnapshot = await sessionRef.collection("messages").get();
      const batch = db.batch();
      messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      batch.delete(sessionRef);

      await batch.commit();
      return { success: true };
    } catch (err) {
      return { success: false, error: this.handleError("ChatRepository", "Failed to delete session", err) };
    }
  }
}

export const chatRepository = new ChatRepository();
