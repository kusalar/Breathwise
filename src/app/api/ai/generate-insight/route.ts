import { NextRequest, NextResponse } from "next/server";
import { geminiService } from "@/services/gemini/gemini.service";
import { airQualityService } from "@/services/air-quality/air-quality.service";
import { weatherService } from "@/services/weather/weather.service";
import { enforceRateLimit, parseSafeJson, formatSafe500Response } from "@/lib/api-security";
import { RequestLocationSchema } from "@/lib/validations/location";
import { z } from "zod";

const InsightRequestSchema = z.object({
  location: RequestLocationSchema,
});

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, "ai:insight", { intervalMs: 60_000, maxRequests: 10 });
  if (limited) return limited;

  const parsedBody = await parseSafeJson<unknown>(request, 16 * 1024);
  if (!parsedBody.success) {
    return parsedBody.response;
  }

  try {
    const parsed = InsightRequestSchema.safeParse(parsedBody.data);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: parsed.error.flatten(), requestId: parsedBody.requestId },
        { status: 400 }
      );
    }

    const location = parsed.data.location;
    const [reading, weather] = await Promise.all([
      airQualityService.getCurrentReading(location),
      weatherService.getCurrentWeather(location),
    ]);

    const insight = await geminiService.generateAirQualityInsight(
      reading,
      location,
      weather
    );

    return NextResponse.json({ success: true, data: insight }, { status: 200 });
  } catch (error) {
    return formatSafe500Response(error, "AiInsightRoute", parsedBody.requestId);
  }
}

