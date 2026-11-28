import { SustainableChoice } from "@/types";
import { Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SustainabilityPanel() {
  const choices: SustainableChoice[] = [
    {
      id: "sc-1",
      category: "commute",
      title: "Clean Transit Option",
      traditionalWay: "Solo petrol scooter / taxi",
      ecoAlternative: "Electric Auto-rickshaw (E-rickshaw) or Metro",
      emissionReductionPercent: 72,
      healthBenefit: "Eliminates direct exhaust exposure in bumper-to-bumper traffic.",
    },
    {
      id: "sc-2",
      category: "waste",
      title: "Garden & Household Waste",
      traditionalWay: "Open leaf / dry waste burning",
      ecoAlternative: "Community mulching & compost pit",
      emissionReductionPercent: 95,
      healthBenefit: "Prevents toxic dioxin and localized PM2.5 release in neighborhood.",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-emerald-950 bg-white dark:bg-forest-900/60 p-6 shadow-subtle space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-950">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <Leaf className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sustainability & Direct Impact Summary
            </h3>
            <p className="text-xs text-muted-foreground">Personal emissions prevented this week</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
          Verified Accounting
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metric stats card */}
        <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
            Estimated Weekly Impact
          </span>
          <div className="grid grid-cols-2 gap-4 my-3">
            <div>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                12.4 kg
              </span>
              <p className="text-xs text-muted-foreground">CO₂ emissions avoided</p>
            </div>
            <div>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                -48%
              </span>
              <p className="text-xs text-muted-foreground">PM2.5 inhalation avoided</p>
            </div>
          </div>
          <span className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">
            Calculated based on 4 low-emission commute shifts in Siliguri.
          </span>
        </div>

        {/* Suggestion list */}
        <div className="space-y-2">
          {choices.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-xl border border-slate-100 dark:border-emerald-950 bg-slate-50/70 dark:bg-forest-950/40 text-xs space-y-1"
            >
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                <span>{c.title}</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  -{c.emissionReductionPercent}% Emissions
                </span>
              </div>
              <p className="text-muted-foreground">
                Shift from <span className="line-through">{c.traditionalWay}</span> to{" "}
                <strong className="text-emerald-700 dark:text-emerald-300">{c.ecoAlternative}</strong>.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

