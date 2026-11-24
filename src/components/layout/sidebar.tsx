"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wind,
  Bot,
  CalendarCheck,
  Home,
  Leaf,
  Users,
  Activity,
  Globe2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";

const navItems = [
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

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex sticky top-0 h-screen flex-col border-r border-slate-200 dark:border-emerald-950/70 bg-white dark:bg-forest-950 transition-all duration-300 select-none z-30 shrink-0",
        collapsed ? "w-20" : "w-64"
      )}
      aria-label="Dashboard Sidebar"
    >
      {/* Brand & Collapse Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-emerald-950/70">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 font-bold text-slate-900 dark:text-white overflow-hidden transition-all",
            collapsed && "justify-center w-full"
          )}
          title="BreatheWise AI"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
            <Wind className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-emerald-900 to-emerald-700 dark:from-emerald-300 dark:to-emerald-100 bg-clip-text text-transparent">
                BreatheWise<span className="text-emerald-600 dark:text-emerald-400"> AI</span>
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                Climate Intelligence
              </span>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950/40"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="py-2 flex justify-center border-b border-slate-100 dark:border-emerald-950">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950/40"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Dashboard views">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-medium transition-all group",
                isActive
                  ? "bg-emerald-700 text-white shadow-sm dark:bg-emerald-600 font-semibold"
                  : "text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-900 dark:hover:text-emerald-200",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-white" : "text-slate-500 dark:text-emerald-400/80"
                )}
                aria-hidden="true"
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Notice */}
      {!collapsed && (
        <div className="p-4 m-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Atmospheric Stream</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Real-time planetary dispersion telemetry from Copernicus CAMS & Open-Meteo.
          </p>
        </div>
      )}
    </aside>
  );
}

