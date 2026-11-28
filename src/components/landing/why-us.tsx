import Image from "next/image";
import { Check, ShieldCheck, Heart, Sparkles, Scale, Compass } from "lucide-react";

export function WhyUs() {
  const points = [
    {
      icon: Sparkles,
      title: "Personalized Guidance, Not Generic Warnings",
      description:
        "Generic weather apps simply report 'Poor Air'. BreatheWise AI explains what to do right now — whether to wear an N95 mask, run your purifier, or shift outdoor workouts to the afternoon.",
    },
    {
      icon: Compass,
      title: "Real Environmental Data Standards",
      description:
        "Rooted in Indian CPCB standards and physical dispersion science. No fabricated numbers, no hidden corporate greenwashing, and fully transparent data attribution.",
    },
    {
      icon: Heart,
      title: "Family-Oriented Protection Protocols",
      description:
        "Tailored for real multi-generational Indian households. Special safety thresholds protect asthmatic children, pregnant mothers, and elderly grandparents.",
    },
    {
      icon: Scale,
      title: "Sustainable Everyday Decisions",
      description:
        "Connects personal health to planetary solutions. Shows how choosing an electric rickshaw, avoiding open burning, or adopting energy-efficient practices cleans your community's air.",
    },
    {
      icon: ShieldCheck,
      title: "Transparent Impact Explanations",
      description:
        "Clear metric breakdowns demonstrating how much personal particulate inhalation you avoided and how many kilograms of carbon emissions your sustainable choices eliminated.",
    },
  ];

  return (
    <section id="about" className="py-20 md:py-32 bg-slate-50 dark:bg-forest-900/40 transition-colors">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column Text */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Why BreatheWise AI
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Built for Severe Winter Smog & Urban Realities
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Winter inversions across northern and eastern India trap pollutants at ground level for weeks. Most platforms only display panic-inducing red numbers. BreatheWise AI empowers you with proactive defenses, practical indoor hacks, and measurable sustainable alternatives.
            </p>
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
              <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Zero Commercial Bias</p>
                <p className="text-muted-foreground mt-0.5">
                  We recommend natural low-cost air cleaning methods (wet mopping, smart cross-ventilation) alongside commercial purifier settings.
                </p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-emerald-900/60 shadow-card h-52 sm:h-60">
              <Image
                src="/images/indoor-sanctuary.jpg"
                alt="Sunlit Indian living room with indoor air-purifying plants and HEPA filtration"
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                <span className="text-xs font-semibold">Indoor Clean-Air Sanctuary</span>
                <span className="text-xs font-mono bg-emerald-700/80 px-2 py-0.5 rounded-full">
                  HEPA + Natural Ventilation
                </span>
              </div>
            </div>
          </div>

          {/* Right Column Highlights List */}
          <div className="lg:col-span-7 space-y-4">
            {points.map((point) => {
              const Icon = point.icon;
              return (
                <div
                  key={point.title}
                  className="p-5 rounded-xl border border-slate-200 dark:border-emerald-950 bg-white dark:bg-forest-950 shadow-subtle hover:shadow-card transition-all flex gap-4 items-start"
                >
                  <div className="h-10 w-10 rounded-lg bg-emerald-100/70 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {point.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

