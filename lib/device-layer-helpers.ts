import type { Device, SensorBinding, TelemetryMetric, TelemetryReading } from '@/lib/db';

export function slugValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function formatMetricLabel(metric: TelemetryMetric): string {
  return metric
    .split('_')
    .map(part => part.toUpperCase() === 'VPD' ? 'VPD' : part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatTelemetryValue(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: Math.abs(value) < 10 ? 2 : 1,
  }).format(value);
}

export function normalizePollingInterval(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(1440, Math.round(parsed)));
}

export function buildAcInfinityDeviceId(controllerId: string): string {
  return `ac-infinity-${slugValue(controllerId) || controllerId}`;
}

export function isAcInfinityControllerDevice(device: Device, controllerId: string, integrationId?: string): boolean {
  const stableId = buildAcInfinityDeviceId(controllerId);
  const legacySuffix = slugValue(controllerId);
  return device.id === stableId
    || Boolean(integrationId && device.id === `${integrationId}-${legacySuffix}`)
    || Boolean(legacySuffix && device.id.endsWith(`-${legacySuffix}`));
}

export function inferAcInfinityRawLabel(binding: SensorBinding): string {
  const label = binding.label.toLowerCase();
  if (label.includes('tmp')) return 'tmp';
  if (label.includes('rlf')) return 'rlf';
  if (label.includes('vpd')) return 'vpd';
  return formatMetricLabel(binding.metric);
}

export function inferAcInfinitySourceMetric(binding: SensorBinding): TelemetryMetric {
  const rawLabel = inferAcInfinityRawLabel(binding);
  if (rawLabel === 'tmp') return 'temperature';
  if (rawLabel === 'rlf') return 'humidity';
  if (rawLabel === 'vpd') return 'air_vpd';
  if (binding.metric === 'leaf_temperature') return 'temperature';
  if (binding.metric === 'leaf_vpd') return 'air_vpd';
  return binding.metric;
}

export const acInfinityDefaultMetrics: Array<{ rawLabel: string; metric: TelemetryMetric }> = [
  { rawLabel: 'tmp', metric: 'temperature' },
  { rawLabel: 'rlf', metric: 'humidity' },
  { rawLabel: 'vpd', metric: 'air_vpd' },
];

export const integrationTypeLabels: Record<string, string> = {
  ac_infinity: 'AC Infinity',
  tuya_legacy: 'Tuya',
  manual: 'Manual',
  mqtt_esp32: 'ESP32 / MQTT',
  third_party: 'Third-party',
};

export function getLatestReadingByBinding(telemetryData: TelemetryReading[]): Record<string, TelemetryReading> {
  return telemetryData.reduce<Record<string, TelemetryReading>>((latest, reading) => {
    if (!reading.sensorBindingId) return latest;
    const current = latest[reading.sensorBindingId];
    if (!current || new Date(reading.recordedAt).getTime() > new Date(current.recordedAt).getTime()) {
      latest[reading.sensorBindingId] = reading;
    }
    return latest;
  }, {});
}
