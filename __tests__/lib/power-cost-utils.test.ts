import { describe, expect, it } from 'vitest';
import {
  POWER_CONSUMER_TEMPLATES,
  calculateConsumerDailyKwh,
  calculatePowerCost,
  createPowerConsumerInputFromDevice,
  createPowerConsumerInputFromRuntimeTelemetry,
  createPowerConsumerInputFromRecord,
  createPowerConsumerRecord,
  createPowerCostProfileRecord,
} from '@/lib/power-cost-utils';

describe('power cost utilities', () => {
  it('calculates daily kWh for consumers with count and hours', () => {
    expect(calculateConsumerDailyKwh({
      id: 'fan',
      label: 'Fan',
      watts: 30,
      hoursPerDay: 24,
      count: 2,
    })).toBe(1.44);
  });

  it('provides explicit Product OS consumer templates for the calculator inputs', () => {
    expect(POWER_CONSUMER_TEMPLATES.map(consumer => consumer.id)).toEqual(expect.arrayContaining([
      'exhaust',
      'intake',
      'circulation',
      'humidifier',
      'dehumidifier',
      'air_conditioner',
      'heating_mat',
      'pumps',
      'other_consumers',
    ]));
    expect(POWER_CONSUMER_TEMPLATES.map(consumer => consumer.label)).toEqual(expect.arrayContaining([
      'Abluftanlage',
      'Aktive Zuluft',
      'Umluft-Ventilation',
      'Luftbefeuchter',
      'Luftentfeuchter',
      'Klimagerät',
      'Heizmatte',
      'Pumpen',
      'Sonstige Verbraucher',
    ]));
  });

  it('calculates phase-based grow cost and optional per-plant/per-gram metrics', () => {
    const result = calculatePowerCost({
      vegDays: 10,
      flowerDays: 20,
      vegLightWatts: 100,
      flowerLightWatts: 200,
      vegLightHours: 18,
      flowerLightHours: 12,
      ballastMultiplier: 1,
      centPerKwh: 50,
      plantCount: 2,
      harvestGrams: 100,
      additionalConsumers: [
        { id: 'fan', label: 'Fan', watts: 10, hoursPerDay: 24 },
      ],
    });

    expect(result.totalKwh).toBe(73.2);
    expect(result.totalCost).toBe(36.6);
    expect(result.costPerPlant).toBe(18.3);
    expect(result.costPerGram).toBe(0.37);
    expect(result.phases.map(phase => phase.name)).toEqual(['Growth', 'Flower']);
  });

  it('applies additional consumers only to their configured grow phase', () => {
    const result = calculatePowerCost({
      vegDays: 10,
      flowerDays: 10,
      vegLightWatts: 0,
      flowerLightWatts: 0,
      vegLightHours: 0,
      flowerLightHours: 0,
      ballastMultiplier: 1,
      centPerKwh: 100,
      additionalConsumers: [
        { id: 'humidifier', label: 'Humidifier', watts: 100, hoursPerDay: 10, phase: 'growth' },
        { id: 'dehumidifier', label: 'Dehumidifier', watts: 200, hoursPerDay: 10, phase: 'flower' },
        { id: 'controller', label: 'Controller', watts: 10, hoursPerDay: 10, phase: 'both' },
      ],
    });

    expect(result.phases[0]).toMatchObject({
      name: 'Growth',
      kwhPerDay: 1.1,
      kwhTotal: 11,
    });
    expect(result.phases[1]).toMatchObject({
      name: 'Flower',
      kwhPerDay: 2.1,
      kwhTotal: 21,
    });
    expect(result.totalKwh).toBe(32);
  });

  it('clamps malformed and extreme inputs to finite supported values', () => {
    const result = calculatePowerCost({
      vegDays: Number.POSITIVE_INFINITY,
      flowerDays: -1,
      vegLightWatts: Number.NaN,
      flowerLightWatts: 100000,
      vegLightHours: 100,
      flowerLightHours: 100,
      ballastMultiplier: 9,
      centPerKwh: 1000,
      plantCount: 0,
      harvestGrams: -1,
      additionalConsumers: [
        { id: 'bad', label: 'Bad', watts: Number.NaN, hoursPerDay: Number.POSITIVE_INFINITY, count: -1 },
      ],
    });

    expect(Number.isFinite(result.totalKwh)).toBe(true);
    expect(Number.isFinite(result.totalCost)).toBe(true);
    expect(result.costPerPlant).toBeNull();
    expect(result.costPerGram).toBeNull();
  });

  it('maps persistent power records and devices into calculator inputs', () => {
    expect(createPowerConsumerInputFromRecord({
      id: 'consumer-1',
      name: 'Fan',
      watts: 35,
      hoursPerDay: 24,
      phase: 'flower',
    })).toEqual({
      id: 'consumer-1',
      label: 'Fan',
      watts: 35,
      hoursPerDay: 24,
      phase: 'flower',
    });

    expect(createPowerConsumerInputFromDevice({ id: 'device-1', name: 'Main Light', type: 'lamp' })).toMatchObject({
      id: 'device-device-1',
      label: 'Main Light',
      watts: 300,
      hoursPerDay: 12,
    });
  });

  it('maps device runtime telemetry into effective daily power consumers', () => {
    expect(createPowerConsumerInputFromRuntimeTelemetry(
      { id: 'lamp-1', name: 'Main Light', type: 'lamp' },
      [
        { deviceId: 'lamp-1', metric: 'light_power', value: 50, recordedAt: '2024-02-01T10:00:00.000Z' },
        { deviceId: 'lamp-1', metric: 'light_power', value: 100, recordedAt: '2024-02-01T11:00:00.000Z' },
        { deviceId: 'other', metric: 'light_power', value: 100, recordedAt: '2024-02-01T11:00:00.000Z' },
      ],
    )).toMatchObject({
      id: 'runtime-lamp-1',
      label: 'Main Light runtime',
      watts: 300,
      hoursPerDay: 18,
    });

    expect(createPowerConsumerInputFromRuntimeTelemetry(
      { id: 'fan-1', name: 'Exhaust Fan', type: 'fan' },
      [
        { deviceId: 'fan-1', metric: 'fan_power', value: 25, recordedAt: '2024-02-01T10:00:00.000Z' },
        { deviceId: 'fan-1', metric: 'exhaust_power', value: 75, recordedAt: '2024-02-01T11:00:00.000Z' },
      ],
    )).toMatchObject({
      watts: 35,
      hoursPerDay: 12,
    });
  });

  it('ignores runtime telemetry without supported device metrics', () => {
    expect(createPowerConsumerInputFromRuntimeTelemetry(
      { id: 'sensor-1', name: 'Temperature Sensor', type: 'sensor' },
      [{ deviceId: 'sensor-1', metric: 'temperature', value: 25, recordedAt: '2024-02-01T10:00:00.000Z' }],
    )).toBeNull();
    expect(createPowerConsumerInputFromRuntimeTelemetry(
      { id: 'lamp-1', name: 'Main Light', type: 'lamp' },
      [{ deviceId: 'lamp-1', metric: 'temperature', value: 25, recordedAt: '2024-02-01T10:00:00.000Z' }],
    )).toBeNull();
  });

  it('creates validated power profile and consumer records', () => {
    expect(createPowerConsumerRecord({
      id: 'consumer-1',
      growId: 'grow-1',
      label: ' Exhaust ',
      watts: 45,
      hoursPerDay: 30,
      timestamp: '2024-02-01T00:00:00.000Z',
    })).toMatchObject({
      id: 'consumer-1',
      growId: 'grow-1',
      name: 'Exhaust',
      watts: 45,
      hoursPerDay: 24,
      phase: 'both',
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-01T00:00:00.000Z',
    });

    expect(createPowerCostProfileRecord({
      id: 'profile-1',
      name: ' Flower Run ',
      centPerKwh: 32,
      vegDays: 35.4,
      flowerDays: 63.2,
      plantCount: 4,
      harvestGrams: 500,
      timestamp: '2024-02-01T00:00:00.000Z',
    })).toMatchObject({
      id: 'profile-1',
      name: 'Flower Run',
      centPerKwh: 32,
      vegDays: 35,
      flowerDays: 63,
      plantCount: 4,
      harvestGrams: 500,
    });
  });
});
