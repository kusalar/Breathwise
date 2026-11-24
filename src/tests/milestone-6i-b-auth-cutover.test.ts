import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  createFirebaseSessionCookie,
  verifyFirebaseSessionCookie,
  revokeFirebaseUserSessions,
  setFirebaseSessionCookie,
  clearFirebaseSessionCookie,
  validateCsrfProtection,
  FIREBASE_SESSION_COOKIE_NAME,
} from "@/lib/firebase/session";
import {
  initializeFirebaseUserProfile,
  getFirebaseUserProfile,
} from "@/lib/firebase/user-profile";
import { firebaseAuthService } from "@/services/firebase/firebase-auth.service";
import { getSessionUser } from "@/lib/auth/server-auth";
import { rateLimiter } from "@/lib/rate-limit";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import {
  POST as sessionCreateHandler,
  GET as sessionGetHandler,
  DELETE as sessionDeleteHandler,
} from "@/app/api/auth/session/route";
import { POST as forgotPasswordHandler } from "@/app/api/auth/forgot-password/route";

const mockUsers = new Map<string, any>();
const mockRevokedUids = new Set<string>();

// Mock Firebase Admin SDK for hermetic test execution
vi.mock("@/lib/firebase/admin", () => {
  return {
    getAdminAuth: vi.fn(() => ({
      createUser: vi.fn(async ({ email, password, displayName }) => {
        if (mockUsers.has(email)) {
          const err: any = new Error("Email already exists");
          err.code = "auth/email-already-exists";
          throw err;
        }
        const uid = `user_${Math.random().toString(36).substring(2, 9)}`;
        const record = { uid, email, displayName, emailVerified: false };
        mockUsers.set(email, record);
        return record;
      }),
      getUserByEmail: vi.fn(async (email: string) => {
        if (!mockUsers.has(email)) {
          throw new Error("User not found");
        }
        return mockUsers.get(email);
      }),
      verifyIdToken: vi.fn(async (idToken: string) => {
        if (idToken === "valid_id_token_abc" || idToken === "valid_id_token") {
          return {
            uid: "user_test_123",
            email: "test.user@breathewise.ai",
            name: "Test User",
            email_verified: true,
          };
        }
        if (idToken === "expired_token") {
          const err: any = new Error("Firebase ID token has expired");
          err.code = "auth/id-token-expired";
          throw err;
        }
        const err: any = new Error("Invalid ID token");
        err.code = "auth/argument-error";
        throw err;
      }),
      createSessionCookie: vi.fn(async (idToken: string, options: { expiresIn: number }) => {
        return `mock_session_cookie_for_${idToken}_exp_${options.expiresIn}`;
      }),
      verifySessionCookie: vi.fn(async (cookie: string, checkRevoked?: boolean) => {
        if (cookie === "revoked_session_cookie" || mockRevokedUids.has("user_test_123")) {
          const err: any = new Error("Session cookie has been revoked");
          err.code = "auth/session-cookie-revoked";
          throw err;
        }
        if (cookie.includes("expired") || cookie === "expired_session_cookie") {
          const err: any = new Error("Session cookie has expired");
          err.code = "auth/session-cookie-expired";
          throw err;
        }
        if (cookie.startsWith("mock_session_cookie") || cookie.startsWith("valid_cookie")) {
          return {
            uid: "user_test_123",
            email: "test.user@breathewise.ai",
            name: "Test User",
            email_verified: true,
          };
        }
        throw new Error("Invalid session cookie");
      }),
      revokeRefreshTokens: vi.fn(async (uid: string) => {
        mockRevokedUids.add(uid);
      }),
      generatePasswordResetLink: vi.fn(async (email: string) => {
        return `https://breathewise.ai/__/auth/action?mode=resetPassword&email=${encodeURIComponent(email)}`;
      }),
    })),
    getAdminFirestore: vi.fn(() => null), // Mock fallback mode tested
  };
});

