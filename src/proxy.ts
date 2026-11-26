import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://apis.google.com https://*.firebaseapp.com${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "img-src 'self' blob: data: https://*.googleusercontent.com https://*.gstatic.com https://*.openstreetmap.org https://air-quality-api.open-meteo.com",
    "connect-src 'self' https://apis.google.com https://accounts.google.com https://*.firebaseapp.com https://*.googleapis.com https://air-quality-api.open-meteo.com https://api.open-meteo.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://generativelanguage.googleapis.com",
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|images/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
