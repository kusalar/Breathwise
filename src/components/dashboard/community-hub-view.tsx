"use client";

import * as React from "react";
import { useStoredState } from "@/hooks/use-stored-state";
import { Globe2, AlertTriangle, MapPin, Plus, CheckCircle2, Trash2, Users } from "lucide-react";
import { useLocation } from "@/context/location-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HotspotReport {
  id: string;
  city: string;
  locality: string;
  category: "biomass_burning" | "road_dust" | "construction" | "traffic";
  description: string;
  reportedAt: string;
  status: "active" | "resolved";
}

const REPORTS_STORAGE_KEY = "breathewise_community_reports";
const PLEDGE_STORAGE_KEY = "breathewise_community_pledges";

const CATEGORY_LABELS: Record<HotspotReport["category"], string> = {
  biomass_burning: "Open Leaf / Waste Burning",
  road_dust: "Unpaved Road Dust",
  construction: "Uncovered Construction",
  traffic: "Severe Traffic Bottleneck",
};

const COMMUNITY_PLEDGES = [
  { id: "pl-1", title: "Zero Dry-Leaf Burning", impact: "Compost garden waste instead of open burning" },
  { id: "pl-2", title: "EV / Metro Short-Trip Shift", impact: "Use electric rickshaws or metro for trips under 4 km" },
  { id: "pl-3", title: "Idle-Engine Off at Signals", impact: "Switch off vehicle engines at red lights > 20 seconds" },
];

/**
 * Interactive Community Clean Air Hub for reporting local pollution hotspots
 * and tracking neighborhood clean-air pledges.
 */
export function CommunityHubView() {
  const { location } = useLocation();
  const [reports, setReports] = useStoredState<HotspotReport[]>(REPORTS_STORAGE_KEY, []);
  const [locality, setLocality] = React.useState("");
  const [category, setCategory] = React.useState<HotspotReport["category"]>("biomass_burning");
  const [description, setDescription] = React.useState("");
  const [joinedPledges, setJoinedPledges] = useStoredState<string[]>(PLEDGE_STORAGE_KEY, []);

  const persistReports = (list: HotspotReport[]) => {
    setReports(list);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locality.trim() || !description.trim()) return;

    const newReport: HotspotReport = {
      id: `rep-${Date.now()}`,
      city: location.name,
      locality: locality.trim(),
      category,
      description: description.trim(),
      reportedAt: new Date().toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "active",
    };

    persistReports([newReport, ...reports]);
    setLocality("");
    setDescription("");
  };

  const toggleResolve = (id: string) => {
    persistReports(
      reports.map((r) =>
        r.id === id ? { ...r, status: r.status === "active" ? "resolved" : "active" } : r
      )
    );
  };

  const deleteReport = (id: string) => {
    persistReports(reports.filter((r) => r.id !== id));
  };

  const togglePledge = (id: string) => {
    setJoinedPledges((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-emerald-950 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Community Clean Air Hub
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Report localized pollution hotspots in {location.name} and join neighborhood clean-air pledges.
          </p>
        </div>
        <Badge variant="outline" className="text-xs border-emerald-600/30 text-emerald-800 dark:text-emerald-300 self-start md:self-center">
          Active City: {location.name}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Report Hotspot Form */}
        <Card className="lg:col-span-5 border-slate-200 dark:border-emerald-950 shadow-subtle">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
              Log Local Pollution Hotspot
            </CardTitle>
            <CardDescription className="text-xs">
              Document open waste burning, construction dust, or congestion near you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label htmlFor="hotspot-locality" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Neighborhood / Landmark
                </label>
                <input
                  id="hotspot-locality"
                  type="text"
                  required
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder={`e.g. Sevoke Road, ${location.name}`}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="hotspot-category" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Emission Source
                </label>
                <select
                  id="hotspot-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as HotspotReport["category"])}
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="hotspot-description" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Observation Details
                </label>
                <textarea
                  id="hotspot-description"
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you observe (smoke, dust plume, time of day)..."
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm"
                />
              </div>

              <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Submit Hotspot Report</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Community Feed & Pledges */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-slate-200 dark:border-emerald-950 shadow-subtle">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Logged Hotspot Reports ({reports.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center border border-dashed border-slate-200 dark:border-emerald-950 rounded-xl">
                  No hotspots logged yet. Use the form to record local pollution sources in {location.name}.
                </p>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-emerald-950 bg-slate-50/50 dark:bg-forest-950/40 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {rep.locality} ({rep.city})
                        </span>
                        <Badge variant={rep.status === "resolved" ? "default" : "outline"} className="text-xs">
                          {rep.status === "resolved" ? "Resolved" : CATEGORY_LABELS[rep.category]}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{rep.description}</p>
                      <span className="text-xs text-muted-foreground font-mono">{rep.reportedAt}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleResolve(rep.id)}
                        aria-label={`Mark ${rep.locality} report as ${rep.status === "active" ? "resolved" : "active"}`}
                        className="h-8 px-2 text-emerald-700 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReport(rep.id)}
                        aria-label={`Delete ${rep.locality} report`}
                        className="h-8 px-2 text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-emerald-950 shadow-subtle">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Neighborhood Clean-Air Pledges
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {COMMUNITY_PLEDGES.map((pledge) => {
                const joined = joinedPledges.includes(pledge.id);
                return (
                  <button
                    key={pledge.id}
                    type="button"
                    onClick={() => togglePledge(pledge.id)}
                    aria-pressed={joined}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      joined
                        ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40"
                        : "border-slate-200 dark:border-emerald-950 hover:border-emerald-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{pledge.title}</span>
                      {joined && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{pledge.impact}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
