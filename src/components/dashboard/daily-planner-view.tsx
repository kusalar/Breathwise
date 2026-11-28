"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  Sparkles,
  Save,
  Trash2,
  CheckCircle2,
  Info,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GeoLocation, RoutineItem, SavedRoutine, AirQualityReading } from "@/types";
import { LocationSelector } from "@/components/shared/location-selector";
import { siteConfig } from "@/config/site";
import { useLocation } from "@/context/location-context";

export function DailyPlannerView() {
  const { location: contextLocation, setLocation: setContextLocation } = useLocation();
  const [locationOverride, setLocationOverride] = React.useState<{
    forContext: GeoLocation | undefined;
    loc: GeoLocation;
  } | null>(null);
  const location =
    locationOverride && locationOverride.forContext === contextLocation
      ? locationOverride.loc
      : contextLocation ?? siteConfig.initialLocation;
  const [airQuality, setAirQuality] = React.useState<AirQualityReading | null>(null);
  const [loadingAQI, setLoadingAQI] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedRoutines, setSavedRoutines] = React.useState<SavedRoutine[]>([]);
  const [routineTitle, setRoutineTitle] = React.useState("Custom Pollution-Aware Schedule");
  const [currentRoutines, setCurrentRoutines] = React.useState<RoutineItem[]>([
    {
      id: "r1",
      timeSlot: "06:30 - 08:00 AM",
      title: "Morning Smog Inversion Window",
      recommendation: "Avoid outdoor morning runs. Particulates accumulate near the ground. Conduct indoor yoga or treadmill sessions with HEPA filtration active.",
      status: "avoid",
      impactScore: "protective",
    },
    {
      id: "r2",
      timeSlot: "08:30 - 09:30 AM",
      title: "Peak Commute Protection",
      recommendation: "Travel via shared electric mobility or keep car AC on internal recirculation. Ensure children and elderly wear fitted N95 masks.",
      status: "caution",
      impactScore: "low_emission",
    },
    {
      id: "r3",
      timeSlot: "01:00 - 03:00 PM",
      title: "Optimal Solar Dispersion Window",
      recommendation: "Safest atmospheric time for essential outdoor chores and brief natural home ventilation as thermal mixing disperses low-level smog.",
      status: "recommended",
      impactScore: "protective",
    },
    {
      id: "r4",
      timeSlot: "06:00 - 08:30 PM",
      title: "Evening Rush & Stagnant Inversion",
      recommendation: "Close street-facing windows. Run air purifiers on medium-high. Prepare meals with kitchen exhaust fans running.",
      status: "caution",
      impactScore: "neutral",
    },
  ]);

  // Load live environmental telemetry
  const loadAQI = React.useCallback(async (loc: GeoLocation): Promise<AirQualityReading | null> => {
    try {
      const res = await fetch(
        `/api/air-quality?lat=${loc.latitude}&lon=${loc.longitude}&city=${encodeURIComponent(loc.name)}`
      );
      if (res.ok) {
        return (await res.json()) as AirQualityReading;
      }
    } catch {
      // Keep existing data
    }
    return null;
  }, []);

  // Fetch saved routines from API
  const loadSavedRoutines = React.useCallback(async () => {
    try {
      const res = await fetch("/api/routines");
      if (res.ok) {
        const data = await res.json();
        setSavedRoutines(data.routines || []);
      }
    } catch {
      // Fallback
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    loadAQI(location)
      .then((aqiData) => {
        if (!cancelled && aqiData) {
          setAirQuality(aqiData);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAQI(false);
        }
      });

    fetch("/api/routines")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setSavedRoutines(data.routines || []);
        }
      })
      .catch(() => {
        // Fallback
      });

    return () => {
      cancelled = true;
    };
  }, [location, loadAQI]);

  // Generate Routine with AI
  const handleGenerateAI = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          aqi: airQuality?.aqi || 165,
          userSchedule: {
            morningCommute: "08:30",
            eveningCommute: "18:00",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.routines && data.routines.length > 0) {
          setCurrentRoutines(data.routines);
          setRoutineTitle(`AI Optimized Schedule for ${location.name} (AQI ${airQuality?.aqi || 165})`);
        }
      }
    } catch {
      // Keep current
    } finally {
      setGenerating(false);
    }
  };

  // Save current routine to database
  const handleSaveRoutine = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: routineTitle,
          targetDate: new Date().toISOString().split("T")[0],
          routinePayload: currentRoutines,
        }),
      });

      if (res.ok) {
        await loadSavedRoutines();
      }
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  // Delete saved routine
  const handleDeleteRoutine = async (id: string) => {
    try {
      const res = await fetch(`/api/routines?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSavedRoutines((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      // Error
    }
  };

  // Update routine item in place
  const handleUpdateItem = (index: number, field: keyof RoutineItem, value: string) => {
    setCurrentRoutines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Add new custom item
  const handleAddItem = () => {
    const newItem: RoutineItem = {
      id: `custom-${Date.now()}`,
      timeSlot: "12:00 - 01:00 PM",
      title: "Custom Activity",
      recommendation: "Plan indoor low-exertion activity.",
      status: "recommended",
      impactScore: "protective",
    };
    setCurrentRoutines((prev) => [...prev, newItem]);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setCurrentRoutines((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-forest-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Pollution-Aware Daily Routine Planner
            </h1>
            <Badge variant="outline" className="text-xs border-emerald-600/30 text-emerald-800 dark:text-emerald-300">
              Diurnal Curve Aware
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Reorganize your day around peak smog inversions and clean air windows to minimize particulate inhalation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <LocationSelector
            currentLocation={location}
            onLocationChange={(loc: GeoLocation) => {
              setLoadingAQI(true);
              setLocationOverride({ forContext: contextLocation, loc });
              setContextLocation(loc);
            }}
          />
        </div>
      </div>

      {/* Environmental Context Banner */}
      <Card className="border-emerald-600/20 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-400">
                Current Atmospheric Context ({location.name})
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Indicative AQI: {loadingAQI ? "..." : airQuality?.aqi ?? 165}</span>
                <Badge className="capitalize text-xs font-medium">
                  {airQuality?.category || "Moderate"}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Dominant Pollutant: {airQuality?.dominantPollutant || "PM2.5"} | Best dispersion period: 12:30 PM – 3:30 PM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              onClick={handleGenerateAI}
              disabled={generating}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm flex-1 md:flex-none"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Smart Routine...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regenerate with AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Routine Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Schedule Workspace */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={routineTitle}
              onChange={(e) => setRoutineTitle(e.target.value)}
              className="text-lg font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-forest-700 focus:outline-none focus:border-emerald-600 text-slate-900 dark:text-white w-full max-w-md py-1"
              aria-label="Routine Title"
            />
            <Button
              onClick={handleSaveRoutine}
              disabled={saving}
              variant="outline"
              size="sm"
              className="border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? "Saving..." : "Save to My Routines"}
            </Button>
          </div>

          <div className="space-y-3">
            {currentRoutines.map((item, idx) => (
              <Card
                key={item.id}
                className={`border transition-all ${
                  item.status === "avoid"
                    ? "border-red-200 dark:border-red-950 bg-red-50/30 dark:bg-red-950/10"
                    : item.status === "caution"
                    ? "border-amber-200 dark:border-amber-950 bg-amber-50/30 dark:bg-amber-950/10"
                    : "border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/10"
                }`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        value={item.timeSlot}
                        onChange={(e) => handleUpdateItem(idx, "timeSlot", e.target.value)}
                        className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded px-1"
                        aria-label="Time Slot"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleUpdateItem(idx, "status", e.target.value as RoutineItem["status"])
                        }
                        className="text-xs font-medium rounded border border-slate-200 dark:border-forest-700 bg-white dark:bg-forest-900 px-2 py-0.5 text-slate-800 dark:text-slate-200"
                        aria-label="Status category"
                      >
                        <option value="recommended">Safe Window</option>
                        <option value="caution">Caution Required</option>
                        <option value="avoid">Peak Hazard / Avoid</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove time block"
                        aria-label="Remove time block"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleUpdateItem(idx, "title", e.target.value)}
                    className="font-semibold text-slate-900 dark:text-white bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded w-full text-sm"
                    aria-label="Block Title"
                  />

                  <textarea
                    rows={2}
                    value={item.recommendation}
                    onChange={(e) => handleUpdateItem(idx, "recommendation", e.target.value)}
                    className="w-full text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-forest-900/60 rounded p-2 border border-slate-200/60 dark:border-forest-800/60 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    aria-label="Specific Recommendation"
                  />
                </CardContent>
              </Card>
            ))}

            <Button
              onClick={handleAddItem}
              variant="outline"
              size="sm"
              className="w-full border-dashed border-slate-300 dark:border-forest-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-forest-900"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Another Schedule Block
            </Button>
          </div>
        </div>

        {/* Sidebar: Saved Routines & Protective Rules */}
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-forest-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                My Saved Routines
              </CardTitle>
              <CardDescription className="text-xs">
                Stored in PostgreSQL with user-isolated RLS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {savedRoutines.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No saved routines yet. Click &ldquo;Save to My Routines&rdquo; to persist your schedule.
                </div>
              ) : (
                savedRoutines.map((routine) => (
                  <div
                    key={routine.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-forest-800 bg-slate-50/50 dark:bg-forest-900/40 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {routine.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Target Date: {routine.targetDate} | {routine.routinePayload.length} blocks
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeleteRoutine(routine.id)}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                      title="Delete routine"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Diurnal Smog Science Advisory */}
          <Alert className="border-amber-200 dark:border-amber-950 bg-amber-50/50 dark:bg-amber-950/20">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
              <strong>Diurnal Smog Dynamics vs Live Telemetry:</strong> In North Indian plains and Sub-Himalayan valleys (like Siliguri and Indo-Gangetic basin), radiation cooling creates nighttime boundary layer trapping, with particulate accumulation typically highest between <strong>06:00 AM – 08:30 AM</strong> and <strong>07:30 PM – 10:00 PM</strong>. <em>Important:</em> These time blocks serve as general atmospheric heuristics. BreatheWise AI prioritizes live hourly forecasts, wind speeds, and local sensor readings; never proceed with outdoor exercise if live midday telemetry reports severe or hazardous pollution.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
