import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import { setFirebaseSessionCookie } from "@/lib/firebase/session";
import { guardAuthMutation } from "@/lib/auth/auth-route-helpers";
import { parseSafeJson, formatSafe500Response } from "@/lib/api-security";

const LoginSchema = z
  .object({
    idToken: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(1, "Password is required").optional(),
  })
  .refine((data) => data.idToken || (data.email && data.password), {
    message: "Either idToken or email and password must be provided",
  });

export async function POST(request: NextRequest) {
  const blocked = guardAuthMutation(request, "auth:firebase:login", { intervalMs: 60_000, maxRequests: 10 });
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

    const { idToken } = parsed.data;
    if (idToken) {
      const result = await firebaseAuthService.createSessionFromIdToken(idToken);
      if (!result.success || !result.data) {
        return NextResponse.json(
          { error: result.error, code: result.code, requestId: parsedBody.requestId },
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

    return NextResponse.json(
      {
        error: "Please authenticate via Firebase Web SDK and exchange the ID token.",
        code: "TOKEN_REQUIRED",
        requestId: parsedBody.requestId,
      },
      { status: 400 }
    );
  } catch (error) {
    return formatSafe500Response(error, "FirebaseAuthLoginRoute", parsedBody.requestId);
  }
}
