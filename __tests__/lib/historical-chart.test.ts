import { describe, expect, it, vi } from 'vitest';
import { generateDemoData } from '@/components/historical-chart';
import { calculateVPD } from '@/lib/vpd-utils';

describe('historical chart utilities', () => {
  it('uses the shared VPD calculation for generated demo data', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-04-01T12:00:00.000Z').getTime());
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const [firstPoint] = generateDemoData();

    expect(firstPoint.vpd).toBe(calculateVPD(firstPoint.temperature!, firstPoint.humidity!));

    vi.restoreAllMocks();
  });
});
