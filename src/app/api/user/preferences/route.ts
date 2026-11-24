import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-auth";
import { dataService } from "@/services/data-provider";
import { z } from "zod";

const PreferencesSchema = z.object({
  defaultCity: z.string().optional(),
  defaultRegion: z.string().optional(),
  defaultCountry: z.string().optional(),
  defaultLatitude: z.number().optional(),
  defaultLongitude: z.number().optional(),
  morningCommuteTime: z.string().optional(),
  eveningCommuteTime: z.string().optional(),
  outdoorWorkHours: z.string().optional(),
  schoolDropTime: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prefs = await dataService.getUserPreferences(user.id);
    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = PreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.defaultCity && parsed.data.defaultLatitude && parsed.data.defaultLongitude) {
      await dataService.saveUserLocation(user.id, {
        name: parsed.data.defaultCity,
        region: parsed.data.defaultRegion || "West Bengal",
        country: parsed.data.defaultCountry || "India",
        latitude: parsed.data.defaultLatitude,
        longitude: parsed.data.defaultLongitude,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

