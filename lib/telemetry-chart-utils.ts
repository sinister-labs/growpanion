import type { GrowEvent, TelemetryMetric, TelemetryReading } from '@/lib/db';

export interface TelemetryMetricMeta {
  label: string;
  unit: string;
  category: 'climate' | 'light' | 'irrigation' | 'nutrition' | 'device';
  color: string;
}

export const TELEMETRY_METRIC_META: Record<TelemetryMetric, TelemetryMetricMeta> = {
  temperature: { label: 'Temperature', unit: '°C', category: 'climate', color: '#ef4444' },
  humidity: { label: 'Humidity', unit: '%', category: 'climate', color: '#3b82f6' },
  air_vpd: { label: 'Air VPD', unit: 'kPa', category: 'climate', color: '#22c55e' },
  leaf_temperature: { label: 'Leaf Temperature', unit: '°C', category: 'climate', color: '#f97316' },
  leaf_vpd: { label: 'Leaf VPD', unit: 'kPa', category: 'climate', color: '#16a34a' },
  pot_weight: { label: 'Pot Weight', unit: 'kg', category: 'irrigation', color: '#2FA98C' },
  water_consumption: { label: 'Water Consumption', unit: 'L', category: 'irrigation', color: '#17876D' },
  ppfd: { label: 'PPFD', unit: 'µmol/m²/s', category: 'light', color: '#00DF81' },
  dli: { label: 'DLI', unit: 'mol/m²/day', category: 'light', color: '#00DF81' },
  light_power: { label: 'Light Power', unit: '%', category: 'device', color: '#00DF81' },
  fan_power: { label: 'Fan Power', unit: '%', category: 'device', color: '#2FA98C' },
  exhaust_power: { label: 'Exhaust Power', unit: '%', category: 'device', color: '#00DF81' },
  circulation_power: { label: 'Circulation Power', unit: '%', category: 'device', color: '#2FA98C' },
  ec: { label: 'EC', unit: 'mS/cm', category: 'nutrition', color: '#17876D' },
  ph: { label: 'pH', unit: 'pH', category: 'nutrition', color: '#2CC295' },
  drain_ec: { label: 'Drain EC', unit: 'mS/cm', category: 'nutrition', color: '#17876D' },
  drain_ph: { label: 'Drain pH', unit: 'pH', category: 'nutrition', color: '#2CC295' },
  drain_volume: { label: 'Drain Volume', unit: 'L', category: 'irrigation', color: '#2FA98C' },
};

export interface TelemetryChartPoint {
  timestamp: number;
  label: string;
  value: number;
}

export type TelemetryTimeRangeId =
  | '10m'
  | '1h'
  | '24h'
  | '3d'
  | '7d'
  | '1w'
  | '1mo'
  | '3mo'
  | '6mo';

export interface TelemetryTimeRange {
  id: TelemetryTimeRangeId;
  label: string;
  durationMs: number;
  bucketMs: number;
}

export const TELEMETRY_TIME_RANGES: TelemetryTimeRange[] = [
  { id: '10m', label: '10 min', durationMs: 10 * 60_000, bucketMs: 60_000 },
  { id: '1h', label: '1 h', durationMs: 60 * 60_000, bucketMs: 5 * 60_000 },
  { id: '24h', label: '24 h', durationMs: 24 * 60 * 60_000, bucketMs: 60 * 60_000 },
  { id: '3d', label: '3 days', durationMs: 3 * 24 * 60 * 60_000, bucketMs: 2 * 60 * 60_000 },
  { id: '7d', label: '7 days', durationMs: 7 * 24 * 60 * 60_000, bucketMs: 4 * 60 * 60_000 },
  { id: '1w', label: '1 week', durationMs: 7 * 24 * 60 * 60_000, bucketMs: 4 * 60 * 60_000 },
  { id: '1mo', label: '1 month', durationMs: 30 * 24 * 60 * 60_000, bucketMs: 24 * 60 * 60_000 },
  { id: '3mo', label: '3 months', durationMs: 90 * 24 * 60 * 60_000, bucketMs: 3 * 24 * 60 * 60_000 },
  { id: '6mo', label: '6 months', durationMs: 180 * 24 * 60 * 60_000, bucketMs: 6 * 24 * 60 * 60_000 },
];

