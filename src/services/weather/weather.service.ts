import { GeoLocation, WeatherReading } from "@/types";
import { OpenMeteoWeatherResponseSchema } from "@/lib/validations/air-quality";
import { environmentalCache } from "@/lib/cache/environmental-cache";

export interface IWeatherService {
  getCurrentWeather(location: GeoLocation, forceRefresh?: boolean): Promise<WeatherReading>;
}

export class WeatherService implements IWeatherService {
  private readonly baseUrl: string;
  private readonly requestTimeoutMs = 8000;
  private readonly cacheTtlSeconds = 600; // 10 minutes cache

  constructor() {
    this.baseUrl =
      process.env.OPEN_METEO_WEATHER_URL ||
      "https://api.open-meteo.com/v1/forecast";
  }

  /**
   * Retrieves current weather conditions from Open-Meteo Weather API.
   */
  async getCurrentWeather(location: GeoLocation, forceRefresh = false): Promise<WeatherReading> {
    const cacheKey = `weather:${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}`;

    if (forceRefresh) {
      environmentalCache.clear(cacheKey);
    }

    // Cache demo fallback data briefly so live weather is retried promptly after an outage.
    const ttl = (reading: WeatherReading) => (reading.isDemoData ? 30 : this.cacheTtlSeconds);

    return environmentalCache.getOrFetch(cacheKey, ttl, async () => {
      try {
        const url = new URL(this.baseUrl);
        url.searchParams.set("latitude", location.latitude.toString());
        url.searchParams.set("longitude", location.longitude.toString());
        url.searchParams.set(
          "current",
          "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m"
        );
        url.searchParams.set("timezone", "auto");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: forceRefresh ? "no-store" : "default",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Open-Meteo Weather API returned status ${response.status}`);
        }

        const rawJson = await response.json();
        const validated = OpenMeteoWeatherResponseSchema.parse(rawJson);
        const cur = validated.current;

        const temperatureC = cur?.temperature_2m ?? 22.4;
        const apparentTemperatureC = cur?.apparent_temperature ?? temperatureC;
        const humidityPercent = cur?.relative_humidity_2m ?? 65;
        const windSpeedKmh = cur?.wind_speed_10m ?? 6.2;
        const windDirectionDegrees = cur?.wind_direction_10m ?? 120;
        const precipitationMm = cur?.precipitation ?? 0.0;
        const weatherCode = cur?.weather_code ?? 1;

        const conditionText = this.interpretWeatherCode(weatherCode, windSpeedKmh);

        return {
          temperatureC: Math.round(temperatureC * 10) / 10,
          apparentTemperatureC: Math.round(apparentTemperatureC * 10) / 10,
          humidityPercent: Math.round(humidityPercent),
          windSpeedKmh: Math.round(windSpeedKmh * 10) / 10,
          windDirectionDegrees: Math.round(windDirectionDegrees),
          uvIndex: 4, // Default baseline estimate
          conditionText,
          precipitationMm,
          weatherCode,
          timestamp: cur?.time || new Date().toISOString(),
          isDemoData: false,
        };
      } catch (_error) {
        // Fallback when network is unavailable
        return {
          temperatureC: 22.4,
          humidityPercent: 68,
          windSpeedKmh: 6.2,
          windDirectionDegrees: 120,
          uvIndex: 4,
          conditionText: "Hazy & Stagnant Air (Fallback)",
          precipitationMm: 0,
          weatherCode: 1,
          timestamp: new Date().toISOString(),
          isDemoData: true,
        };
      }
    });
  }

  /**
   * Translates WMO weather code and wind speed into atmospheric pollution context.
   */
  private interpretWeatherCode(code: number, windSpeedKmh: number): string {
    const isCalm = windSpeedKmh < 8;

    if (code === 45 || code === 48) {
      return isCalm ? "Dense Fog & Inversion Smog" : "Dense Fog";
    }
    if (code === 0) {
      return isCalm ? "Clear Skies (Low Dispersion)" : "Clear & Breezy";
    }
    if (code >= 1 && code <= 3) {
      return isCalm ? "Hazy & Stagnant Air" : "Partly Cloudy";
    }
    if (code >= 51 && code <= 67) {
      return "Light Rain (Particulate Washout)";
    }
    if (code >= 80 && code <= 99) {
      return "Showers / Thunderstorms";
    }
    return isCalm ? "Calm & Hazy" : "Overcast";
  }
}

export const weatherService = new WeatherService();
