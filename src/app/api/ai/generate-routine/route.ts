import { NextRequest, NextResponse } from "next/server";
import { geminiService } from "@/services/gemini/gemini.service";
import { airQualityService } from "@/services/air-quality/air-quality.service";
import { weatherService } from "@/services/weather/weather.service";
import { z } from "zod";

const RoutineRequestSchema = z.object({
  location: z.object({
    name: z.string(),
    region: z.string().default(""),
    country: z.string().default("India"),
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RoutineRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const location = parsed.data.location;
    const reading = await airQualityService.getCurrentReading(location);
    const weather = await weatherService.getCurrentWeather(location);

    const routine = await geminiService.generateRoutine(reading, location, weather);

    return NextResponse.json({ success: true, data: routine, routines: routine }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

