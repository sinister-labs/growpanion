import { describe, expect, it } from 'vitest';
import {
    FertilizerMixDBSchema,
    GrowSchema,
    NotificationSettingsSchema,
    PlantDBSchema,
    ReminderSchema,
    SettingsSchema,
    StrainSchema,
} from '@/lib/validation-schemas';

describe('validation schemas', () => {
    it('preserves optional yield fields on persisted grows', () => {
        const result = GrowSchema.parse({
            id: 'grow-1',
            name: 'Grow 1',
            startDate: '2024-01-01',
            currentPhase: 'Flowering',
            phaseHistory: [{ phase: 'Seedling', startDate: '2024-01-01' }],
            expectedYield: 120,
            actualYield: 90,
        });

        expect(result.expectedYield).toBe(120);
        expect(result.actualYield).toBe(90);
    });

    it('trims required strings and rejects whitespace-only values', () => {
        const result = GrowSchema.parse({
            id: ' grow-1 ',
            name: ' Grow 1 ',
            startDate: '2024-01-01',
            currentPhase: 'Flowering',
            phaseHistory: [{ phase: 'Seedling', startDate: '2024-01-01' }],
        });

        expect(result.id).toBe('grow-1');
        expect(result.name).toBe('Grow 1');
        expect(GrowSchema.safeParse({
            id: 'grow-1',
            name: '   ',
            startDate: '2024-01-01',
            currentPhase: 'Flowering',
            phaseHistory: [{ phase: 'Seedling', startDate: '2024-01-01' }],
        }).success).toBe(false);
    });

    it('rejects impossible calendar dates instead of accepting Date.parse normalization', () => {
        const baseGrow = {
            id: 'grow-1',
            name: 'Grow 1',
            startDate: '2024-02-29',
            currentPhase: 'Flowering',
            phaseHistory: [{ phase: 'Seedling', startDate: '2024-01-01T00:00:00.000Z' }],
        };

        expect(GrowSchema.safeParse(baseGrow).success).toBe(true);
        expect(GrowSchema.safeParse({ ...baseGrow, startDate: '2024-02-30' }).success).toBe(false);
        expect(GrowSchema.safeParse({
            ...baseGrow,
            phaseHistory: [{ phase: 'Seedling', startDate: '2024-02-31T00:00:00.000Z' }],
        }).success).toBe(false);
    });

    it('requires persisted plants to have a grow id and complete plant fields', () => {
        const result = PlantDBSchema.safeParse({
            id: 'plant-1',
            growId: 'grow-1',
            name: 'Plant 1',
            genetic: 'Northern Lights',
            manufacturer: 'Sensi',
            type: 'feminized',
            propagationMethod: 'seed',
        });

        expect(result.success).toBe(true);
        expect(PlantDBSchema.safeParse({ id: 'plant-1', name: 'Plant 1' }).success).toBe(false);
    });

    it('preserves harvest fields on persisted plants', () => {
        const result = PlantDBSchema.parse({
            id: 'plant-1',
            growId: 'grow-1',
            name: 'Plant 1',
            genetic: 'Northern Lights',
            manufacturer: 'Sensi',
            type: 'feminized',
            propagationMethod: 'seed',
            isHarvested: true,
            harvest: {
                date: '2024-04-01',
                yieldWetGrams: 120,
                yieldDryGrams: 30,
                notes: 'Good run',
            },
        });

        expect(result.isHarvested).toBe(true);
        expect(result.harvest?.yieldDryGrams).toBe(30);
    });

    it('rejects impossible harvest dry weight', () => {
        const result = PlantDBSchema.safeParse({
            id: 'plant-1',
            growId: 'grow-1',
            name: 'Plant 1',
            genetic: 'Northern Lights',
            manufacturer: 'Sensi',
            type: 'feminized',
            propagationMethod: 'seed',
            isHarvested: true,
            harvest: {
                date: '2024-04-01',
                yieldWetGrams: 120,
                yieldDryGrams: 140,
            },
        });

        expect(result.success).toBe(false);
    });

    it('rejects watering records with non-positive or non-numeric amounts', () => {
        const basePlant = {
            id: 'plant-1',
            growId: 'grow-1',
            name: 'Plant 1',
            genetic: 'Northern Lights',
            manufacturer: 'Sensi',
            type: 'feminized',
            propagationMethod: 'seed',
            waterings: [{ date: '2024-04-01', amount: '500' }],
        };

        expect(PlantDBSchema.safeParse(basePlant).success).toBe(true);
        expect(PlantDBSchema.safeParse({
            ...basePlant,
            waterings: [{ date: '2024-04-01', amount: '0' }],
        }).success).toBe(false);
        expect(PlantDBSchema.safeParse({
            ...basePlant,
            waterings: [{ date: '2024-04-01', amount: '-100' }],
        }).success).toBe(false);
        expect(PlantDBSchema.safeParse({
            ...basePlant,
            waterings: [{ date: '2024-04-01', amount: 'abc' }],
        }).success).toBe(false);
    });

    it('requires fertilizer mixes to include a grow id and at least one fertilizer', () => {
        const result = FertilizerMixDBSchema.safeParse({
            id: 'mix-1',
            growId: 'grow-1',
            name: 'Veg Mix',
            description: 'Base feed',
            waterAmount: '10',
            fertilizers: [{ name: 'Base', amount: '20' }],
        });

        expect(result.success).toBe(true);
        expect(result.success && result.data.description).toBe('Base feed');
        expect(FertilizerMixDBSchema.safeParse({
            id: 'mix-1',
            growId: 'grow-1',
            name: 'Empty Mix',
            waterAmount: '10',
            fertilizers: [],
        }).success).toBe(false);
    });

    it('rejects fertilizer mixes with non-positive or non-numeric amounts', () => {
        const baseMix = {
            id: 'mix-1',
            growId: 'grow-1',
            name: 'Veg Mix',
            waterAmount: '1000',
            fertilizers: [{ name: 'Base', amount: '2.5' }],
        };

        expect(FertilizerMixDBSchema.safeParse(baseMix).success).toBe(true);
        expect(FertilizerMixDBSchema.safeParse({ ...baseMix, waterAmount: '0' }).success).toBe(false);
        expect(FertilizerMixDBSchema.safeParse({ ...baseMix, waterAmount: '-1000' }).success).toBe(false);
        expect(FertilizerMixDBSchema.safeParse({ ...baseMix, waterAmount: 'abc' }).success).toBe(false);
        expect(FertilizerMixDBSchema.safeParse({
            ...baseMix,
            fertilizers: [{ name: 'Base', amount: '0' }],
        }).success).toBe(false);
        expect(FertilizerMixDBSchema.safeParse({
            ...baseMix,
            fertilizers: [{ name: 'Base', amount: 'abc' }],
        }).success).toBe(false);
    });

    it('validates strain numeric ranges', () => {
        const valid = StrainSchema.safeParse({
            id: 'strain-1',
            name: 'Test Strain',
            breeder: 'Breeder',
            genetics: 'Hybrid',
            thcPercent: 20,
        });
        const invalid = StrainSchema.safeParse({
            id: 'strain-1',
            name: 'Test Strain',
            breeder: 'Breeder',
            genetics: 'Hybrid',
            thcPercent: 80,
        });

        expect(valid.success).toBe(true);
        expect(invalid.success).toBe(false);
    });

    it('rejects invalid reminder intervals and due dates', () => {
        const baseReminder = {
            id: 'reminder-1',
            growId: 'grow-1',
            type: 'watering',
            title: 'Water',
            intervalDays: 2,
            nextDue: '2024-04-01T09:00:00.000Z',
            enabled: true,
            createdAt: '2024-04-01T09:00:00.000Z',
            updatedAt: '2024-04-01T09:00:00.000Z',
        };

        expect(ReminderSchema.safeParse(baseReminder).success).toBe(true);
        expect(ReminderSchema.safeParse({ ...baseReminder, intervalDays: -1 }).success).toBe(false);
        expect(ReminderSchema.safeParse({ ...baseReminder, nextDue: 'not-a-date' }).success).toBe(false);
    });

    it('validates notification singleton settings and time format', () => {
        const baseSettings = {
            id: 'notification-settings',
            enabled: true,
            permission: 'default',
            defaultReminderTime: '09:00',
            soundEnabled: true,
        };

        expect(NotificationSettingsSchema.safeParse(baseSettings).success).toBe(true);
        expect(NotificationSettingsSchema.safeParse({ ...baseSettings, id: 'wrong' }).success).toBe(false);
        expect(NotificationSettingsSchema.safeParse({ ...baseSettings, defaultReminderTime: '25:99' }).success).toBe(false);
    });

    it('keeps sensor decimal place limits aligned with sensor normalization', () => {
        const baseSettings = {
            id: 'global',
            sensors: [{
                id: 'sensor-1',
                name: 'Tent Sensor',
                tuyaId: 'device-1',
                type: 'Temperature',
                values: [{ code: 'temp_current', decimalPlaces: 2 }],
            }],
        };

        expect(SettingsSchema.safeParse(baseSettings).success).toBe(true);
        expect(SettingsSchema.safeParse({
            ...baseSettings,
            sensors: [{
                ...baseSettings.sensors[0],
                values: [{ code: 'temp_current', decimalPlaces: 0 }],
            }],
        }).success).toBe(false);
        expect(SettingsSchema.safeParse({
            ...baseSettings,
            sensors: [{
                ...baseSettings.sensors[0],
                values: [{ code: 'temp_current', decimalPlaces: 4 }],
            }],
        }).success).toBe(false);
    });

    it('trims optional settings strings and sensor value codes', () => {
        const result = SettingsSchema.parse({
            id: 'global',
            tuyaClientId: ' client-id ',
            tuyaClientSecret: ' secret ',
            sensors: [{
                id: ' sensor-1 ',
                name: ' Tent Sensor ',
                tuyaId: ' device-1 ',
                type: 'Temperature',
                values: [{ code: ' temp_current ', decimalPlaces: 2 }],
            }],
        });

        expect(result.tuyaClientId).toBe('client-id');
        expect(result.tuyaClientSecret).toBe('secret');
        expect(result.sensors?.[0]).toMatchObject({
            id: 'sensor-1',
            name: 'Tent Sensor',
            tuyaId: 'device-1',
            values: [{ code: 'temp_current', decimalPlaces: 2 }],
        });
    });
});
