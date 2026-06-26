import { describe, expect, it } from 'vitest';
import { calculateSVP, calculateVPD, getOptimalVpdRange, getVpdStatus } from '@/lib/vpd-utils';

describe('vpd utilities', () => {
  it('calculates finite VPD values for normal conditions', () => {
    expect(calculateSVP(25)).toBeGreaterThan(3);
    expect(calculateVPD(25, 60)).toBeCloseTo(0.91, 2);
  });

  it('clamps invalid or out-of-range humidity for VPD calculations', () => {
    expect(calculateVPD(25, 150)).toBe(0);
    expect(calculateVPD(25, -20)).toBeGreaterThan(2);
    expect(calculateVPD(25, Number.NaN)).toBeGreaterThan(2);
  });

  it('returns safe values for invalid temperatures', () => {
    expect(calculateSVP(Number.POSITIVE_INFINITY)).toBe(0);
    expect(calculateSVP(-237.3)).toBe(0);
    expect(calculateSVP(1e308)).toBe(0);
    expect(calculateVPD(Number.NaN, 60)).toBe(0);
    expect(calculateVPD(1e308, 60)).toBe(0);
  });

  it('classifies day zero as early phase instead of late phase', () => {
    expect(getOptimalVpdRange('Vegetative', 0)?.description).toContain('Early Vegetation');
    expect(getOptimalVpdRange('Flowering', 0)?.description).toContain('Early Flowering');
  });

  it('returns unknown VPD status when no range is available', () => {
    expect(getVpdStatus(1.2, null)).toBe('unknown');
  });

  it('returns unknown VPD status for non-finite values', () => {
    expect(getVpdStatus(Number.NaN, getOptimalVpdRange('Vegetative', 7))).toBe('unknown');
    expect(getVpdStatus(Number.POSITIVE_INFINITY, getOptimalVpdRange('Vegetative', 7))).toBe('unknown');
  });
});
