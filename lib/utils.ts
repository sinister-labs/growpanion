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
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Formats a date to local format
 * @param dateString Date as string
 * @returns Formatted date
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

