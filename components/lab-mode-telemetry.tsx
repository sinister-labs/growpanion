"use client";

import { useEffect, useMemo, useState } from 'react';
import { Activity, Database, GitCompareArrows, Layers3, LineChart as LineChartIcon } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomDropdown, type DropdownOption } from '@/components/ui/custom-dropdown';
import {
  getGrowEventsForGrow,
  getTelemetryForGrow,
  type GrowEvent,
  type TelemetryMetric,
  type TelemetryReading,
} from '@/lib/db';
import {
  buildBucketedTelemetryChartSeries,
  buildCombinedTelemetryChartSeries,
  buildTelemetryEventImpacts,
  buildTelemetryEventOverlays,
  TELEMETRY_METRIC_META,
  TELEMETRY_TIME_RANGES,
  telemetryUnitToAxisId,
  type TelemetryTimeRangeId,
} from '@/lib/telemetry-chart-utils';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { useTelemetryRefreshToken } from '@/hooks/useTelemetryRefreshToken';
import { cn } from '@/lib/utils';

interface LabModeTelemetryProps {
  growId: string;
}

const metricOptions: DropdownOption[] = Object.entries(TELEMETRY_METRIC_META).map(([id, meta]) => ({
  id,
  label: meta.label,
  description: `${meta.category} • ${meta.unit}`,
}));

const chartConfig: ChartConfig = {
  value: {
    label: 'Value',
    color: '#00DF81',
  },
};

interface CombinedTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number | null; color?: string }>;
  label?: string;
  metrics: TelemetryMetric[];
}