export interface TelemetryMetricRange {
  min: number;
  max: number;
  unit: string;
}

export interface BucketedTelemetryChartPoint {
  timestamp: number;
  label: string;
  value: number | null;
}

export type CombinedTelemetryChartPoint = {
  timestamp: number;
  label: string;
} & Partial<Record<TelemetryMetric, number | null>>;

export interface CombinedTelemetryChartSeries {
  metrics: TelemetryMetric[];
  points: CombinedTelemetryChartPoint[];
  units: string[];
  unitByMetric: Partial<Record<TelemetryMetric, string>>;
}

export function telemetryUnitToAxisId(unit: string): string {
  return `axis_${unit.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()}`;
}

export function getTelemetryTimeRange(id: TelemetryTimeRangeId): TelemetryTimeRange {
  const range = TELEMETRY_TIME_RANGES.find(item => item.id === id);
  if (!range) {
    return TELEMETRY_TIME_RANGES.find(item => item.id === '24h')!;
  }
  return range;
}

export function resolveTelemetryWindow(
  readings: TelemetryReading[],
  range: TelemetryTimeRange,
  now = Date.now(),
): { start: number; end: number } {
  const end = now;
  const start = end - range.durationMs;
  const hasDataInWindow = readings.some(reading => {
    const timestamp = Date.parse(reading.recordedAt);
    return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
  });

  if (hasDataInWindow) {
    return { start, end };
  }

  const timestamps = readings
    .map(reading => Date.parse(reading.recordedAt))
    .filter(Number.isFinite);
  if (timestamps.length === 0) {
    return { start, end };
  }

  const latest = Math.max(...timestamps);
  return { start: latest - range.durationMs, end: latest };
}

export function formatTelemetryBucketLabel(timestamp: number, rangeId: TelemetryTimeRangeId): string {
  const date = new Date(timestamp);
  switch (rangeId) {
    case '10m':
    case '1h':
    case '24h':
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    case '3d':
    case '7d':
    case '1w':
      return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' });
    case '1mo':
    case '3mo':
    case '6mo':
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    default:
      return date.toLocaleString();
  }
}

function buildBucketTimestamps(start: number, end: number, bucketMs: number): number[] {
  const alignedStart = Math.floor(start / bucketMs) * bucketMs;
  const buckets: number[] = [];
  for (let timestamp = alignedStart; timestamp <= end; timestamp += bucketMs) {
    if (timestamp + bucketMs > start) {
      buckets.push(timestamp);
    }
  }
  return buckets;
}

function bucketKeyForTimestamp(timestamp: number, bucketMs: number): number {
  return Math.floor(timestamp / bucketMs) * bucketMs;
}

function aggregateMetricBuckets(
  readings: TelemetryReading[],
  metric: TelemetryMetric,
  bucketMs: number,
): Map<number, number> {
  const sums = new Map<number, { total: number; count: number }>();

  for (const reading of readings) {
    if (reading.metric !== metric) continue;
    const timestamp = Date.parse(reading.recordedAt);
    if (!Number.isFinite(timestamp)) continue;

    const bucket = bucketKeyForTimestamp(timestamp, bucketMs);
    const current = sums.get(bucket) ?? { total: 0, count: 0 };
    current.total += reading.value;
    current.count += 1;
    sums.set(bucket, current);
  }

  const averages = new Map<number, number>();
  for (const [bucket, entry] of sums) {
    if (entry.count > 0) {
      averages.set(bucket, Number((entry.total / entry.count).toFixed(2)));
    }
  }
  return averages;
}

export function getMetricsWithDataInWindow(
  readings: TelemetryReading[],
  start: number,
  end: number,
): TelemetryMetric[] {
  const metrics = new Set<TelemetryMetric>();
  for (const reading of readings) {
    const timestamp = Date.parse(reading.recordedAt);
    if (!Number.isFinite(timestamp) || timestamp < start || timestamp > end) continue;
    metrics.add(reading.metric);
  }
  return [...metrics].sort((a, b) => TELEMETRY_METRIC_META[a].label.localeCompare(TELEMETRY_METRIC_META[b].label));
}

