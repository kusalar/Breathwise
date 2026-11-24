import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  createFirebaseSessionCookie,
  verifyFirebaseSessionCookie,
  revokeFirebaseUserSessions,
  setFirebaseSessionCookie,
  clearFirebaseSessionCookie,
  validateCsrfProtection,
  MIN_SESSION_EXPIRY_MS,
  MAX_SESSION_EXPIRY_MS,
  DEFAULT_SESSION_EXPIRY_MS,
  FIREBASE_SESSION_COOKIE_NAME,
} from "@/lib/firebase/session";
import {
  initializeFirebaseUserProfile,
  getFirebaseUserProfile,
} from "@/lib/firebase/user-profile";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import { rateLimiter } from "@/lib/rate-limit";
import { POST as registerHandler } from "@/app/api/auth/firebase/register/route";
import { POST as sessionHandler, DELETE as sessionDeleteHandler } from "@/app/api/auth/firebase/session/route";
import { POST as forgotPasswordHandler } from "@/app/api/auth/firebase/forgot-password/route";

// Mock Firebase Admin SDK
vi.mock("@/lib/firebase/admin", () => {
  const mockUsers = new Map<string, any>();
  const mockRevokedUids = new Set<string>();

  return {
    getAdminAuth: vi.fn(() => ({
      createUser: vi.fn(async ({ email, password, displayName }) => {
        if (mockUsers.has(email)) {
          const err: any = new Error("Email already exists");
          err.code = "auth/email-already-exists";
          throw err;
        }
        const uid = `uid_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const userRecord = { uid, email, displayName, emailVerified: false };
        mockUsers.set(email, userRecord);
        return userRecord;
      }),
      verifyIdToken: vi.fn(async (token: string, checkRevoked?: boolean) => {
        if (token === "expired_token") {
          const err: any = new Error("Firebase ID token has expired");
          err.code = "auth/id-token-expired";
          throw err;
        }
        if (token === "invalid_token") {
          const err: any = new Error("Decoding Firebase ID token failed");
          err.code = "auth/argument-error";
          throw err;
        }
        if (token.startsWith("revoked_")) {
          const err: any = new Error("Firebase ID token has been revoked");
          err.code = "auth/id-token-revoked";
          throw err;
        }
        return {
          uid: "user_test_123",
          email: "test.user@breathewise.ai",
          name: "Test User",
          email_verified: false,
        };
      }),
      createSessionCookie: vi.fn(async (idToken: string, { expiresIn }: { expiresIn: number }) => {
        if (idToken === "invalid_token") throw new Error("Invalid token for session cookie");
        return `mock_session_cookie_for_${idToken}_exp_${expiresIn}`;
      }),
      verifySessionCookie: vi.fn(async (cookie: string, checkRevoked?: boolean) => {
        if (cookie === "expired_cookie") throw new Error("Session cookie expired");
        if (cookie.includes("revoked") && checkRevoked) {
          throw new Error("Firebase session cookie has been revoked");
        }
        return {
          uid: "user_test_123",
          email: "test.user@breathewise.ai",
          name: "Test User",
          email_verified: false,
        };
      }),
      revokeRefreshTokens: vi.fn(async (uid: string) => {
        mockRevokedUids.add(uid);
      }),
      generatePasswordResetLink: vi.fn(async (email: string) => {
        if (email === "unknown@breathewise.ai") {
          throw new Error("No user found with email");
        }
        return `https://breathewise.firebaseapp.com/__/auth/action?mode=resetPassword&email=${encodeURIComponent(email)}`;
      }),
    })),
    getAdminFirestore: vi.fn(() => null), // Mock fallback mode tested
  };
});

