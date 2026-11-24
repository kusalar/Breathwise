export type { FamilyProfile } from "@/types";

export interface FamilyGroup {
  groupId: string;
  name: string;
  primaryLocation: string;
  membersCount: number;
  highestVulnerability: "standard" | "high" | "critical";
}

