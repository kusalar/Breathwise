import { NextRequest, NextResponse } from "next/server";
import { airQualityService } from "@/services/air-quality/air-quality.service";
import { AirQualityQuerySchema } from "@/lib/validations/air-quality";
import { GeoLocation } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("latitude");
    const lonParam = searchParams.get("longitude");
    const nameParam = searchParams.get("name") || "Demonstration Location";
    const standardParam = searchParams.get("standard") || "CPCB_INDIA";

    const parsedQuery = AirQualityQuerySchema.safeParse({
      latitude: latParam,
      longitude: lonParam,
      standard: standardParam,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 }
      );
    }

    const location: GeoLocation = {
      name: nameParam,
      region: "West Bengal",
      country: "India",
      latitude: parsedQuery.data.latitude,
      longitude: parsedQuery.data.longitude,
      isDemo: false,
    };

    const reading = await airQualityService.getCurrentReading(
      location,
      parsedQuery.data.standard
    );

    return NextResponse.json(
      {
        success: true,
        data: reading,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

