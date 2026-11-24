import { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = {
  title: "Environmental Intelligence Dashboard",
  description:
    "Real-time air quality metrics, Gemini AI insights, daily routine planning, and family protection protocols for urban air pollution.",
};

export default function DashboardPage() {
  return <DashboardView />;
}

