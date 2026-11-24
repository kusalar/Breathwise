export type { RoutineItem } from "@/types";

export interface DaySchedule {
  date: string;
  locationName: string;
  items: Array<{
    timeSlot: string;
    activityType: "commute" | "exercise" | "work" | "ventilation" | "sleep";
    advice: string;
    exposureRisk: "low" | "medium" | "high";
  }>;
}

