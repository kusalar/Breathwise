import Image from "next/image";
import { IndoorAirAdvice } from "@/types";
import { Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function IndoorAirPanel() {
  const hacks: IndoorAirAdvice[] = [
    {
      id: "ia-1",
      title: "Smart Midday Cross-Ventilation",
      summary: "Ventilate between 12:00 PM and 2:00 PM when winter thermal updrafts dilute ground-level particulates.",
      actionType: "ventilation",
      urgency: "immediate",
      practicalTip: "Crack windows on the wind-sheltered side of the home for 20 minutes maximum.",
    },
    {
      id: "ia-2",
      title: "Dust & PM2.5 Suppression via Damp Mopping",
      summary: "Dry sweeping aerosolizes settled fine dust back into breathing height.",
      actionType: "source_control",
      urgency: "advisory",
      practicalTip: "Use micro-fiber damp mopping twice daily to trap settled PM2.5 particulates.",
    },
    {
      id: "ia-3",
      title: "HEPA Purifier Elevation & Air Circulation",
      summary: "Floor placement blocks air intake. Elevate unit 2 feet above ground for optimal 360° airflow.",
      actionType: "filtration",
      urgency: "moderate",
      practicalTip: "Keep doors closed to create a dedicated clean bedroom sanctuary.",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-emerald-950 bg-white dark:bg-forest-900/60 p-6 shadow-subtle space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-950">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
            <Home className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Indoor Air Quality Optimizer
            </h3>
            <p className="text-xs text-muted-foreground">Practical indoor hacks for urban homes</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-800">
          Actionable Hacks
        </Badge>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-teal-200/60 dark:border-emerald-950 h-36 sm:h-44">
        <Image
          src="/images/indoor-sanctuary.jpg"
          alt="Clean indoor living room with air-purifying plants and HEPA filtration"
          fill
          sizes="(max-width: 768px) 100vw, 480px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/20 to-transparent" />
        <div className="absolute bottom-3 left-4 text-white">
          <p className="text-xs font-bold">Indoor Sanctuary Protocol</p>
          <p className="text-xs text-slate-200">
            Combine midday cross-ventilation with elevated HEPA circulation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {hacks.map((hack) => (
          <div
            key={hack.id}
            className="p-4 rounded-xl border border-slate-100 dark:border-emerald-950 bg-slate-50/60 dark:bg-forest-950/40 flex flex-col justify-between"
          >
            <div>
              <Badge variant="outline" className="text-xs uppercase font-semibold text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-900 mb-2">
                {hack.actionType}
              </Badge>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                {hack.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {hack.summary}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-emerald-950 text-xs text-teal-800 dark:text-teal-300 font-medium">
              💡 {hack.practicalTip}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