describe("Milestone 6I-B — Firebase-Only Authentication Cutover Suite", () => {
  beforeEach(() => {
    rateLimiter.reset();
    mockRevokedUids.clear();
  });

  describe("Mandatory 18 Verification Scenarios", () => {
    // 1. Successful registration
    it("1. Successful registration via consolidated POST /api/auth/register", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "sarah.green@breathewise.ai",
          password: "SuperSecurePass123!",
          fullName: "Sarah Green",
        }),
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.user.email).toBe("sarah.green@breathewise.ai");
      expect(json.user.fullName).toBe("Sarah Green");
    });

    // 2. Successful login
    it("2. Successful login via consolidated POST /api/auth/login with idToken", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: "valid_id_token_abc",
        }),
      });

      const res = await loginHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.user.id).toBe("user_test_123");

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain(FIREBASE_SESSION_COOKIE_NAME);
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie?.toLowerCase()).toContain("samesite=lax");
    });

    // 3. Invalid credentials
    it("3. Invalid credentials in login rejects with 401 and AUTH_FAILED", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "nonexistent.user@breathewise.ai",
          password: "WrongPassword999!",
        }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("AUTH_FAILED");
    });

    // 4. Missing Firebase configuration
    it("4. Rejects gracefully when Firebase Admin is unconfigured", async () => {
      const { getAdminAuth } = await import("@/lib/firebase/admin");
      vi.mocked(getAdminAuth).mockReturnValueOnce(null as any);

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "config.test@breathewise.ai",
          password: "ValidPassword123!",
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.code).toBe("ADMIN_NOT_CONFIGURED");
    });

    // 5. Invalid Firebase ID token
    it("5. Rejects invalid Firebase ID token during session exchange", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          idToken: "tampered_or_invalid_token",
        }),
      });

      const res = await sessionCreateHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("INVALID_TOKEN");
    });

    // 6. Expired session cookie
    it("6. Rejects expired session cookie during verification", async () => {
      const decoded = await verifyFirebaseSessionCookie("expired_session_cookie", true);
      expect(decoded).toBeNull();
    });

    // 7. Revoked session
    it("7. Rejects revoked session cookie when checkRevoked is enforced", async () => {
      const decoded = await verifyFirebaseSessionCookie("revoked_session_cookie", true);
      expect(decoded).toBeNull();
    });

    // 8. Missing session cookie
    it("8. Rejects missing session cookie on protected session endpoint with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/session", {
        method: "GET",
      });

      const res = await sessionGetHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHENTICATED");
    });

    // 9. Forged client-supplied UID
    it("9. Derives user identity exclusively from session token, ignoring body/query UIDs", async () => {
      // Create request with verified session cookie for user_test_123, but attacker attempts to spoof target_uid
      const req = new NextRequest("http://localhost:3000/api/auth/session", {
        method: "GET",
        headers: {
          cookie: `${FIREBASE_SESSION_COOKIE_NAME}=valid_cookie_123`,
          "x-user-id": "attacker_spoofed_uid_999",
        },
      });

      const user = await getSessionUser(req);
      expect(user).not.toBeNull();
      // Server must derive UID from verified session token (user_test_123), NOT the forged header
      expect(user?.id).toBe("user_test_123");
      expect(user?.authProvider).toBe("firebase");
    });

    // 10. Cross-user access attempt
    it("10. Prevents cross-user profile access attempt", async () => {
      const CALLER_UID = "user_victim_111";
      const TARGET_UID = "user_other_222";

      const accessAttempt = await getFirebaseUserProfile(CALLER_UID, TARGET_UID);
      expect(accessAttempt.success).toBe(false);
      expect(accessAttempt.error).toContain("Forbidden");
    });

    // 11. Successful logout
    it("11. Successful logout via consolidated POST /api/auth/logout", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: `${FIREBASE_SESSION_COOKIE_NAME}=valid_cookie_123`,
        },
      });

      const res = await logoutHandler(req);
      expect(res.status).toBe(200);

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain("Max-Age=0");
    });

    // 12. Logout with an already expired session
    it("12. Logout with an already expired session succeeds gracefully without throwing", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: `${FIREBASE_SESSION_COOKIE_NAME}=expired_session_cookie`,
        },
      });

      const res = await logoutHandler(req);
      expect(res.status).toBe(200);

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain("Max-Age=0");
    });

    // 13. Session restoration after refresh
    it("13. Restores user session after page refresh via GET /api/auth/session", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/session", {
        method: "GET",
        headers: {
          cookie: `${FIREBASE_SESSION_COOKIE_NAME}=valid_cookie_123`,
        },
      });

      const res = await sessionGetHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.authenticated).toBe(true);
      expect(json.user.id).toBe("user_test_123");
    });

    // 14. Firestore profile initialization
    it("14. Initializes user profile document under users/{uid} upon registration", async () => {
      const UID = "user_init_test_456";
      const result = await initializeFirebaseUserProfile(UID, {
        email: "init.test@breathewise.ai",
        displayName: "Init Test",
        emailVerified: false,
      });

      expect(result.success).toBe(true);
      expect(result.profile?.uid).toBe(UID);
      expect(result.profile?.displayName).toBe("Init Test");
    });

    // 15. Duplicate registration handling
    it("15. Handles duplicate registration with 409 Conflict and EMAIL_EXISTS code", async () => {
      const email = "duplicate.check@breathewise.ai";
      // Initial register
      const req1 = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email, password: "Password123!" }),
      });
      await registerHandler(req1);

      // Attempt duplicate
      const req2 = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email, password: "Password123!" }),
      });
      const res2 = await registerHandler(req2);
      expect(res2.status).toBe(409);
      const json2 = await res2.json();
      expect(json2.code).toBe("EMAIL_EXISTS");
    });

    // 16. Password-reset request validation
    it("16. Validates password-reset request and returns generic safe response", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "existing.user@breathewise.ai",
        }),
      });

      const res = await forgotPasswordHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("If an account associated with this email exists");
    });

    // 17. CSRF/origin rejection
    it("17. Rejects state-changing auth requests from mismatched origins with HTTP 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://attacker-controlled-site.com",
          host: "localhost:3000",
        },
        body: JSON.stringify({ idToken: "any_token" }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("CSRF check failed");
    });

    // 18. Rate-limit enforcement
    it("18. Enforces rate limits on repeated login attempts", async () => {
      const clientIp = "10.0.0.42";
      // Exhaust 10 requests
      for (let i = 0; i < 10; i++) {
        rateLimiter.check(`auth:login:${clientIp}`, {
          intervalMs: 60_000,
          maxRequests: 10,
        });
      }

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": clientIp,
        },
        body: JSON.stringify({ idToken: "valid_id_token" }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });
});
