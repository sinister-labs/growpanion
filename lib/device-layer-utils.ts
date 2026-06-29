import type { Device, DeviceIntegration, SensorBinding, TelemetryMetric, TelemetryReading, TuyaSensor } from '@/lib/db';
import type { AcInfinityController } from '@/lib/ac-infinity-api';

export type DeviceIntegrationType = DeviceIntegration['type'];

export interface DeviceWizardInput {
  integrationType: DeviceIntegrationType;
  integrationName: string;
  deviceName: string;
  deviceType: Device['type'];
  room?: string;
  tent?: string;
  growId?: string;
  plantId?: string;
  metric: TelemetryMetric;
  unit: string;
}

export interface DeviceLayerRecords {
  integration: DeviceIntegration;
  device: Device;
  binding: SensorBinding;
}

export interface DeviceAdapterConfig extends Record<string, unknown> {
  adapterId: string;
  capabilities: Array<'telemetry' | 'manual_entry' | 'runtime_power' | 'automation'>;
  automationReady: boolean;
  telemetrySource: 'sensor' | 'manual' | 'legacy_proxy' | 'planned';
}

export interface SensorReadingInput {
  id: string;
  binding: SensorBinding;
  value: number;
  recordedAt: string;
  growId?: string;
  plantId?: string;
}

export interface AcInfinityTelemetryInput {
  controller: AcInfinityController;
  bindings: SensorBinding[];
  recordedAt: string;
}

export function inferTelemetryMetricFromSensor(sensor: Pick<TuyaSensor, 'type' | 'values'>): TelemetryMetric {
  if (sensor.type === 'Temperature') return 'temperature';
  if (sensor.type === 'Humidity') return 'humidity';
  if (sensor.type === 'Lamp') return 'light_power';
  if (sensor.type === 'Fan') return 'fan_power';

  const codes = sensor.values.map(value => value.code.toLowerCase());
  if (codes.some(code => code.includes('humid'))) return 'humidity';
  if (codes.some(code => code.includes('temp'))) return 'temperature';
  if (codes.some(code => code.includes('ppfd'))) return 'ppfd';
  if (codes.some(code => code.includes('dli'))) return 'dli';
  if (codes.some(code => code.includes('ec'))) return 'ec';
  if (codes.some(code => code.includes('ph'))) return 'ph';
  return 'temperature';
}

export function inferUnitForMetric(metric: TelemetryMetric): string {
  switch (metric) {
    case 'temperature':
    case 'leaf_temperature':
      return '°C';
    case 'humidity':
      return '%';
    case 'air_vpd':
    case 'leaf_vpd':
      return 'kPa';
    case 'pot_weight':
      return 'kg';
    case 'water_consumption':
    case 'drain_volume':
      return 'L';
    case 'ppfd':
      return 'µmol/m²/s';
    case 'dli':
      return 'mol/m²/day';
    case 'ec':
    case 'drain_ec':
      return 'mS/cm';
    case 'ph':
    case 'drain_ph':
      return 'pH';
    case 'light_power':
    case 'fan_power':
    case 'exhaust_power':
    case 'circulation_power':
      return '%';
  }
}

