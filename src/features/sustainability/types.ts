export type { SustainableChoice } from "@/types";

export interface ImpactSummary {
  co2SavedKg: number;
  particulateInhalationAvoidedPercent: number;
  activeSustainableChoices: number;
  period: "weekly" | "monthly" | "all_time";
}

