export type { IndoorAirAdvice } from "@/types";

export interface RoomAirProfile {
  roomId: string;
  name: "bedroom" | "living_room" | "kitchen" | "nursery";
  squareFootage: number;
  hasPurifier: boolean;
  estimatedAqi: number;
}