export function buildBucketedTelemetryChartSeries(
  readings: TelemetryReading[],
  metric: TelemetryMetric,
  rangeId: TelemetryTimeRangeId,
  now = Date.now(),
): BucketedTelemetryChartPoint[] {
  const range = getTelemetryTimeRange(rangeId);
  const window = resolveTelemetryWindow(readings, range, now);
  const inWindow = readings.filter(reading => {
    const timestamp = Date.parse(reading.recordedAt);
    return Number.isFinite(timestamp) && timestamp >= window.start && timestamp <= window.end;
  });
  const buckets = buildBucketTimestamps(window.start, window.end, range.bucketMs);
  const averages = aggregateMetricBuckets(inWindow, metric, range.bucketMs);

  return buckets.map(timestamp => ({
    timestamp,
    label: formatTelemetryBucketLabel(timestamp, rangeId),
    value: averages.get(timestamp) ?? null,
  }));
}

export function buildCombinedTelemetryChartSeries(
  readings: TelemetryReading[],
  rangeId: TelemetryTimeRangeId,
  now = Date.now(),
): CombinedTelemetryChartSeries {
  const range = getTelemetryTimeRange(rangeId);
  const window = resolveTelemetryWindow(readings, range, now);
  const metrics = getMetricsWithDataInWindow(readings, window.start, window.end);
  const buckets = buildBucketTimestamps(window.start, window.end, range.bucketMs);
  const unitByMetric: Partial<Record<TelemetryMetric, string>> = {};

  for (const metric of metrics) {
    unitByMetric[metric] = TELEMETRY_METRIC_META[metric].unit;
  }

  const bucketedByMetric = new Map<TelemetryMetric, Map<number, number>>();
  const inWindow = readings.filter(reading => {
    const timestamp = Date.parse(reading.recordedAt);
    return Number.isFinite(timestamp) && timestamp >= window.start && timestamp <= window.end;
  });
  for (const metric of metrics) {
    bucketedByMetric.set(
      metric,
      aggregateMetricBuckets(inWindow, metric, range.bucketMs),
    );
  }

  const points: CombinedTelemetryChartPoint[] = buckets.map(timestamp => {
    const point: CombinedTelemetryChartPoint = {
      timestamp,
      label: formatTelemetryBucketLabel(timestamp, rangeId),
    };

    for (const metric of metrics) {
      point[metric] = bucketedByMetric.get(metric)?.get(timestamp) ?? null;
    }

    return point;
  });

  const units = [...new Set(metrics.map(metric => TELEMETRY_METRIC_META[metric].unit))];

  return {
    metrics,
    points,
    units,
    unitByMetric,
  };
}

export function buildTelemetryChartSeries(
  readings: TelemetryReading[],
  metric: TelemetryMetric,
  limit = 80,
): TelemetryChartPoint[] {
  return readings
    .filter(reading => reading.metric === metric)
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
    .slice(-limit)
    .map(reading => {
      const timestamp = Date.parse(reading.recordedAt);
      return {
        timestamp,
        label: Number.isFinite(timestamp)
          ? new Date(timestamp).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
          : reading.recordedAt,
        value: reading.value,
      };
    });
}

export interface TelemetryEventOverlay {
  id: string;
  eventId: string;
  label: string;
  eventTitle: string;
  eventType: GrowEvent['type'];
  timestamp: number;
}

export interface TelemetryEventImpact {
  id: string;
  eventId: string;
  eventTitle: string;
  eventType: GrowEvent['type'];
  eventAt: string;
  before?: TelemetryReading;
  after?: TelemetryReading;
  delta?: number;
  deltaPercent?: number;
  direction: 'up' | 'down' | 'flat' | 'unknown';
  summary: string;
}

export function getLatestReadingByMetric(readings: TelemetryReading[]): Partial<Record<TelemetryMetric, TelemetryReading>> {
  return readings.reduce<Partial<Record<TelemetryMetric, TelemetryReading>>>((latest, reading) => {
    const current = latest[reading.metric];
    if (!current || Date.parse(reading.recordedAt) > Date.parse(current.recordedAt)) {
      latest[reading.metric] = reading;
    }
    return latest;
  }, {});
}

export function buildTelemetryEventOverlays(
  readings: TelemetryReading[],
  events: GrowEvent[],
  metric: TelemetryMetric,
  maxDistanceHours = 24,
): TelemetryEventOverlay[] {
  const series = buildTelemetryChartSeries(readings, metric);
  if (series.length === 0) return [];

  const maxDistanceMs = maxDistanceHours * 36e5;
  return events
    .map(event => {
      const eventTime = Date.parse(event.occurredAt);
      if (!Number.isFinite(eventTime)) return null;

      const nearestPoint = series.reduce<TelemetryChartPoint | null>((nearest, point) => {
        const distance = Math.abs(point.timestamp - eventTime);
        if (distance > maxDistanceMs) return nearest;
        if (!nearest) return point;
        return distance < Math.abs(nearest.timestamp - eventTime) ? point : nearest;
      }, null);

      if (!nearestPoint) return null;
      return {
        id: `overlay-${event.id}-${metric}`,
        eventId: event.id,
        label: nearestPoint.label,
        eventTitle: event.title,
        eventType: event.type,
        timestamp: eventTime,
      };
    })
    .filter((overlay): overlay is TelemetryEventOverlay => Boolean(overlay))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);
}

export function buildTelemetryEventImpacts(
  readings: TelemetryReading[],
  events: GrowEvent[],
  metric: TelemetryMetric,
  windowHours = 72,
): TelemetryEventImpact[] {
  const metricReadings = readings
    .filter(reading => reading.metric === metric && Number.isFinite(Date.parse(reading.recordedAt)))
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  if (metricReadings.length === 0) return [];

  const windowMs = windowHours * 36e5;
  return events
    .map((event): TelemetryEventImpact | null => {
      const eventTime = Date.parse(event.occurredAt);
      if (!Number.isFinite(eventTime)) return null;

      const scopedReadings = metricReadings.filter(reading => (
        !event.plantId || !reading.plantId || reading.plantId === event.plantId
      ));
      const before = [...scopedReadings]
        .reverse()
        .find(reading => {
          const readingTime = Date.parse(reading.recordedAt);
          return readingTime <= eventTime && eventTime - readingTime <= windowMs;
        });
      const after = scopedReadings.find(reading => {
        const readingTime = Date.parse(reading.recordedAt);
        return readingTime >= eventTime && readingTime - eventTime <= windowMs;
      });

      const delta = before && after ? Number((after.value - before.value).toFixed(2)) : undefined;
      const deltaPercent = before && after && before.value !== 0
        ? Number((((after.value - before.value) / before.value) * 100).toFixed(1))
        : undefined;
      const direction: TelemetryEventImpact['direction'] = delta === undefined
        ? 'unknown'
        : Math.abs(delta) < 0.01
          ? 'flat'
          : delta > 0
            ? 'up'
            : 'down';

      return {
        id: `impact-${event.id}-${metric}`,
        eventId: event.id,
        eventTitle: event.title,
        eventType: event.type,
        eventAt: event.occurredAt,
        before,
        after,
        delta,
        deltaPercent,
        direction,
        summary: formatImpactSummary(metric, before, after, delta, deltaPercent),
      };
    })
    .filter((impact): impact is TelemetryEventImpact => Boolean(impact))
    .filter(impact => impact.before || impact.after)
    .sort((a, b) => Date.parse(b.eventAt) - Date.parse(a.eventAt))
    .slice(0, 6);
}

function formatImpactSummary(
  metric: TelemetryMetric,
  before: TelemetryReading | undefined,
  after: TelemetryReading | undefined,
  delta: number | undefined,
  deltaPercent: number | undefined,
): string {
  const meta = TELEMETRY_METRIC_META[metric];
  if (!before || !after || delta === undefined) {
    return `Noch nicht genug ${meta.label}-Messpunkte vor und nach diesem Event.`;
  }

  const sign = delta > 0 ? '+' : '';
  const percent = deltaPercent !== undefined ? ` (${sign}${deltaPercent}%)` : '';
  return `${meta.label}: ${before.value}${before.unit} -> ${after.value}${after.unit}, Delta ${sign}${delta}${after.unit}${percent}.`;
}
