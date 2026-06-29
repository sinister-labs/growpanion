import { describe, expect, it } from 'vitest';
import {
  buildPhenotypeComparisonMetrics,
  getComparisonDirection,
  getComparisonValueClass,
  parseComparisonNumber,
} from '@/lib/comparison-utils';

describe('comparison utilities', () => {
  it('parses only complete numeric comparison values', () => {
    expect(parseComparisonNumber(12)).toBe(12);
    expect(parseComparisonNumber(' 12.5 ')).toBe(12.5);
    expect(parseComparisonNumber('-')).toBeNull();
    expect(parseComparisonNumber('12abc')).toBeNull();
    expect(parseComparisonNumber('')).toBeNull();
    expect(parseComparisonNumber(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('compares values according to whether higher values are better', () => {
    expect(getComparisonDirection(12, 10, true)).toBe('first');
    expect(getComparisonDirection(12, 10, false)).toBe('second');
    expect(getComparisonDirection(10, 12, false)).toBe('first');
    expect(getComparisonDirection(10, 10, true)).toBe('equal');
  });

  it('treats non-numeric and malformed comparison values as equal', () => {
    expect(getComparisonDirection('Flowering', 'Seedling')).toBe('equal');
    expect(getComparisonDirection('12abc', '10')).toBe('equal');
    expect(getComparisonValueClass('12abc', '10', true)).toBe('text-foreground');
  });

  it('marks only the better side as highlighted', () => {
    expect(getComparisonValueClass(12, 10, true)).toBe('text-primary');
    expect(getComparisonValueClass(12, 10, false)).toBe('text-muted-foreground');
    expect(getComparisonValueClass(12, 10, true, false)).toBe('text-muted-foreground');
    expect(getComparisonValueClass(12, 10, false, false)).toBe('text-primary');
  });

  it('builds phenotype comparison metrics from trait records', () => {
    const metrics = buildPhenotypeComparisonMetrics(
      {
        label: 'Pheno A',
        vigor: 'High',
        stretch: 'Low',
        terpenes: ['Berry', 'Gas'],
        yieldGrams: 42,
        traits: ['bushy'],
      },
      {
        label: 'Pheno B',
        vigor: 'Medium',
        stretch: 'High',
        terpenes: ['Citrus'],
        yieldGrams: 55,
        issues: ['EC sensitive'],
      },
    );

    expect(metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Yield', value1: 42, value2: 55, unit: 'g' }),
      expect.objectContaining({ label: 'Terpenes', value1: 'Berry, Gas', value2: 'Citrus' }),
      expect.objectContaining({ label: 'Issues', value1: '-', value2: 'EC sensitive' }),
    ]));
  });
});
