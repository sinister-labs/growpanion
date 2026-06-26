import { afterEach, describe, expect, it, vi } from 'vitest';
import { Plant } from '@/components/plant-modal/types';
import { getLastActivity, getPlantActivities } from '@/lib/plant-utils';

const basePlant: Plant = {
    id: 'plant-1',
    name: 'Plant 1',
    genetic: 'Test',
    manufacturer: 'Test',
    type: 'feminized',
    propagationMethod: 'seed'
};

describe('plant-utils', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('ignores activities with invalid dates', () => {
        const activities = getPlantActivities({
            ...basePlant,
            waterings: [{ date: 'not-a-date', amount: '100' }],
            hstRecords: [{ date: '2024-04-01', method: 'Topping' }]
        });

        expect(activities).toHaveLength(1);
        expect(activities[0].type).toBe('HST');
    });

    it('does not render negative days for future activity dates', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-04-01T12:00:00.000Z'));

        const lastActivity = getLastActivity({
            ...basePlant,
            waterings: [{ date: '2024-04-02T12:00:00.000Z', amount: '100' }]
        });

        expect(lastActivity).toBe('Watered 0 days ago (100 ml)');
    });

    it('includes harvest as a plant activity', () => {
        const activities = getPlantActivities({
            ...basePlant,
            waterings: [{ date: '2024-04-01T12:00:00.000Z', amount: '100' }],
            harvest: {
                date: '2024-04-03T12:00:00.000Z',
                yieldDryGrams: 42,
            },
            isHarvested: true,
        });

        expect(activities[0]).toMatchObject({
            type: 'Harvested',
            details: '42 g dry',
        });
    });

    it('ignores harvest activity with invalid dates', () => {
        const activities = getPlantActivities({
            ...basePlant,
            harvest: {
                date: 'not-a-date',
                yieldWetGrams: 100,
            },
            isHarvested: true,
        });

        expect(activities).toEqual([]);
    });
});
