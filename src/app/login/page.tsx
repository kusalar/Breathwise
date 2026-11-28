"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wind, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { loginWithGoogle } from "@/lib/firebase/auth";
import { logger } from "@/lib/observability/logger";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const authResult = await loginWithGoogle();
      if (!authResult.success || !authResult.idToken) {
        if (
          authResult.code === "auth/popup-closed-by-user" ||
          authResult.code === "auth/cancelled-popup-request" ||
          authResult.error?.includes("popup-closed-by-user") ||
          authResult.error?.includes("cancelled-popup-request")
        ) {
          return;
        }

        if (authResult.code === "auth/operation-not-allowed") {
          throw new Error(
            "Google Sign-In is not enabled in Firebase Console. Please enable the Google provider under Authentication -> Sign-in method."
          );
        } else if (authResult.code === "auth/unauthorized-domain") {
          throw new Error(
            "This domain is not authorized in Firebase Console. Add it under Authentication -> Settings -> Authorized domains."
          );
        } else if (authResult.code === "auth/popup-blocked") {
          throw new Error(
            "Sign-in popup was blocked by your browser. Please allow popups for this site and try again."
          );
        }

        throw new Error(authResult.error || "Google Sign-In failed.");
      }

      // Mint server session cookie via ID token
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken: authResult.idToken }),
        });

        let data: { error?: string } | null = null;
        try {
          data = await response.json();
        } catch {
          // Response body was empty or not JSON
        }

        if (!response.ok && data?.error) {
          logger.warn("LoginPage", "Server session establishment notice", { meta: { error: data.error } });
        }
      } catch (sessionErr) {
        logger.warn("LoginPage", "Server session endpoint not reachable, continuing with authenticated client session", { meta: { error: sessionErr instanceof Error ? sessionErr.message : String(sessionErr) } });
      }

      setSuccess(true);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Direct login via server endpoint which coordinates Firebase Admin & mints session cookie
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data: { error?: string } | null = null;
      try {
        data = await response.json();
      } catch {
        // Response was not JSON
      }

      if (!response.ok) {
        throw new Error(data?.error || `Authentication failed (status ${response.status}). Please verify your credentials.`);
      }

      setSuccess(true);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-forest-950 transition-colors">
      {/* Header bar */}
      <header className="w-full border-b border-slate-200/80 dark:border-emerald-950/70 bg-white/90 dark:bg-forest-950/90 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 dark:text-white"
          aria-label="BreatheWise AI Home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
            <Wind className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">
            BreatheWise<span className="text-emerald-600 dark:text-emerald-400"> AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Explore Demo
          </Link>
        </div>
      </header>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white dark:bg-forest-900/90 p-8 rounded-2xl shadow-xl border border-slate-200/80 dark:border-emerald-950/70">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign In to BreatheWise AI
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Access your personal pollution alerts, health routines, and family protection dashboard.
            </p>
          </div>

          {error && (
            <div
              id="login-error-alert"
              className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 text-sm flex items-start gap-2.5"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2.5"
              role="status"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Authentication successful! Redirecting to dashboard...</span>
            </div>
          )}

          {/* Sign in with Google option */}
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              disabled={loading || googleLoading}
              onClick={handleGoogleSignIn}
              id="google-signin-button"
              className="w-full h-11 border-slate-200 dark:border-emerald-950 bg-white dark:bg-forest-950/50 hover:bg-slate-50 dark:hover:bg-forest-900/70 text-slate-800 dark:text-slate-100 font-medium rounded-xl shadow-xs gap-3 transition-colors"
            >
              {googleLoading ? (
                <div className="h-4 w-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>{googleLoading ? "Signing in with Google..." : "Sign in with Google"}</span>
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200 dark:border-emerald-950/80" />
              <span className="absolute bg-white dark:bg-forest-900 px-3 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-950 bg-slate-50 dark:bg-forest-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-emerald-950 bg-slate-50 dark:bg-forest-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl shadow-sm gap-2"
            >
              {loading ? "Verifying Session..." : "Sign In with Firebase"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-emerald-950/60 text-center text-xs text-slate-500 dark:text-slate-400">
            Secured by Firebase Authentication & HttpOnly Session Cookies.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
        © 2026 BreatheWise AI. Dedicated Live Staging Environment.
      </footer>
    </div>
  );
}
