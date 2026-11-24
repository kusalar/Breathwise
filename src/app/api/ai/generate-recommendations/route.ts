import { NextRequest, NextResponse } from "next/server";
import { geminiService } from "@/services/gemini/gemini.service";
import { airQualityService } from "@/services/air-quality/air-quality.service";
import { weatherService } from "@/services/weather/weather.service";
import { z } from "zod";

const RecommendationsSchema = z.object({
  location: z.object({
    name: z.string(),
    region: z.string().default(""),
    country: z.string().default("India"),
    latitude: z.number(),
    longitude: z.number(),
  }),
  category: z.enum(["all", "indoor", "commute", "family"]).default("all"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RecommendationsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const location = parsed.data.location;
    const reading = await airQualityService.getCurrentReading(location);
    const weather = await weatherService.getCurrentWeather(location);
    const insight = await geminiService.generateAirQualityInsight(reading, location, weather);

    return NextResponse.json(
      {
        success: true,
        data: {
          location: location.name,
          category: parsed.data.category,
          recommendedActions: insight.recommendedActions || [],
          actionsToAvoid: insight.actionsToAvoid || [],
          practicalAlternatives: insight.practicalAlternatives || [],
          tailoredAction: insight.tailoredAction,
          dataSource: reading.sourceAttribution,
          timestamp: reading.timestamp,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

