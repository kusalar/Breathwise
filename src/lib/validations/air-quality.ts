import { z } from "zod";

export const PollutantValuesSchema = z.object({
  pm25: z.number().min(0).max(1000).nullable(),
  pm10: z.number().min(0).max(1000).nullable(),
  no2: z.number().min(0).max(1000).nullable(),
  so2: z.number().min(0).max(1000).nullable(),
  co: z.number().min(0).max(500).nullable(),
  o3: z.number().min(0).max(1000).nullable(),
  dust: z.number().min(0).max(2000).nullable().optional(),
  uvIndex: z.number().min(0).max(25).nullable().optional(),
});

export const AirQualityQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  standard: z.enum(["CPCB_INDIA", "US_EPA", "EUROPEAN_AQI"]).default("CPCB_INDIA"),
});

// Zod schemas for Open-Meteo external responses
export const OpenMeteoAirQualityResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  utc_offset_seconds: z.number().optional().default(0),
  timezone: z.string().optional().default("UTC"),
  hourly: z.object({
    time: z.array(z.string()),
    pm10: z.array(z.number().nullable()).optional(),
    pm2_5: z.array(z.number().nullable()).optional(),
    carbon_monoxide: z.array(z.number().nullable()).optional(),
    nitrogen_dioxide: z.array(z.number().nullable()).optional(),
    sulphur_dioxide: z.array(z.number().nullable()).optional(),
    ozone: z.array(z.number().nullable()).optional(),
    dust: z.array(z.number().nullable()).optional(),
    uv_index: z.array(z.number().nullable()).optional(),
    european_aqi: z.array(z.number().nullable()).optional(),
    us_aqi: z.array(z.number().nullable()).optional(),
  }),
});

export const OpenMeteoWeatherResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  current: z.object({
    time: z.string().optional(),
    temperature_2m: z.number().nullable().optional(),
    relative_humidity_2m: z.number().nullable().optional(),
    apparent_temperature: z.number().nullable().optional(),
    precipitation: z.number().nullable().optional(),
    weather_code: z.number().nullable().optional(),
    wind_speed_10m: z.number().nullable().optional(),
    wind_direction_10m: z.number().nullable().optional(),
  }).optional(),
});

export type PollutantValuesInput = z.infer<typeof PollutantValuesSchema>;
export type AirQualityQueryInput = z.infer<typeof AirQualityQuerySchema>;
export type OpenMeteoAirQualityResponse = z.infer<typeof OpenMeteoAirQualityResponseSchema>;
export type OpenMeteoWeatherResponse = z.infer<typeof OpenMeteoWeatherResponseSchema>;
