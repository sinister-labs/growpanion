import { describe, expect, it } from 'vitest';
import type { GrowEvent, TelemetryReading } from '@/lib/db';
import {
  buildBucketedTelemetryChartSeries,
  buildCombinedTelemetryChartSeries,
  buildTelemetryEventImpacts,
  buildTelemetryEventOverlays,
  buildTelemetryChartSeries,
  getLatestReadingByMetric,
  getTelemetryTimeRange,
  TELEMETRY_METRIC_META,
} from '@/lib/telemetry-chart-utils';

const readings: TelemetryReading[] = [
  {
    id: 'reading-1',
    growId: 'grow-1',
    metric: 'temperature',
    value: 24,
    unit: '°C',
    recordedAt: '2024-02-20T10:00:00.000Z',
    source: 'manual',
  },
  {
    id: 'reading-2',
    growId: 'grow-1',
    metric: 'humidity',
    value: 62,
    unit: '%',
    recordedAt: '2024-02-20T10:05:00.000Z',
    source: 'manual',
  },
  {
    id: 'reading-3',
    growId: 'grow-1',
    metric: 'temperature',
    value: 25,
    unit: '°C',
    recordedAt: '2024-02-20T11:00:00.000Z',
    source: 'manual',
  },
];

describe('telemetry chart utilities', () => {
  it('defines display metadata for telemetry metrics', () => {
    expect(TELEMETRY_METRIC_META.temperature).toMatchObject({
      label: 'Temperature',
      unit: '°C',
      category: 'climate',
    });
    expect(TELEMETRY_METRIC_META.drain_ec.category).toBe('nutrition');
  });

  it('finds the latest reading per metric', () => {
    const latest = getLatestReadingByMetric(readings);

    expect(latest.temperature?.id).toBe('reading-3');
    expect(latest.humidity?.id).toBe('reading-2');
  });

  it('builds ordered chart series for a selected metric', () => {
    const series = buildTelemetryChartSeries(readings, 'temperature');

    expect(series.map(point => point.value)).toEqual([24, 25]);
    expect(series[0].timestamp).toBe(Date.parse('2024-02-20T10:00:00.000Z'));
    expect(series[0].label).toEqual(expect.any(String));
  });

  it('maps nearby grow events onto telemetry chart points', () => {
    const events: GrowEvent[] = [{
      id: 'event-1',
      growId: 'grow-1',
      type: 'training',
      title: 'Topping',
      occurredAt: '2024-02-20T10:30:00.000Z',
      createdAt: '2024-02-20T10:30:00.000Z',
    }];

    const overlays = buildTelemetryEventOverlays(readings, events, 'temperature', 2);

    expect(overlays).toHaveLength(1);
    expect(overlays[0]).toMatchObject({
      eventId: 'event-1',
      eventTitle: 'Topping',
      eventType: 'training',
    });
    expect(overlays[0].label).toEqual(expect.any(String));
  });

  it('summarizes before and after telemetry around events', () => {
    const events: GrowEvent[] = [{
      id: 'event-1',
      growId: 'grow-1',
      type: 'training',
      title: 'Topping',
      occurredAt: '2024-02-20T10:30:00.000Z',
      createdAt: '2024-02-20T10:30:00.000Z',
    }];

    const impacts = buildTelemetryEventImpacts(readings, events, 'temperature', 2);

    expect(impacts).toHaveLength(1);
    expect(impacts[0]).toMatchObject({
      eventId: 'event-1',
      before: expect.objectContaining({ id: 'reading-1' }),
      after: expect.objectContaining({ id: 'reading-3' }),
      delta: 1,
      deltaPercent: 4.2,
      direction: 'up',
    });
    expect(impacts[0].summary).toContain('Delta +1°C');
  });

  it('aggregates high-frequency readings into hourly buckets for a 24h range', () => {
    const now = Date.parse('2024-02-21T12:00:00.000Z');
    const denseReadings: TelemetryReading[] = Array.from({ length: 1440 }, (_, index) => ({
      id: `reading-${index}`,
      growId: 'grow-1',
      metric: 'temperature',
      value: 20 + (index % 10),
      unit: '°C',
      recordedAt: new Date(now - (1440 - index) * 60_000).toISOString(),
      source: 'sensor',
    }));

    const series = buildBucketedTelemetryChartSeries(denseReadings, 'temperature', '24h', now);
    const populated = series.filter(point => point.value !== null);

    expect(series.length).toBeLessThanOrEqual(getTelemetryTimeRange('24h').durationMs / getTelemetryTimeRange('24h').bucketMs + 2);
    expect(populated.length).toBeGreaterThan(0);
    expect(populated.length).toBeLessThan(40);
  });

  it('maps readings to the same bucket keys used by the chart timeline', () => {
    const now = Date.parse('2024-02-21T15:37:42.000Z');
    const reading: TelemetryReading = {
      id: 'reading-live',
      growId: 'grow-1',
      metric: 'temperature',
      value: 24.6,
      unit: '°C',
      recordedAt: new Date(now - 90_000).toISOString(),
      source: 'sensor',
    };

    const series = buildBucketedTelemetryChartSeries([reading], 'temperature', '24h', now);
    const populated = series.filter(point => point.value !== null);

    expect(populated.length).toBeGreaterThan(0);
    expect(populated.some(point => point.value === 24.6)).toBe(true);
  });

  it('builds a combined chart with every metric that has data in the selected window', () => {
    const now = Date.parse('2024-02-21T12:00:00.000Z');
    const combinedReadings: TelemetryReading[] = [
      {
        id: 'temp-1',
        growId: 'grow-1',
        metric: 'temperature',
        value: 24,
        unit: '°C',
        recordedAt: new Date(now - 30 * 60_000).toISOString(),
        source: 'sensor',
      },
      {
        id: 'hum-1',
        growId: 'grow-1',
        metric: 'humidity',
        value: 58,
        unit: '%',
        recordedAt: new Date(now - 20 * 60_000).toISOString(),
        source: 'sensor',
      },
      {
        id: 'vpd-1',
        growId: 'grow-1',
        metric: 'air_vpd',
        value: 1.1,
        unit: 'kPa',
        recordedAt: new Date(now - 10 * 60_000).toISOString(),
        source: 'sensor',
      },
    ];

    const combined = buildCombinedTelemetryChartSeries(combinedReadings, '1h', now);

    expect(combined.metrics).toEqual(expect.arrayContaining(['temperature', 'humidity', 'air_vpd']));
    expect(combined.units).toEqual(expect.arrayContaining(['°C', '%', 'kPa']));
    expect(combined.points.some(point => point.temperature !== null)).toBe(true);
    expect(combined.points.some(point => point.humidity !== null)).toBe(true);
    expect(combined.points.some(point => point.air_vpd !== null)).toBe(true);
  });
});
