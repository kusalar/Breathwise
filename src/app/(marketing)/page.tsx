import { Hero } from "@/components/landing/hero";
import { AirQualityPreview } from "@/components/landing/aqi-preview";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { WhyUs } from "@/components/landing/why-us";
import { FinalCTA } from "@/components/landing/cta";

export const metadata = {
  title: "BreatheWise AI — Breathe Smarter. Live Healthier. Breathe Better.",
  description:
    "GenAI-powered environmental health and sustainability assistant helping families navigate urban air pollution and severe winter smog with low-emission routines and actionable guidance.",
};

export default function LandingPage() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <AirQualityPreview />
      <Features />
      <HowItWorks />
      <WhyUs />
      <FinalCTA />
    </div>
  );
}

