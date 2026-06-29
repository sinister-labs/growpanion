import { describe, expect, it } from 'vitest';
import { buildAcInfinityTelemetryReadings, buildDeviceLayerRecords, buildTelemetryReadingFromBinding, getDeviceAdapterConfig, inferTelemetryMetricFromSensor, inferUnitForMetric, readAcInfinityMetricValue } from '@/lib/device-layer-utils';

describe('device layer utilities', () => {
  it('infers telemetry metrics from legacy sensor configuration', () => {
    expect(inferTelemetryMetricFromSensor({
      type: 'Temperature',
      values: [{ code: 'temp_current' }],
    })).toBe('temperature');

    expect(inferTelemetryMetricFromSensor({
      type: 'Number',
      values: [{ code: 'drain_ec' }],
    })).toBe('ec');

    expect(inferTelemetryMetricFromSensor({
      type: 'Lamp',
      values: [{ code: 'switch_led' }],
    })).toBe('light_power');
  });

  it('returns stable units for telemetry metrics', () => {
    expect(inferUnitForMetric('leaf_vpd')).toBe('kPa');
    expect(inferUnitForMetric('ppfd')).toBe('µmol/m²/s');
    expect(inferUnitForMetric('water_consumption')).toBe('L');
    expect(inferUnitForMetric('exhaust_power')).toBe('%');
    expect(inferUnitForMetric('circulation_power')).toBe('%');
  });

  it('builds integration, device and sensor binding records from wizard input', () => {
    const records = buildDeviceLayerRecords({
      integrationType: 'manual',
      integrationName: 'Manual Sensors',
      deviceName: 'Tent Climate',
      deviceType: 'sensor',
      room: 'Room A',
      tent: 'Tent 1',
      growId: 'grow-1',
      plantId: 'plant-1',
      metric: 'humidity',
      unit: '%',
    }, new Date('2024-01-01T00:00:00.000Z'));

    expect(records.integration).toMatchObject({
      id: 'manual-manual-sensors',
      type: 'manual',
      status: 'active',
      config: {
        adapterId: 'adapter.manual-sensor.v1',
        capabilities: ['telemetry', 'manual_entry'],
        telemetrySource: 'manual',
      },
    });
    expect(records.device).toMatchObject({
      id: 'manual-manual-sensors-tent-climate',
      integrationId: 'manual-manual-sensors',
      growId: 'grow-1',
      plantId: 'plant-1',
    });
    expect(records.binding).toMatchObject({
      id: 'manual-manual-sensors-tent-climate-humidity',
      metric: 'humidity',
      unit: '%',
    });
  });

  it('exposes adapter capabilities for supported integration types', () => {
    expect(getDeviceAdapterConfig('ac_infinity')).toMatchObject({
      adapterId: 'adapter.ac-infinity.v1',
      automationReady: true,
      telemetrySource: 'sensor',
    });
    expect(getDeviceAdapterConfig('tuya_legacy')).toMatchObject({
      adapterId: 'adapter.tuya-legacy.v1',
      automationReady: false,
      telemetrySource: 'legacy_proxy',
    });
    expect(getDeviceAdapterConfig('mqtt_esp32').capabilities).toEqual(expect.arrayContaining([
      'telemetry',
      'automation',
    ]));
  });

  it('keeps future third-party adapters planned until they are configured', () => {
    const records = buildDeviceLayerRecords({
      integrationType: 'third_party',
      integrationName: 'Vendor Bridge',
      deviceName: 'External Controller',
      deviceType: 'controller',
      metric: 'temperature',
      unit: '°C',
    }, new Date('2024-01-01T00:00:00.000Z'));

    expect(records.integration).toMatchObject({
      id: 'third_party-vendor-bridge',
      type: 'third_party',
      status: 'planned',
    });
    expect(records.device).toMatchObject({
      id: 'third_party-vendor-bridge-external-controller',
      status: 'planned',
    });
  });

  it('builds sensor-sourced telemetry readings from sensor bindings', () => {
    const reading = buildTelemetryReadingFromBinding({
      id: 'reading-1',
      binding: {
        id: 'binding-1',
        deviceId: 'device-1',
        growId: 'grow-1',
        plantId: 'plant-1',
        metric: 'air_vpd',
        label: 'Tent VPD',
        unit: 'kPa',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      value: 1.2,
      recordedAt: '2024-01-02T00:00:00.000Z',
    });

    expect(reading).toMatchObject({
      id: 'reading-1',
      growId: 'grow-1',
      plantId: 'plant-1',
      deviceId: 'device-1',
      sensorBindingId: 'binding-1',
      metric: 'air_vpd',
      value: 1.2,
      unit: 'kPa',
      source: 'sensor',
    });
  });

  it('requires a grow scope and finite value for sensor telemetry readings', () => {
    const binding = {
      id: 'binding-1',
      deviceId: 'device-1',
      metric: 'temperature' as const,
      label: 'Tent Temperature',
      unit: '°C',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    expect(buildTelemetryReadingFromBinding({
      id: 'reading-1',
      binding,
      value: 24,
      recordedAt: '2024-01-02T00:00:00.000Z',
    })).toBeNull();
    expect(buildTelemetryReadingFromBinding({
      id: 'reading-2',
      binding,
      growId: 'grow-1',
      value: Number.NaN,
      recordedAt: '2024-01-02T00:00:00.000Z',
    })).toBeNull();
  });

  it('extracts AC Infinity climate values from reverse-engineered controller payloads', () => {
    const raw = {
      devId: 'controller-69',
      devName: 'Controller 69 Pro',
      climate: {
        temp: 2366,
        humidity: 5118,
        vpdnums: 143,
      },
    };

    expect(readAcInfinityMetricValue(raw, 'temperature')).toBe(23.66);
    expect(readAcInfinityMetricValue(raw, 'humidity')).toBe(51.18);
    expect(readAcInfinityMetricValue(raw, 'air_vpd')).toBe(1.43);
    expect(readAcInfinityMetricValue(raw, 'ec')).toBeNull();
  });

  it('still converts explicit Fahrenheit AC Infinity temperature fields when present', () => {
    expect(readAcInfinityMetricValue({ temperatureF: '77.0 °F' }, 'temperature')).toBe(25);
  });

  it('builds GrowPanion telemetry readings from AC Infinity controller payloads', () => {
    const readings = buildAcInfinityTelemetryReadings({
      controller: {
        id: 'controller-69',
        name: 'Controller 69 Pro',
        raw: {
          devId: 'controller-69',
          climate: {
            temp: 2440,
            humidity: 5800,
            vpdnums: 124,
          },
        },
      },
      recordedAt: '2026-01-01T12:00:00.000Z',
      bindings: [
        {
          id: 'controller-69-temperature',
          deviceId: 'controller-69',
          growId: 'grow-1',
          metric: 'temperature',
          label: 'Controller Temperature',
          unit: '°C',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'controller-69-humidity',
          deviceId: 'controller-69',
          growId: 'grow-1',
          metric: 'humidity',
          label: 'Controller Humidity',
          unit: '%',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'controller-69-air-vpd',
          deviceId: 'controller-69',
          growId: 'grow-1',
          metric: 'air_vpd',
          label: 'Controller VPD',
          unit: 'kPa',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(readings).toHaveLength(3);
    expect(readings.map(reading => [reading.metric, reading.value])).toEqual([
      ['temperature', 24.4],
      ['humidity', 58],
      ['air_vpd', 1.24],
    ]);
    expect(readings[0]).toMatchObject({
      id: 'controller-69-temperature-2026-01-01T12:00:00.000Z',
      growId: 'grow-1',
      source: 'sensor',
    });
  });

  it('does not build AC Infinity readings without grow scoped bindings', () => {
    const readings = buildAcInfinityTelemetryReadings({
      controller: {
        id: 'controller-69',
        name: 'Controller 69 Pro',
        raw: { temp: 24 },
      },
      recordedAt: '2026-01-01T12:00:00.000Z',
      bindings: [
        {
          id: 'controller-69-temperature',
          deviceId: 'controller-69',
          metric: 'temperature',
          label: 'Controller Temperature',
          unit: '°C',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    expect(readings).toEqual([]);
  });
});
