import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { getCPCBCategory } from "@/lib/constants/aqi-standards";

export interface TrendPoint {
  label: string;
  aqi: number;
  status: string;
  note: string;
}

interface AqiTrendPanelProps {
  forecastData?: Array<{
    label?: string;
    timeLabel?: string;
    aqi: number;
    status?: string;
    note?: string;
    pm25?: number | null;
    pm10?: number | null;
  }>;
}

export function AqiTrendPanel({ forecastData }: AqiTrendPanelProps) {
  const points: TrendPoint[] =
    forecastData && forecastData.length > 0
      ? forecastData.map((f) => {
          const cat = getCPCBCategory(f.aqi);
          return {
            label: f.label || f.timeLabel || "N/A",
            aqi: f.aqi,
            status: f.status || cat.label,
            note: f.note || (f.pm25 ? `PM2.5: ${f.pm25} µg/m³` : cat.healthImplications),
          };
        })
      : [
          { label: "12:00 AM", aqi: 185, status: "Moderate (Elevated)", note: "Nocturnal boundary layer inversion" },
          { label: "03:00 AM", aqi: 195, status: "Moderate (Elevated)", note: "Overnight thermal stagnation" },
          { label: "06:00 AM", aqi: 178, status: "Moderate (Elevated)", note: "Early morning inversion peak" },
          { label: "09:00 AM", aqi: 162, status: "Moderate", note: "Vehicular morning traffic" },
          { label: "12:00 PM", aqi: 122, status: "Moderate", note: "Solar thermal dispersion window" },
          { label: "03:00 PM", aqi: 108, status: "Moderate (Optimal)", note: "Best air quality window" },
          { label: "06:00 PM", aqi: 155, status: "Moderate", note: "Dusk temperature drop & rush" },
          { label: "09:00 PM", aqi: 176, status: "Moderate (Elevated)", note: "Biomass heating & trapped air" },
        ];

  const maxAqi = Math.max(250, ...points.map((p) => p.aqi + 30));

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-emerald-950 bg-white dark:bg-forest-900/60 p-6 shadow-subtle space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-emerald-950">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Diurnal Air Quality Trend & Inversion Curve
          </h3>
          <p className="text-xs text-muted-foreground">
            Projected cycle showing real-time atmospheric changes and optimal ventilation windows
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
          Hourly Telemetry
        </Badge>
      </div>

      {/* Screen reader text alternative table (WCAG 2.2 AA requirement) */}
      <div className="sr-only">
        <h4>Hourly Air Quality Trend Table</h4>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>AQI Value</th>
              <th>Status</th>
              <th>Guidance</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.label}>
                <td>{p.label}</td>
                <td>{p.aqi}</td>
                <td>{p.status}</td>
                <td>{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual Accessible Bar/Column Trend Representation */}
      <div className="pt-2 overflow-x-auto scrollbar-thin">
        <div
          className="flex items-end gap-1 sm:gap-2 h-44 sm:h-52 px-2 border-b border-slate-200 dark:border-emerald-950 pb-2"
          style={{ minWidth: points.length > 8 ? `${points.length * 36}px` : "100%" }}
        >
          {points.map((p) => {
            const heightPercent = Math.min(100, Math.round((p.aqi / maxAqi) * 100));
            const cat = getCPCBCategory(p.aqi);

            return (
              <div key={p.label} className="flex flex-col items-center flex-1 h-full justify-end group min-w-[24px]">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 opacity-70 group-hover:opacity-100 font-mono">
                  {p.aqi}
                </span>
                <div
                  className="w-full max-w-[38px] rounded-t-md transition-all duration-300 relative group-hover:brightness-110 cursor-pointer"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: cat.colorHex,
                  }}
                  role="img"
                  title={`${p.label}: AQI ${p.aqi} (${p.status}) - ${p.note}`}
                  aria-label={`${p.label}: AQI ${p.aqi}, ${p.status}. ${p.note}`}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div
          className="flex gap-1 sm:gap-2 px-2 pt-2 text-center text-xs font-mono text-muted-foreground"
          style={{ minWidth: points.length > 8 ? `${points.length * 36}px` : "100%" }}
        >
          {points.map((p) => {
            const shortLabel = p.label.replace(":00", "");
            return (
              <div key={p.label} className="flex-1 min-w-[24px] truncate" title={p.label}>
                {shortLabel}
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanatory annotation */}
      <div className="p-3 rounded-xl border border-slate-100 dark:border-emerald-950 bg-slate-50/70 dark:bg-forest-950/40 text-xs text-muted-foreground flex items-center gap-2">
        <Info className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Inversion pattern note:</strong> Peak particulate concentrations typically occur during morning and evening rush hours. Plan outdoor errands between 12:00 PM and 3:30 PM.
        </span>
      </div>
    </div>
  );
}
