import { describe, expect, it } from 'vitest';
import type { Grow, PlantDB } from '@/lib/db';
import {
  getGrowStats,
  getHarvestedPlants,
  getRunningYieldHistory,
  getStrainStats,
  getYieldHistory,
  getYieldSummary,
} from '@/lib/statistics-utils';

const grow: Grow = {
  id: 'grow-1',
  name: 'Spring Grow',
  startDate: '2024-01-01T00:00:00.000Z',
  currentPhase: 'Done',
  phaseHistory: [{ phase: 'Seedling', startDate: '2024-01-01T00:00:00.000Z' }],
};

const plant = (overrides: Partial<PlantDB>): PlantDB => ({
  id: 'plant-1',
  growId: 'grow-1',
  name: 'Plant 1',
  genetic: 'Blue Test',
  manufacturer: 'GrowPanion',
  type: 'feminized',
  propagationMethod: 'seed',
  isHarvested: true,
  harvest: {
    date: '2024-04-01T10:00:00.000Z',
    yieldDryGrams: 40,
  },
  ...overrides,
});

describe('statistics utilities', () => {
  it('keeps only harvested plants with positive finite dry yield', () => {
    const harvested = getHarvestedPlants([
      plant({ id: 'valid', harvest: { date: '2024-04-01', yieldDryGrams: 40 } }),
      plant({ id: 'zero', harvest: { date: '2024-04-01', yieldDryGrams: 0 } as PlantDB['harvest'] }),
      plant({ id: 'infinite', harvest: { date: '2024-04-01', yieldDryGrams: Number.POSITIVE_INFINITY } }),
      plant({ id: 'not-harvested', isHarvested: false }),
    ], [grow]);

    expect(harvested.map(item => item.id)).toEqual(['valid']);
  });

  it('summarizes yield data across harvested plants', () => {
    const harvested = getHarvestedPlants([
      plant({ id: 'plant-1', genetic: 'Blue Test', harvest: { date: '2024-04-01', yieldDryGrams: 40 } }),
      plant({ id: 'plant-2', genetic: 'Red Test', harvest: { date: '2024-04-02', yieldDryGrams: 60 } }),
    ], [grow]);

    expect(getYieldSummary(harvested)).toEqual({
      totalPlants: 2,
      totalDryYield: 100,
      avgYieldPerPlant: 50,
      maxYield: 60,
      minYield: 40,
      uniqueStrains: 2,
      uniqueGrows: 1,
    });
  });

  it('normalizes labels before aggregating strain statistics', () => {
    const harvested = getHarvestedPlants([
      plant({ id: 'plant-1', name: ' First ', genetic: ' Blue Test ', harvest: { date: '2024-04-01', yieldDryGrams: 40 } }),
      plant({ id: 'plant-2', name: 'Second', genetic: 'Blue Test', harvest: { date: '2024-04-02', yieldDryGrams: 60 } }),
      plant({ id: 'plant-3', genetic: '   ', harvest: { date: '2024-04-03', yieldDryGrams: 20 } }),
    ], [grow]);

    expect(getYieldSummary(harvested)?.uniqueStrains).toBe(2);
    expect(getStrainStats(harvested).map(stat => stat.name)).toEqual(['Blue Test', 'Unknown']);
    expect(getGrowStats(harvested, [grow])[0].strains).toEqual(['Blue Test', 'Unknown']);
    expect(getYieldHistory(harvested).find(entry => entry.yieldDry === 40)).toMatchObject({
      plantName: 'First',
      strainName: 'Blue Test',
    });
  });

  it('groups strain and grow stats without losing missing grow references', () => {
    const harvested = getHarvestedPlants([
      plant({ id: 'plant-1', growId: 'missing-grow', genetic: 'Blue Test', harvest: { date: '2024-04-01', yieldDryGrams: 40 } }),
      plant({ id: 'plant-2', growId: 'grow-1', genetic: 'Blue Test', harvest: { date: '2024-04-02', yieldDryGrams: 60 } }),
    ], [grow]);

    expect(getStrainStats(harvested)[0]).toMatchObject({
      name: 'Blue Test',
      plantCount: 2,
      totalYield: 100,
      avgYield: 50,
    });
    expect(getGrowStats(harvested, [grow]).map(stat => stat.name)).toContain('Unknown Grow (missing-grow)');
  });

  it('builds chronological harvest history and running averages', () => {
    const harvested = getHarvestedPlants([
      plant({
        id: 'plant-1',
        name: 'First',
        harvest: { date: '2024-04-01T10:00:00.000Z', yieldDryGrams: 40, yieldWetGrams: 100 },
      }),
      plant({
        id: 'plant-2',
        name: 'Second',
        harvest: { date: '2024-04-03T10:00:00.000Z', yieldDryGrams: 80 },
      }),
      plant({
        id: 'plant-3',
        name: 'Invalid Date',
        harvest: { date: 'not-a-date', yieldDryGrams: 20 },
      }),
    ], [grow]);

    const history = getYieldHistory(harvested);

    expect(history.map(entry => entry.plantName)).toEqual(['Second', 'First']);
    expect(history[1].yieldWet).toBe(100);
    expect(getRunningYieldHistory(history).map(entry => entry.runningAvg)).toEqual([60, 40]);
  });
});
