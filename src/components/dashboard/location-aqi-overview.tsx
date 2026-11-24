import { AirQualityReading, WeatherReading } from "@/types";
import { getCPCBCategory } from "@/lib/constants/aqi-standards";
import { Badge } from "@/components/ui/badge";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { Wind, Droplets, Thermometer, Compass, Clock, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

interface LocationAqiOverviewProps {
  reading: AirQualityReading;
  weather: WeatherReading;
}

export function LocationAqiOverview({ reading, weather }: LocationAqiOverviewProps) {
  const categoryDetail = getCPCBCategory(reading.aqi);

  // Format observation timestamp
  const dateObj = new Date(reading.timestamp);
  const formattedTime = !isNaN(dateObj.getTime())
    ? new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        day: "numeric",
        month: "short",
      }).format(dateObj)
    : reading.timestamp;

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-emerald-950 bg-white dark:bg-forest-900/60 p-6 shadow-subtle space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-emerald-950">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Primary Environmental Metric
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {reading.location.name}, {reading.location.region}
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            {reading.location.latitude.toFixed(4)}°N, {reading.location.longitude.toFixed(4)}°E
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs border-emerald-300 dark:border-emerald-800">
            CPCB Indicative Scale
          </Badge>
          {reading.isDemoData ? (
            <DemoDataBadge />
          ) : (
            <Badge variant="default" className="bg-emerald-600 text-white gap-1 text-[11px]">
              <CheckCircle2 className="h-3 w-3" />
              <span>Live Model-Based Estimate</span>
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Big AQI Number & Category */}
        <div className="md:col-span-5 flex flex-col items-start p-5 rounded-xl bg-slate-50 dark:bg-forest-950 border border-slate-100 dark:border-emerald-950/80">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Indicative Air Quality Index</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
              <Clock className="h-3 w-3" />
              {formattedTime}
            </span>
          </div>

          <div className="flex items-baseline gap-3 my-2">
            <span
              className="text-6xl font-black tracking-tight"
              style={{ color: categoryDetail.colorHex }}
            >
              {reading.aqi}
            </span>
            <div className="flex flex-col">
              <span
                className="text-lg font-bold"
                style={{ color: categoryDetail.colorHex }}
              >
                {categoryDetail.label}
              </span>
              <span className="text-xs text-muted-foreground">
                Dominant: <strong className="text-slate-900 dark:text-slate-200">{reading.dominantPollutant}</strong>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            {categoryDetail.healthImplications}
          </p>

          {/* Standard Distinction Badges */}
          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-emerald-950/80 w-full flex flex-wrap gap-2 text-[11px]">
            {reading.usAqi !== undefined && (
              <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-forest-900 font-mono text-slate-700 dark:text-slate-300">
                US EPA AQI: <strong>{reading.usAqi}</strong>
              </span>
            )}
            {reading.europeanAqi !== undefined && (
              <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-forest-900 font-mono text-slate-700 dark:text-slate-300">
                European AQI: <strong>{reading.europeanAqi}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Weather Conditions & Atmospheric Inversion factors */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-slate-100 dark:border-emerald-950 bg-slate-50/50 dark:bg-forest-950/40">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Thermometer className="h-4 w-4 text-emerald-600" />
              <span>Temp</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {weather.temperatureC}°C
            </p>
            <span className="text-[10px] text-muted-foreground">
              {weather.apparentTemperatureC !== undefined ? `Feels ${weather.apparentTemperatureC}°C` : "Ambient"}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-100 dark:border-emerald-950 bg-slate-50/50 dark:bg-forest-950/40">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Droplets className="h-4 w-4 text-sky-600" />
              <span>Humidity</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {weather.humidityPercent}%
            </p>
            <span className="text-[10px] text-muted-foreground">Particle retention</span>
          </div>

          <div className="p-3 rounded-xl border border-slate-100 dark:border-emerald-950 bg-slate-50/50 dark:bg-forest-950/40">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wind className="h-4 w-4 text-teal-600" />
              <span>Wind</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {weather.windSpeedKmh} km/h
            </p>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              {weather.windSpeedKmh < 8 ? "Stagnant Layer" : "Moderate Breeze"}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-100 dark:border-emerald-950 bg-slate-50/50 dark:bg-forest-950/40">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Compass className="h-4 w-4 text-emerald-600" />
              <span>Atmosphere</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate" title={weather.conditionText}>
              {weather.conditionText}
            </p>
            <span className="text-[10px] text-muted-foreground font-mono">
              Dir: {weather.windDirectionDegrees}° • UV: {weather.uvIndex}
            </span>
          </div>
        </div>
      </div>

      {/* Attribution & Data Quality Metadata Bar */}
      <div className="pt-3 border-t border-slate-100 dark:border-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Source: {reading.sourceAttribution}</span>
        </div>
        {reading.dataQuality && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Data Quality: {reading.dataQuality.completeness}%
            </span>
            <span className="text-[11px]">({reading.dataQuality.confidenceText})</span>
          </div>
        )}
      </div>
    </div>
  );
}
