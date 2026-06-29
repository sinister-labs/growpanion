import { describe, expect, it } from 'vitest';
import { getIrrigationGrowEventType, getSubstrateGrowEventType } from '@/components/grow-wizards';

describe('grow wizards', () => {
  it('stores repotting and substrate setup as distinct Product OS event types', () => {
    expect(getSubstrateGrowEventType('repotting')).toBe('transplant');
    expect(getSubstrateGrowEventType('potting')).toBe('substrate_change');
  });

  it('stores clear water and nutrient batch irrigation as distinct Product OS event types', () => {
    expect(getIrrigationGrowEventType('')).toBe('watering');
    expect(getIrrigationGrowEventType('prepared-batch-1')).toBe('feeding');
  });
});
