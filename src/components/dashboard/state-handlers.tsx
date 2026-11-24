import { AlertTriangle, WifiOff, FileQuestion, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading air quality intelligence">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Skeleton className="md:col-span-5 h-48 rounded-2xl" />
        <Skeleton className="md:col-span-7 h-48 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-44 w-full rounded-2xl" />
    </div>
  );
}

export function DashboardEmptyState({
  title = "No Environmental Data Available",
  message = "Please select an active city or allow location services to load regional air quality metrics.",
  onAction,
}: {
  title?: string;
  message?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-emerald-950 p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white/50 dark:bg-forest-950/30">
      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-emerald-950/60 flex items-center justify-center text-slate-500">
        <FileQuestion className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm">{message}</p>
      {onAction && (
        <Button onClick={onAction} variant="outline" size="sm" className="mt-2">
          Reset to Demo Location
        </Button>
      )}
    </div>
  );
}

export function DashboardUnavailableState({
  stationName = "Siliguri North Station",
  reason = "Sensor node undergoing routine winter recalibration.",
}: {
  stationName?: string;
  reason?: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-950/60 bg-amber-50/50 dark:bg-amber-950/20 p-8 text-center flex flex-col items-center justify-center space-y-3">
      <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-400">
        <WifiOff className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
        Telemetry Temporarily Unavailable for {stationName}
      </h3>
      <p className="text-xs text-muted-foreground max-w-md">{reason}</p>
      <span className="text-[11px] text-amber-800 dark:text-amber-300 font-mono">
        Fallback model running with historical regional averages.
      </span>
    </div>
  );
}

export function DashboardErrorState({
  error = "Failed to communicate with the environmental service.",
  onRetry,
}: {
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center flex flex-col items-center justify-center space-y-3">
      <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-700 dark:text-rose-400">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
        Data Synchronization Error
      </h3>
      <p className="text-xs text-muted-foreground max-w-md">{error}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="secondary"
          size="sm"
          className="mt-2 gap-1.5 font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Connection</span>
        </Button>
      )}
    </div>
  );
}

