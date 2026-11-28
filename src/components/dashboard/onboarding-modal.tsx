"use client";

import * as React from "react";
import { useLocation } from "@/context/location-context";
import { siteConfig } from "@/config/site";
import { GeoLocation } from "@/types";
import { User, MapPin, Check, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEscapeKey, useFocusTrap } from "@/hooks/use-dismissable";

export function OnboardingModal() {
  const {
    isOnboardingOpen,
    setIsOnboardingOpen,
    userName,
    setUserName,
    location,
    setDefaultLocation,
  } = useLocation();

  const [draftName, setDraftName] = React.useState<string | null>(null);
  const [cityOverride, setCityOverride] = React.useState<{
    forLocation: GeoLocation;
    city: GeoLocation;
  } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  const inputName = draftName ?? (userName || "");
  const selectedCity =
    cityOverride && cityOverride.forLocation === location
      ? cityOverride.city
      : location;

  useEscapeKey(isOnboardingOpen, () => setIsOnboardingOpen(false));
  useFocusTrap(dialogRef, isOnboardingOpen);

  if (!isOnboardingOpen) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      // 1. Update context & localStorage via location-context
      setUserName(trimmed);
      setDefaultLocation(selectedCity);

      // 2. Persist to server preferences if session active
      fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultCity: selectedCity.name,
          defaultRegion: selectedCity.region,
          defaultCountry: selectedCity.country,
          defaultLatitude: selectedCity.latitude,
          defaultLongitude: selectedCity.longitude,
        }),
      }).catch(() => {});

      // Mark onboarding as completed
      if (typeof window !== "undefined") {
        localStorage.setItem("breathewise_onboarding_completed", "true");
      }

      setIsOnboardingOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const topCities = siteConfig.supportedLocations.slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div ref={dialogRef} className="w-full max-w-lg bg-white dark:bg-forest-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-emerald-950 p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 mb-1 shadow-xs">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2
            id="onboarding-modal-title"
            className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Welcome to BreatheWise AI
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Please set your name and preferred default location to personalize your live atmospheric telemetry and health advisories.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Step 1: User Name */}
          <div className="space-y-2">
            <label
              htmlFor="onboarding-user-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              1. What should we call you?
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                id="onboarding-user-name"
                type="text"
                required
                value={inputName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Enter your name (e.g. Kusal)"
                className="w-full rounded-xl border border-slate-200 dark:border-emerald-950 bg-slate-50 dark:bg-forest-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
          </div>

          {/* Step 2: Preferred Default Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="onboarding-city-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                2. Choose Your Default Monitoring City
              </label>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {selectedCity.name}
              </span>
            </div>

            {/* Quick-Pick Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {topCities.map((city) => {
                const isSelected = city.name === selectedCity.name;
                return (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => setCityOverride({ forLocation: location, city })}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                        : "bg-slate-50 dark:bg-forest-950/60 border-slate-200 dark:border-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-forest-800"
                    }`}
                  >
                    <span>{city.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>

            {/* Dropdown for full list */}
            <div className="pt-1">
              <select
                id="onboarding-city-select"
                value={selectedCity.name}
                onChange={(e) => {
                  const found = siteConfig.supportedLocations.find((l) => l.name === e.target.value);
                  if (found) setCityOverride({ forLocation: location, city: found });
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-emerald-950 bg-slate-50 dark:bg-forest-950/60 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              >
                {siteConfig.supportedLocations.map((loc) => (
                  <option key={loc.name} value={loc.name}>
                    {loc.name}, {loc.region} ({loc.country})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Trust disclosure */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Real-time Copernicus CAMS & Open-Meteo planetary dispersion telemetry will be loaded for your city.</span>
          </div>

          {/* Action button */}
          <Button
            type="submit"
            disabled={saving || !inputName.trim()}
            className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-sm gap-2 text-sm"
          >
            <span>{saving ? "Personalizing Dashboard..." : "Save Preferences & Continue"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
