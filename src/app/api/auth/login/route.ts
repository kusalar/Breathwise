import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import { setFirebaseSessionCookie } from "@/lib/firebase/session";
import { guardAuthMutation } from "@/lib/auth/auth-route-helpers";
import { parseSafeJson, formatSafe500Response } from "@/lib/api-security";

const LoginSchema = z
  .object({
    idToken: z.string().optional(),
    email: z.string().email("Valid email required").optional(),
    password: z.string().min(1, "Password is required").optional(),
  })
  .refine((data) => data.idToken || (data.email && data.password), {
    message: "Either idToken or email and password must be provided",
  });

export async function POST(request: NextRequest) {
  const blocked = guardAuthMutation(request, "auth:login", { intervalMs: 60_000, maxRequests: 10 });
  if (blocked) return blocked;

  const parsedBody = await parseSafeJson<unknown>(request, 32 * 1024);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const parsed = LoginSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten(), requestId: parsedBody.requestId },
        { status: 400 }
      );
    }

    const { idToken, email, password } = parsed.data;

    if (idToken) {
      const result = await firebaseAuthService.createSessionFromIdToken(idToken);
      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error, code: result.code || "INVALID_TOKEN", requestId: parsedBody.requestId },
          { status: 401 }
        );
      }

      const response = NextResponse.json(
        { success: true, user: result.data.user, profile: result.data.profile, requestId: parsedBody.requestId },
        { status: 200 }
      );
      setFirebaseSessionCookie(response, result.data.sessionCookie, result.data.expiresInMs);
      return response;
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Invalid email or password", code: "AUTH_FAILED", requestId: parsedBody.requestId },
        { status: 401 }
      );
    }

    try {
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );

      const signInData = await signInRes.json();
      if (!signInRes.ok || !signInData.idToken) {
        return NextResponse.json(
          { error: "Invalid email or password", code: "AUTH_FAILED", requestId: parsedBody.requestId },
          { status: 401 }
        );
      }

      const result = await firebaseAuthService.createSessionFromIdToken(signInData.idToken);
      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error, code: result.code || "SESSION_CREATION_FAILED", requestId: parsedBody.requestId },
          { status: 401 }
        );
      }

      const response = NextResponse.json(
        {
          success: true,
          user: result.data.user,
          profile: result.data.profile,
          requestId: parsedBody.requestId,
        },
        { status: 200 }
      );
      setFirebaseSessionCookie(response, result.data.sessionCookie, result.data.expiresInMs);
      return response;
    } catch {
      return NextResponse.json(
        { error: "Invalid email or password", code: "AUTH_FAILED", requestId: parsedBody.requestId },
        { status: 401 }
      );
    }
  } catch (error) {
    return formatSafe500Response(error, "AuthLoginRoute", parsedBody.requestId);
  }
}
