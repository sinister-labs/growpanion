import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    applySensorDecimalPlaces,
    buildSensorValuesFromSelection,
    getLastUpdatedText,
    normalizeDecimalPlaces,
    normalizeSensorConfig,
    normalizeSensorValues,
    toggleSensorPropertySelection
} from '@/lib/sensor-utils';

describe('sensor utilities', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not show negative elapsed time for future updates', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-04-01T12:00:00.000Z'));

        expect(getLastUpdatedText(new Date('2024-04-01T12:00:30.000Z'))).toBe('0 seconds ago');
    });

    it('returns an empty label for invalid dates', () => {
        expect(getLastUpdatedText(new Date('not-a-date'))).toBe('');
    });

    it('normalizes legacy sensor value arrays and removes blank duplicates', () => {
        expect(normalizeSensorValues([
            ' temp_current ',
            { code: 'humidity_value', decimalPlaces: 1 },
            'temp_current',
            ' ',
        ])).toEqual([
            { code: 'temp_current' },
            { code: 'humidity_value', decimalPlaces: 1 },
        ]);
    });

    it('drops invalid decimal place settings while keeping supported values', () => {
        expect(normalizeDecimalPlaces('2')).toBe(2);
        expect(normalizeDecimalPlaces(3)).toBe(3);
        expect(normalizeDecimalPlaces(0)).toBeUndefined();
        expect(normalizeDecimalPlaces(Number.NaN)).toBeUndefined();
        expect(normalizeDecimalPlaces(4)).toBeUndefined();

        expect(normalizeSensorValues([
            { code: 'temp_current', decimalPlaces: Number.NaN },
            { code: 'humidity_value', decimalPlaces: '2' as unknown as number },
            { code: 'co2_value', decimalPlaces: 4 },
        ])).toEqual([
            { code: 'temp_current', decimalPlaces: undefined },
            { code: 'humidity_value', decimalPlaces: 2 },
            { code: 'co2_value', decimalPlaces: undefined },
        ]);
    });

    it('trims sensor config fields while preserving typed value settings', () => {
        const result = normalizeSensorConfig({
            id: 'sensor-1',
            name: ' Tent ',
            tuyaId: ' device-1 ',
            type: 'Temperature',
            values: [{ code: ' temp_current ', decimalPlaces: 1 }],
        });

        expect(result.name).toBe('Tent');
        expect(result.tuyaId).toBe('device-1');
        expect(result.values).toEqual([{ code: 'temp_current', decimalPlaces: 1 }]);
    });

    it('treats missing legacy sensor values as an empty configuration', () => {
        const result = normalizeSensorConfig({
            id: 'sensor-1',
            name: 'Tent',
            tuyaId: 'device-1',
            type: 'Temperature',
        } as unknown as Parameters<typeof normalizeSensorConfig>[0]);

        expect(result.values).toEqual([]);
    });

    it('drops malformed legacy sensor value objects instead of throwing', () => {
        expect(normalizeSensorValues([
            { code: 'temp_current' },
            { code: undefined } as unknown as Parameters<typeof normalizeSensorValues>[0][number],
            { label: 'bad' } as unknown as Parameters<typeof normalizeSensorValues>[0][number],
            null as unknown as Parameters<typeof normalizeSensorValues>[0][number],
        ])).toEqual([
            { code: 'temp_current', decimalPlaces: undefined },
        ]);
    });

    it('removes stale decimal places when a tested sensor property is deselected', () => {
        expect(toggleSensorPropertySelection(
            ['temp_current', 'humidity_value'],
            { temp_current: 1, humidity_value: 2 },
            'humidity_value'
        )).toEqual({
            selectedProperties: ['temp_current'],
            decimalPlacesByCode: { temp_current: 1 },
        });
    });

    it('builds normalized sensor values from tested property selections', () => {
        expect(buildSensorValuesFromSelection(
            [' temp_current ', 'humidity_value', 'temp_current'],
            { temp_current: 1, humidity_value: 2 }
        )).toEqual([
            { code: 'temp_current', decimalPlaces: 1 },
            { code: 'humidity_value', decimalPlaces: 2 },
        ]);
    });

    it('applies sensor decimal places only to complete numeric values', () => {
        expect(applySensorDecimalPlaces(246, 1)).toBe(24.6);
        expect(applySensorDecimalPlaces('246', 1)).toBe(24.6);
        expect(applySensorDecimalPlaces('', 1)).toBe('');
        expect(applySensorDecimalPlaces('246abc', 1)).toBe('246abc');
        expect(applySensorDecimalPlaces(true, 1)).toBe('On');
    });
});
