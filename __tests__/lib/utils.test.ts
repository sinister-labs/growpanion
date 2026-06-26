import { describe, expect, it, vi, afterEach } from 'vitest';
import { calculateDuration, formatDate } from '@/lib/utils';

describe('shared utilities', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not format invalid dates as browser error text', () => {
        expect(formatDate('not-a-date')).toBe('Unknown date');
    });

    it('does not return positive durations for invalid or future dates', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-03-10T12:00:00.000Z'));

        expect(calculateDuration('not-a-date')).toBe(0);
        expect(calculateDuration('2024-03-20T00:00:00.000Z')).toBe(0);
    });
});
