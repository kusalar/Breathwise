import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface DemoDataBadgeProps {
  label?: string;
  className?: string;
}

export function DemoDataBadge({
  label = "DEMO DATA",
  className = "",
}: DemoDataBadgeProps) {
  return (
    <Badge
      variant="demo"
      className={`inline-flex items-center gap-1 font-mono tracking-wider font-semibold text-[10px] px-2 py-0.5 border border-amber-300 dark:border-amber-700 bg-amber-50/90 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 shadow-xs ${className}`}
      title="This reading is demonstrative data for preview purposes and not a live physical measurement."
      aria-label="Demonstration data notice: not a live physical measurement"
    >
      <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  );
}

