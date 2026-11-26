/** @type {import('next').NextConfig} */
const trustedOrigin =
  process.env.NEXT_PUBLIC_APP_URL || "https://breathewise-ai-cyan.vercel.app";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: trustedOrigin,
          },
          {
            key: "Vary",
            value: "Origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "X-XSS-Protection",
            value: "0",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'none'",
              "script-src 'self' https://apis.google.com https://*.firebaseapp.com",
              "style-src 'self' https://fonts.googleapis.com",
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
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

