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
export const PHASE_ICONS: Record<string, React.ForwardRefExoticComponent<any>> = {
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

/**
 * Get the current day count for a phase
 * @param grow The grow object
 * @param phaseName Optional phase name, defaults to current phase
 * @returns Number of days in the phase
 */
export function getDaysInPhase(grow: Grow, phaseName?: string): number {
  const phase = phaseName || grow.currentPhase;
  const phaseStart = grow.phaseHistory.find(ph => ph.phase === phase)?.startDate;
  
  if (!phaseStart) return 0;
  
  const start = new Date(phaseStart);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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