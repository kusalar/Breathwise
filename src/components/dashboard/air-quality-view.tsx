"use client";

import * as React from "react";
import { RefreshCw, Wind, MapPin } from "lucide-react";
import { GeoLocation, AirQualityReading, WeatherReading } from "@/types";
import { siteConfig } from "@/config/site";
import { useLocation } from "@/context/location-context";
import { airQualityService } from "@/services/air-quality/air-quality.service";
import { weatherService } from "@/services/weather/weather.service";
import { getCPCBCategory } from "@/lib/constants/aqi-standards";
import { LocationAqiOverview } from "./location-aqi-overview";
import { PollutantCards } from "./pollutant-cards";
import { AqiTrendPanel } from "./aqi-trend-panel";
import { DashboardLoadingSkeleton, DashboardErrorState } from "./state-handlers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Full-featured Air Quality Analytics view with live pollutant telemetry,
 * 24-hour diurnal curve, and multi-city regional comparison.
 */
export function AirQualityView() {
  const { location: contextLocation, setLocation: setContextLocation } = useLocation();
  const [locationOverride, setLocationOverride] = React.useState<{
    forContext: GeoLocation | undefined;
    loc: GeoLocation;
  } | null>(null);
  const [reading, setReading] = React.useState<AirQualityReading | null>(null);
  const [weather, setWeather] = React.useState<WeatherReading | null>(null);
  const [cityComparison, setCityComparison] = React.useState<AirQualityReading[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const location =
    locationOverride && locationOverride.forContext === contextLocation
      ? locationOverride.loc
      : contextLocation ?? siteConfig.initialLocation;

  const fetchAnalyticsSnapshot = React.useCallback(async (loc: GeoLocation, forceRefresh = false) => {
    const [aqiData, weatherData, comparisonData] = await Promise.all([
      airQualityService.getCurrentReading(loc, "CPCB_INDIA", forceRefresh),
      weatherService.getCurrentWeather(loc, forceRefresh),
      Promise.all(
        siteConfig.supportedLocations
          .slice(0, 6)
          .map((city) => airQualityService.getCurrentReading(city, "CPCB_INDIA", forceRefresh))
      ),
    ]);
    return { aqiData, weatherData, comparisonData };
  }, []);

  const loadAnalytics = React.useCallback(
    async (loc: GeoLocation, forceRefresh = false) => {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const { aqiData, weatherData, comparisonData } = await fetchAnalyticsSnapshot(
          loc,
          forceRefresh
        );
        setReading(aqiData);
        setWeather(weatherData);
        setCityComparison(comparisonData);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load air quality analytics");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchAnalyticsSnapshot]
  );

  React.useEffect(() => {
    let cancelled = false;
    fetchAnalyticsSnapshot(location, false)
      .then(({ aqiData, weatherData, comparisonData }) => {
        if (cancelled) return;
        setReading(aqiData);
        setWeather(weatherData);
        setCityComparison(comparisonData);
        setLastUpdated(new Date());
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load air quality analytics");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location, fetchAnalyticsSnapshot]);

  if (loading && !reading) {
    return <DashboardLoadingSkeleton />;
  }

  if (error && !reading) {
    return <DashboardErrorState error={error} onRetry={() => loadAnalytics(location)} />;
  }

  if (!reading || !weather) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-emerald-950 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Comprehensive Air Quality Analytics
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            CPCB-calibrated particulate breakdown, 24-hour diurnal curve, and regional city comparison.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(location, true)}
            disabled={refreshing}
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>{refreshing ? "Syncing Telemetry..." : "Refresh Analytics"}</span>
          </Button>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground font-mono" aria-live="polite">
              Last updated:{" "}
              {new Intl.DateTimeFormat("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              }).format(lastUpdated)}
            </span>
          )}
        </div>
      </div>

      <LocationAqiOverview reading={reading} weather={weather} lastUpdated={lastUpdated} />
      <PollutantCards pollutants={reading.pollutants} />
      <AqiTrendPanel forecastData={reading.hourlyForecast} />

      {/* Multi-City Regional Comparison */}
      <section
        aria-labelledby="regional-comparison-heading"
        className="rounded-2xl border border-slate-200/90 dark:border-emerald-950 bg-white dark:bg-forest-900/60 p-6 shadow-subtle space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-950 pb-3">
          <div>
            <h2 id="regional-comparison-heading" className="text-base font-bold text-slate-900 dark:text-white">
              Regional Indian City Telemetry Comparison
            </h2>
            <p className="text-xs text-muted-foreground">
              Select any city below to switch your active monitoring feed
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            CPCB Indicative
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cityComparison.map((cityReading) => {
            const cat = getCPCBCategory(cityReading.aqi);
            const isActive = cityReading.location.name === location.name;
            return (
              <button
                key={cityReading.location.name}
                type="button"
                onClick={() => {
                  setLocationOverride({
                    forContext: contextLocation,
                    loc: cityReading.location,
                  });
                  setContextLocation(cityReading.location);
                }}
                className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                  isActive
                    ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-emerald-950 bg-slate-50/50 dark:bg-forest-950/40 hover:border-emerald-400"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    <span>{cityReading.location.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PM2.5: {cityReading.pollutants.pm25 ?? "N/A"} µg/m³ • {cat.label}
                  </p>
                </div>
                <span
                  className="text-xl font-black font-mono"
                  style={{ color: cat.colorHex }}
                >
                  {cityReading.aqi}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
