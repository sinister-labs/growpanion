import { describe, expect, it } from 'vitest';
import {
  calculateDLI,
  calculateOptimalPPFD,
  getDLIRating,
  getInitialSchedule,
  normalizeGrowLightPhase,
  parseClampedNumber,
} from '@/lib/dli-utils';

describe('dli utilities', () => {
  it('calculates daily light integral from PPFD and photoperiod', () => {
    expect(calculateDLI(600, 18)).toBeCloseTo(38.88, 2);
  });

  it('clamps malformed numeric input before calculation', () => {
    expect(parseClampedNumber('', 1, 24)).toBe(1);
    expect(parseClampedNumber('abc', 0, 2000)).toBe(0);
    expect(parseClampedNumber('3000', 0, 2000)).toBe(2000);
    expect(calculateDLI(Number.NaN, 18)).toBe(0);
    expect(calculateDLI(600, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('rates DLI against the selected grow phase', () => {
    expect(getDLIRating(18, 'seedling').rating).toBe('optimal');
    expect(getDLIRating(24, 'veg').rating).toBe('low');
    expect(getDLIRating(70, 'flower').rating).toBe('too_high');
  });

  it('calculates optimal PPFD and recognizes preset schedules', () => {
    expect(calculateOptimalPPFD('veg', 18)).toBe(540);
    expect(calculateOptimalPPFD('flower', 0)).toBe(0);
    expect(getInitialSchedule(18)).toBe('18');
    expect(getInitialSchedule(19)).toBe('custom');
  });

  it('falls back to vegetative phase for malformed phase values', () => {
    expect(normalizeGrowLightPhase('broken')).toBe('veg');
    expect(getDLIRating(35, 'broken' as never).rating).toBe('optimal');
    expect(calculateOptimalPPFD('broken' as never, 18)).toBe(540);
  });
});
