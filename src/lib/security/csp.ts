/**
 * Single source of truth for the page Content-Security-Policy.
 * Used by `src/proxy.ts` with a fresh per-request nonce.
 */

const CONNECT_SOURCES = [
  "'self'",
  "https://apis.google.com",
  "https://accounts.google.com",
  "https://*.firebaseapp.com",
  "https://*.googleapis.com",
  "https://air-quality-api.open-meteo.com",
  "https://api.open-meteo.com",
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://firestore.googleapis.com",
  "https://generativelanguage.googleapis.com",
];

export function buildContentSecurityPolicy(nonce: string, isDev = false): string {
  return [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://apis.google.com https://*.firebaseapp.com${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "img-src 'self' blob: data: https://*.googleusercontent.com https://*.gstatic.com https://*.openstreetmap.org https://air-quality-api.open-meteo.com",
    `connect-src ${CONNECT_SOURCES.join(" ")}`,
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "manifest-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}
