import { GeminiInsight } from "@/types";

export interface AiChatMessage {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  insightMeta?: GeminiInsight;
}

export interface AssistantSession {
  sessionId: string;
  activeLocation: string;
  messages: AiChatMessage[];
}

