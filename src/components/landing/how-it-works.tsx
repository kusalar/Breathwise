import { MapPin, BarChart3, Sparkles, HeartHandshake } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: MapPin,
      title: "Choose Your Location",
      description:
        "Select your city or neighborhood. Works seamlessly across Indian metropolitan and tier-2 cities like Siliguri, Delhi, Kolkata, and Patna, as well as global locations.",
    },
    {
      step: "02",
      icon: BarChart3,
      title: "Understand Your Air Quality",
      description:
        "View unambiguous Indian CPCB AQI classifications with granular PM2.5, PM10, and meteorological inversion data instead of confusing raw numbers.",
    },
    {
      step: "03",
      icon: Sparkles,
      title: "Get Personalized AI Guidance",
      description:
        "Gemini AI analyzes atmospheric trends, weather patterns, and your family's vulnerability profile to synthesize specific, time-sensitive precautions.",
    },
    {
      step: "04",
      icon: HeartHandshake,
      title: "Make Smarter Everyday Choices",
      description:
        "Adjust daily commute times, optimize indoor ventilation, adopt lower-emission alternatives, and protect young children and elderly family members.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-white dark:bg-forest-950 transition-colors">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Simple, Transparent, Actionable
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            How BreatheWise AI Protects You
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
            From atmospheric telemetry to real-world behavioral changes in four straightforward steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative flex flex-col p-6 rounded-2xl border border-slate-200/80 dark:border-emerald-950 bg-slate-50/50 dark:bg-forest-900/40"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="h-12 w-12 rounded-xl bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center shadow-sm">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <span className="text-2xl font-black text-slate-300 dark:text-emerald-900/80 font-mono">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

