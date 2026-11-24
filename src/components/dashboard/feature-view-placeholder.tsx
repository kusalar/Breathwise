import Link from "next/link";
import { ArrowLeft, Sparkles, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FeatureViewPlaceholderProps {
  title: string;
  subtitle: string;
  milestone: string;
  description: string;
  keyCapabilities: string[];
}

export function FeatureViewPlaceholder({
  title,
  subtitle,
  milestone = "Milestone 2 Integration Target",
  description,
  keyCapabilities,
}: FeatureViewPlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard Overview</span>
          </Button>
        </Link>
        <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
          Telemetry Ready
        </Badge>
      </div>

      <div className="rounded-2xl border border-slate-200/90 dark:border-emerald-950 bg-white dark:bg-forest-900/60 p-8 shadow-subtle space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
              {milestone}
            </Badge>
            <span className="text-xs text-muted-foreground">• Architecture Ready</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed">
          {description}
        </p>

        <div className="pt-4 border-t border-slate-100 dark:border-emerald-950">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Architectural Blueprint & Planned Capabilities
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {keyCapabilities.map((cap, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-emerald-950 bg-slate-50/70 dark:bg-forest-950/40 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2.5"
              >
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Service layer and database schemas have been architecturally specified in Milestone 1.</span>
          </div>
          <Link href="/dashboard">
            <Button size="sm" variant="secondary">
              View Overview
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

