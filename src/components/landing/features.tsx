import {
  Wind,
  Bot,
  CalendarCheck,
  Home,
  Leaf,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function Features() {
  const features = [
    {
      id: "live-aqi",
      icon: Wind,
      title: "Live Air Quality Intelligence",
      badge: "Environmental Data",
      description:
        "Hyperlocal air quality metrics calibrated to Indian CPCB standards. Continuous monitoring of PM2.5, PM10, NO₂, and atmospheric inversions.",
      highlights: [
        "CPCB 6-tier classification",
        "Multi-pollutant granularity (PM2.5/PM10)",
        "Demonstration base in Siliguri, WB",
      ],
    },
    {
      id: "ai-assistant",
      icon: Bot,
      title: "Gemini AI Pollution Assistant",
      badge: "Contextual GenAI",
      description:
        "Tailored guidance powered by Google Gemini. Translates complex environmental chemistry into actionable, everyday advice for your specific city.",
      highlights: [
        "Plain-language smog advisories",
        "Localized meteorological reasoning",
        "Transparent confidence explanation",
      ],
    },
    {
      id: "daily-planner",
      icon: CalendarCheck,
      title: "Smart Daily Routine Planner",
      badge: "Behavioral Guidance",
      description:
        "Intelligently structures your day around cleaner atmospheric windows. Suggests optimal times for commuting, ventilation, and outdoor exercise.",
      highlights: [
        "Peak smog avoidance schedules",
        "Safe commute route suggestions",
        "School and exercise timing adjustments",
      ],
    },
    {
      id: "indoor-air",
      icon: Home,
      title: "Indoor Air Quality Optimizer",
      badge: "Home Wellness",
      description:
        "Actionable indoor air quality hacks for urban Indian homes. Low-cost modifications, smart ventilation protocols, and air purifier optimization.",
      highlights: [
        "Smart window opening windows",
        "Purifier placement & fan speed advice",
        "Wet-mopping particulate suppression",
      ],
    },
    {
      id: "sustainable-alternatives",
      icon: Leaf,
      title: "Sustainable Alternative Finder",
      badge: "Eco Impact",
      description:
        "Discover practical, lower-emission alternatives for daily transit, cooking, and waste disposal. Direct impact metrics showing emissions prevented.",
      highlights: [
        "Electric vs ICE comparison metrics",
        "Biomass burn reduction guidance",
        "Quantified personal CO₂ savings",
      ],
    },
    {
      id: "family-protection",
      icon: Users,
      title: "Family Protection Mode",
      badge: "Vulnerable Care",
      description:
        "Personalized safety thresholds for children, seniors, pregnant family members, and individuals with asthma or respiratory conditions.",
      highlights: [
        "Custom vulnerability profiles",
        "Pediatric and geriatric precautions",
        "Emergency severe-smog protocols",
      ],
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32 bg-slate-50 dark:bg-forest-900/40 transition-colors">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <Badge variant="default" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Engineered For Real Impact
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Comprehensive Environmental Protection
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Six interconnected pillars designed to help families and communities navigate severe urban smog, take proactive steps, and live sustainably.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.id}
                className="flex flex-col justify-between border-slate-200/90 dark:border-emerald-950/70 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <Badge variant="outline" className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-2">
                    {feature.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 pt-0">
                  <div className="pt-4 border-t border-slate-100 dark:border-emerald-950/60 space-y-2">
                    {feature.highlights.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

