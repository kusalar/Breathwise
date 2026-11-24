"use client";

import * as React from "react";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { siteConfig } from "@/config/site";
import { GeoLocation } from "@/types";
import { X, Wind } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  CalendarCheck,
  Home,
  Leaf,
  Users,
  Activity,
  Globe2,
  Settings,
} from "lucide-react";

import { LocationProvider, useLocation } from "@/context/location-context";

const mobileNavItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Air Quality", href: "/dashboard/air-quality", icon: Wind },
  { label: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot },
  { label: "Daily Planner", href: "/dashboard/daily-planner", icon: CalendarCheck },
  { label: "Indoor Air", href: "/dashboard/indoor-air", icon: Home },
  { label: "Sustainable Choices", href: "/dashboard/sustainable-choices", icon: Leaf },
  { label: "Family Protection", href: "/dashboard/family-protection", icon: Users },
  { label: "Impact Tracker", href: "/dashboard/impact-tracker", icon: Activity },
  { label: "Community Hub", href: "/dashboard/community", icon: Globe2 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LocationProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </LocationProvider>
  );
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { location, setLocation } = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/60 dark:bg-forest-950/60">
      {/* Desktop Sidebar */}
      <DashboardSidebar />

      {/* Mobile Drawer Backdrop & Drawer */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-xs animate-in fade-in-50"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          <div className="w-72 bg-white dark:bg-forest-950 h-full p-4 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-emerald-950">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
                    <Wind className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-base">BreatheWise AI</span>
                </Link>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Close navigation drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-4 space-y-1">
                {mobileNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-emerald-700 text-white font-semibold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950/40"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-emerald-950 text-xs text-muted-foreground">
              Demo baseline: Siliguri, WB
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader
          currentLocation={location}
          onLocationChange={(loc) => setLocation(loc)}
          onMobileMenuToggle={() => setMobileSidebarOpen(true)}
        />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 focus:outline-none"
          tabIndex={-1}
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

