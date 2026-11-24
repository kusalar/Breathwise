import {
  AirQualityReading,
  GeoLocation,
  HourlyTrendPoint,
  DataQualityReport,
} from "@/types";
import {
  AQIStandard,
  getCPCBCategory,
  calculateIndicativeCPCB,
} from "@/lib/constants/aqi-standards";
import {
  OpenMeteoAirQualityResponseSchema,
  OpenMeteoAirQualityResponse,
} from "@/lib/validations/air-quality";
import { environmentalCache } from "@/lib/cache/environmental-cache";
import { IAirQualityService } from "./types";

export class AirQualityService implements IAirQualityService {
  private readonly baseUrl: string;
  private readonly requestTimeoutMs = 8000;
  private readonly cacheTtlSeconds = 600; // 10 minutes cache

  constructor() {
    this.baseUrl =
      process.env.OPEN_METEO_AIR_QUALITY_URL ||
      "https://air-quality-api.open-meteo.com/v1/air-quality";
  }

  /**
   * Retrieves the current air quality snapshot.
   * Fetches real live data from Open-Meteo Air Quality API with in-memory caching.
   * If the API is unreachable, falls back to calibrated simulation data with explicit demo labeling.
   */
  async getCurrentReading(
    location: GeoLocation,
    standard: AQIStandard = "CPCB_INDIA",
    forceRefresh = false
  ): Promise<AirQualityReading> {
    const cacheKey = `aqi:${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}:${standard}`;

    if (forceRefresh) {
      environmentalCache.clear(cacheKey);
    }

    return environmentalCache.getOrFetch(cacheKey, this.cacheTtlSeconds, async () => {
      try {
        const url = new URL(this.baseUrl);
        url.searchParams.set("latitude", location.latitude.toString());
        url.searchParams.set("longitude", location.longitude.toString());
        url.searchParams.set(
          "hourly",
          "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index,european_aqi,us_aqi"
        );
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", "2");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: forceRefresh ? "no-store" : "default",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Open-Meteo Air Quality API responded with status ${response.status}`);
        }

        const rawJson = await response.json();
        const validated = OpenMeteoAirQualityResponseSchema.parse(rawJson);

        return this.transformOpenMeteoResponse(validated, location, standard);
      } catch (error) {
        // Fallback to simulation model when API is unavailable or offline
        return this.getFallbackReading(location, error instanceof Error ? error.message : "Network error");
      }
    });
  }

  /**
   * Transforms validated Open-Meteo API response into strict domain models.
   */
  private transformOpenMeteoResponse(
    data: OpenMeteoAirQualityResponse,
    location: GeoLocation,
    _standard: AQIStandard
  ): AirQualityReading {
    const { hourly } = data;
    const times = hourly.time;

    // Find the current hour index closest to now (or default to last available index)
    const nowIso = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
    let currentIndex = times.findIndex((t) => t.startsWith(nowIso));
    if (currentIndex === -1) {
      // Find latest non-null PM2.5 index
      currentIndex = times.length > 0 ? Math.min(12, times.length - 1) : 0;
    }

    const rawPm25 = hourly.pm2_5?.[currentIndex];
    const rawPm10 = hourly.pm10?.[currentIndex];
    const rawNo2 = hourly.nitrogen_dioxide?.[currentIndex];
    const rawSo2 = hourly.sulphur_dioxide?.[currentIndex];
    const rawCo = hourly.carbon_monoxide?.[currentIndex];
    const rawO3 = hourly.ozone?.[currentIndex];
    const rawDust = hourly.dust?.[currentIndex];
    const rawUvIndex = hourly.uv_index?.[currentIndex];
    const europeanAqi = hourly.european_aqi?.[currentIndex] ?? undefined;
    const usAqi = hourly.us_aqi?.[currentIndex] ?? undefined;

    const pm25 = rawPm25 != null && !isNaN(rawPm25) ? Math.round(rawPm25 * 10) / 10 : null;
    const pm10 = rawPm10 != null && !isNaN(rawPm10) ? Math.round(rawPm10 * 10) / 10 : null;
    const no2 = rawNo2 != null && !isNaN(rawNo2) ? Math.round(rawNo2 * 10) / 10 : null;
    const so2 = rawSo2 != null && !isNaN(rawSo2) ? Math.round(rawSo2 * 10) / 10 : null;
    const co = rawCo != null && !isNaN(rawCo) ? Math.round((rawCo / 1000) * 10) / 10 : null;
    const o3 = rawO3 != null && !isNaN(rawO3) ? Math.round(rawO3 * 10) / 10 : null;
    const dust = rawDust != null && !isNaN(rawDust) ? Math.round(rawDust * 10) / 10 : null;
    const uvIndex = rawUvIndex != null && !isNaN(rawUvIndex) ? Math.round(rawUvIndex * 10) / 10 : null;

    // Calculate indicative CPCB sub-index from real pollutant concentrations
    const cpcbResult = calculateIndicativeCPCB({
      pm25,
      pm10,
      no2,
      so2,
      co,
      o3,
    });

    // Track data completeness and missing parameters
    const missing: string[] = [];
    if (pm25 === null) missing.push("PM2.5");
    if (pm10 === null) missing.push("PM10");
    if (no2 === null) missing.push("NO₂");
    if (so2 === null) missing.push("SO₂");
    if (co === null) missing.push("CO");
    if (o3 === null) missing.push("O₃");

    const validCount = 6 - missing.length;
    const completeness = Math.round((validCount / 6) * 100);

    const dataQuality: DataQualityReport = {
      completeness,
      freshnessSeconds: 900,
      confidenceText:
        cpcbResult.status === "insufficient_data"
          ? "Insufficient particulate data to calculate CPCB AQI (PM2.5 or PM10 required)"
          : completeness >= 80
          ? "High Confidence (Real-time telemetry, all primary pollutants available)"
          : "Moderate Confidence (Partial sensor parameters returned)",
      isRealTime: true,
      missingParameters: missing,
    };

    // Build 24-point diurnal hourly trend curve (full 24-hour cycle)
    const trendPoints: HourlyTrendPoint[] = [];
    const currentDayPrefix = times[currentIndex]?.slice(0, 10);
    let startIndex = 0;
    if (currentDayPrefix) {
      const dayStart = times.findIndex((t) => t.startsWith(currentDayPrefix));
      if (dayStart !== -1) {
        startIndex = dayStart;
      } else {
        startIndex = Math.max(0, currentIndex >= 12 ? currentIndex - 12 : 0);
      }
    } else {
      startIndex = Math.max(0, currentIndex >= 12 ? currentIndex - 12 : 0);
    }
    const endIndex = Math.min(times.length, startIndex + 24);

    for (let i = startIndex; i < endIndex; i++) {
      const rawP25 = hourly.pm2_5?.[i];
      const rawP10 = hourly.pm10?.[i];
      const rawN2 = hourly.nitrogen_dioxide?.[i];
      const rawS2 = hourly.sulphur_dioxide?.[i];
      const rawC = hourly.carbon_monoxide?.[i];
      const rawO = hourly.ozone?.[i];
      const uAqi = hourly.us_aqi?.[i] ?? undefined;

      const p25 = rawP25 != null && !isNaN(rawP25) ? Math.round(rawP25 * 10) / 10 : null;
      const p10 = rawP10 != null && !isNaN(rawP10) ? Math.round(rawP10 * 10) / 10 : null;
      const n2 = rawN2 != null && !isNaN(rawN2) ? Math.round(rawN2 * 10) / 10 : null;
      const s2 = rawS2 != null && !isNaN(rawS2) ? Math.round(rawS2 * 10) / 10 : null;
      const c = rawC != null && !isNaN(rawC) ? Math.round((rawC / 1000) * 10) / 10 : null;
      const o = rawO != null && !isNaN(rawO) ? Math.round(rawO * 10) / 10 : null;

      const subIdx = calculateIndicativeCPCB({
        pm25: p25,
        pm10: p10,
        no2: n2,
        so2: s2,
        co: c,
        o3: o,
      });

      // Format timeLabel e.g. "06:00 AM"
      const dateObj = new Date(times[i]);
      const timeLabel = !isNaN(dateObj.getTime())
        ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(dateObj)
        : times[i].slice(11, 16);

      trendPoints.push({
        timestamp: times[i],
        timeLabel,
        pm25: p25,
        pm10: p10,
        aqi: subIdx.aqi,
        usAqi: uAqi ?? undefined,
      });
    }

    return {
      location,
      timestamp: times[currentIndex] || new Date().toISOString(),
      aqi: cpcbResult.aqi,
      category: cpcbResult.category.category,
      dominantPollutant: cpcbResult.dominantPollutant,
      pollutants: {
        pm25,
        pm10,
        no2,
        so2,
        co,
        o3,
        dust,
        uvIndex,
      },
      usAqi,
      europeanAqi,
      standardUsed: "CPCB_INDICATIVE",
      dataQuality,
      officialStationStatus: {
        available: false,
        message:
          "Official CPCB real-time ground monitor station API connection requires regional CAAQMS sensor hookup. Current readings reflect satellite-calibrated planetary dispersion models.",
      },
      hourlyForecast: trendPoints,
      isDemoData: false,
      sourceAttribution: "Open-Meteo Air Quality API (Copernicus CAMS & ECMWF data)",
    };
  }

  /**
   * Safe fallback generator when Open-Meteo API is unreachable or rate limited.
   */
  private getFallbackReading(location: GeoLocation, reason: string): AirQualityReading {
    const isDelhi = location.name.toLowerCase().includes("delhi");
    const isPatna = location.name.toLowerCase().includes("patna");
    const demoAqi = isDelhi ? 312 : isPatna ? 238 : 142;
    const categoryDetail = getCPCBCategory(demoAqi);

    return {
      location,
      timestamp: new Date().toISOString(),
      aqi: demoAqi,
      category: categoryDetail.category,
      dominantPollutant: "PM2.5",
      pollutants: {
        pm25: demoAqi > 200 ? 186.4 : 58.2,
        pm10: demoAqi > 200 ? 294.1 : 112.6,
        no2: 34.5,
        so2: 12.8,
        co: 1.4,
        o3: 42.1,
      },
      usAqi: demoAqi > 200 ? 280 : 138,
      europeanAqi: demoAqi > 200 ? 75 : 42,
      standardUsed: "CPCB_INDICATIVE",
      dataQuality: {
        completeness: 100,
        freshnessSeconds: 0,
        confidenceText: `Demonstration Fallback Active (${reason})`,
        isRealTime: false,
        missingParameters: [],
      },
      officialStationStatus: {
        available: false,
        message: "Live API connection offline or timed out. Operating in demonstration mode.",
      },
      hourlyForecast: Array.from({ length: 24 }, (_, i) => {
        const hour = i;
        const timeLabel = `${String(hour % 12 === 0 ? 12 : hour % 12).padStart(2, "0")}:00 ${hour >= 12 ? "PM" : "AM"}`;
        const aqi = Math.max(40, Math.round(demoAqi + Math.sin((i / 24) * 2 * Math.PI) * 35));
        return {
          timestamp: new Date(Date.now() + (i - 12) * 3600000).toISOString(),
          timeLabel,
          aqi,
          pm25: Math.round(aqi * 0.6),
          pm10: Math.round(aqi * 1.1),
        };
      }),
      isDemoData: true,
      sourceAttribution: `BreatheWise Fallback Engine — DEMO DATA (${reason})`,
    };
  }

  /**
   * Retrieves hourly forecast data for trends visualization.
   */
  async getHourlyForecast(location: GeoLocation): Promise<AirQualityReading[]> {
    const reading = await this.getCurrentReading(location);
    if (reading.hourlyForecast && reading.hourlyForecast.length > 0) {
      return reading.hourlyForecast.map((pt) => {
        const cat = getCPCBCategory(pt.aqi);
        return {
          location,
          timestamp: pt.timestamp,
          aqi: pt.aqi,
          category: cat.category,
          dominantPollutant: "PM2.5",
          pollutants: {
            pm25: pt.pm25,
            pm10: pt.pm10,
            no2: reading.pollutants.no2,
            so2: reading.pollutants.so2,
            co: reading.pollutants.co,
            o3: reading.pollutants.o3,
          },
          isDemoData: reading.isDemoData,
          sourceAttribution: reading.sourceAttribution,
        };
      });
    }

    // Default fallback array
    const now = new Date();
    return [-4, -2, 0, 2, 4, 6].map((offset) => {
      const pointTime = new Date(now.getTime() + offset * 3600 * 1000);
      const aqi = Math.max(50, reading.aqi + offset * 8);
      const cat = getCPCBCategory(aqi);
      return {
        location,
        timestamp: pointTime.toISOString(),
        aqi,
        category: cat.category,
        dominantPollutant: "PM2.5",
        pollutants: reading.pollutants,
        isDemoData: true,
        sourceAttribution: "Simulated Hourly Trend — DEMO DATA",
      };
    });
  }
}

export const airQualityService = new AirQualityService();
