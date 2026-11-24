import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional class names with Tailwind CSS class resolution.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a timestamp into a human-readable local time string.
 */
export function formatTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Formats a numeric value with decimal places safely.
 */
export function formatMetric(val: number | undefined | null, unit: string = ""): string {
  if (val === undefined || val === null || isNaN(val)) return "N/A";
  return `${Math.round(val * 10) / 10} ${unit}`.trim();
}

