import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200/80 dark:bg-emerald-950/40",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };

