import { vi } from "vitest";
import type {
  OpenMeteoAirQualityResponse,
  OpenMeteoWeatherResponse,
} from "@/lib/validations/air-quality";

export function buildOpenMeteoAirQualityFixture(
  overrides: Partial<OpenMeteoAirQualityResponse> = {}
): OpenMeteoAirQualityResponse {
  const baseDate = new Date();
  baseDate.setUTCMinutes(0, 0, 0);
  baseDate.setUTCHours(0);

  const times: string[] = [];
  const pm25: number[] = [];
  const pm10: number[] = [];
  const no2: number[] = [];
  const so2: number[] = [];
  const co: number[] = [];
  const o3: number[] = [];
  const dust: number[] = [];
  const uvIndex: number[] = [];

  for (let i = 0; i < 48; i++) {
    const t = new Date(baseDate.getTime() + i * 3600_000);
    times.push(t.toISOString().slice(0, 16));
    pm25.push(82 + (i % 6) * 4);
    pm10.push(110 + (i % 6) * 5);
    no2.push(28 + (i % 4) * 2);
    so2.push(9 + (i % 3));
    co.push(750 + (i % 5) * 40);
    o3.push(42 + (i % 8) * 3);
    dust.push(18);
    uvIndex.push(i % 24 >= 8 && i % 24 <= 16 ? 5.2 : 0);
  }

  return {
    latitude: 26.7271,
    longitude: 88.3953,
    utc_offset_seconds: 19800,
    timezone: "Asia/Kolkata",
    hourly: {
      time: times,
      pm2_5: pm25,
      pm10,
      nitrogen_dioxide: no2,
      sulphur_dioxide: so2,
      carbon_monoxide: co,
      ozone: o3,
      dust,
      uv_index: uvIndex,
    },
    ...overrides,
  };
}

export function buildOpenMeteoWeatherFixture(
  overrides: Partial<OpenMeteoWeatherResponse> = {}
): OpenMeteoWeatherResponse {
  return {
    latitude: 26.7271,
    longitude: 88.3953,
    current: {
      time: new Date().toISOString().slice(0, 16),
      temperature_2m: 26.4,
      relative_humidity_2m: 62,
      apparent_temperature: 27.1,
      precipitation: 0,
      weather_code: 1,
      wind_speed_10m: 8.5,
      wind_direction_10m: 145,
    },
    ...overrides,
  };
}

/**
 * Intercepts live Open-Meteo air-quality and weather HTTP requests in unit/component tests
 * while forwarding any other URLs to the underlying fetch implementation.
 */
export function stubOpenMeteoFetch() {
  const originalFetch = globalThis.fetch;
  const aqFixture = buildOpenMeteoAirQualityFixture();
  const weatherFixture = buildOpenMeteoWeatherFixture();

  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      if (url.includes("air-quality-api.open-meteo.com")) {
        return Promise.resolve({
          ok: true,
          json: async () => aqFixture,
        } as Response);
      }

      if (url.includes("api.open-meteo.com")) {
        return Promise.resolve({
          ok: true,
          json: async () => weatherFixture,
        } as Response);
      }

      return originalFetch(input, init);
    });
}
