import { describe, expect, it } from 'vitest';
import { Grow, PlantDB } from '@/lib/db';
import {
    aggregateGrowEvents,
    aggregateProductTimeline,
    buildSensorTimelineLanes,
    buildTimelineBeforeAfterAnalysis,
    DEFAULT_SENSOR_TIMELINE_METRICS,
    filterEventsByDateRange,
    filterEventsByPhenotype,
    filterEventsByPlant,
    filterEventsByStructuredType,
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

    it('filters events by plant id while keeping all events when no plant is selected', () => {
        const events = [
            {
                id: 'plant-event',
                type: 'grow_event' as const,
                date: '2024-03-10T18:30:00.000Z',
                title: 'Plant event',
                description: 'Plant scoped',
                plantId: 'plant-1',
            },
            {
                id: 'grow-event',
                type: 'grow_event' as const,
                date: '2024-03-10T19:30:00.000Z',
                title: 'Grow event',
                description: 'Grow scoped',
            },
        ];

        expect(filterEventsByPlant(events)).toHaveLength(2);
        expect(filterEventsByPlant(events, 'plant-1')).toEqual([events[0]]);
    });

    it('filters events by phenotype id while keeping all events when no phenotype is selected', () => {
        const events = [
            {
                id: 'phenotype-event',
                type: 'grow_event' as const,
                date: '2024-03-10T18:30:00.000Z',
                title: 'Phenotype event',
                description: 'Phenotype scoped',
                phenotypeId: 'phenotype-1',
            },
            {
                id: 'other-event',
                type: 'grow_event' as const,
                date: '2024-03-10T19:30:00.000Z',
                title: 'Other event',
                description: 'Other scoped',
                phenotypeId: 'phenotype-2',
            },
        ];

        expect(filterEventsByPhenotype(events)).toHaveLength(2);
        expect(filterEventsByPhenotype(events, 'phenotype-1')).toEqual([events[0]]);
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

    it('aggregates structured grow events and telemetry readings into the timeline view', () => {
        const plants: PlantDB[] = [
            {
                id: 'plant-1',
                growId: 'grow-1',
                name: 'Plant One',
                phenotypeId: 'phenotype-1',
                genetic: 'Test Kush',
                manufacturer: 'GrowPanion',
                type: 'feminized',
                propagationMethod: 'seed',
            },
        ];

        const events = aggregateProductTimeline(
            grow,
            plants,
            [{
                id: 'event-1',
                growId: 'grow-1',
                plantId: 'plant-1',
                phenotypeId: 'phenotype-1',
                type: 'training',
                title: 'HST: Topping',
                photoIds: ['photo-1'],
                occurredAt: '2024-02-10T12:00:00.000Z',
                createdAt: '2024-02-10T12:00:00.000Z',
            }],
            [{
                id: 'reading-1',
                growId: 'grow-1',
                plantId: 'plant-1',
                phenotypeId: 'phenotype-1',
                metric: 'water_consumption',
                value: 1.2,
                unit: 'L',
                recordedAt: '2024-02-11T12:00:00.000Z',
                source: 'manual',
            }],
            [{
                id: 'photo-1',
                growId: 'grow-1',
                plantId: 'plant-1',
                phenotypeId: 'phenotype-1',
                uri: 'data:image/png;base64,abc',
                takenAt: '2024-02-10T12:00:00.000Z',
                createdAt: '2024-02-10T12:00:00.000Z',
            }]
        );

        expect(events[0]).toMatchObject({
            id: 'telemetry-reading-1',
            type: 'telemetry',
            title: 'Water Consumption',
            plantName: 'Plant One',
            phenotypeId: 'phenotype-1',
        });
        expect(events.find(event => event.id === 'grow-event-event-1')).toMatchObject({
            type: 'grow_event',
            plantName: 'Plant One',
            phenotypeId: 'phenotype-1',
            structuredEventType: 'training',
            title: 'HST: Topping',
            mediaUris: ['data:image/png;base64,abc'],
            details: {
                eventType: 'training',
                photoIds: 'photo-1',
            },
        });
        expect(getEventStats(events)).toMatchObject({
            grow_event: 1,
            telemetry: 1,
        });
    });

    it('filters structured Product OS events by their concrete event type', () => {
        const events = [
            {
                id: 'grow-event-training',
                type: 'grow_event' as const,
                structuredEventType: 'lst' as const,
                date: '2024-03-10T18:30:00.000Z',
                title: 'LST',
                description: 'Tie down',
            },
            {
                id: 'grow-event-problem',
                type: 'grow_event' as const,
                structuredEventType: 'problem' as const,
                date: '2024-03-10T19:30:00.000Z',
                title: 'Problem',
                description: 'Leaf spots',
            },
            {
                id: 'telemetry-1',
                type: 'telemetry' as const,
                date: '2024-03-10T20:30:00.000Z',
                title: 'Temperature',
                description: '24 °C',
            },
        ];

        expect(filterEventsByStructuredType(events, ['problem'])).toEqual([events[1], events[2]]);
        expect(filterEventsByStructuredType(events, [])).toEqual(events);
    });

    it('builds normalized sensor timeline lanes from telemetry readings', () => {
        const lanes = buildSensorTimelineLanes([
            {
                id: 'temp-1',
                growId: 'grow-1',
                metric: 'temperature',
                value: 24,
                unit: '°C',
                recordedAt: '2024-02-10T10:00:00.000Z',
                source: 'manual',
            },
            {
                id: 'temp-2',
                growId: 'grow-1',
                metric: 'temperature',
                value: 28,
                unit: '°C',
                recordedAt: '2024-02-10T12:00:00.000Z',
                source: 'manual',
            },
            {
                id: 'vpd-1',
                growId: 'grow-1',
                metric: 'air_vpd',
                value: 1.2,
                unit: 'kPa',
                recordedAt: '2024-02-10T12:00:00.000Z',
                source: 'manual',
            },
            {
                id: 'bad',
                growId: 'grow-1',
                metric: 'humidity',
                value: 60,
                unit: '%',
                recordedAt: 'not-a-date',
                source: 'manual',
            },
        ], ['temperature', 'humidity', 'air_vpd']);

        expect(lanes.map(lane => lane.metric)).toEqual(['temperature', 'air_vpd']);
        expect(lanes[0]).toMatchObject({
            label: 'Temperature',
            min: 24,
            max: 28,
        });
        expect(lanes[0].points.map(point => point.positionPercent)).toEqual([0, 100]);
        expect(lanes[1].points[0].positionPercent).toBe(50);
    });

    it('includes Product OS telemetry metrics as default sensor timeline lanes', () => {
        expect(DEFAULT_SENSOR_TIMELINE_METRICS).toEqual(expect.arrayContaining([
            'temperature',
            'humidity',
            'air_vpd',
            'leaf_temperature',
            'leaf_vpd',
            'pot_weight',
            'water_consumption',
            'ppfd',
            'dli',
            'ec',
            'ph',
            'drain_ec',
            'drain_ph',
            'drain_volume',
        ]));

        const lanes = buildSensorTimelineLanes([
            {
                id: 'leaf-vpd-1',
                growId: 'grow-1',
                metric: 'leaf_vpd',
                value: 1.1,
                unit: 'kPa',
                recordedAt: '2024-02-10T10:00:00.000Z',
                source: 'manual',
            },
            {
                id: 'ph-1',
                growId: 'grow-1',
                metric: 'ph',
                value: 6.2,
                unit: 'pH',
                recordedAt: '2024-02-10T10:00:00.000Z',
                source: 'manual',
            },
            {
                id: 'drain-ph-1',
                growId: 'grow-1',
                metric: 'drain_ph',
                value: 6.4,
                unit: 'pH',
                recordedAt: '2024-02-10T10:00:00.000Z',
                source: 'manual',
            },
        ]);

        expect(lanes.map(lane => lane.metric)).toEqual(['leaf_vpd', 'ph', 'drain_ph']);
    });

    it('builds scoped before and after analysis for a selectable timeline window', () => {
        const analysis = buildTimelineBeforeAfterAnalysis([
            {
                id: 'before-1',
                growId: 'grow-1',
                plantId: 'plant-1',
                metric: 'pot_weight',
                value: 10,
                unit: 'kg',
                recordedAt: '2024-02-10T10:00:00.000Z',
                source: 'manual',
            },
            {
                id: 'before-2',
                growId: 'grow-1',
                plantId: 'plant-1',
                metric: 'pot_weight',
                value: 11,
                unit: 'kg',
                recordedAt: '2024-02-10T11:00:00.000Z',
                source: 'manual',
            },
            {
                id: 'after-1',
                growId: 'grow-1',
                plantId: 'plant-1',
                metric: 'pot_weight',
                value: 13,
                unit: 'kg',
                recordedAt: '2024-02-10T13:00:00.000Z',
                source: 'manual',
            },
            {
                id: 'other-plant',
                growId: 'grow-1',
                plantId: 'plant-2',
                metric: 'pot_weight',
                value: 99,
                unit: 'kg',
                recordedAt: '2024-02-10T13:00:00.000Z',
                source: 'manual',
            },
            {
                id: 'outside-window',
                growId: 'grow-1',
                plantId: 'plant-1',
                metric: 'pot_weight',
                value: 20,
                unit: 'kg',
                recordedAt: '2024-02-09T08:00:00.000Z',
                source: 'manual',
            },
        ], {
            date: '2024-02-10T12:00:00.000Z',
            plantId: 'plant-1',
        }, ['pot_weight'], 6);

        expect(analysis).toEqual([{
            metric: 'pot_weight',
            label: 'Pot Weight',
            unit: 'kg',
            beforeAverage: 10.5,
            afterAverage: 13,
            beforeCount: 2,
            afterCount: 1,
            delta: 2.5,
            deltaPercent: 23.8,
            direction: 'up',
        }]);
    });
});
