import { FeatureViewPlaceholder } from "@/components/dashboard/feature-view-placeholder";

export const metadata = { title: "Indoor Air Quality Optimizer | BreatheWise AI" };

export default function IndoorAirPage() {
  return (
    <FeatureViewPlaceholder
      title="Indoor Air Quality Optimizer"
      subtitle="Engineering safe indoor sanctuaries against severe ambient pollution."
      milestone="Indoor Sanctuary"
      description="Combines low-cost physical modifications, DIY air purifier filter guidelines, and smart IoT purifier integrations to ensure indoor particulate counts remain below safe thresholds."
      keyCapabilities={[
        "Purifier CADR calculator for room dimensions",
        "DIY box fan + HEPA filter build guide",
        "Cooking and incense aerosol mitigation routines",
      ]}
    />
  );
}

