"use client";

import * as React from "react";
import { useStoredState } from "@/hooks/use-stored-state";
import { Home, Calculator, CheckCircle2, ShieldCheck } from "lucide-react";
import { IndoorAirPanel } from "./indoor-air-panel";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
}

const INDOOR_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "chk-damp-mop",
    label: "Damp-mop floors instead of dry sweeping",
    detail: "Prevents re-aerosolizing settled PM2.5 particulates indoors.",
  },
  {
    id: "chk-exhaust",
    label: "Run kitchen exhaust hood while cooking",
    detail: "Captures LPG/frying combustion aerosols before they spread.",
  },
  {
    id: "chk-midday-vent",
    label: "Cross-ventilate briefly during midday (12:00 PM – 2:30 PM)",
    detail: "Leverages peak solar thermal mixing when outdoor smog is lowest.",
  },
  {
    id: "chk-incense",
    label: "Avoid incense (agarbatti) or mosquito coils in closed rooms",
    detail: "Eliminates concentrated indoor particulate and VOC spikes.",
  },
  {
    id: "chk-hepa-elevate",
    label: "Elevate HEPA purifier 2–3 ft off floor away from walls",
    detail: "Ensures unobstructed 360° air intake and clean bedroom airflow.",
  },
];

const CHECKLIST_STORAGE_KEY = "breathewise_indoor_checklist";

/**
 * Interactive Indoor Air Quality Optimizer with a HEPA CADR Room Calculator
 * and persistent daily clean-air checklist.
 */
export function IndoorAirView() {
  const [lengthFt, setLengthFt] = React.useState(14);
  const [widthFt, setWidthFt] = React.useState(12);
  const [heightFt, setHeightFt] = React.useState(10);
  const [achTarget, setAchTarget] = React.useState(5);
  const [completedIds, setCompletedIds] = useStoredState<string[]>(CHECKLIST_STORAGE_KEY, []);

  const toggleItem = (id: string) => {
    setCompletedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const areaSqFt = Math.max(0, lengthFt * widthFt);
  const volumeCubicFt = Math.max(0, areaSqFt * heightFt);
  const volumeCubicMeters = volumeCubicFt * 0.0283168;
  const recommendedCadrM3h = Math.round(volumeCubicMeters * achTarget);
  const recommendedCadrCfm = Math.round((volumeCubicFt * achTarget) / 60);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-emerald-950 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-teal-600" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Indoor Air Quality Optimizer
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Calculate ideal HEPA purifier CADR capacity for your room and track daily indoor protection habits.
          </p>
        </div>
        <Badge variant="outline" className="text-xs border-teal-600/30 text-teal-800 dark:text-teal-300 self-start md:self-center">
          Clean-Air Sanctuary
        </Badge>
      </div>

      <IndoorAirPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive HEPA CADR Calculator */}
        <Card className="border-slate-200 dark:border-emerald-950 shadow-subtle">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-teal-600" aria-hidden="true" />
              HEPA Purifier CADR Room Calculator
            </CardTitle>
            <CardDescription className="text-xs">
              Size your air purifier to achieve 4–5 Air Changes per Hour (ACH) during severe smog episodes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="room-length" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Length (ft)
                </label>
                <input
                  id="room-length"
                  type="number"
                  min={4}
                  max={100}
                  value={lengthFt}
                  onChange={(e) => setLengthFt(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="room-width" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Width (ft)
                </label>
                <input
                  id="room-width"
                  type="number"
                  min={4}
                  max={100}
                  value={widthFt}
                  onChange={(e) => setWidthFt(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="room-height" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Height (ft)
                </label>
                <input
                  id="room-height"
                  type="number"
                  min={6}
                  max={30}
                  value={heightFt}
                  onChange={(e) => setHeightFt(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="room-ach" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target ACH
                </label>
                <select
                  id="room-ach"
                  value={achTarget}
                  onChange={(e) => setAchTarget(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-2 py-1.5 text-sm"
                >
                  <option value={4}>4 ACH (Moderate)</option>
                  <option value={5}>5 ACH (Severe Smog)</option>
                  <option value={6}>6 ACH (Asthma Care)</option>
                </select>
              </div>
            </div>

            <div
              className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 grid grid-cols-3 gap-3 text-center"
              aria-live="polite"
            >
              <div>
                <span className="text-xs text-muted-foreground block">Room Area</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                  {areaSqFt} sq ft
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Required CADR</span>
                <span className="text-lg font-extrabold text-teal-700 dark:text-teal-400 font-mono">
                  {recommendedCadrM3h} m³/h
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">US CFM Rating</span>
                <span className="text-lg font-extrabold text-teal-700 dark:text-teal-400 font-mono">
                  {recommendedCadrCfm} CFM
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Indoor Protection Checklist */}
        <Card className="border-slate-200 dark:border-emerald-950 shadow-subtle">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Daily Indoor Protection Checklist
              </CardTitle>
              <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                {completedIds.length}/{INDOOR_CHECKLIST_ITEMS.length} Done
              </span>
            </div>
            <CardDescription className="text-xs">
              Zero-cost physical practices to keep indoor PM2.5 low.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {INDOOR_CHECKLIST_ITEMS.map((item) => {
              const checked = completedIds.includes(item.id);
              return (
                <label
                  key={item.id}
                  htmlFor={item.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    checked
                      ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/30"
                      : "border-slate-200 dark:border-emerald-950 hover:bg-slate-50 dark:hover:bg-forest-950/40"
                  }`}
                >
                  <input
                    id={item.id}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(item.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <span className={`text-xs font-semibold block ${checked ? "line-through text-muted-foreground" : "text-slate-900 dark:text-white"}`}>
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                  </div>
                  {checked && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />}
                </label>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
