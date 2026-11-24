export interface CommunityReport {
  id: string;
  locationName: string;
  latitude: number;
  longitude: number;
  type: "biomass_burning" | "traffic_snarl" | "industrial_plume" | "dust_storm";
  reportedAt: string;
  verificationCount: number;
}

