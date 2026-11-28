"use client";

import * as React from "react";
import {
  CheckCircle2,
  TrendingDown,
  Info,
  ArrowRight,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SustainableAlternative {
  id: string;
  category: "commute" | "waste" | "energy" | "home";
  title: string;
  traditionalWay: string;
  ecoAlternative: string;
  co2SavedKg: number;
  particulateAvoidedPct: number;
  healthBenefit: string;
  scientificReference: string;
}

const ALTERNATIVES: SustainableAlternative[] = [
  {
    id: "alt-1",
    category: "commute",
    title: "Electric Rickshaw / Metro Commute",
    traditionalWay: "Solo petrol car commute in stop-and-go traffic (~10 km round trip)",
    ecoAlternative: "Shared electric three-wheeler (E-rickshaw) or regional electric transit",
    co2SavedKg: 1.8,
    particulateAvoidedPct: 45,
    healthBenefit: "Bypasses tailpipe exhaust idling; reduces ambient street particulate loading by ~45%.",
    scientificReference: "Central Road Research Institute (CRRI) / CPCB Urban Commute Emission Baseline (0.18 kg CO2/km petrol vs grid-charged EV).",
  },
  {
    id: "alt-2",
    category: "waste",
    title: "Aerobic Kitchen Composting & Mulching",
    traditionalWay: "Open backyard burning of garden leaves, dry refuse, and plastic-laced trash",
    ecoAlternative: "Aerobic pit composting of organic biomass; municipal segregation of dry recyclables",
    co2SavedKg: 3.5,
    particulateAvoidedPct: 85,
    healthBenefit: "Eliminates toxic polycyclic aromatic hydrocarbons (PAHs) and immediate local smog plumes.",
    scientificReference: "National Environmental Engineering Research Institute (NEERI) biomass open burning factor (~1.4 kg CO2e + 90g PM2.5 per kg burned).",
  },
  {
    id: "alt-3",
    category: "home",
    title: "Smokeless Aromatics & Natural Ventilation",
    traditionalWay: "Daily burning of uncertified charcoal-base agarbatti (incense) and dhoop indoors",
    ecoAlternative: "Cold reed essential oil diffusers or natural sun-dried citrus peel potpourri",
    co2SavedKg: 0.4,
    particulateAvoidedPct: 75,
    healthBenefit: "Reduces peak indoor PM2.5 concentrations from >350 µg/m³ down to baseline ambient (<40 µg/m³).",
    scientificReference: "Indian Journal of Medical Research (IJMR) indoor air pollution study on religious incense particulate emission factors.",
  },
  {
    id: "alt-4",
    category: "energy",
    title: "Thermal Night-Flushing & Natural Clay Storage",
    traditionalWay: "Continuous air conditioner use and motorized refrigerated drinking water coolers",
    ecoAlternative: "Night-time cross-ventilation during clean air windows + traditional terracotta matka cooling",
    co2SavedKg: 2.2,
    particulateAvoidedPct: 30,
    healthBenefit: "Avoids artificial dry air throat irritation and lowers household carbon footprint by 65 kWh/month.",
    scientificReference: "Bureau of Energy Efficiency (BEE) India residential thermal comfort model (0.82 kg CO2 per kWh thermal displacement).",
  },
];

export function SustainabilityView() {
  const [loggingId, setLoggingId] = React.useState<string | null>(null);
  const [loggedSuccessId, setLoggedSuccessId] = React.useState<string | null>(null);

  const handleLogAction = async (alt: SustainableAlternative) => {
    setLoggingId(alt.id);
    try {
      const res = await fetch("/api/sustainability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: alt.category,
          actionDescription: `${alt.title}: Switched from ${alt.traditionalWay.substring(0, 50)}... to ${alt.ecoAlternative.substring(0, 50)}...`,
          estimatedCo2SavedKg: alt.co2SavedKg,
          estimatedParticulateAvoidedPct: alt.particulateAvoidedPct,
        }),
      });

      if (res.ok) {
        setLoggedSuccessId(alt.id);
        setTimeout(() => setLoggedSuccessId(null), 4000);
      }
    } catch {
      // error
    } finally {
      setLoggingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-forest-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Sustainable Alternatives & Low-Emission Living
            </h1>
            <Badge variant="outline" className="text-xs border-emerald-600/30 text-emerald-800 dark:text-emerald-300">
              Science Backed
            </Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Replace high-emission urban habits with clean alternatives that simultaneously safeguard your family and reduce community pollution.
          </p>
        </div>

        <Link
          href="/dashboard/impact-tracker"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          )}
        >
          View My Logged Impact
          <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Disclosures Alert */}
      <Alert className="border-emerald-200 dark:border-emerald-950/70 bg-emerald-50/50 dark:bg-emerald-950/20">
        <Info className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
        <AlertDescription className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
          <strong>Defensible Environmental Factors:</strong> Emission reductions are calculated using verified Indian urban baselines (CPCB, CRRI, NEERI, and BEE). All figures are estimated personal contributions based on standard lifecycle displacement factors. An application-defined illustrative uncertainty heuristic (±15%) reflects variations in regional grid carbon intensity (0.62–0.85 kg CO₂/kWh, CEA Baseline Database) and real-world urban traffic speeds.
        </AlertDescription>
      </Alert>

      {/* Alternatives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ALTERNATIVES.map((alt) => (
          <Card key={alt.id} className="border-slate-200 dark:border-forest-800 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase tracking-wider text-xs font-semibold border-none">
                  {alt.category}
                </Badge>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <TrendingDown className="h-3.5 w-3.5" />
                  -{alt.co2SavedKg} kg CO₂ / action
                </div>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white pt-2">
                {alt.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <div className="space-y-2">
                <div className="p-2.5 rounded bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-950/40">
                  <span className="font-bold text-red-800 dark:text-red-300 block mb-0.5">
                    High-Emission Routine:
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{alt.traditionalWay}</span>
                </div>

                <div className="p-2.5 rounded bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-950/50">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                    Sustainable Clean Alternative:
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{alt.ecoAlternative}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-forest-800 space-y-1 text-slate-600 dark:text-slate-400">
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Health Impact:</strong> {alt.healthBenefit}
                </div>
                <div className="text-xs text-slate-500 italic">
                  <strong>Source:</strong> {alt.scientificReference}
                </div>
              </div>

              <div className="pt-3">
                <Button
                  onClick={() => handleLogAction(alt)}
                  disabled={loggingId === alt.id}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
                >
                  {loggingId === alt.id ? (
                    "Logging Impact..."
                  ) : loggedSuccessId === alt.id ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Logged to Your Impact Record!
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Log This Action (-{alt.co2SavedKg} kg CO₂)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

