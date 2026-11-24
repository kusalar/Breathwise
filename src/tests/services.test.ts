import { describe, it, expect } from "vitest";
import { airQualityService } from "@/services/air-quality/air-quality.service";
import { geminiService } from "@/services/gemini/gemini.service";
import { getCPCBCategory } from "@/lib/constants/aqi-standards";
import { GeoLocationSchema } from "@/lib/validations/location";
import { PollutantValuesSchema } from "@/lib/validations/air-quality";
import { siteConfig } from "@/config/site";

describe("Service Layer & Business Domain Tests", () => {
  it("computes correct CPCB categories across all tiers", () => {
    expect(getCPCBCategory(30).category).toBe("good");
    expect(getCPCBCategory(80).category).toBe("satisfactory");
    expect(getCPCBCategory(150).category).toBe("moderate");
    expect(getCPCBCategory(250).category).toBe("poor");
    expect(getCPCBCategory(350).category).toBe("very_poor");
    expect(getCPCBCategory(450).category).toBe("severe");
  });

  it("AirQualityService returns reading with explicit data attribution", async () => {
    const reading = await airQualityService.getCurrentReading(siteConfig.initialLocation);

    expect(reading.location.name).toBe("Siliguri");
    expect(typeof reading.isDemoData).toBe("boolean");
    expect(reading.sourceAttribution.length).toBeGreaterThan(0);
    expect(reading.pollutants.pm25).toBeGreaterThanOrEqual(0);
    expect(reading.dominantPollutant).toBeDefined();
  });

  it("AirQualityService returns hourly forecast array", async () => {
    const forecast = await airQualityService.getHourlyForecast(siteConfig.initialLocation);

    expect(Array.isArray(forecast)).toBe(true);
    expect(forecast.length).toBeGreaterThan(0);
    expect(forecast[0].aqi).toBeGreaterThanOrEqual(0);
  });

  it("GeminiService synthesizes tailored actionable guidance", async () => {
    const reading = await airQualityService.getCurrentReading(siteConfig.initialLocation);
    const insight = await geminiService.generateAirQualityInsight(
      reading,
      siteConfig.initialLocation
    );

    expect(typeof insight.isDemoData).toBe("boolean");
    expect(insight.confidenceScore).toBeGreaterThan(0);
    expect(insight.headline.length).toBeGreaterThan(0);
    expect(insight.tailoredAction.length).toBeGreaterThan(10);
  });

  it("validates GeoLocation input via Zod schema", () => {
    const valid = GeoLocationSchema.safeParse({
      name: "Siliguri",
      region: "West Bengal",
      country: "India",
      latitude: 26.7271,
      longitude: 88.3953,
    });
    expect(valid.success).toBe(true);

    const invalid = GeoLocationSchema.safeParse({
      name: "",
      latitude: 100, // Invalid latitude
    });
    expect(invalid.success).toBe(false);
  });

  it("validates PollutantValues via Zod schema", () => {
    const valid = PollutantValuesSchema.safeParse({
      pm25: 58.2,
      pm10: 112.6,
      no2: 34.5,
      so2: 12.8,
      co: 1.4,
      o3: 42.1,
    });
    expect(valid.success).toBe(true);

    const invalid = PollutantValuesSchema.safeParse({
      pm25: -5, // Negative value invalid
    });
    expect(invalid.success).toBe(false);
  });
});
