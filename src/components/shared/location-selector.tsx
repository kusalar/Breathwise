"use client";

import * as React from "react";
import { MapPin, ChevronDown, Check, Compass, AlertCircle, Loader2 } from "lucide-react";
import { siteConfig } from "@/config/site";
import { GeoLocation } from "@/types";
import { cn } from "@/lib/utils";

interface LocationSelectorProps {
  currentLocation?: GeoLocation;
  onLocationChange?: (location: GeoLocation) => void;
  className?: string;
}

export function LocationSelector({
  currentLocation = siteConfig.initialLocation,
  onLocationChange,
  className = "",
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<GeoLocation>(currentLocation);
  const [isLocating, setIsLocating] = React.useState(false);
  const [gpsError, setGpsError] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Keep internal state synced with prop
  React.useEffect(() => {
    setSelected(currentLocation);
  }, [currentLocation]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (loc: GeoLocation) => {
    setSelected(loc);
    setGpsError(null);
    setIsOpen(false);
    if (onLocationChange) {
      onLocationChange(loc);
    }
  };

  /**
   * Browser Geolocation with explicit consent and safe privacy rounding
   */
  const handleRequestGeolocation = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        // Round to 4 decimal places (~11 meters) for privacy and effective API caching
        const lat = Math.round(position.coords.latitude * 10000) / 10000;
        const lon = Math.round(position.coords.longitude * 10000) / 10000;

        const detectedLocation: GeoLocation = {
          name: "Local Position",
          region: "Detected GPS Coordinates",
          country: "India",
          latitude: lat,
          longitude: lon,
          isDemo: false,
        };

        setSelected(detectedLocation);
        setIsOpen(false);
        if (onLocationChange) {
          onLocationChange(detectedLocation);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError("Location permission denied. Please select your city manually.");
        } else if (error.code === error.TIMEOUT) {
          setGpsError("Location request timed out. Please select from the list.");
        } else {
          setGpsError("Unable to retrieve coordinates. Please select manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current location is ${selected.name}, ${selected.region}. Click to select a different city.`}
        className="flex items-center gap-2 rounded-lg border border-slate-200/90 dark:border-emerald-950/70 bg-white dark:bg-emerald-950/40 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 shadow-2xs hover:bg-slate-50 dark:hover:bg-emerald-900/30 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
      >
        <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
        <span className="truncate max-w-[140px] sm:max-w-[200px]">
          {selected.name}, {selected.country === "India" ? selected.region : selected.country}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Select City or Region"
          className="absolute left-0 mt-2 w-80 origin-top-left rounded-xl border border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-forest-900 p-2.5 shadow-xl ring-1 ring-black/5 focus:outline-none z-50 animate-in fade-in-50 zoom-in-95"
        >
          {/* Explicit Geolocation Consent Trigger Button */}
          <div className="pb-2 border-b border-slate-100 dark:border-emerald-950">
            <button
              type="button"
              onClick={handleRequestGeolocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/70 py-2 px-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
            >
              {isLocating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                  <span>Requesting GPS permission...</span>
                </>
              ) : (
                <>
                  <Compass className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>Use Current Device Location (GPS)</span>
                </>
              )}
            </button>
            {gpsError && (
              <div className="mt-1.5 p-2 rounded-md bg-amber-50 dark:bg-amber-950/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Indian & Global Cities
          </div>

          <div className="py-1 max-h-60 overflow-y-auto space-y-0.5">
            {siteConfig.supportedLocations.map((loc) => {
              const isCurrent = selected.name === loc.name;
              return (
                <button
                  key={`${loc.name}-${loc.country}`}
                  role="option"
                  aria-selected={isCurrent}
                  onClick={() => handleSelect(loc)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition-colors",
                    isCurrent
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-medium"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-900/30"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {loc.name}
                      {loc.name === "Siliguri" && (
                        <span className="ml-1.5 text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                          (Baseline)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {loc.region ? `${loc.region}, ` : ""}
                      {loc.country}
                    </span>
                  </div>
                  {isCurrent && <Check className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-emerald-950 px-2 py-1 text-[11px] text-muted-foreground">
            Coordinates are rounded to 4 decimals to protect personal privacy.
          </div>
        </div>
      )}
    </div>
  );
}
