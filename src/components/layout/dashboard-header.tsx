"use client";

import * as React from "react";
import { Bell, User, Search, ShieldAlert, Sparkles, Menu } from "lucide-react";
import { LocationSelector } from "@/components/shared/location-selector";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { GeoLocation } from "@/types";
import { siteConfig } from "@/config/site";

interface DashboardHeaderProps {
  currentLocation?: GeoLocation;
  onLocationChange?: (loc: GeoLocation) => void;
  onMobileMenuToggle?: () => void;
}

export function DashboardHeader({
  currentLocation = siteConfig.initialLocation,
  onLocationChange,
  onMobileMenuToggle,
}: DashboardHeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [sessionUser, setSessionUser] = React.useState<{ email?: string; fullName?: string } | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setSessionUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/90 dark:border-emerald-950/70 bg-white/95 dark:bg-forest-950/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Left side: Mobile Toggle & Location Selector */}
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="md:hidden h-9 w-9"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <LocationSelector
          currentLocation={currentLocation}
          onLocationChange={onLocationChange}
        />
      </div>

      {/* Right side controls: Search placeholder, Notifications, Theme toggle, Profile menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Environmental status pill */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>CPCB-Breakpoint-Based Estimate</span>
        </div>

        <ThemeToggle />

        {/* Notifications Icon with popover */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative rounded-lg text-slate-700 dark:text-slate-200"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileOpen(false);
            }}
            aria-label="View notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500" />
          </Button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 dark:border-emerald-950 bg-white dark:bg-forest-900 p-3 shadow-xl z-50 animate-in fade-in-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-emerald-950">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Environmental Alerts (Demo)
                </span>
                <span className="text-[10px] text-muted-foreground">Siliguri Area</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex gap-2 items-start">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[11px]">Evening Smog Inversion Spike</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      PM2.5 concentration expected to rise after 6:00 PM due to cooling ground temperatures.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User profile menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            aria-expanded={profileOpen}
            aria-label="User profile and settings"
            className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-emerald-950 p-1 hover:bg-slate-50 dark:hover:bg-emerald-950/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
              BW
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-emerald-950 bg-white dark:bg-forest-900 p-3 shadow-xl z-50 animate-in fade-in-50">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-emerald-950">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                  {sessionUser?.fullName?.substring(0, 2).toUpperCase() || "BW"}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {sessionUser?.fullName || "BreatheWise Pioneer"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{sessionUser?.email || "demo.user@breathewise.ai"}</span>
                </div>
              </div>
              <div className="py-2 text-xs space-y-1">
                <div className="px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-emerald-950/40 cursor-pointer text-slate-700 dark:text-slate-300">
                  Profile & Health Preferences
                </div>
                <div className="px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-emerald-950/40 cursor-pointer text-slate-700 dark:text-slate-300">
                  Family Group Management
                </div>
                <div className="px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-emerald-950/40 cursor-pointer text-slate-700 dark:text-slate-300">
                  Air Purifier Hardware Sync
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-emerald-950 text-[11px] text-muted-foreground px-2">
                Firebase Authentication active (HttpOnly session secured).
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-emerald-950">
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = "/login";
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-medium text-xs transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

