import { z } from "zod";

export const GeoLocationSchema = z.object({
  name: z.string().min(1, "Location name is required").max(100),
  region: z.string().max(100).default(""),
  country: z.string().min(1, "Country is required").max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isDemo: z.boolean().optional().default(false),
});

export const LocationQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  name: z.string().optional(),
});

export type GeoLocationInput = z.infer<typeof GeoLocationSchema>;
export type LocationQueryInput = z.infer<typeof LocationQuerySchema>;

