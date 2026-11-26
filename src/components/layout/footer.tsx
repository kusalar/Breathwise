import Link from "next/link";
import { Wind, Heart, Shield, Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-emerald-950/70 bg-slate-50 dark:bg-forest-950 transition-colors">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <Wind className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight">BreatheWise AI</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {siteConfig.tagline} Empowering families and communities with intelligent environmental insights and sustainable alternatives.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-emerald-800 dark:text-emerald-400 font-medium">
              <Shield className="h-3.5 w-3.5" />
              <span>WCAG 2.2 AA Compliant & Secure</span>
            </div>
          </div>

          {/* Solutions */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Solutions
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/dashboard" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Air Quality Intelligence
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Gemini AI Advisor
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Smart Routine Planner
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Indoor Air Quality Optimizer
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Family Protection Mode
                </Link>
              </li>
            </ul>
          </div>

          {/* Standards & Regional */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Standards & Region
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>Central Pollution Control Board (CPCB India)</li>
              <li>National Ambient Air Quality Standards (NAAQS)</li>
              <li>Open-Meteo Planetary Environmental Models</li>
              <li>Targeted for Indian Cities & Severe Smog Basins</li>
              <li>Pan-India Live Atmospheric Telemetry</li>
            </ul>
          </div>

          {/* Project & Integrity */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Platform Integrity
            </h3>
            <div className="p-3 rounded-lg border border-slate-200 dark:border-emerald-950 bg-white/70 dark:bg-emerald-950/20 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>Honest Environmental AI</span>
              </div>
              <p className="text-[11px] leading-normal">
                Atmospheric metrics are derived from verified planetary dispersion models. We never fabricate physical sensor telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-200/80 dark:border-emerald-950/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} BreatheWise AI. Built for environmental health and community resilience.</p>
          <div className="flex items-center gap-1 text-slate-500">
            <span>Designed with</span>
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500" aria-hidden="true" />
            <span className="sr-only">care</span>
            <span>for clean air across India & beyond</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

