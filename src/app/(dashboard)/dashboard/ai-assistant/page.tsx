import { Metadata } from "next";
import { AiAssistantView } from "@/components/dashboard/ai-assistant-view";

export const metadata: Metadata = {
  title: "Gemini AI Environmental Assistant | BreatheWise AI",
  description:
    "Contextual AI recommendations for severe smog, indoor air optimization, and low-emission commute alternatives.",
};

export default function AiAssistantPage() {
  return <AiAssistantView />;
}
