import { NextRequest, NextResponse } from "next/server";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import { clearFirebaseSessionCookie, validateCsrfProtection } from "@/lib/firebase/session";
import { rateLimiter, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // CSRF validation
  const csrf = validateCsrfProtection(request);
  if (!csrf.valid) {
    return NextResponse.json(
      { error: "Forbidden: CSRF check failed", reason: csrf.reason },
      { status: 403 }
    );
  }

  // Rate limit: 30 logout requests per minute per IP
  const clientIp = getClientIp(request.headers);
  rateLimiter.check(`auth:logout:${clientIp}`, {
    intervalMs: 60_000,
    maxRequests: 30,
  });

  try {
    const user = await firebaseAuthService.getUserFromRequest(request);
    if (user) {
      await firebaseAuthService.revokeSessions(user.id);
    }

    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );

    clearFirebaseSessionCookie(response);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { success: true, message: "Logged out" },
      { status: 200 }
    );
    clearFirebaseSessionCookie(response);
    return response;
  }
}
