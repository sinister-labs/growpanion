import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates the number of days between the given date and today
 * @param startDate Start date as string
 * @returns Number of days as an integer
 */
export function calculateDuration(startDate: string): number {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  const diffTime = Date.now() - start.getTime();
  if (diffTime <= 0) {
    return 0;
  }

  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Formats a date to local format
 * @param dateString Date as string
 * @returns Formatted date
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : 'Unknown date';
}
