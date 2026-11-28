import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Sparkles, Users, Activity } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-gradient-to-b from-emerald-50/50 via-background to-background dark:from-forest-950/60 dark:via-background dark:to-background">
      {/* Decorative ambient backdrop */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-400/10 dark:bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 dark:border-emerald-800 bg-white/80 dark:bg-emerald-950/60 px-3.5 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-200 shadow-2xs backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>GenAI-Powered Environmental Health Assistant</span>
            <span className="text-emerald-300 dark:text-emerald-700">•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-normal">India-First Focus</span>
          </div>

          {/* Primary Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.12]">
            Breathe Smarter. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-700 dark:from-emerald-400 dark:via-emerald-300 dark:to-teal-300 bg-clip-text text-transparent">
              Live Healthier.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl font-normal leading-relaxed">
            Your intelligent companion for navigating air pollution, protecting your family, and building a cleaner, more sustainable everyday life.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto pt-2">
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium shadow-card hover:shadow-card-hover transition-all gap-2"
              )}
            >
              <span>Launch Interactive Demo</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#features"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full sm:w-auto border-slate-300 dark:border-emerald-900 font-medium hover:bg-slate-50 dark:hover:bg-emerald-950/40"
              )}
            >
              Explore Architecture & Features
            </Link>
          </div>

          {/* Trust & Environmental Signals */}
          <div className="pt-6 grid grid-cols-3 gap-4 sm:gap-8 border-t border-slate-200/60 dark:border-emerald-950/60 w-full max-w-xl text-xs text-muted-foreground">
            <div className="flex flex-col items-center">
              <ShieldCheck className="h-4 w-4 text-emerald-600 mb-1" aria-hidden="true" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">CPCB Calibrated</span>
              <span>Indian Air Standards</span>
            </div>
            <div className="flex flex-col items-center">
              <Users className="h-4 w-4 text-emerald-600 mb-1" aria-hidden="true" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Family Mode</span>
              <span>Child & Senior Care</span>
            </div>
            <div className="flex flex-col items-center">
              <Activity className="h-4 w-4 text-emerald-600 mb-1" aria-hidden="true" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Actionable Advice</span>
              <span>Low-Emission Routines</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Preview Card */}
        <div className="mt-12 sm:mt-16 max-w-4xl mx-auto rounded-2xl border border-slate-200/90 dark:border-emerald-900/60 bg-white/95 dark:bg-forest-900/90 p-4 sm:p-6 shadow-xl backdrop-blur-sm">
          <div className="relative mb-4 overflow-hidden rounded-xl border border-emerald-200/50 dark:border-emerald-900/50 h-44 sm:h-56">
            <Image
              src="/images/hero-atmosphere.jpg"
              alt="Serene Indian urban skyline transitioning from morning smog mist to clear midday air"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 480px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold tracking-wide uppercase">
                  Planetary Dispersion &amp; Smog Inversion Intelligence
                </span>
              </div>
              <span className="hidden sm:inline-block text-xs font-mono bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                Copernicus CAMS + Open-Meteo
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-emerald-950">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Simulated Environmental Feed — Siliguri Base
              </span>
            </div>
            <DemoDataBadge />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* AQI Overview Box */}
            <div className="rounded-xl border border-amber-200/60 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Live AQI (CPCB Indian Standard)</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-amber-900 dark:text-amber-200">142</span>
                  <Badge variant="warning" className="text-xs font-semibold">Moderate</Badge>
                </div>
              </div>
              <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-2">
                Breathing discomfort to sensitive individuals on prolonged exposure. Primary culprit: PM2.5.
              </p>
            </div>

            {/* Gemini Assistant Recommendation */}
            <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Gemini AI Action Advice</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 line-clamp-3">
                  &ldquo;Winter inversion layer trapping smoke over Mahananda basin. Delay morning jogs until 10:30 AM when solar warming aids dispersion.&rdquo;
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                <span>Confidence: 94%</span>
                <span>Routine: Safe Shift</span>
              </div>
            </div>

            {/* Sustainable Choice Preview */}
            <div className="rounded-xl border border-slate-200/80 dark:border-emerald-900/50 bg-slate-50/60 dark:bg-forest-950/40 p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Sustainable Alternative</span>
                <p className="text-xs text-slate-800 dark:text-slate-100 font-semibold mt-1">
                  Shared E-Rickshaw vs Single Petrol Bike
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Saves 1.8 kg CO₂ and eliminates direct street-level tailpipe exhaust along Sevoke Road.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Impact: -65% Personal Emissions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

