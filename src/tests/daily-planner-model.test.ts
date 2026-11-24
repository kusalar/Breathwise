import { describe, it, expect } from "vitest";
import { geminiService } from "@/services/gemini/gemini.service";
import { AirQualityReading, GeoLocation, WeatherReading } from "@/types";

describe("Phase 4 — Daily Planner Model & Diurnal Forecast Validation", () => {
  const siliguriLocation: GeoLocation = {
    name: "Siliguri",
    region: "West Bengal",
    country: "India",
    latitude: 26.7271,
    longitude: 88.3953,
  };

  const baseWeather: WeatherReading = {
    temperatureC: 18.5,
    humidityPercent: 68,
    windSpeedKmh: 4.2, // Stagnant wind
    windDirectionDegrees: 180,
    uvIndex: 4,
    conditionText: "Hazy",
    isDemoData: false,
  };

  it("prioritizes live forecast clean dispersion window over fixed clock heuristic", async () => {
    const readingWithCleanWindow: AirQualityReading = {
      location: siliguriLocation,
      timestamp: "2026-11-20T08:00:00Z",
      aqi: 210,
      category: "poor",
      dominantPollutant: "PM2.5",
      pollutants: { pm25: 110, pm10: 160, no2: 30, so2: 12, co: 0.8, o3: 40 },
      isDemoData: false,
      sourceAttribution: "Open-Meteo",
      hourlyForecast: [
        { timestamp: "2026-11-20T06:00:00Z", timeLabel: "06:00 AM", pm25: 130, pm10: 190, aqi: 240 },
        { timestamp: "2026-11-20T09:00:00Z", timeLabel: "09:00 AM", pm25: 100, pm10: 150, aqi: 190 },
        { timestamp: "2026-11-20T13:00:00Z", timeLabel: "01:00 PM", pm25: 35, pm10: 60, aqi: 82 }, // Clean window
        { timestamp: "2026-11-20T18:00:00Z", timeLabel: "06:00 PM", pm25: 115, pm10: 170, aqi: 220 },
      ],
    };

    const routine = await geminiService.generateRoutine(readingWithCleanWindow, siliguriLocation, baseWeather);

    expect(routine.length).toBe(4);
    // Finds clean window around 01:00 PM
    const cleanItem = routine.find((r) => r.timeSlot.includes("01:00 PM"));
    expect(cleanItem).toBeDefined();
    expect(cleanItem?.status).toBe("recommended");
    expect(cleanItem?.recommendation).toContain("optimal dispersion around 01:00 PM (Projected AQI: 82)");
  });

  it("refuses to recommend outdoor midday exercise when entire forecast curve is hazardous", async () => {
    const allHazardousReading: AirQualityReading = {
      location: siliguriLocation,
      timestamp: "2026-11-20T08:00:00Z",
      aqi: 380,
      category: "very_poor",
      dominantPollutant: "PM2.5",
      pollutants: { pm25: 230, pm10: 380, no2: 60, so2: 25, co: 2.1, o3: 50 },
      isDemoData: false,
      sourceAttribution: "Open-Meteo",
      hourlyForecast: [
        { timestamp: "2026-11-20T06:00:00Z", timeLabel: "06:00 AM", pm25: 280, pm10: 420, aqi: 410 },
        { timestamp: "2026-11-20T12:00:00Z", timeLabel: "12:00 PM", pm25: 220, pm10: 350, aqi: 360 }, // Even lowest is hazardous
        { timestamp: "2026-11-20T15:00:00Z", timeLabel: "03:00 PM", pm25: 240, pm10: 370, aqi: 380 },
        { timestamp: "2026-11-20T20:00:00Z", timeLabel: "08:00 PM", pm25: 310, pm10: 460, aqi: 440 },
      ],
    };

    const routine = await geminiService.generateRoutine(allHazardousReading, siliguriLocation, baseWeather);

    // Midday slot must NOT recommend outdoor workouts
    const middayItem = routine[1];
    expect(middayItem.status).toBe("avoid");
    expect(middayItem.recommendation).toContain("Severe pollution persists across all forecast hours");
    expect(middayItem.recommendation).toContain("Postpone all outdoor fitness");
  });

  it("adjusts morning guidance when rain scavenging washes out particulates", async () => {
    const rainyWeather: WeatherReading = {
      ...baseWeather,
      precipitationMm: 12.4,
      conditionText: "Rain",
    };

    const reading: AirQualityReading = {
      location: siliguriLocation,
      timestamp: "2026-11-20T08:00:00Z",
      aqi: 72,
      category: "satisfactory",
      dominantPollutant: "PM2.5",
      pollutants: { pm25: 22, pm10: 45, no2: 15, so2: 5, co: 0.4, o3: 30 },
      isDemoData: false,
      sourceAttribution: "Open-Meteo",
      hourlyForecast: [
        { timestamp: "2026-11-20T06:00:00Z", timeLabel: "06:00 AM", pm25: 20, pm10: 40, aqi: 65 },
        { timestamp: "2026-11-20T10:00:00Z", timeLabel: "10:00 AM", pm25: 25, pm10: 48, aqi: 75 },
        { timestamp: "2026-11-20T14:00:00Z", timeLabel: "02:00 PM", pm25: 18, pm10: 38, aqi: 58 },
        { timestamp: "2026-11-20T18:00:00Z", timeLabel: "06:00 PM", pm25: 30, pm10: 55, aqi: 85 },
      ],
    };

    const routine = await geminiService.generateRoutine(reading, siliguriLocation, rainyWeather);
    const morningItem = routine[0];
    expect(morningItem.recommendation).toContain("Precipitation particulate scavenging active");
  });

  it("falls back to clearly labeled heuristic items when hourly forecast is absent or incomplete", async () => {
    const readingWithoutForecast: AirQualityReading = {
      location: siliguriLocation,
      timestamp: "2026-11-20T08:00:00Z",
      aqi: 175,
      category: "moderate",
      dominantPollutant: "PM2.5",
      pollutants: { pm25: 65, pm10: 120, no2: 28, so2: 10, co: 0.9, o3: 35 },
      isDemoData: false,
      sourceAttribution: "Open-Meteo",
      hourlyForecast: [], // Empty forecast
    };

    const routine = await geminiService.generateRoutine(readingWithoutForecast, siliguriLocation, baseWeather);

    expect(routine.length).toBe(4);
    // Every item must be explicitly labeled as [General Heuristic]
    for (const item of routine) {
      expect(item.title).toContain("[General Heuristic]");
    }
  });
});