function CombinedTelemetryTooltip({ active, payload, label, metrics }: CombinedTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[0.95rem] border border-white/10 bg-[#0d151b]/95 px-3 py-2 text-xs shadow-lg">
      <div className="mb-2 font-medium text-foreground">{label}</div>
      <div className="space-y-1">
        {metrics.map(metric => {
          const entry = payload.find(item => item.dataKey === metric);
          if (entry?.value === undefined || entry.value === null) return null;
          const meta = TELEMETRY_METRIC_META[metric];
          return (
            <div key={metric} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label}
              </span>
              <span className="font-medium text-foreground">{entry.value} {meta.unit}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PRIORITY_UNIT_ORDER = ['°C', '%', 'kPa', 'mS/cm', 'pH', 'L', 'kg', 'µmol/m²/s', 'mol/m²/day'];

function sortUnitsForAxes(units: string[]): string[] {
  return [...units].sort((a, b) => {
    const aIndex = PRIORITY_UNIT_ORDER.indexOf(a);
    const bIndex = PRIORITY_UNIT_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export function LabModeTelemetry({ growId }: LabModeTelemetryProps) {
  const telemetryRefreshToken = useTelemetryRefreshToken();
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [events, setEvents] = useState<GrowEvent[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<TelemetryMetric>('temperature');
  const [timeRangeId, setTimeRangeId] = useState<TelemetryTimeRangeId>('24h');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLabData() {
      try {
        const [telemetry, growEvents] = await Promise.all([
          getTelemetryForGrow(growId),
          getGrowEventsForGrow(growId),
        ]);

        if (!cancelled) {
          setReadings(telemetry);
          setEvents(growEvents);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setReadings([]);
          setEvents([]);
          setLoadError('Lab-Daten konnten nicht geladen werden.');
        }
      }
    }

    void loadLabData();
    return () => {
      cancelled = true;
    };
  }, [growId, telemetryRefreshToken]);

  const selectedMeta = TELEMETRY_METRIC_META[selectedMetric];
  const combinedSeries = useMemo(
    () => buildCombinedTelemetryChartSeries(readings, timeRangeId),
    [readings, timeRangeId],
  );
  const combinedAxisUnits = useMemo(
    () => sortUnitsForAxes(combinedSeries.units).slice(0, 4),
    [combinedSeries.units],
  );
  const metricChartSeries = useMemo(
    () => buildBucketedTelemetryChartSeries(readings, selectedMetric, timeRangeId),
    [readings, selectedMetric, timeRangeId],
  );
  const metricChartPoints = useMemo(
    () => metricChartSeries.filter(point => point.value !== null),
    [metricChartSeries],
  );
  const eventOverlays = useMemo(
    () => buildTelemetryEventOverlays(readings, events, selectedMetric),
    [readings, events, selectedMetric],
  );
  const eventImpacts = useMemo(
    () => buildTelemetryEventImpacts(readings, events, selectedMetric),
    [readings, events, selectedMetric],
  );
  const latestByMetric = useMemo(() => {
    return readings.reduce<Partial<Record<TelemetryMetric, TelemetryReading>>>((latest, reading) => {
      const current = latest[reading.metric];
      if (!current || Date.parse(reading.recordedAt) > Date.parse(current.recordedAt)) {
        latest[reading.metric] = reading;
      }
      return latest;
    }, {});
  }, [readings]);
  const recentEvents = useMemo(() => (
    [...events]
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .slice(0, 6)
  ), [events]);

  const groupedMetrics = useMemo(() => {
    const categories: Array<TelemetryMetricMetaCategory> = ['climate', 'light', 'irrigation', 'nutrition'];
    return categories.map(category => ({
      category,
      readings: Object.entries(TELEMETRY_METRIC_META)
        .filter(([, meta]) => meta.category === category)
        .map(([metric, meta]) => ({
          metric: metric as TelemetryMetric,
          meta,
          reading: latestByMetric[metric as TelemetryMetric],
        }))
        .filter(item => item.reading),
    })).filter(group => group.readings.length > 0);
  }, [latestByMetric]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Layers3 className="h-5 w-5 text-primary" />
            Telemetry Overview
          </CardTitle>
          <TimeRangeSelector value={timeRangeId} onChange={setTimeRangeId} />
        </CardHeader>
        <CardContent>
          {loadError && <p className="mb-3 text-sm text-amber-300">{loadError}</p>}
          {combinedSeries.metrics.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[360px] w-full">
              <LineChart data={combinedSeries.points} margin={{ left: 8, right: 12, top: 12, bottom: 12 }}>
                <CartesianGrid vertical={false} stroke="rgba(96, 111, 108, 0.22)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
                {combinedAxisUnits.map((unit, index) => (
                  <YAxis
                    key={unit}
                    yAxisId={telemetryUnitToAxisId(unit)}
                    orientation={index % 2 === 0 ? 'left' : 'right'}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    unit={` ${unit}`}
                    label={{
                      value: unit,
                      angle: index % 2 === 0 ? -90 : 90,
                      position: index % 2 === 0 ? 'insideLeft' : 'insideRight',
                      style: { fill: '#64748b', fontSize: 11 },
                    }}
                  />
                ))}
                <Tooltip content={<CombinedTelemetryTooltip metrics={combinedSeries.metrics} />} />
                <Legend />
                {combinedSeries.metrics.map(metric => {
                  const unit = combinedSeries.unitByMetric[metric];
                  if (!unit || !combinedAxisUnits.includes(unit)) return null;
                  return (
                    <Line
                      key={metric}
                      type="monotone"
                      yAxisId={telemetryUnitToAxisId(unit)}
                      dataKey={metric}
                      name={TELEMETRY_METRIC_META[metric].label}
                      stroke={TELEMETRY_METRIC_META[metric].color}
                      strokeWidth={2}
                      dot={combinedSeries.points.length <= 24}
                      connectNulls={false}
                      activeDot={{ r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[360px] items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.045] text-sm text-muted-foreground">
              Keine Messwerte im gewählten Zeitraum.
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Alle Metriken mit Daten im Zeitraum werden gemeinsam dargestellt. Bis zu vier Einheiten-Achsen (°C, %, kPa, …).
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <LineChartIcon className="h-5 w-5 text-accent" />
              Telemetry Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CustomDropdown
              options={metricOptions}
              value={selectedMetric}
              onChange={(value) => setSelectedMetric(value as TelemetryMetric)}
              placeholder="Metric"
              width="w-full"
              buttonClassName="mt-1"
            />
            {metricChartPoints.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                <LineChart data={metricChartSeries} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid vertical={false} stroke="rgba(96, 111, 108, 0.22)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis tickLine={false} axisLine={false} unit={selectedMeta.unit} width={64} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(180,176,166,0.9)', borderRadius: 16, color: '#1d2725', boxShadow: '0 16px 34px rgba(55,65,81,0.14)' }}
                    formatter={(value) => {
                      if (value === null || value === undefined) return ['—', selectedMeta.label];
                      return [`${value} ${selectedMeta.unit}`, selectedMeta.label];
                    }}
                  />
                  {eventOverlays.map(overlay => (
                    <ReferenceLine
                      key={overlay.id}
                      x={overlay.label}
                      stroke="#1aa167"
                      strokeDasharray="4 4"
                      label={{ value: overlay.eventType, fill: '#1aa167', fontSize: 11 }}
                    />
                  ))}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={selectedMeta.color}
                    strokeWidth={2}
                    dot={metricChartPoints.length <= 24}
                    connectNulls={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.045] text-sm text-muted-foreground">
                Keine Messwerte für diese Metrik im gewählten Zeitraum.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5 text-primary" />
              Event Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEvents.length > 0 ? recentEvents.map(event => (
              <div key={event.id} className="rounded-[0.95rem] border border-white/10 bg-white/[0.045] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-foreground">{event.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleDateString()}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{event.type}</div>
              </div>
            )) : (
              <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.045] p-4 text-sm text-muted-foreground">
                Noch keine Events als Overlay verfügbar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <GitCompareArrows className="h-5 w-5 text-accent" />
            Event-Korrelationen
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {eventImpacts.length > 0 ? eventImpacts.map(impact => (
            <button
              key={impact.id}
              type="button"
              onClick={() => setSelectedMetric(selectedMetric)}
              className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4 text-left transition-colors hover:border-accent/60 hover:bg-emerald-300/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{impact.eventTitle}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{impact.eventType} • {new Date(impact.eventAt).toLocaleDateString()}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${
                  impact.direction === 'up'
                    ? 'bg-primary/10 text-primary'
                    : impact.direction === 'down'
                      ? 'bg-accent/10 text-accent'
                      : impact.direction === 'flat'
                        ? 'bg-white/[0.045] text-muted-foreground'
                        : 'bg-accent/10 text-accent'
                }`}>
                  {impact.delta !== undefined ? `${impact.delta > 0 ? '+' : ''}${impact.delta}${selectedMeta.unit}` : 'offen'}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{impact.summary}</p>
            </button>
          )) : (
            <div className="col-span-full rounded-[1rem] border border-white/10 bg-white/[0.045] p-6 text-center text-sm text-muted-foreground">
              Noch keine Vorher/Nachher-Analyse für {selectedMeta.label}. Lege Messpunkte vor und nach Events an.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Database className="h-5 w-5 text-accent" />
            Latest Signals
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {groupedMetrics.length > 0 ? groupedMetrics.map(group => (
            <div key={group.category} className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
              <div className="text-sm font-medium capitalize text-foreground">{group.category}</div>
              <div className="mt-3 space-y-2">
                {group.readings.map(({ metric, meta, reading }) => (
                  <button
                    key={metric}
                    type="button"
                    onClick={() => setSelectedMetric(metric)}
                    className="flex w-full items-center justify-between gap-3 rounded-[0.95rem] bg-white/[0.045] px-3 py-2 text-left transition-colors hover:bg-emerald-300/10"
                  >
                    <span className="text-xs text-muted-foreground">{meta.label}</span>
                    <span className="text-sm font-medium text-foreground">{reading?.value} {reading?.unit}</span>
                  </button>
                ))}
              </div>
            </div>
          )) : (
            <div className="col-span-full rounded-[1rem] border border-white/10 bg-white/[0.045] p-6 text-center text-sm text-muted-foreground">
              Noch keine TelemetryReadings. Nutze den Messungs-Wizard oder Sensorbindings.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type TelemetryMetricMetaCategory = 'climate' | 'light' | 'irrigation' | 'nutrition';

function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TelemetryTimeRangeId;
  onChange: (value: TelemetryTimeRangeId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TELEMETRY_TIME_RANGES.map(range => (
        <Button
          key={range.id}
          type="button"
          size="sm"
          variant={value === range.id ? 'default' : 'outline'}
          className={cn('rounded-full px-3', value === range.id && 'shadow-sm')}
          onClick={() => onChange(range.id)}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}

export default LabModeTelemetry;
