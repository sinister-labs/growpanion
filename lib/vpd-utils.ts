/**
 * Utility functions for VPD (Vapor Pressure Deficit) calculations
 * Used for environmental monitoring in grow environments
 */

/**
 * Calculates the Saturation Vapor Pressure (SVP) in kPa
 * @param tempC Temperature in °C
 * @returns Saturation vapor pressure in kPa
 */
export function calculateSVP(tempC: number): number {
  return 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

/**
 * Calculates the Vapor Pressure Deficit (VPD) in kPa based on leaf temperature
 * @param airTempC Air temperature in °C
 * @param humidity Relative humidity in %
 * @returns VPD in kPa
 */
export function calculateVPD(airTempC: number, humidity: number): number {
  // Leaf temperature is typically approx. 2°C lower than air temperature
  const leafTempC = airTempC - 2;
  
  // Saturation vapor pressure at leaf temperature
  const leafSVP = calculateSVP(leafTempC);
  
  // Current vapor pressure of air based on air temperature and humidity
  const airSVP = calculateSVP(airTempC);
  const actualVaporPressure = airSVP * (humidity / 100);
  
  // VPD is the difference between leaf saturation vapor pressure
  // and actual vapor pressure of air
  const vpd = leafSVP - actualVaporPressure;
  
  // Rounded to 2 decimal places
  return Number(vpd.toFixed(2));
}

// VPD ranges for different growth phases
export interface VpdRange {
  min: number;
  max: number;
  label: string;
  description: string;
}

// VPD ranges based on plant phase and current day
export const vpdRanges: Record<string, VpdRange> = {
  'propagation': {
    min: 0.4,
    max: 0.8,
    label: 'Low Transpiration',
    description: 'Cuttings & Seedlings'
  },
  'early_veg': {
    min: 0.4,
    max: 0.8,
    label: 'Low Transpiration',
    description: 'Early Vegetation (Day 1-21)'
  },
  'late_veg': {
    min: 0.8,
    max: 1.0,
    label: 'Medium Transpiration',
    description: 'Late Vegetation (Day 22-49)'
  },
  'early_flower': {
    min: 0.8,
    max: 1.2,
    label: 'Healthy Transpiration',
    description: 'Early Flowering (Day 50-70)'
  },
  'late_flower': {
    min: 1.2,
    max: 1.6,
    label: 'High Transpiration',
    description: 'Late Flowering (Day 71-112+)'
  }
};

/**
 * Determines the optimal VPD range based on grow phase and current day
 * @param phase Current growth phase
 * @param currentDay Current day in the phase
 * @returns Optimal VPD range or null if no phase defined
 */
export function getOptimalVpdRange(phase?: string, currentDay?: number): VpdRange | null {
  if (!phase) return null;
  
  // Phase logic with day-based subdivision
  const lowerPhase = phase.toLowerCase();
  
  // Special handling for propagation (no day subdivision)
  if (lowerPhase === 'propagation' || lowerPhase === 'clone' || lowerPhase === 'seedling') {
    return vpdRanges['propagation'];
  }
  
  // For vegetation and flowering, we use the day to determine "early" or "late"
  if (lowerPhase === 'vegetative') {
    // Day-based subdivision for vegetation
    if (currentDay && currentDay <= 14) {
      return vpdRanges['early_veg'];
    } else {
      return vpdRanges['late_veg'];
    }
  }
  
  if (lowerPhase === 'flowering') {
    // Day-based subdivision for flowering
    if (currentDay && currentDay <= 21) {
      return vpdRanges['early_flower'];
    } else {
      return vpdRanges['late_flower'];
    }
  }
  
  return null;
}

/**
 * Type for VPD status
 */
export type VpdStatus = 'optimal' | 'low' | 'high' | 'unknown';

/**
 * Determines VPD status based on current value and optimal range
 * @param vpdValue Current VPD value
 * @param optimalRange Optimal VPD range
 * @returns Status of the VPD value
 */
export function getVpdStatus(vpdValue: number, optimalRange: VpdRange | null): VpdStatus {
  if (!optimalRange) return 'unknown';
  
  if (vpdValue < optimalRange.min) return 'low';
  if (vpdValue > optimalRange.max) return 'high';
  return 'optimal';
}

/**
 * Returns a color-coded class based on VPD status
 * @param status VPD status
 * @returns CSS class name
 */
export function getVpdStatusClass(status: VpdStatus): string {
  switch (status) {
    case 'optimal': return 'text-green-400';
    case 'low': return 'text-amber-400';
    case 'high': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

/**
 * Returns a description of the VPD status
 * @param status VPD status
 * @param optimalRange Optimal VPD range
 * @returns Text description of the status
 */
export function getVpdStatusText(status: VpdStatus, optimalRange: VpdRange | null): string {
  if (!optimalRange) return 'No optimal range defined';
  
  switch (status) {
    case 'optimal': 
      return `Optimal (${optimalRange.min}-${optimalRange.max} kPa)`;
    case 'low': 
      return `Too low, increase to >${optimalRange.min} kPa`;
    case 'high': 
      return `Too high, reduce to <${optimalRange.max} kPa`;
    default: 
      return 'Status unknown';
  }
} 