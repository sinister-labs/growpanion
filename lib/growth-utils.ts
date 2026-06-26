/**
 * Utility functions for grow phase management
 */
import React from 'react';
import { Sprout, Leaf, Cannabis, Wind, Package, CheckCircle } from 'lucide-react';
import { Grow } from '@/lib/db';

/**
 * Ordered list of growth phases
 */
export const GROWTH_PHASES = [
  "Seedling",
  "Vegetative",
  "Flowering",
  "Flushing",
  "Drying",
  "Curing",
  "Done"
];

/**
 * Icon mapping for each growth phase
 */
export const PHASE_ICONS: Record<string, React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>> = {
  Seedling: Sprout,
  Vegetative: Leaf,
  Flowering: Cannabis,
  Flushing: Wind,
  Drying: Wind,
  Curing: Package,
  Done: CheckCircle,
};

/**
 * Check if a grow is active (not completed)
 * @param grow Grow to check
 * @returns True if grow is active, false if done
 */
export function isGrowActive(grow: Grow): boolean {
  return grow.currentPhase !== "Done";
}

export function getDashboardActiveGrow(grows: Grow[], activeGrowId: string | null): Grow | null {
  const activeGrows = grows.filter(isGrowActive);

  if (activeGrows.length === 0) {
    return null;
  }

  return activeGrows.find(grow => grow.id === activeGrowId) ?? activeGrows[0];
}

function getNonNegativeDaysSince(dateString: string): number {
  const start = new Date(dateString);

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  const diffTime = Date.now() - start.getTime();

  if (diffTime <= 0) {
    return 0;
  }

  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function createPhaseHistoryEntry(phase: string, startDate: string) {
  const normalizedStartDate = startDate.includes("T")
    ? new Date(startDate)
    : new Date(`${startDate}T00:00:00.000Z`);

  return {
    phase,
    startDate: Number.isNaN(normalizedStartDate.getTime())
      ? new Date().toISOString()
      : normalizedStartDate.toISOString(),
  };
}

export function createInitialPhaseHistory(phase: string, startDate: string) {
  return [createPhaseHistoryEntry(phase, startDate)];
}

/**
 * Get the current day count for a phase
 * @param grow The grow object
 * @param phaseName Optional phase name, defaults to current phase
 * @returns Number of days in the phase
 */
export function getDaysInPhase(grow: Grow, phaseName?: string): number {
  const phase = phaseName || grow.currentPhase;
  const phaseStart = [...grow.phaseHistory]
    .reverse()
    .find(ph => ph.phase === phase)?.startDate;

  if (!phaseStart) return 0;

  return getNonNegativeDaysSince(phaseStart);
}

function getValidPhaseHistory(grow: Grow) {
  return grow.phaseHistory
    .map(phase => ({ ...phase, date: new Date(phase.startDate) }))
    .filter(phase => Number.isFinite(phase.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getDurationDays(start: Date, end: Date): number {
  const diffTime = end.getTime() - start.getTime();
  if (diffTime <= 0) {
    return 0;
  }

  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateGrowTotalDays(grow: Grow, now = new Date()): number {
  const start = new Date(grow.startDate);
  if (!Number.isFinite(start.getTime())) {
    return 0;
  }

  const validPhaseHistory = getValidPhaseHistory(grow);
  const doneStart = [...validPhaseHistory]
    .reverse()
    .find(phase => phase.phase === "Done")?.date;
  const end = grow.currentPhase === "Done" ? doneStart ?? now : now;

  return getDurationDays(start, end);
}

export function getGrowElapsedDays(grow: Grow, now = new Date()): number {
  return calculateGrowTotalDays(grow, now);
}

export function calculatePhaseDurations(grow: Grow, now = new Date()): Record<string, number> {
  const durations: Record<string, number> = {};
  const phaseHistory = getValidPhaseHistory(grow);
  const doneStart = [...phaseHistory]
    .reverse()
    .find(phase => phase.phase === "Done")?.date;
  const fallbackEndDate = grow.currentPhase === "Done" ? doneStart ?? now : now;

  for (let i = 0; i < phaseHistory.length; i++) {
    const phase = phaseHistory[i];
    if (phase.phase === "Done") {
      continue;
    }

    const nextPhase = phaseHistory[i + 1];
    const endDate = nextPhase?.date ?? fallbackEndDate;
    const days = getDurationDays(phase.date, endDate);

    durations[phase.phase] = (durations[phase.phase] || 0) + days;
  }

  return durations;
}

/**
 * Get dropdown options for growth phases
 * @returns Array of dropdown options with phase info
 */
export function getPhaseOptions() {
  return GROWTH_PHASES.map(phase => ({
    id: phase,
    label: phase,
    icon: React.createElement(PHASE_ICONS[phase] || Sprout, {
      className: "w-4 h-4 text-green-400 mr-2"
    })
  }));
}
