import { describe, expect, it } from 'vitest';
import {
  normalizeSubstrateRecord,
  normalizeTrainingRecord,
  normalizeWateringRecord,
} from '@/lib/plant-modal-utils';

describe('plant modal utilities', () => {
  it('removes empty fertilizer mix references from watering records', () => {
    expect(normalizeWateringRecord({
      date: '2024-04-01',
      amount: ' 500 ',
      mixId: '',
    })).toEqual({
      date: '2024-04-01',
      amount: '500',
    });

    expect(normalizeWateringRecord({
      date: '2024-04-01',
      amount: '500',
      mixId: '   ',
    })).toEqual({
      date: '2024-04-01',
      amount: '500',
    });
  });

  it('keeps trimmed fertilizer mix ids when a mix is selected', () => {
    expect(normalizeWateringRecord({
      date: '2024-04-01',
      amount: ' 750 ',
      mixId: ' mix-1 ',
    })).toEqual({
      date: '2024-04-01',
      amount: '750',
      mixId: 'mix-1',
    });
  });

  it('normalizes training records and removes blank notes', () => {
    expect(normalizeTrainingRecord({
      date: ' 2024-04-02 ',
      method: ' Topping ',
      notes: '   ',
    })).toEqual({
      date: '2024-04-02',
      method: 'Topping',
    });

    expect(normalizeTrainingRecord({
      date: '2024-04-02',
      method: ' Bending ',
      notes: ' Tie lower branches ',
    })).toEqual({
      date: '2024-04-02',
      method: 'Bending',
      notes: 'Tie lower branches',
    });
  });

  it('normalizes substrate records and removes blank notes', () => {
    expect(normalizeSubstrateRecord({
      date: ' 2024-04-03 ',
      action: 'repotting',
      substrateType: ' Living Soil ',
      potSize: ' 11 ',
      notes: '   ',
    })).toEqual({
      date: '2024-04-03',
      action: 'repotting',
      substrateType: 'Living Soil',
      potSize: '11',
    });
  });
});
