export type GrowLightPhase = 'seedling' | 'veg' | 'flower';

export type DLIRating = 'too_low' | 'low' | 'optimal' | 'high' | 'too_high';

export interface DLIResult {
  dli: number;
  rating: DLIRating;
  ratingLabel: string;
  suggestion: string;
}

export const DLI_RECOMMENDATIONS = {
  seedling: { min: 12, optimal: 18, max: 22, label: 'Seedling' },
  veg: { min: 25, optimal: 35, max: 45, label: 'Vegetative' },
  flower: { min: 40, optimal: 50, max: 65, label: 'Flowering' },
} as const;

export const LIGHT_SCHEDULES = [
  { id: '24', label: '24/0 (24h light)', hours: 24 },
  { id: '20', label: '20/4', hours: 20 },
  { id: '18', label: '18/6 (Veg standard)', hours: 18 },
  { id: '16', label: '16/8', hours: 16 },
  { id: '14', label: '14/10', hours: 14 },
  { id: '12', label: '12/12 (Flower standard)', hours: 12 },
  { id: 'custom', label: 'Custom', hours: 0 },
] as const;

export function normalizeGrowLightPhase(value: unknown): GrowLightPhase {
  return value === 'seedling' || value === 'veg' || value === 'flower' ? value : 'veg';
}

export function getInitialSchedule(photoperiod: number): string {
  return LIGHT_SCHEDULES.find(schedule => schedule.hours === photoperiod)?.id || 'custom';
}

export function clampFiniteNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function parseClampedNumber(value: string, min: number, max: number): number {
  if (value.trim() === '') {
    return min;
  }

  return clampFiniteNumber(Number(value), min, max);
}

export function calculateDLI(ppfd: number, photoperiod: number): number {
  const safePPFD = clampFiniteNumber(ppfd, 0, 2000);
  const safePhotoperiod = clampFiniteNumber(photoperiod, 0, 24);

  return (safePPFD * safePhotoperiod * 3600) / 1_000_000;
}

export function getDLIRating(dli: number, phase: GrowLightPhase): DLIResult {
  const safePhase = normalizeGrowLightPhase(phase);
  const rec = DLI_RECOMMENDATIONS[safePhase];
  const safeDLI = Math.max(0, Number.isFinite(dli) ? dli : 0);

  let rating: DLIRating;
  let ratingLabel: string;
  let suggestion: string;

  if (safeDLI < rec.min * 0.7) {
    rating = 'too_low';
    ratingLabel = 'Too Low';
    suggestion = `Increase PPFD or light hours. Target: ${rec.min}-${rec.optimal} DLI for ${rec.label}.`;
  } else if (safeDLI < rec.min) {
    rating = 'low';
    ratingLabel = 'Below Optimal';
    suggestion = `Slightly increase light. Target: ${rec.optimal} DLI for best ${rec.label.toLowerCase()} growth.`;
  } else if (safeDLI <= rec.optimal + 5) {
    rating = 'optimal';
    ratingLabel = 'Optimal';
    suggestion = `Perfect light levels for ${rec.label.toLowerCase()} phase!`;
  } else if (safeDLI <= rec.max) {
    rating = 'high';
    ratingLabel = 'High (OK)';
    suggestion = `Good levels, monitor for light stress. Max recommended: ${rec.max} DLI.`;
  } else {
    rating = 'too_high';
    ratingLabel = 'Too High';
    suggestion = `Risk of light stress! Reduce PPFD or hours. Max for ${rec.label}: ${rec.max} DLI.`;
  }

  return { dli: safeDLI, rating, ratingLabel, suggestion };
}

export function calculateOptimalPPFD(phase: GrowLightPhase, photoperiod: number): number {
  const safePhotoperiod = clampFiniteNumber(photoperiod, 0, 24);
  if (safePhotoperiod <= 0) {
    return 0;
  }

  const rec = DLI_RECOMMENDATIONS[normalizeGrowLightPhase(phase)];
  return Math.round((rec.optimal * 1_000_000) / (safePhotoperiod * 3600));
}