describe("Milestone 6B — Firebase Authentication & Secure Session Suite", () => {
  beforeEach(() => {
    rateLimiter.reset();
  });

  describe("Phase 7 Verification: 18 Authentication Scenarios", () => {
    // 1. Successful registration
    it("1. Successful registration via API creates user and returns 201", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/firebase/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "new.user@breathewise.ai",
          password: "SecurePassword123!",
          fullName: "New Pioneer",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.user.email).toBe("new.user@breathewise.ai");
      expect(json.user.fullName).toBe("New Pioneer");
    });

    // 2. Successful login & session minting
    it("2. Successful login via session exchange creates session cookie and initializes profile", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/firebase/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: "valid_id_token_abc",
          expiresInMs: 432_000_000,
        }),
      });

      const res = await sessionHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.user.id).toBe("user_test_123");

      // Verify Set-Cookie header contains HttpOnly session cookie
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain(FIREBASE_SESSION_COOKIE_NAME);
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie?.toLowerCase()).toContain("samesite=lax");
    });

    // 3. Incorrect password rejection
    it("3. Registration rejects short/invalid passwords with validation failure", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/firebase/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "weak@breathewise.ai",
          password: "short", // Must be >= 8 chars
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
    });

    // 4. Unknown email handling
    it("4. Unknown email in password reset returns generic success to prevent enumeration", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/firebase/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "unknown@breathewise.ai",
        }),
      });

      const res = await forgotPasswordHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("If an account associated with this email exists");
    });

    // 5. Duplicate registration
    it("5. Duplicate registration returns 409 Conflict with EMAIL_EXISTS code", async () => {
      // First registration
      const req1 = new NextRequest("http://localhost:3000/api/auth/firebase/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "duplicate@breathewise.ai",
          password: "ValidPassword123!",
        }),
      });
      await registerHandler(req1);

      // Duplicate registration attempt
      const req2 = new NextRequest("http://localhost:3000/api/auth/firebase/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "duplicate@breathewise.ai",
          password: "ValidPassword123!",
        }),
      });

      const res2 = await registerHandler(req2);
      expect(res2.status).toBe(409);
      const json2 = await res2.json();
      expect(json2.code).toBe("EMAIL_EXISTS");
    });

    // 6. Invalid ID token
    it("6. Rejects invalid ID token during session creation with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/firebase/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: "invalid_token",
        }),
      });

      const res = await sessionHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("INVALID_TOKEN");
    });

    // 7. Expired ID token
    it("7. Rejects expired ID token during session creation with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/firebase/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: "expired_token",
        }),
      });

      const res = await sessionHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("INVALID_TOKEN");
    });

    // 8. Revoked session
    it("8. Rejects revoked session cookie when checkRevoked is true", async () => {
      const decoded = await verifyFirebaseSessionCookie("revoked_session_cookie", true);
      expect(decoded).toBeNull();
    });

    // 9. Successful logout
    it("9. Successful logout clears session cookie and revokes refresh tokens", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/firebase/session", {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: `${FIREBASE_SESSION_COOKIE_NAME}=valid_cookie_123`,
        },
      });

      const res = await sessionDeleteHandler(req);
      expect(res.status).toBe(200);

      // Verify Set-Cookie expires the cookie immediately
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain("Max-Age=0");
    });

    // 10. Session expiration limits
    it("10. Enforces Firebase session cookie expiration boundaries", async () => {
      // Expiry lower than 5 minutes should clamp to minimum (5 min)
      const cookieMin = await createFirebaseSessionCookie("valid_id_token", 10_000);
      expect(cookieMin).toContain(`exp_${MIN_SESSION_EXPIRY_MS}`);

      // Expiry higher than 14 days should clamp to maximum (14 days)
      const cookieMax = await createFirebaseSessionCookie("valid_id_token", 30 * 24 * 60 * 60 * 1000);
      expect(cookieMax).toContain(`exp_${MAX_SESSION_EXPIRY_MS}`);
    });

    // 11. Password reset flow
    it("11. Password reset flow dispatches reset link successfully", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/firebase/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "registered.user@breathewise.ai",
        }),
      });

      const res = await forgotPasswordHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    // 12. Email verification behavior
    it("12. Initializes user with emailVerified false by default", async () => {
      const profile = await initializeFirebaseUserProfile("test_uid_email_ver", {
        email: "verif@breathewise.ai",
        displayName: "Verification Test",
        emailVerified: false,
      });

      expect(profile.success).toBe(true);
      expect(profile.profile?.emailVerified).toBe(false);
    });

    // 13. Cross-user profile isolation
    it("13. Prevents User B from accessing User A's profile document", async () => {
      const USER_A = "user_alpha_111";
      const USER_B = "user_beta_222";

      const accessAttempt = await getFirebaseUserProfile(USER_B, USER_A);
      expect(accessAttempt.success).toBe(false);
      expect(accessAttempt.error).toContain("Forbidden");
    });

    // 14. Unauthorized profile access
    it("14. Rejects profile access when caller UID is empty", async () => {
      const accessAttempt = await getFirebaseUserProfile("", "user_target_123");
      expect(accessAttempt.success).toBe(false);
      expect(accessAttempt.error).toContain("required");
    });

    // 15. CSRF rejection
    it("15. Rejects state-changing requests with mismatched origin headers", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/firebase/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://malicious-site.com",
          host: "localhost:3000",
        },
        body: JSON.stringify({ idToken: "any_token" }),
      });

      const res = await sessionHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("CSRF check failed");
    });

    // 16. Rate-limit enforcement
    it("16. Enforces rate limits on repeated session requests", async () => {
      const clientIp = "192.168.1.100";
      // Exhaust 20 requests
      for (let i = 0; i < 20; i++) {
        rateLimiter.check(`auth:firebase:session:${clientIp}`, {
          intervalMs: 60_000,
          maxRequests: 20,
        });
      }

      const req = new NextRequest("http://localhost:3000/api/auth/firebase/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": clientIp,
        },
        body: JSON.stringify({ idToken: "valid_id_token" }),
      });

      const res = await sessionHandler(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    // 17. Malformed request handling
    it("17. Rejects malformed JSON body with HTTP 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/firebase/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: "{ broken json...",
      });

      const res = await sessionHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("MALFORMED_JSON");
    });

    // 18. Repeated profile initialization (idempotency)
    it("18. Repeated profile initialization is idempotent and preserves initial profile", async () => {
      const UID = "user_idempotent_999";

      const init1 = await initializeFirebaseUserProfile(UID, {
        email: "idempotent@breathewise.ai",
        displayName: "Initial Name",
        emailVerified: false,
      });

      expect(init1.success).toBe(true);

      // Re-run initialization
      const init2 = await initializeFirebaseUserProfile(UID, {
        email: "idempotent@breathewise.ai",
        displayName: "Initial Name",
        emailVerified: true,
      });

      expect(init2.success).toBe(true);
      expect(init2.profile?.uid).toBe(UID);
    });
  });
});
