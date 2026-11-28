import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server-auth";
import { dataService } from "@/services/data-provider";
import { parseSafeJson, formatSafe500Response } from "@/lib/api-security";
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
    return formatSafe500Response(error, "PreferencesRoute");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedBody = await parseSafeJson<unknown>(request);
    if (!parsedBody.success) {
      return parsedBody.response;
    }
    const parsed = PreferencesSchema.safeParse(parsedBody.data);

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
    return formatSafe500Response(error, "PreferencesRoute");
  }
}

