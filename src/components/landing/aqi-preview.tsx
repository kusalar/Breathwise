import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { CPCB_CATEGORIES } from "@/lib/constants/aqi-standards";

export function AirQualityPreview() {
  const pollutants = [
    { name: "PM 2.5", value: "58.2", unit: "µg/m³", standardLimit: "30 µg/m³", status: "Elevated", statusVariant: "warning" as const },
    { name: "PM 10", value: "112.6", unit: "µg/m³", standardLimit: "60 µg/m³", status: "Moderate", statusVariant: "warning" as const },
    { name: "Nitrogen Dioxide (NO₂)", value: "34.5", unit: "µg/m³", standardLimit: "40 µg/m³", status: "Acceptable", statusVariant: "default" as const },
    { name: "Sulphur Dioxide (SO₂)", value: "12.8", unit: "µg/m³", standardLimit: "50 µg/m³", status: "Good", statusVariant: "default" as const },
    { name: "Carbon Monoxide (CO)", value: "1.4", unit: "mg/m³", standardLimit: "2.0 mg/m³", status: "Good", statusVariant: "default" as const },
    { name: "Ozone (O₃)", value: "42.1", unit: "µg/m³", standardLimit: "100 µg/m³", status: "Good", statusVariant: "default" as const },
  ];

  return (
    <section className="py-16 md:py-24 bg-white dark:bg-forest-950 transition-colors border-y border-slate-200/70 dark:border-emerald-950/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-600/40 text-emerald-800 dark:text-emerald-300">
              Environmental Intelligence
            </Badge>
            <DemoDataBadge />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Understand Every Breath You Take
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
            Hyper-localized air quality telemetry with transparent Indian CPCB thresholds, multi-pollutant breakdowns, and actionable health guidance.
          </p>
        </div>

        {/* Air Quality Dashboard Preview Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-emerald-900/60 bg-slate-50/50 dark:bg-forest-900/70 p-6 sm:p-8 shadow-card">
          {/* Top header bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-emerald-950">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Siliguri Municipal Area, West Bengal
                </h3>
                <span className="text-xs text-muted-foreground font-mono">26.72°N, 88.39°E</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calculated according to Indian National Ambient Air Quality Standards (CPCB)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Updated 12 mins ago (Simulated)
              </span>
              <DemoDataBadge />
            </div>
          </div>

          {/* Main Air Quality Gauge & Status Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
            <div className="lg:col-span-1 rounded-xl bg-white dark:bg-forest-950 p-6 border border-slate-200 dark:border-emerald-950 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Air Quality Index (AQI)
                </span>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-5xl font-black text-amber-600 dark:text-amber-400">
                    142
                  </span>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Moderate
                    </span>
                    <span className="text-xs text-muted-foreground">CPCB Category</span>
                  </div>
                </div>
              </div>

              {/* Visual 6-level CPCB Bar */}
              <div className="my-4 space-y-1.5">
                <div className="h-2.5 w-full bg-slate-100 dark:bg-forest-900 rounded-full flex overflow-hidden">
                  <div className="w-[10%] bg-emerald-500" title="Good (0-50)" />
                  <div className="w-[10%] bg-lime-500" title="Satisfactory (51-100)" />
                  <div className="w-[20%] bg-amber-500 ring-2 ring-slate-900/10" title="Moderate (101-200)" />
                  <div className="w-[20%] bg-orange-500 opacity-40" title="Poor (201-300)" />
                  <div className="w-[20%] bg-red-500 opacity-40" title="Very Poor (301-400)" />
                  <div className="w-[20%] bg-rose-900 opacity-40" title="Severe (401-500)" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>0 Good</span>
                  <span>100</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">142</span>
                  <span>300</span>
                  <span>500 Severe</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Sensitive Group Alert</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Breathing discomfort possible for individuals with asthma or cardiovascular conditions. Avoid high-intensity outdoor running.
                </p>
              </div>
            </div>

            {/* Pollutant Matrix */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pollutants.map((item) => (
                <div
                  key={item.name}
                  className="rounded-xl bg-white dark:bg-forest-950 p-4 border border-slate-200 dark:border-emerald-950 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {item.name}
                    </span>
                    <Badge variant={item.statusVariant} className="text-xs px-1.5 py-0">
                      {item.status}
                    </Badge>
                  </div>
                  <div className="my-2">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {item.value}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Standard limit: {item.standardLimit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CPCB Standard Scale Reference Table */}
          <div className="pt-6 border-t border-slate-200 dark:border-emerald-950">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              National Air Quality Index (NAQI) Standard Reference
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              {Object.values(CPCB_CATEGORIES).map((cat) => (
                <div
                  key={cat.category}
                  className="p-2.5 rounded-lg border border-slate-200/80 dark:border-emerald-950 bg-white dark:bg-forest-950 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.colorHex }}
                      aria-hidden="true"
                    />
                    <span className="text-slate-900 dark:text-slate-100">{cat.label}</span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {cat.min} – {cat.max}
                  </span>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {cat.healthImplications}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

