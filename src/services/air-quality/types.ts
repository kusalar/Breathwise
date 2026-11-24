import { AirQualityReading, GeoLocation } from "@/types";
import { AQIStandard } from "@/lib/constants/aqi-standards";

export interface IAirQualityService {
  getCurrentReading(location: GeoLocation, standard?: AQIStandard): Promise<AirQualityReading>;
  getHourlyForecast(location: GeoLocation): Promise<AirQualityReading[]>;
}

