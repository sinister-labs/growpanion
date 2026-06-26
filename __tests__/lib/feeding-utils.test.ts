import { describe, expect, it } from 'vitest';
import { calculateFertilizerAmount, formatDosePerLiter, hasExistingFertilizerMix } from '@/lib/feeding-utils';

describe('feeding-utils', () => {
  it('scales fertilizer amounts from recipe batch to watering amount', () => {
    expect(calculateFertilizerAmount('3', '1000', '1400')).toBe('4.2');
    expect(calculateFertilizerAmount('15', '5000', '1000')).toBe('3.0');
  });

  it('rejects invalid or non-positive amount calculations', () => {
    expect(calculateFertilizerAmount('3', '0', '1000')).toBeNull();
    expect(calculateFertilizerAmount('bad', '1000', '1000')).toBeNull();
    expect(calculateFertilizerAmount('3', '1000', '-100')).toBeNull();
  });

  it('formats recipe doses as ml per liter', () => {
    expect(formatDosePerLiter('3', '1000')).toBe('3 ml/L');
    expect(formatDosePerLiter('15', '5000')).toBe('3 ml/L');
    expect(formatDosePerLiter('7.5', '2000')).toBe('3.75 ml/L');
  });

  it('falls back to raw batch values for invalid doses', () => {
    expect(formatDosePerLiter('bad', '1000')).toBe('bad ml / 1000 ml');
    expect(formatDosePerLiter('3', '0')).toBe('3 ml / 0 ml');
  });

  it('detects existing fertilizer mixes by id instead of temporary id shape', () => {
    const mixes = [
      { id: 'mix-legacy-id', name: 'Legacy Mix' },
      { id: 'generated-id', name: 'Generated Mix' },
    ];

    expect(hasExistingFertilizerMix(mixes, { id: 'mix-legacy-id' })).toBe(true);
    expect(hasExistingFertilizerMix(mixes, { id: 'mix-new-temp' })).toBe(false);
    expect(hasExistingFertilizerMix(mixes, null)).toBe(false);
  });
});
