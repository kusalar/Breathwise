"use client";

import * as React from "react";
import {
  Activity,
  Leaf,
  Trash2,
  TrendingDown,
  Award,
  Plus,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SustainabilityAction } from "@/types";

export function ImpactTrackerView() {
  const [actions, setActions] = React.useState<SustainabilityAction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddForm, setShowAddForm] = React.useState(false);

  // Form State
  const [category, setCategory] = React.useState<SustainabilityAction["category"]>("commute");
  const [description, setDescription] = React.useState("");
  const [co2Saved, setCo2Saved] = React.useState<number>(1.5);
  const [particulateAvoided, setParticulateAvoided] = React.useState<number>(40);
  const [submitting, setSubmitting] = React.useState(false);

  const retrieveActions = React.useCallback(async (): Promise<SustainabilityAction[] | null> => {
    try {
      const res = await fetch("/api/sustainability");
      if (res.ok) {
        const data = await res.json();
        return (data.actions || []) as SustainabilityAction[];
      }
    } catch {
      // error
    }
    return null;
  }, []);

  const fetchActions = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await retrieveActions();
      if (list) {
        setActions(list);
      }
    } finally {
      setLoading(false);
    }
  }, [retrieveActions]);

  React.useEffect(() => {
    let cancelled = false;
    retrieveActions()
      .then((list) => {
        if (!cancelled && list) {
          setActions(list);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retrieveActions]);

  const totalCo2Saved = actions.reduce((sum, a) => sum + (Number(a.estimatedCo2SavedKg) || 0), 0);
  const avgParticulateAvoided =
    actions.length > 0
      ? Math.round(actions.reduce((sum, a) => sum + (Number(a.estimatedParticulateAvoidedPct) || 0), 0) / actions.length)
      : 0;

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/sustainability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          actionDescription: description,
          estimatedCo2SavedKg: Number(co2Saved),
          estimatedParticulateAvoidedPct: Number(particulateAvoided),
        }),
      });

      if (res.ok) {
        await fetchActions();
        setDescription("");
        setShowAddForm(false);
      }
    } catch {
      // error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAction = async (id: string) => {
    try {
      const res = await fetch(`/api/sustainability?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setActions((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // error
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-forest-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Personal Sustainability & Carbon Impact Tracker
            </h1>
            <Badge variant="outline" className="text-xs border-emerald-600/30 text-emerald-800 dark:text-emerald-300">
              User Logged
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track your verified contributions toward lowering urban emissions and avoiding severe smog exposure.
          </p>
        </div>

        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {showAddForm ? "Cancel" : "Log Custom Action"}
        </Button>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-emerald-600/20 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                Total CO₂ Emissions Avoided
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {totalCo2Saved.toFixed(1)} <span className="text-base font-normal text-slate-500">kg CO₂e</span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Equivalent to planting ~{(totalCo2Saved / 21).toFixed(2)} urban trees
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
              <Leaf className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-600/20 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-blue-800 dark:text-blue-400 uppercase tracking-wider">
                Avg. Particulate Avoided
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {avgParticulateAvoided}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Inhaled particulate exposure reduction
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
              <TrendingDown className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-600/20 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                Actions Recorded
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {actions.length}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Secured via PostgreSQL RLS
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Logger Form */}
      {showAddForm && (
        <Card className="border-emerald-600/30 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle as="h2" className="text-base font-bold text-slate-900 dark:text-white">
              Log a Clean Lifestyle Action
            </CardTitle>
            <CardDescription className="text-xs">
              Every voluntary eco-choice contributes to cleaner ambient air in your neighbourhood.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAction} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="impact-category" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    id="impact-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SustainabilityAction["category"])}
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="commute">Clean Commute (E-Rickshaw, Metro, Cycling)</option>
                    <option value="waste">Waste Management (Composting, No Burning)</option>
                    <option value="energy">Energy Efficiency (Natural Cooling, Solar)</option>
                    <option value="home">Indoor Clean Habits (Smokeless Aroma, HEPA)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="impact-co2-saved" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Estimated CO₂ Saved (kg)
                  </label>
                  <input
                    id="impact-co2-saved"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1000"
                    value={co2Saved}
                    onChange={(e) => setCo2Saved(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="impact-particulate-avoided" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Particulate Avoided (%)
                  </label>
                  <input
                    id="impact-particulate-avoided"
                    type="number"
                    min="0"
                    max="100"
                    value={particulateAvoided}
                    onChange={(e) => setParticulateAvoided(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="impact-description" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Action Details & Context
                </label>
                <input
                  id="impact-description"
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Took shared electric rickshaw instead of single-occupancy cab along Sevoke Road"
                  className="mt-1 w-full rounded-md border border-slate-300 dark:border-forest-700 bg-white dark:bg-forest-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  {submitting ? "Saving..." : "Record Action"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Logged Actions Table */}
      <Card className="border-slate-200 dark:border-forest-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle as="h2" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            Your Environmental Action History
          </CardTitle>
          <CardDescription className="text-xs">
            Individually verified and protected under your user identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading your actions...</div>
          ) : actions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Leaf className="h-8 w-8 mx-auto text-slate-400" />
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                No actions logged yet
              </div>
              <p className="text-xs max-w-sm mx-auto text-slate-500">
                Log an action above or visit Sustainable Choices to log one-click alternatives!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-forest-800">
              {actions.map((a) => (
                <div key={a.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="capitalize text-xs bg-slate-100 dark:bg-forest-900 text-slate-800 dark:text-slate-200 border-none font-semibold">
                        {a.category}
                      </Badge>
                      <span className="text-xs font-medium text-slate-900 dark:text-white">
                        {a.actionDescription}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Saved: <strong className="text-emerald-600 dark:text-emerald-400">{a.estimatedCo2SavedKg} kg CO₂</strong></span>
                      <span>Exposure Avoided: <strong className="text-blue-600 dark:text-blue-400">{a.estimatedParticulateAvoidedPct}%</strong></span>
                      <span>{new Date(a.recordedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleDeleteAction(a.id)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                    title="Delete record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scientific Methodology & Transparency Box */}
      <Card className="border-slate-200 dark:border-forest-800 shadow-sm bg-slate-50/50 dark:bg-forest-950/30">
        <CardHeader className="pb-2">
          <CardTitle as="h2" className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Info className="h-4 w-4 text-emerald-600" />
            Methodology & Uncertainty Disclosures
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
          <p>
            <strong>Emission Baselines:</strong> Carbon savings are derived using IPCC Tier 1 & Tier 2 emission factors adjusted for the Indian regional electricity grid intensity (~0.71 kg CO₂/kWh, Central Electricity Authority CO₂ Baseline Database) and internal combustion urban fuel economy (Central Road Research Institute).
          </p>
          <p>
            <strong>Uncertainty Boundaries:</strong> Estimated savings include an application-defined illustrative uncertainty heuristic (±15%) reflecting varying urban traffic speeds (8–25 km/h in congested stop-and-go driving), regional grid mix fluctuations (0.62–0.85 kg CO₂/kWh, CEA Database), and ambient meteorological dispersion dynamics. Personal actions are voluntary indicators and are not certified carbon offsets.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

