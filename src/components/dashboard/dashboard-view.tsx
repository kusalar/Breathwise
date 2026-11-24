"use client";

import * as React from "react";
import { GeoLocation, AirQualityReading, WeatherReading, GeminiInsight } from "@/types";
import { siteConfig } from "@/config/site";
import { WelcomeBanner } from "./welcome-banner";
import { LocationAqiOverview } from "./location-aqi-overview";
import { PollutantCards } from "./pollutant-cards";
import { GeminiInsightPanel } from "./gemini-insight-panel";
import { RoutinePlannerPanel } from "./routine-planner-panel";
import { IndoorAirPanel } from "./indoor-air-panel";
import { SustainabilityPanel } from "./sustainability-panel";
import { FamilyProtectionPanel } from "./family-protection-panel";
import { AqiTrendPanel } from "./aqi-trend-panel";
import { DashboardLoadingSkeleton, DashboardErrorState } from "./state-handlers";
import { airQualityService } from "@/services/air-quality/air-quality.service";
import { weatherService } from "@/services/weather/weather.service";
import { geminiService } from "@/services/gemini/gemini.service";
import { useLocation } from "@/context/location-context";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardViewProps {
  initialLocation?: GeoLocation;
}

export function DashboardView({
  initialLocation,
}: DashboardViewProps) {
  const { location: contextLocation, setLocation: setContextLocation } = useLocation();
  const [location, setLocation] = React.useState<GeoLocation>(
    initialLocation ?? contextLocation ?? siteConfig.initialLocation
  );
  const [reading, setReading] = React.useState<AirQualityReading | null>(null);
  const [weather, setWeather] = React.useState<WeatherReading | null>(null);
  const [insight, setInsight] = React.useState<GeminiInsight | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Synchronize location context changes (e.g. from header selector or quick pills)
  React.useEffect(() => {
    if (contextLocation) {
      setLocation(contextLocation);
    }
  }, [contextLocation]);

  // Synchronize location prop changes if passed explicitly
  React.useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }, [initialLocation]);

  /**
   * Fetch live environmental readings and AI insights for the active location
   */
  const loadEnvironmentalData = React.useCallback(async (loc: GeoLocation, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [aqiData, weatherData] = await Promise.all([
        airQualityService.getCurrentReading(loc, "CPCB_INDIA", isRefresh),
        weatherService.getCurrentWeather(loc, isRefresh),
      ]);

      setReading(aqiData);
      setWeather(weatherData);
      setLastUpdated(new Date());

      // Generate Gemini insight for this specific environmental snapshot
      const aiInsight = await geminiService.generateAirQualityInsight(
        aqiData,
        loc,
        weatherData,
        isRefresh
      );
      setInsight(aiInsight);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load environmental data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadEnvironmentalData(location);
  }, [location, loadEnvironmentalData]);

  if (loading && !reading) {
    return <DashboardLoadingSkeleton />;
  }

  if (error && !reading) {
    return <DashboardErrorState error={error} onRetry={() => loadEnvironmentalData(location)} />;
  }

  if (!reading || !weather || !insight) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with live refresh trigger */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1">
          <WelcomeBanner
            location={location}
            onLocationChange={(newLoc) => {
              setLocation(newLoc);
              setContextLocation(newLoc);
            }}
          />
        </div>
        <div className="flex flex-col items-end gap-1.5 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadEnvironmentalData(location, true)}
            disabled={refreshing}
            className="gap-1.5 text-xs font-semibold border-slate-300 dark:border-emerald-900 bg-white dark:bg-forest-900"
            title="Fetch latest Open-Meteo telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>{refreshing ? "Syncing Telemetry..." : "Refresh Readings"}</span>
          </Button>
          {lastUpdated && (
            <span className="text-[11px] text-muted-foreground font-mono">
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

      {/* B. Location and Air Quality Overview */}
      <LocationAqiOverview reading={reading} weather={weather} lastUpdated={lastUpdated} />

      {/* C. Pollutant Metric Cards */}
      <PollutantCards pollutants={reading.pollutants} />

      {/* D. Gemini AI Insight */}
      <GeminiInsightPanel insight={insight} />

      {/* I. Air Quality Trend Chart */}
      <AqiTrendPanel forecastData={reading.hourlyForecast} />

      {/* E. Today's Recommended Routine */}
      <RoutinePlannerPanel />

      {/* F. Indoor Air Recommendations */}
      <IndoorAirPanel />

      {/* G. Sustainability Impact Summary & H. Family Protection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SustainabilityPanel />
        <FamilyProtectionPanel />
      </div>
    </div>
  );
}
