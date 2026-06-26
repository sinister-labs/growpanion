import { describe, expect, it } from 'vitest';
import {
    calculateDryingLoss,
    compareYield,
    estimateYield,
    parsePositiveHarvestWeight,
    YieldEstimation
} from '@/lib/harvest-utils';

describe('harvest utilities', () => {
    it('parses only complete positive harvest weight inputs', () => {
        expect(parsePositiveHarvestWeight('42.5')).toBe(42.5);
        expect(parsePositiveHarvestWeight(' 42 ')).toBe(42);
        expect(parsePositiveHarvestWeight('42abc')).toBeNull();
        expect(parsePositiveHarvestWeight('')).toBeNull();
        expect(parsePositiveHarvestWeight('0')).toBeNull();
        expect(parsePositiveHarvestWeight('-1')).toBeNull();
    });

    it('calculates drying loss only when wet and dry weights are present', () => {
        expect(calculateDryingLoss(100, 25)).toBe(75);
        expect(calculateDryingLoss(null, 25)).toBeNull();
        expect(calculateDryingLoss(100, null)).toBeNull();
    });

    it('normalizes invalid numeric estimation inputs to finite values', () => {
        const estimation = estimateYield({
            plantCount: 0,
            strainType: 'photo',
            medium: 'soil',
            lightType: 'led',
            lightWattage: 0,
            experienceLevel: 'beginner',
            growSpaceSqM: -1,
        });

        expect(estimation.totalMinYield).toBeGreaterThanOrEqual(0);
        expect(estimation.totalMaxYield).toBeGreaterThanOrEqual(estimation.totalMinYield);
        expect(Number.isFinite(estimation.efficiency.gramsPerWatt.min)).toBe(true);
        expect(Number.isFinite(estimation.efficiency.gramsPerWatt.max)).toBe(true);
        expect(estimation.efficiency.gramsPerSqM).toBeUndefined();
    });

    it('normalizes malformed categorical estimation inputs', () => {
        const estimation = estimateYield({
            plantCount: 2,
            strainType: 'unknown' as never,
            medium: 'unknown' as never,
            lightType: 'unknown' as never,
            lightWattage: 300,
            experienceLevel: 'unknown' as never,
            growSpaceSqM: 1,
        });

        expect(estimation.totalMinYield).toBeGreaterThan(0);
        expect(estimation.totalMaxYield).toBeGreaterThanOrEqual(estimation.totalMinYield);
        expect(Number.isFinite(estimation.averageYield)).toBe(true);
        expect(Number.isFinite(estimation.efficiency.gramsPerWatt.max)).toBe(true);
    });

    it('caps extreme numeric estimation inputs to supported ranges', () => {
        const estimation = estimateYield({
            plantCount: 100000,
            strainType: 'photo',
            medium: 'hydro',
            lightType: 'led',
            lightWattage: 100000,
            experienceLevel: 'expert',
            growSpaceSqM: 100000,
        });

        expect(estimation.totalMaxYield).toBeLessThanOrEqual(4000);
        expect(estimation.efficiency.gramsPerSqM?.max).toBeLessThanOrEqual(40);
        expect(Number.isFinite(estimation.averageYield)).toBe(true);
    });

    it('does not divide by zero when comparing against an empty expectation', () => {
        const expected: YieldEstimation = {
            minYieldPerPlant: 0,
            maxYieldPerPlant: 0,
            totalMinYield: 0,
            totalMaxYield: 0,
            averageYield: 0,
            efficiency: {
                gramsPerWatt: { min: 0, max: 0 },
            },
        };

        const comparison = compareYield(expected, 25);

        expect(comparison.percentageDifference).toBe(0);
        expect(comparison.difference).toBe(25);
    });

    it('normalizes invalid actual yield comparisons', () => {
        const expected: YieldEstimation = {
            minYieldPerPlant: 10,
            maxYieldPerPlant: 20,
            totalMinYield: 10,
            totalMaxYield: 20,
            averageYield: 15,
            efficiency: {
                gramsPerWatt: { min: 0.1, max: 0.2 },
            },
        };

        const comparison = compareYield(expected, Number.POSITIVE_INFINITY);

        expect(comparison.actualYield).toBe(0);
        expect(comparison.difference).toBe(-15);
        expect(Number.isFinite(comparison.percentageDifference)).toBe(true);
    });
});
