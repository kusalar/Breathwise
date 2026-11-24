import { GeoLocation } from "@/types";
import { Sparkles, Calendar, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

interface WelcomeBannerProps {
  location: GeoLocation;
  onLocationChange?: (location: GeoLocation) => void;
}

export function WelcomeBanner({ location, onLocationChange }: WelcomeBannerProps) {
  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-emerald-950 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50 dark:from-forest-950 dark:via-forest-900/60 dark:to-forest-950 p-6 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
            Welcome Back
          </span>
          <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Live Atmosphere</span>
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Good Morning. Air Quality for {location.name}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          <span>{todayFormatted}</span>
          <span>•</span>
          <span>Baseline: {location.name === "Siliguri" ? "Mahananda Basin" : location.region} Topography</span>
        </p>

        {/* Quick City Switch Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground font-semibold mr-1">Switch City:</span>
          {siteConfig.supportedLocations.map((loc) => {
            const isSelected = loc.name === location.name;
            return (
              <button
                key={loc.name}
                type="button"
                onClick={() => onLocationChange?.(loc)}
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-emerald-700 text-white font-semibold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-forest-900 dark:hover:bg-forest-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-emerald-950"
                }`}
              >
                {loc.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900 bg-white/80 dark:bg-forest-900/80 px-4 py-2.5 text-right shadow-2xs">
          <span className="text-[11px] text-muted-foreground block">Active Guidance Profile</span>
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
            Family Protection Mode (Active)
          </span>
        </div>
      </div>
    </div>
  );
}

