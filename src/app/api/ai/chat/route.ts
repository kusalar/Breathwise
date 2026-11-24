import { NextRequest, NextResponse } from "next/server";
import { geminiService } from "@/services/gemini/gemini.service";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";
import { parseSafeJson, formatSafe500Response } from "@/lib/api-security";
import { getFirebaseSessionUser } from "@/lib/firebase/session";
import { chatRepository } from "@/services/firebase/firestore/chat.repository";
import { z } from "zod";

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  location: z.object({
    name: z.string(),
    region: z.string().default(""),
    country: z.string().default("India"),
    latitude: z.number(),
    longitude: z.number(),
  }),
  reading: z.any().optional(),
  weather: z.any().optional(),
  history: z.array(z.any()).optional(),
  householdPreferences: z.record(z.string(), z.any()).optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request.headers);

  // 1. Dual-Layer Sliding Window Rate Limiting
  // Layer 1: Client/IP Rate Limiter (Max 5 requests/minute per IP)
  const clientLimitStatus = rateLimiter.check(`ai:chat:ip:${clientIp}`, {
    intervalMs: 60_000,
    maxRequests: 5,
  });

  if (!clientLimitStatus.allowed) {
    return NextResponse.json(
      {
        error: `Client rate limit exceeded. Please wait ${clientLimitStatus.resetSeconds} seconds before sending another question.`,
        code: "CLIENT_RATE_LIMIT_EXCEEDED",
        layer: "client_ip",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(clientLimitStatus.resetSeconds),
          "X-RateLimit-Limit-IP": String(clientLimitStatus.limit),
          "X-RateLimit-Remaining-IP": "0",
        },
      }
    );
  }

  // Layer 2: Provider-Aware Global Project Budget (Max 12 requests/minute globally across all callers)
  // Google AI Studio Free Tier enforces a hard 15 RPM ceiling. We reserve 3 RPM headroom for background jobs.
  const globalBudgetStatus = rateLimiter.check("ai:chat:global", {
    intervalMs: 60_000,
    maxRequests: 12,
  });

  if (!globalBudgetStatus.allowed) {
    return NextResponse.json(
      {
        error: `Global AI provider capacity reached for the current minute (${globalBudgetStatus.limit} RPM project budget). Please wait ${globalBudgetStatus.resetSeconds} seconds or rely on local atmospheric guidelines.`,
        code: "PROVIDER_BUDGET_EXCEEDED",
        layer: "global_provider_budget",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(globalBudgetStatus.resetSeconds),
          "X-RateLimit-Limit-Global": String(globalBudgetStatus.limit),
          "X-RateLimit-Remaining-Global": "0",
        },
      }
    );
  }

  // 2. Safe Request Size Checking & JSON Parsing
  const parsedBody = await parseSafeJson<unknown>(request, 64 * 1024);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const parsed = ChatRequestSchema.safeParse(parsedBody.data);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten(), requestId: parsedBody.requestId },
        { status: 400 }
      );
    }

    // 3. Session Ownership & Authentication Verification (when sessionId is provided)
    if (parsed.data.sessionId) {
      const sessionId = parsed.data.sessionId.trim();
      // Validate session ID format (alphanumeric, dashes, underscores, length 8-128)
      if (!/^[a-zA-Z0-9_-]{8,128}$/.test(sessionId)) {
        return NextResponse.json(
          {
            error: "Malformed session ID format.",
            code: "INVALID_SESSION_ID",
            requestId: parsedBody.requestId,
          },
          { status: 400 }
        );
      }

      const user = await getFirebaseSessionUser(request);
      if (!user) {
        return NextResponse.json(
          {
            error: "Authentication required to associate messages with a saved chat session.",
            code: "UNAUTHORIZED_SESSION_ACCESS",
            requestId: parsedBody.requestId,
          },
          { status: 401 }
        );
      }

      // Explicit ownership check in Firestore: session must exist under users/{user.id}/chatSessions/{sessionId}
      const session = await chatRepository.getSession(user.id, sessionId);
      if (!session) {
        return NextResponse.json(
          {
            error: "Chat session not found or does not belong to the authenticated user.",
            code: "SESSION_NOT_FOUND_OR_FORBIDDEN",
            requestId: parsedBody.requestId,
          },
          { status: 404 }
        );
      }
      // Verified session ownership: session exists and belongs strictly to authenticated user.id derived from session cookie
    }

    let result;
    try {
      result = await geminiService.chat({
        message: parsed.data.message,
        location: parsed.data.location,
        reading: parsed.data.reading,
        weather: parsed.data.weather,
        history: parsed.data.history,
        householdPreferences: parsed.data.householdPreferences,
      });
    } catch (aiErr) {
      console.warn("[AiChatRoute] Primary/secondary AI service threw, activating safe fallback:", aiErr);
      const fallback = (geminiService as any).getContextualFallbackChatReply(
        {
          message: parsed.data.message,
          location: parsed.data.location,
          reading: parsed.data.reading,
          weather: parsed.data.weather,
        },
        50
      );
      result = {
        ...fallback,
        fallbackUsed: true,
        modelUsed: "none",
        generationStatus: "deterministic_fallback",
        fallbackReason: "Engine exception fallback",
      };
    }

    return NextResponse.json(
      { success: true, data: result, requestId: parsedBody.requestId },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit-IP": String(clientLimitStatus.limit),
          "X-RateLimit-Remaining-IP": String(clientLimitStatus.remaining),
          "X-RateLimit-Limit-Global": String(globalBudgetStatus.limit),
          "X-RateLimit-Remaining-Global": String(globalBudgetStatus.remaining),
          "X-Model-Used": result.modelUsed || "none",
          "X-Fallback-Used": String(Boolean(result.fallbackUsed)),
        },
      }
    );
  } catch (error) {
    return formatSafe500Response(error, "AiChatRoute", parsedBody.requestId);
  }
}
