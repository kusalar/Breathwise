import { DailyPlannerView } from "@/components/dashboard/daily-planner-view";

export const metadata = {
  title: "Pollution-Aware Daily Routine Planner | BreatheWise AI",
  description: "Reorganize your day around peak smog inversions and clean air windows to minimize particulate inhalation.",
};

export default function DailyPlannerPage() {
  return <DailyPlannerView />;
}
