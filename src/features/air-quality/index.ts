export * from "./types";

export interface AirQualityDomainState {
  currentAqi: number;
  category: string;
  dominantPollutant: string;
  isStagnantInversion: boolean;
  stationName: string;
}

