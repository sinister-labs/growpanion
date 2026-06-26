import { afterEach, describe, expect, it, vi } from 'vitest';
import { Grow } from '@/lib/db';
import {
    calculateGrowTotalDays,
    calculatePhaseDurations,
    createInitialPhaseHistory,
    getDashboardActiveGrow,
    getDaysInPhase,
    getGrowElapsedDays,
} from '@/lib/growth-utils';
import { calculateDuration } from '@/lib/utils';

describe('growth utilities', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('uses the latest matching phase history entry for repeated phases', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-03-10T12:00:00.000Z'));

        const grow: Grow = {
            id: 'grow-1',
            name: 'Test Grow',
            startDate: '2024-01-01T00:00:00.000Z',
            currentPhase: 'Vegetative',
            phaseHistory: [
                { phase: 'Seedling', startDate: '2024-01-01T00:00:00.000Z' },
                { phase: 'Vegetative', startDate: '2024-01-15T00:00:00.000Z' },
                { phase: 'Flowering', startDate: '2024-02-01T00:00:00.000Z' },
                { phase: 'Vegetative', startDate: '2024-03-08T00:00:00.000Z' },
            ],
        };

        expect(getDaysInPhase(grow)).toBe(3);
    });

    it('does not turn future phase dates into positive durations', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-03-10T12:00:00.000Z'));

        const grow: Grow = {
            id: 'grow-1',
            name: 'Test Grow',
            startDate: '2024-03-20T00:00:00.000Z',
            currentPhase: 'Seedling',
            phaseHistory: [
                { phase: 'Seedling', startDate: '2024-03-20T00:00:00.000Z' },
            ],
        };

        expect(getDaysInPhase(grow)).toBe(0);
        expect(calculateDuration(grow.startDate)).toBe(0);
    });

    it('creates an initial phase history entry from the selected phase and start date', () => {
        expect(createInitialPhaseHistory('Flowering', '2024-04-15')).toEqual([
            {
                phase: 'Flowering',
                startDate: '2024-04-15T00:00:00.000Z',
            },
        ]);
    });

    it('calculates active grow total days and phase durations up to now', () => {
        const now = new Date('2024-03-10T12:00:00.000Z');
        const grow: Grow = {
            id: 'grow-1',
            name: 'Active Grow',
            startDate: '2024-03-01T00:00:00.000Z',
            currentPhase: 'Vegetative',
            phaseHistory: [
                { phase: 'Seedling', startDate: '2024-03-01T00:00:00.000Z' },
                { phase: 'Vegetative', startDate: '2024-03-05T00:00:00.000Z' },
            ],
        };

        expect(calculateGrowTotalDays(grow, now)).toBe(10);
        expect(calculatePhaseDurations(grow, now)).toEqual({
            Seedling: 4,
            Vegetative: 6,
        });
    });

    it('stops completed grow duration at the done phase marker', () => {
        const now = new Date('2024-04-01T00:00:00.000Z');
        const grow: Grow = {
            id: 'grow-1',
            name: 'Completed Grow',
            startDate: '2024-03-01T00:00:00.000Z',
            currentPhase: 'Done',
            phaseHistory: [
                { phase: 'Seedling', startDate: '2024-03-01T00:00:00.000Z' },
                { phase: 'Vegetative', startDate: '2024-03-05T00:00:00.000Z' },
                { phase: 'Flowering', startDate: '2024-03-20T00:00:00.000Z' },
                { phase: 'Done', startDate: '2024-03-25T00:00:00.000Z' },
            ],
        };

        expect(calculateGrowTotalDays(grow, now)).toBe(24);
        expect(getGrowElapsedDays(grow, now)).toBe(24);
        expect(calculatePhaseDurations(grow, now)).toEqual({
            Seedling: 4,
            Vegetative: 15,
            Flowering: 5,
        });
    });

    it('uses current time for active grow elapsed days', () => {
        const now = new Date('2024-04-01T00:00:00.000Z');
        const grow: Grow = {
            id: 'grow-1',
            name: 'Active Grow',
            startDate: '2024-03-20T00:00:00.000Z',
            currentPhase: 'Flowering',
            phaseHistory: [
                { phase: 'Seedling', startDate: '2024-03-20T00:00:00.000Z' },
                { phase: 'Flowering', startDate: '2024-03-25T00:00:00.000Z' },
            ],
        };

        expect(getGrowElapsedDays(grow, now)).toBe(12);
    });

    it('keeps legacy completed grows without a done marker from collapsing the last phase', () => {
        const now = new Date('2024-04-01T00:00:00.000Z');
        const grow: Grow = {
            id: 'grow-1',
            name: 'Legacy Completed Grow',
            startDate: '2024-03-01T00:00:00.000Z',
            currentPhase: 'Done',
            phaseHistory: [
                { phase: 'Seedling', startDate: '2024-03-01T00:00:00.000Z' },
                { phase: 'Flowering', startDate: '2024-03-10T00:00:00.000Z' },
            ],
        };

        expect(calculateGrowTotalDays(grow, now)).toBe(31);
        expect(calculatePhaseDurations(grow, now)).toEqual({
            Seedling: 9,
            Flowering: 22,
        });
    });

    it('selects only active grows for the dashboard', () => {
        const completedGrow: Grow = {
            id: 'done-grow',
            name: 'Done Grow',
            startDate: '2024-03-01T00:00:00.000Z',
            currentPhase: 'Done',
            phaseHistory: [
                { phase: 'Seedling', startDate: '2024-03-01T00:00:00.000Z' },
                { phase: 'Done', startDate: '2024-03-20T00:00:00.000Z' },
            ],
        };
        const activeGrow: Grow = {
            id: 'active-grow',
            name: 'Active Grow',
            startDate: '2024-03-01T00:00:00.000Z',
            currentPhase: 'Vegetative',
            phaseHistory: [
                { phase: 'Seedling', startDate: '2024-03-01T00:00:00.000Z' },
                { phase: 'Vegetative', startDate: '2024-03-10T00:00:00.000Z' },
            ],
        };

        expect(getDashboardActiveGrow([completedGrow, activeGrow], 'done-grow')).toBe(activeGrow);
        expect(getDashboardActiveGrow([completedGrow], 'done-grow')).toBeNull();
    });
});
