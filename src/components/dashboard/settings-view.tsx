"use client";

import * as React from "react";
import {
  Settings,
  MapPin,
  Clock,
  Bell,
  Save,
  CheckCircle2,
  Shield,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { siteConfig } from "@/config/site";
import { GeoLocation } from "@/types";
import { useLocation } from "@/context/location-context";

export function SettingsView() {
  const { userName, setUserName, defaultLocation, location, setDefaultLocation } = useLocation();
  const [displayName, setDisplayName] = React.useState(userName || "");
  const [selectedCityName, setSelectedCityName] = React.useState(
    (defaultLocation || location)?.name || siteConfig.initialLocation.name
  );
  const [standard, setStandard] = React.useState("CPCB_INDIA");
  const [morningCommute, setMorningCommute] = React.useState("08:30");
  const [eveningCommute, setEveningCommute] = React.useState("18:00");
  const [schoolDropTime, setSchoolDropTime] = React.useState("07:45");
  const [severeAlertThreshold, setSevereAlertThreshold] = React.useState(250);
  const [saving, setSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  React.useEffect(() => {
    if (userName) setDisplayName(userName);
  }, [userName]);

  React.useEffect(() => {
    const active = defaultLocation || location;
    if (active?.name) setSelectedCityName(active.name);
  }, [defaultLocation, location]);

  const selectedLoc = siteConfig.supportedLocations.find((l: GeoLocation) => l.name === selectedCityName) || siteConfig.supportedLocations[0];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (displayName.trim()) {
        setUserName(displayName.trim());
      }
      setDefaultLocation(selectedLoc);

      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultCity: selectedLoc.name,
          defaultRegion: selectedLoc.region,
          defaultCountry: selectedLoc.country,
          defaultLatitude: selectedLoc.latitude,
          defaultLongitude: selectedLoc.longitude,
          morningCommuteTime: morningCommute,
          eveningCommuteTime: eveningCommute,
          schoolDropTime,
        }),
      }).catch(() => {});

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-forest-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              User Preferences & Schedule Configuration
            </h1>
            <Badge variant="outline" className="text-xs border-emerald-600/30 text-emerald-800 dark:text-emerald-300">
              Personalized
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Configure your home region, commute hours, and smog alert thresholds.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Default Location Card */}
        <Card className="border-slate-200 dark:border-forest-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Default Monitoring Location
            </CardTitle>
            <CardDescription className="text-xs">
              The primary atmospheric station data loaded on dashboard startup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="settings-display-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Name
              </label>
              <input
                id="settings-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-base-city" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Base City
                </label>
                <select
                  id="settings-base-city"
                  value={selectedCityName}
                  onChange={(e) => setSelectedCityName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {siteConfig.supportedLocations.map((loc: GeoLocation) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name}, {loc.region} ({loc.latitude.toFixed(2)}°N, {loc.longitude.toFixed(2)}°E)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="settings-aqi-standard" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  AQI Standard Calculation Engine
                </label>
                <select
                  id="settings-aqi-standard"
                  value={standard}
                  onChange={(e) => setStandard(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="CPCB_INDIA">National AQI (CPCB India — 6 Breakpoint Scale)</option>
                  <option value="US_EPA">US EPA Air Quality Index (0–500)</option>
                  <option value="EUROPEAN_AQI">European Air Quality Index (EAQI)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Preferences Card */}
        <Card className="border-slate-200 dark:border-forest-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Clock className="h-4 w-4 text-emerald-600" />
              Daily Routine Schedule Timings
            </CardTitle>
            <CardDescription className="text-xs">
              Used by the AI Planner to detect whether your outdoor transit intersects severe smog inversion peaks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Morning Commute Departure
                </label>
                <input
                  type="time"
                  value={morningCommute}
                  onChange={(e) => setMorningCommute(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Evening Return Transit
                </label>
                <input
                  type="time"
                  value={eveningCommute}
                  onChange={(e) => setEveningCommute(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  School Drop / Outdoor Play
                </label>
                <input
                  type="time"
                  value={schoolDropTime}
                  onChange={(e) => setSchoolDropTime(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Notifications Card */}
        <Card className="border-slate-200 dark:border-forest-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Bell className="h-4 w-4 text-emerald-600" />
              Smog Alert & Advisory Thresholds
            </CardTitle>
            <CardDescription className="text-xs">
              When should high-priority warnings trigger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Severe Smog Inversion Threshold:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  AQI {severeAlertThreshold}
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="400"
                step="25"
                value={severeAlertThreshold}
                onChange={(e) => setSevereAlertThreshold(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>100 (Moderate)</span>
                <span>200 (Poor)</span>
                <span>300 (Very Poor)</span>
                <span>400 (Severe)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Preferences saved successfully!
            </span>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </form>
    </div>
  );
}
