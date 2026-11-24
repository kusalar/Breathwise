import { GeminiInsight } from "@/types";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface GeminiInsightPanelProps {
  insight: GeminiInsight;
}

export function GeminiInsightPanel({ insight }: GeminiInsightPanelProps) {
  return (
    <div className="rounded-2xl border border-emerald-200/90 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/60 via-white to-forest-50/40 dark:from-forest-950 dark:via-forest-900/60 dark:to-emerald-950/40 p-6 shadow-subtle space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100 dark:border-emerald-950">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Gemini AI Atmospheric & Health Synthesis
            </h3>
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
              Confidence Score: {Math.round(insight.confidenceScore * 100)}%
            </span>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
          Live AI Synthesis
        </Badge>
      </div>

      <div className="space-y-2">
        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {insight.headline}
        </h4>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {insight.explanation}
        </p>
      </div>

      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/80 bg-white dark:bg-forest-950 text-xs sm:text-sm space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Tailored Recommendation for Right Now</span>
        </div>
        <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed">
          {insight.tailoredAction}
        </p>
      </div>
    </div>
  );
}

