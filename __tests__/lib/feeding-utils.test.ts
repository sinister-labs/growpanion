import { describe, expect, it } from 'vitest';
import {
  calculateDosePerLiter,
  calculateFertilizerAmount,
  createFertilizerProductId,
  createMixRecipeIdFromLegacyMix,
  findMixRecipeForLegacyMix,
  formatDosePerLiter,
  hasExistingFertilizerMix,
} from '@/lib/feeding-utils';

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

  it('creates deterministic product and recipe ids for product-os records', () => {
    expect(createFertilizerProductId(' Terra Vega ')).toBe('fertilizer-product-terra-vega');
    expect(createFertilizerProductId('CalMag+ 2.0')).toBe('fertilizer-product-calmag-2-0');
    expect(createMixRecipeIdFromLegacyMix('mix-123')).toBe('recipe-mix-123');
  });

  it('calculates numeric recipe dose per liter', () => {
    expect(calculateDosePerLiter('15', '5000')).toBe(3);
    expect(calculateDosePerLiter('3', '0')).toBeNull();
  });

  it('finds product-os recipe metadata for a legacy fertilizer mix', () => {
    const recipes = [
      { id: 'recipe-other', name: 'Other' },
      { id: 'recipe-mix-123', name: 'Product OS Recipe' },
    ];

    expect(findMixRecipeForLegacyMix(recipes, 'mix-123')).toEqual(recipes[1]);
    expect(findMixRecipeForLegacyMix(recipes, 'missing')).toBeUndefined();
  });
});
