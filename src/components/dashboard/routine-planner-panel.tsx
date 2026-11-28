import { RoutineItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export function RoutinePlannerPanel() {
  const routine: RoutineItem[] = [
    {
      id: "r1",
      timeSlot: "06:30 AM – 08:30 AM",
      title: "Morning Routine & Commute",
      recommendation: "Avoid outdoor cardio. Surface inversion layer traps smoke; wear N95 on two-wheeler commute.",
      status: "caution",
      impactScore: "protective",
    },
    {
      id: "r2",
      timeSlot: "11:30 AM – 02:30 PM",
      title: "Ventilation & Errands Window",
      recommendation: "Optimal window for natural home ventilation. Solar heating disperses ground particulates.",
      status: "recommended",
      impactScore: "low_emission",
    },
    {
      id: "r3",
      timeSlot: "05:00 PM – 07:30 PM",
      title: "Evening Commute & School Run",
      recommendation: "Evening rush hour spike. Close vehicle windows; keep children inside indoor play areas.",
      status: "caution",
      impactScore: "protective",
    },
    {
      id: "r4",
      timeSlot: "09:00 PM – 06:00 AM",
      title: "Overnight Sleep Sanctuary",
      recommendation: "Seal bedroom draft points; set HEPA purifier to continuous low whisper mode.",
      status: "recommended",
      impactScore: "protective",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-emerald-950 bg-white dark:bg-forest-900/60 p-6 shadow-subtle space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-950">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Today&apos;s Recommended Routine
          </h3>
          <p className="text-xs text-muted-foreground">
            Synchronized with diurnal smog dispersion cycles
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
          Diurnal Model
        </Badge>
      </div>

      <div className="space-y-3">
        {routine.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-slate-100 dark:border-emerald-950/80 bg-slate-50/70 dark:bg-forest-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-emerald-600" />
                  {item.timeSlot}
                </span>
                <Badge
                  variant={item.status === "recommended" ? "default" : "warning"}
                  className="text-xs py-0"
                >
                  {item.status === "recommended" ? "Optimal Window" : "Precaution Required"}
                </Badge>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {item.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {item.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