export function buildDeviceLayerRecords(input: DeviceWizardInput, now = new Date()): DeviceLayerRecords {
  const timestamp = now.toISOString();
  const integrationId = `${input.integrationType}-${slug(input.integrationName) || 'integration'}`;
  const deviceId = `${integrationId}-${slug(input.deviceName) || 'device'}`;
  const bindingId = `${deviceId}-${input.metric}`;
  const adapterConfig = getDeviceAdapterConfig(input.integrationType);

  return {
    integration: {
      id: integrationId,
      type: input.integrationType,
      name: input.integrationName.trim(),
      status: input.integrationType === 'mqtt_esp32' || input.integrationType === 'third_party' ? 'planned' : 'active',
      config: adapterConfig,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    device: {
      id: deviceId,
      integrationId,
      name: input.deviceName.trim(),
      type: input.deviceType,
      room: cleanOptional(input.room),
      tent: cleanOptional(input.tent),
      growId: cleanOptional(input.growId),
      plantId: cleanOptional(input.plantId),
      status: input.integrationType === 'mqtt_esp32' || input.integrationType === 'third_party' ? 'planned' : 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    binding: {
      id: bindingId,
      deviceId,
      growId: cleanOptional(input.growId),
      plantId: cleanOptional(input.plantId),
      metric: input.metric,
      label: input.deviceName.trim(),
      unit: input.unit.trim() || inferUnitForMetric(input.metric),
      createdAt: timestamp,
    },
  };
}

export function getDeviceAdapterConfig(type: DeviceIntegrationType): DeviceAdapterConfig {
  switch (type) {
    case 'ac_infinity':
      return {
        adapterId: 'adapter.ac-infinity.v1',
        capabilities: ['telemetry', 'runtime_power', 'automation'],
        automationReady: true,
        telemetrySource: 'sensor',
      };
    case 'tuya_legacy':
      return {
        adapterId: 'adapter.tuya-legacy.v1',
        capabilities: ['telemetry', 'runtime_power'],
        automationReady: false,
        telemetrySource: 'legacy_proxy',
      };
    case 'manual':
      return {
        adapterId: 'adapter.manual-sensor.v1',
        capabilities: ['telemetry', 'manual_entry'],
        automationReady: false,
        telemetrySource: 'manual',
      };
    case 'mqtt_esp32':
      return {
        adapterId: 'adapter.mqtt-esp32.v1',
        capabilities: ['telemetry', 'runtime_power', 'automation'],
        automationReady: false,
        telemetrySource: 'planned',
      };
    case 'third_party':
      return {
        adapterId: 'adapter.third-party.v1',
        capabilities: ['telemetry', 'runtime_power', 'automation'],
        automationReady: false,
        telemetrySource: 'planned',
      };
  }
}

export function buildTelemetryReadingFromBinding(input: SensorReadingInput): TelemetryReading | null {
  const value = Number(input.value);
  const growId = cleanOptional(input.binding.growId) ?? cleanOptional(input.growId);

  if (!growId || !Number.isFinite(value)) {
    return null;
  }

  return {
    id: input.id,
    growId,
    plantId: cleanOptional(input.binding.plantId) ?? cleanOptional(input.plantId),
    deviceId: input.binding.deviceId,
    sensorBindingId: input.binding.id,
    metric: input.binding.metric,
    value,
    unit: input.binding.unit,
    recordedAt: input.recordedAt,
    source: 'sensor',
  };
}

export function buildAcInfinityTelemetryReadings(input: AcInfinityTelemetryInput): TelemetryReading[] {
  return input.bindings
    .map(binding => {
      const value = readAcInfinityMetricValue(input.controller.raw, binding.metric);
      if (value === null) return null;

      return buildTelemetryReadingFromBinding({
        id: `${binding.id}-${input.recordedAt}`,
        binding,
        value,
        recordedAt: input.recordedAt,
      });
    })
    .filter((reading): reading is TelemetryReading => Boolean(reading));
}

export function readAcInfinityMetricValue(raw: Record<string, unknown>, metric: TelemetryMetric): number | null {
  const aliases = acInfinityMetricAliases(metric);
  if (aliases.length === 0) return null;

  const flattened = flattenObject(raw);
  for (const alias of aliases) {
    const match = flattened.find(entry => entry.path.some(part => part === alias || part.includes(alias)));
    const parsed = match ? parseMetricNumber(match.value) : null;
    if (parsed !== null) return normalizeAcInfinityMetricValue(metric, match?.path ?? [], parsed);
  }

  return null;
}

function acInfinityMetricAliases(metric: TelemetryMetric): string[] {
  switch (metric) {
    case 'temperature':
      return ['temperature', 'temp', 'probe_temperature', 'sensor_temperature', 'devtemp'];
    case 'humidity':
      return ['humidity', 'humid', 'rh', 'devhumidity'];
    case 'air_vpd':
      return ['vpdnums', 'vpd', 'airvpd', 'air_vpd'];
    case 'light_power':
      return ['lightpower', 'light_power', 'brightness', 'light'];
    case 'fan_power':
      return ['fanpower', 'fan_power', 'fanspeed', 'fan_speed', 'fan'];
    case 'exhaust_power':
      return ['exhaustpower', 'exhaust_power', 'exhaust'];
    case 'circulation_power':
      return ['circulationpower', 'circulation_power', 'circulation'];
    default:
      return [];
  }
}

function normalizeAcInfinityMetricValue(metric: TelemetryMetric, path: string[], value: number): number {
  if (metric === 'temperature' && path.some(part => part.endsWith('f') || part.includes('fahrenheit'))) {
    return Number((((value - 32) * 5) / 9).toFixed(2));
  }
  if (metric === 'temperature' && value > 200) {
    return Number((value / 100).toFixed(2));
  }
  if (metric === 'humidity' && value > 100) {
    return Number((value / 100).toFixed(2));
  }
  if (metric === 'air_vpd' && (value > 20 || path.some(part => part.includes('vpdnums')))) {
    return Number((value / 100).toFixed(2));
  }
  return value;
}

function flattenObject(value: unknown, path: string[] = []): Array<{ path: string[]; value: unknown }> {
  if (!value || typeof value !== 'object') return [{ path, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenObject(item, [...path, String(index)]));
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => (
    flattenObject(nested, [...path, normalizeKey(key)])
  ));
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseMetricNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const cleaned = value.replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0];
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function cleanOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
