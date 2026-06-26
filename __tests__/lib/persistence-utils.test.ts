import { describe, expect, it } from 'vitest';
import type { PlantDB } from '@/lib/db';
import {
  getFertilizerMixReferenceError,
  getPlantReferenceError,
  getReminderReferenceError,
  isDueAt,
  removeFertilizerMixReferences,
} from '@/lib/persistence-utils';

const plant = (overrides: Partial<PlantDB>): PlantDB => ({
  id: 'plant-1',
  growId: 'grow-1',
  name: 'Plant 1',
  genetic: 'Blue Test',
  manufacturer: 'GrowPanion',
  type: 'feminized',
  propagationMethod: 'seed',
  ...overrides,
});

describe('persistence utilities', () => {
  it('removes deleted fertilizer mix references from watering records', () => {
    const updatedPlants = removeFertilizerMixReferences([
      plant({
        waterings: [
          { date: '2024-04-01', amount: '500', mixId: 'mix-1' },
          { date: '2024-04-02', amount: '600', mixId: 'mix-2' },
          { date: '2024-04-03', amount: '700' },
        ],
      }),
    ], 'mix-1');

    expect(updatedPlants).toHaveLength(1);
    expect(updatedPlants[0].waterings).toEqual([
      { date: '2024-04-01', amount: '500' },
      { date: '2024-04-02', amount: '600', mixId: 'mix-2' },
      { date: '2024-04-03', amount: '700' },
    ]);
  });

  it('returns only plants that actually changed', () => {
    const unchanged = plant({
      id: 'plant-1',
      waterings: [{ date: '2024-04-01', amount: '500', mixId: 'mix-2' }],
    });
    const changed = plant({
      id: 'plant-2',
      waterings: [{ date: '2024-04-01', amount: '500', mixId: 'mix-1' }],
    });

    const updatedPlants = removeFertilizerMixReferences([unchanged, changed], 'mix-1');

    expect(updatedPlants).toHaveLength(1);
    expect(updatedPlants[0].id).toBe('plant-2');
    expect(updatedPlants[0].waterings).toEqual([{ date: '2024-04-01', amount: '500' }]);
  });

  it('does not update anything for an empty mix id', () => {
    expect(removeFertilizerMixReferences([
      plant({ waterings: [{ date: '2024-04-01', amount: '500', mixId: 'mix-1' }] }),
    ], '')).toEqual([]);
  });

  it('checks reminder due dates by parsed time instead of string ordering', () => {
    const now = new Date('2024-04-01T10:00:00.000Z');

    expect(isDueAt('2024-04-01T09:59:59.000Z', now)).toBe(true);
    expect(isDueAt('2024-04-01T10:00:01.000Z', now)).toBe(false);
    expect(isDueAt('April 1, 2024 09:00:00 UTC', now)).toBe(true);
  });

  it('ignores empty or invalid reminder due dates', () => {
    const now = new Date('2024-04-01T10:00:00.000Z');

    expect(isDueAt(undefined, now)).toBe(false);
    expect(isDueAt('', now)).toBe(false);
    expect(isDueAt('not-a-date', now)).toBe(false);
    expect(isDueAt('2024-04-01T09:00:00.000Z', new Date('not-a-date'))).toBe(false);
  });

  it('rejects plants and fertilizer mixes that reference missing grows', () => {
    expect(getPlantReferenceError({ growId: 'grow-1' }, true)).toBeNull();
    expect(getPlantReferenceError({ growId: 'missing-grow' }, false)).toBe(
      'Plant references missing grow: missing-grow',
    );

    expect(getFertilizerMixReferenceError({ growId: 'grow-1' }, true)).toBeNull();
    expect(getFertilizerMixReferenceError({ growId: 'missing-grow' }, false)).toBe(
      'Fertilizer mix references missing grow: missing-grow',
    );
  });

  it('rejects reminders with missing or cross-grow references', () => {
    expect(getReminderReferenceError({ growId: 'grow-1' }, true, undefined)).toBeNull();
    expect(getReminderReferenceError({ growId: 'missing-grow' }, false, undefined)).toBe(
      'Reminder references missing grow: missing-grow',
    );
    expect(getReminderReferenceError({ growId: 'grow-1', plantId: 'plant-1' }, true, undefined)).toBe(
      'Reminder references missing plant: plant-1',
    );
    expect(getReminderReferenceError({ growId: 'grow-1', plantId: 'plant-2' }, true, { growId: 'grow-2' })).toBe(
      'Reminder plant does not belong to grow: plant-2',
    );
    expect(getReminderReferenceError({ growId: 'grow-1', plantId: 'plant-1' }, true, { growId: 'grow-1' })).toBeNull();
  });
});
