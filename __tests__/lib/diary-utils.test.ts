import { describe, expect, it } from 'vitest';
import { Grow, PlantDB } from '@/lib/db';
import {
    aggregateGrowEvents,
    filterEventsByDateRange,
    formatDiaryDate,
    formatDiaryTime,
    formatEventForExport,
    getEventStats,
    groupEventsByDate,
} from '@/lib/diary-utils';

const grow: Grow = {
    id: 'grow-1',
    name: 'Diary Grow',
    startDate: '2024-01-01T00:00:00.000Z',
    currentPhase: 'Flowering',
    phaseHistory: [
        { phase: 'Seedling', startDate: '2024-01-01T00:00:00.000Z' },
        { phase: 'Flowering', startDate: '2024-02-01T00:00:00.000Z' },
    ],
};

describe('diary utilities', () => {
    it('includes harvest events in aggregation and statistics', () => {
        const plants: PlantDB[] = [
            {
                id: 'plant-1',
                growId: 'grow-1',
                name: 'Plant One',
                genetic: 'Test Kush',
                manufacturer: 'GrowPanion',
                type: 'feminized',
                propagationMethod: 'seed',
                harvest: {
                    date: '2024-03-01T10:00:00.000Z',
                    yieldDryGrams: 42,
                    notes: 'Dense flowers',
                },
                isHarvested: true,
            },
        ];

        const events = aggregateGrowEvents(grow, plants);
        const harvestEvent = events.find(event => event.type === 'harvest');

        expect(harvestEvent).toMatchObject({
            title: 'Harvest',
            plantName: 'Plant One',
            description: '42g dry - Dense flowers',
        });
        expect(getEventStats(events).harvest).toBe(1);
    });

    it('keeps events on the selected end date', () => {
        const events = [
            {
                id: 'watering-1',
                type: 'watering' as const,
                date: '2024-03-10T18:30:00.000Z',
                title: 'Watering',
                description: '500ml',
            },
        ];

        expect(filterEventsByDateRange(events, '2024-03-10', '2024-03-10')).toHaveLength(1);
    });

    it('ignores invalid date range boundaries instead of filtering all events', () => {
        const events = [
            {
                id: 'watering-1',
                type: 'watering' as const,
                date: '2024-03-10T18:30:00.000Z',
                title: 'Watering',
                description: '500ml',
            },
        ];

        expect(filterEventsByDateRange(events, 'not-a-date', '2024-03-10')).toHaveLength(1);
        expect(filterEventsByDateRange(events, '2024-03-10', 'not-a-date')).toHaveLength(1);
    });

    it('ignores invalid event dates while grouping', () => {
        const grouped = groupEventsByDate([
            {
                id: 'bad-event',
                type: 'watering',
                date: 'not-a-date',
                title: 'Bad event',
                description: 'Invalid date',
            },
            {
                id: 'good-event',
                type: 'watering',
                date: '2024-03-10T18:30:00.000Z',
                title: 'Watering',
                description: '500ml',
            },
        ]);

        expect(Array.from(grouped.keys())).toEqual(['2024-03-10']);
        expect(grouped.get('2024-03-10')).toHaveLength(1);
    });

    it('formats invalid diary dates with a stable fallback', () => {
        expect(formatDiaryDate('not-a-date')).toBe('Unknown date');
        expect(formatDiaryTime('not-a-date')).toBe('');
        expect(formatEventForExport({
            id: 'bad-event',
            type: 'watering',
            date: 'not-a-date',
            title: 'Watering',
            description: '500ml',
        })).toBe('Unknown date: Watering - 500ml');
    });
});
