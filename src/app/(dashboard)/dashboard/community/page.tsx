import { FeatureViewPlaceholder } from "@/components/dashboard/feature-view-placeholder";

export const metadata = { title: "Community Hub | BreatheWise AI" };

export default function CommunityHubPage() {
  return (
    <FeatureViewPlaceholder
      title="Community Clean Air Hub"
      subtitle="Neighborhood clean-air initiatives, hyper-local sensor mesh, and citizen reports."
      milestone="Milestone 2 Integration"
      description="Connects citizens in Siliguri and regional cities to report local biomass burnings, coordinate community carpooling, and mobilize neighborhood air-quality awareness drives."
      keyCapabilities={[
        "Geo-tagged pollution hotspot reporting",
        "Community air purifier group-buying initiatives",
        "Local school clean air action networks",
      ]}
    />
  );
}

