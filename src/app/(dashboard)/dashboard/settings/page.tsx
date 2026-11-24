import { SettingsView } from "@/components/dashboard/settings-view";

export const metadata = {
  title: "Settings & Schedule Preferences | BreatheWise AI",
  description: "Configure default monitoring location, routine timings, and smog warning thresholds.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
