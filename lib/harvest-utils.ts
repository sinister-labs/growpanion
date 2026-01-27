/**
 * Harvest yield estimation utilities
 */

export type StrainType = 'auto' | 'photo';
export type MediumType = 'soil' | 'coco' | 'hydro' | 'dwc';
export type LightType = 'hps' | 'led' | 'cmh' | 'cfl' | 'sun';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface YieldEstimationInput {
  plantCount: number;
  strainType: StrainType;
  medium: MediumType;
  lightType: LightType;
  lightWattage: number;
  experienceLevel: ExperienceLevel;
  growSpaceSqM?: number;
}

export interface YieldEstimation {
  minYieldPerPlant: number;
  maxYieldPerPlant: number;
  totalMinYield: number;
  totalMaxYield: number;
  averageYield: number;
  efficiency: {
    gramsPerWatt: { min: number; max: number };
    gramsPerSqM?: { min: number; max: number };
  };
}

// Base yield ranges per plant in grams (indoor)
const BASE_YIELD_RANGES: Record<StrainType, { min: number; max: number }> = {
  auto: { min: 30, max: 150 },
  photo: { min: 50, max: 400 },
};

// Medium multipliers
const MEDIUM_MULTIPLIERS: Record<MediumType, number> = {
  soil: 1.0,
  coco: 1.15,
  hydro: 1.25,
  dwc: 1.35,
};

// Light efficiency multipliers
const LIGHT_MULTIPLIERS: Record<LightType, number> = {
  cfl: 0.6,
  hps: 0.9,
  cmh: 1.0,
  led: 1.1,
  sun: 1.2,
};

// Experience level multipliers
const EXPERIENCE_MULTIPLIERS: Record<ExperienceLevel, number> = {
  beginner: 0.6,
  intermediate: 0.8,
  advanced: 1.0,
  expert: 1.15,
};

// Light wattage efficiency (grams per watt)
const WATTAGE_EFFICIENCY: Record<LightType, { min: number; max: number }> = {
  cfl: { min: 0.3, max: 0.5 },
  hps: { min: 0.8, max: 1.2 },
  cmh: { min: 0.9, max: 1.3 },
  led: { min: 1.0, max: 2.0 },
  sun: { min: 1.5, max: 3.0 }, // Outdoor/greenhouse
};

/**
 * Estimates the yield based on grow parameters
 */
export function estimateYield(input: YieldEstimationInput): YieldEstimation {
  const {
    plantCount,
    strainType,
    medium,
    lightType,
    lightWattage,
    experienceLevel,
    growSpaceSqM,
  } = input;

  // Get base yield range
  const baseRange = BASE_YIELD_RANGES[strainType];

  // Apply multipliers
  const mediumMultiplier = MEDIUM_MULTIPLIERS[medium];
  const lightMultiplier = LIGHT_MULTIPLIERS[lightType];
  const expMultiplier = EXPERIENCE_MULTIPLIERS[experienceLevel];

  const totalMultiplier = mediumMultiplier * lightMultiplier * expMultiplier;

  // Calculate per-plant yield
  const minYieldPerPlant = Math.round(baseRange.min * totalMultiplier);
  const maxYieldPerPlant = Math.round(baseRange.max * totalMultiplier);

  // Check wattage constraint (don't exceed what the light can support)
  const wattageEfficiency = WATTAGE_EFFICIENCY[lightType];
  const maxFromWattage = lightWattage * wattageEfficiency.max;
  const minFromWattage = lightWattage * wattageEfficiency.min;

  // Calculate totals (capped by wattage)
  let totalMinYield = minYieldPerPlant * plantCount;
  let totalMaxYield = maxYieldPerPlant * plantCount;

  // Cap by light capacity
  if (totalMaxYield > maxFromWattage) {
    totalMaxYield = Math.round(maxFromWattage);
  }
  if (totalMinYield > minFromWattage * 2) {
    totalMinYield = Math.round(minFromWattage);
  }

  const averageYield = Math.round((totalMinYield + totalMaxYield) / 2);

  // Calculate efficiency metrics
  const gramsPerWatt = {
    min: Math.round((totalMinYield / lightWattage) * 100) / 100,
    max: Math.round((totalMaxYield / lightWattage) * 100) / 100,
  };

  let gramsPerSqM: { min: number; max: number } | undefined;
  if (growSpaceSqM && growSpaceSqM > 0) {
    gramsPerSqM = {
      min: Math.round(totalMinYield / growSpaceSqM),
      max: Math.round(totalMaxYield / growSpaceSqM),
    };
  }

  return {
    minYieldPerPlant,
    maxYieldPerPlant,
    totalMinYield,
    totalMaxYield,
    averageYield,
    efficiency: {
      gramsPerWatt,
      gramsPerSqM,
    },
  };
}

/**
 * Compares expected vs actual yield
 */
export interface YieldComparison {
  expectedAverage: number;
  actualYield: number;
  difference: number;
  percentageDifference: number;
  rating: 'poor' | 'below_average' | 'average' | 'above_average' | 'excellent';
  ratingLabel: string;
}

export function compareYield(
  expected: YieldEstimation,
  actualYield: number
): YieldComparison {
  const expectedAverage = expected.averageYield;
  const difference = actualYield - expectedAverage;
  const percentageDifference = Math.round((difference / expectedAverage) * 100);

  let rating: YieldComparison['rating'];
  let ratingLabel: string;

  if (percentageDifference >= 20) {
    rating = 'excellent';
    ratingLabel = 'Excellent! Way above expectations';
  } else if (percentageDifference >= 5) {
    rating = 'above_average';
    ratingLabel = 'Above average yield';
  } else if (percentageDifference >= -10) {
    rating = 'average';
    ratingLabel = 'Within expected range';
  } else if (percentageDifference >= -25) {
    rating = 'below_average';
    ratingLabel = 'Below expectations';
  } else {
    rating = 'poor';
    ratingLabel = 'Significantly below expectations';
  }

  return {
    expectedAverage,
    actualYield,
    difference,
    percentageDifference,
    rating,
    ratingLabel,
  };
}

/**
 * Gets display label for various types
 */
export const STRAIN_TYPE_LABELS: Record<StrainType, string> = {
  auto: 'Autoflowering',
  photo: 'Photoperiod',
};

export const MEDIUM_LABELS: Record<MediumType, string> = {
  soil: 'Soil',
  coco: 'Coco Coir',
  hydro: 'Hydroponics',
  dwc: 'DWC (Deep Water Culture)',
};

export const LIGHT_LABELS: Record<LightType, string> = {
  cfl: 'CFL',
  hps: 'HPS',
  cmh: 'CMH/LEC',
  led: 'LED',
  sun: 'Sunlight/Greenhouse',
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner (First 1-2 grows)',
  intermediate: 'Intermediate (3-5 grows)',
  advanced: 'Advanced (6+ grows)',
  expert: 'Expert (Commercial/Professional)',
};

/**
 * Gets rating color class
 */
export function getRatingColorClass(rating: YieldComparison['rating']): string {
  switch (rating) {
    case 'excellent':
      return 'text-green-400 bg-green-600/20';
    case 'above_average':
      return 'text-emerald-400 bg-emerald-600/20';
    case 'average':
      return 'text-blue-400 bg-blue-600/20';
    case 'below_average':
      return 'text-yellow-400 bg-yellow-600/20';
    case 'poor':
      return 'text-red-400 bg-red-600/20';
    default:
      return 'text-gray-400 bg-gray-600/20';
  }
}
