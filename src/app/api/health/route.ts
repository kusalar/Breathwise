import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";

export async function GET() {
  const isFirebaseConfigured = isFirebaseAdminConfigured();
  const isGeminiConfigured = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0
  );

  return NextResponse.json(
    {
      status: "healthy",
      service: "BreatheWise AI Engine",
      version: "1.0.0",
      releaseCandidate: "v1.0.0-RC1",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      services: {
        airQualityApi: "operational",
        weatherApi: "operational",
        geminiAi: isGeminiConfigured ? "configured" : "fallback_contextual",
        firestoreStorage: isFirebaseConfigured ? "configured" : "local_isolation_store",
      },
      telemetry: {
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptimeSeconds: Math.round(process.uptime()),
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
