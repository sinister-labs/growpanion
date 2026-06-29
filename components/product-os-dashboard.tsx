"use client";

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Beaker, CheckCircle2, ChevronRight, ClipboardList, Clock3, Cloud, Database, Droplet, FlaskConical, Layers3, RadioTower, Route, Sparkles, Sprout } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LabModeTelemetry from '@/components/lab-mode-telemetry';
import PhenotypeComparison from '@/components/phenotype-comparison';
import type { Grow, GrowEvent, IrrigationEvent, Phenotype, PlantDB, Recommendation, Reminder, TelemetryReading } from '@/lib/db';
import {
  getAllSensorBindings,
  getGrowEventsForGrow,
  getIrrigationEventsForGrow,
  getPhenotypesForGrow,
  getRecommendationsForGrow,
  getRemindersForGrow,
  getTelemetryForGrow,
  saveRecommendation,
  type SensorBinding,
} from '@/lib/db';
import {
  buildLabSignals,
  buildRecentActivity,
  buildRecommendations,
  PRODUCT_ENTITIES,
  PRODUCT_MODULES,
  productRecommendationToRecord,
  type GrowPanionMode,
  type ProductRecommendation,
  type RecommendationSeverity,
} from '@/lib/product-os';
import { useSensorData } from '@/hooks/useSensorData';
import { useTelemetryRefreshToken } from '@/hooks/useTelemetryRefreshToken';
import { cn } from '@/lib/utils';

interface ProductOSDashboardProps {
  grow: Grow | null;
  plants: PlantDB[];
  onOpenGrows: () => void;
  onOpenGrow?: () => void;
  onOpenTools: () => void;
  showHeader?: boolean;
}

const severityIcon = (severity: RecommendationSeverity) => {
  if (severity === 'success') return <CheckCircle2 className="h-4 w-4" />;
  if (severity === 'warning' || severity === 'critical') return <AlertTriangle className="h-4 w-4" />;
  if (severity === 'action') return <ClipboardList className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
};

const latestTelemetryMetric = (readings: TelemetryReading[], metric: TelemetryReading['metric']) => {
  return readings
    .filter(reading => reading.metric === metric)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
};

export function ProductOSDashboard({ grow, plants, onOpenGrows, onOpenGrow, onOpenTools, showHeader = true }: ProductOSDashboardProps) {
  const telemetryRefreshToken = useTelemetryRefreshToken();
  const [mode, setMode] = useState<GrowPanionMode>('grow');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [sensorBindings, setSensorBindings] = useState<SensorBinding[]>([]);
  const [telemetryReadings, setTelemetryReadings] = useState<TelemetryReading[]>([]);
  const [growEvents, setGrowEvents] = useState<GrowEvent[]>([]);
  const [irrigationEvents, setIrrigationEvents] = useState<IrrigationEvent[]>([]);
  const [phenotypes, setPhenotypes] = useState<Phenotype[]>([]);
  const [storedRecommendations, setStoredRecommendations] = useState<Recommendation[]>([]);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const { sensorData } = useSensorData(60000);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      if (!grow) {
        setReminders([]);
        setSensorBindings([]);
        setTelemetryReadings([]);
        setGrowEvents([]);
        setIrrigationEvents([]);
        setPhenotypes([]);
        setStoredRecommendations([]);
        setReminderError(null);
        return;
      }

      try {
        const [data, bindings, telemetry, events, irrigations, phenotypeRecords, recommendations] = await Promise.all([
          getRemindersForGrow(grow.id),
          getAllSensorBindings(),
          getTelemetryForGrow(grow.id),
          getGrowEventsForGrow(grow.id),
          getIrrigationEventsForGrow(grow.id),
          getPhenotypesForGrow(grow.id),
          getRecommendationsForGrow(grow.id),
        ]);
        if (!cancelled) {
          setReminders(data);
          setSensorBindings(bindings.filter(binding => !binding.growId || binding.growId === grow.id));
          setTelemetryReadings(telemetry);
          setGrowEvents(events);
          setIrrigationEvents(irrigations);
          setPhenotypes(phenotypeRecords);
          setStoredRecommendations(recommendations);
          setReminderError(null);
        }
      } catch {
        if (!cancelled) {
          setReminders([]);
          setSensorBindings([]);
          setTelemetryReadings([]);
          setGrowEvents([]);
          setIrrigationEvents([]);
          setPhenotypes([]);
          setStoredRecommendations([]);
          setReminderError('Reminders could not be loaded.');
        }
      }
    }

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, [grow, telemetryRefreshToken]);

  const hasLegacySensorData = Boolean(sensorData && sensorData.length > 0);
  const hasSensorData = telemetryReadings.length > 0
    || sensorBindings.some(binding => binding.growId)
    || hasLegacySensorData;
  const recommendations = useMemo(() => buildRecommendations(grow, plants, reminders, new Date(), {
    telemetryReadings,
    growEvents,
    irrigationEvents,
    phenotypes,
    storedRecommendations,
  }), [grow, plants, reminders, telemetryReadings, growEvents, irrigationEvents, phenotypes, storedRecommendations]);
  const recentActivity = useMemo(() => buildRecentActivity(plants, {
    telemetryReadings,
    growEvents,
    irrigationEvents,
  }), [plants, telemetryReadings, growEvents, irrigationEvents]);
  const labSignals = useMemo(() => buildLabSignals(hasSensorData, sensorBindings), [hasSensorData, sensorBindings]);
  const operatingSignalCards = useMemo(() => {
    const temperature = latestTelemetryMetric(telemetryReadings, 'temperature');
    const humidity = latestTelemetryMetric(telemetryReadings, 'humidity');
    const latestIrrigation = [...irrigationEvents]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];
    const nutritionEvents = growEvents.filter(event => event.type === 'feeding' || event.type === 'prepared_batch' || event.type === 'measurement');

    return [
      {
        id: 'plants',
        title: 'Plants',
        value: grow ? `${plants.length}/${plants.length}` : '0/0',
        detail: plants.length > 0 ? `${plants.length} operational plant${plants.length === 1 ? '' : 's'} in this grow.` : 'No plants in this grow yet.',
        icon: Sprout,
        active: plants.length > 0,
      },
      {
        id: 'climate',
        title: 'Climate',
        value: temperature && humidity ? `${temperature.value}${temperature.unit} · ${humidity.value}${humidity.unit}` : 'No data',
        detail: temperature || humidity ? 'Latest temperature and humidity telemetry is available.' : 'Capture temperature, humidity or VPD telemetry.',
        icon: Cloud,
        active: Boolean(temperature || humidity),
      },
      {
        id: 'irrigation',
        title: 'Irrigation',
        value: latestIrrigation ? `${latestIrrigation.liters} L` : 'No data',
        detail: latestIrrigation ? `Last watering ${new Date(latestIrrigation.occurredAt).toLocaleDateString()}.` : 'Use the watering wizard to capture water use and runoff.',
        icon: Droplet,
        active: Boolean(latestIrrigation),
      },
      {
        id: 'nutrition',
        title: 'Nutrition',
        value: nutritionEvents.length > 0 ? `${nutritionEvents.length} records` : 'No data',
        detail: nutritionEvents.length > 0 ? 'Feeding and measurement events are available.' : 'Capture batch, EC/pH and runoff values in a wizard.',
        icon: FlaskConical,
        active: nutritionEvents.length > 0,
      },
    ];
  }, [grow, growEvents, irrigationEvents, plants.length, telemetryReadings]);

  useEffect(() => {
    if (!grow) return;

    const generatedRecommendations: ProductRecommendation[] = recommendations.filter(recommendation => (
      !recommendation.id.startsWith('stored-') &&
      recommendation.id !== 'all-clear' &&
      recommendation.id !== 'create-grow'
    ));

    void Promise.all(generatedRecommendations.map(recommendation => (
      saveRecommendation(productRecommendationToRecord(recommendation, grow.id))
    ))).catch(() => undefined);
  }, [grow, recommendations]);

  return (
    <section className="min-w-0 max-w-full space-y-3 overflow-x-hidden pt-3 text-slate-100">
      {showHeader && (
        <div className="infotainment-panel p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Activity className="h-3.5 w-3.5" />
                {grow ? grow.name : 'No active grow'}
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">GrowPanion OS</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  A focused operating surface for grow decisions, signal checks and repeat workflows.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={onOpenTools}>
                <Beaker className="mr-2 h-4 w-4" />
                Tools
              </Button>
              <Button onClick={onOpenGrows}>
                <Route className="mr-2 h-4 w-4" />
                Manage Grows
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0 max-w-full">
        <div className="relative min-h-[15rem] overflow-hidden rounded-[1.45rem] border border-white/[0.12] bg-[#0d151b] bg-[url('/grow-hero-canopy.png')] bg-cover bg-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_70px_rgba(0,0,0,0.32)]">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,11,15,0.95)_0%,rgba(6,11,15,0.74)_42%,rgba(6,11,15,0.24)_100%)]" />
          <div className="relative flex min-h-[15rem] flex-col justify-between gap-8 p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/[0.18] bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-normal text-emerald-200 shadow-[0_0_24px_rgba(52,255,154,0.10)]">
                  <Activity className="h-3.5 w-3.5" />
                  {grow ? `${grow.currentPhase} · ${plants.length} plants` : 'No active grow'}
                </div>
                <h1 className="mt-4 truncate text-5xl font-light tracking-normal text-white sm:text-6xl">
                  Home
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  {grow ? `Your grow is in ${grow.currentPhase} stage. Systems nominal.` : 'Create or select a grow workspace to start the operating surface.'}
                </p>
              </div>

              <Button
                className="group relative h-[3.65rem] w-full overflow-hidden rounded-[1.45rem] border border-emerald-200/[0.35] bg-[linear-gradient(180deg,rgba(32,214,132,0.98)_0%,rgba(12,164,94,0.98)_48%,rgba(3,122,72,0.98)_100%)] px-0 text-base font-semibold text-white shadow-[0_0_0_1px_rgba(52,255,154,0.12),0_0_34px_rgba(16,185,129,0.46),0_18px_34px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.30),inset_0_-12px_24px_rgba(0,58,35,0.24)] transition-[box-shadow,filter,transform] duration-200 hover:brightness-110 hover:shadow-[0_0_0_1px_rgba(52,255,154,0.18),0_0_44px_rgba(16,185,129,0.58),0_18px_34px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.34),inset_0_-12px_24px_rgba(0,58,35,0.20)] sm:w-[15.75rem] lg:mt-5"
                onClick={grow && onOpenGrow ? onOpenGrow : onOpenGrows}
              >
                <span className="pointer-events-none absolute inset-x-4 top-1 h-5 rounded-full bg-white/18 blur-md" />
                <span className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18))]" />
                <span className="relative z-10 flex w-full items-center justify-between gap-5 px-8">
                  <span>{grow ? 'Open Grow' : 'Manage Grows'}</span>
                  <ArrowRight className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Button>
            </div>

            <div className="flex w-full max-w-[34rem] gap-1 rounded-[1.15rem] border border-white/[0.14] bg-black/[0.34] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl" role="group" aria-label="Dashboard mode">
              {(['grow', 'lab'] as const).map(nextMode => (
                <button
                  key={nextMode}
                  type="button"
                  onClick={() => setMode(nextMode)}
                  className={cn(
                    "h-14 flex-1 rounded-[0.92rem] px-4 text-base font-semibold transition-[background-color,color,box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
                    mode === nextMode
                      ? "border border-emerald-200/[0.28] bg-emerald-400/30 text-emerald-100 shadow-[0_0_28px_rgba(52,255,154,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]"
                      : "border border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  {nextMode === 'grow' ? 'Grow' : 'Lab'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {mode === 'grow' && (
        <div className="mt-3 min-w-0 max-w-full space-y-3 overflow-x-hidden">
          <div className="min-w-0 overflow-hidden rounded-[1.1rem] border border-white/10 bg-[#090f14]/92 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_52px_rgba(0,0,0,0.25)]">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,255,154,0.8)]" />
                  Operating Signals
                </h2>
              </div>
              <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-semibold text-slate-300">
                <RadioTower className="h-3.5 w-3.5" />
                {telemetryReadings.length > 0 ? `${telemetryReadings.length} readings` : 'Manual ready'}
              </div>
            </div>
            <div className="w-0 min-w-full max-w-full overflow-x-auto pb-1">
              <div className="grid min-w-[62rem] grid-cols-4 gap-2.5">
              {operatingSignalCards.map(card => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className="relative min-h-[13.25rem] overflow-hidden rounded-[0.95rem] border border-white/10 bg-[linear-gradient(150deg,rgba(19,28,35,0.96),rgba(7,12,17,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_12px_28px_rgba(0,0,0,0.24)]"
                  >
                    <div className="pointer-events-none absolute inset-x-5 bottom-4 h-9 rounded-b-[0.8rem] border-b border-emerald-300/[0.22] bg-[linear-gradient(90deg,transparent,rgba(52,255,154,0.11),transparent)]" />
                    <div className="pointer-events-none absolute bottom-6 left-6 right-6 h-5 opacity-90 [clip-path:polygon(0_74%,26%_74%,36%_48%,44%_74%,52%_74%,58%_26%,66%_73%,100%_73%,100%_100%,0_100%)] bg-emerald-300/[0.16]" />
                    <div className="relative flex items-start justify-between gap-3">
                      <h3 className="truncate text-sm font-semibold text-slate-200">{card.title}</h3>
                      <span className={cn(
                        "mt-0.5 h-7 w-7 shrink-0 rounded-full border border-dashed",
                        card.active ? "border-emerald-300 bg-emerald-300/10 shadow-[0_0_18px_rgba(52,255,154,0.28)]" : "border-white/[0.35]",
                      )} />
                    </div>
                    <div className="relative mt-5 flex items-center gap-4">
                      <span className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full border border-emerald-300/[0.24] bg-black/[0.22] text-emerald-200 shadow-[0_0_30px_rgba(52,255,154,0.14),inset_0_0_24px_rgba(52,255,154,0.07)]">
                        <span className="absolute inset-3 rounded-full border border-emerald-300/[0.20]" />
                        <span className="absolute inset-6 rounded-full border border-emerald-300/[0.14]" />
                        <Icon className="relative h-6 w-6" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-2xl font-semibold tracking-normal text-white">{card.value}</div>
                        <p className="mt-2 line-clamp-3 max-w-[12rem] text-xs leading-5 text-slate-400">{card.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <Card className="min-w-0 rounded-[1.1rem] border-white/10 bg-[#090f14]/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_52px_rgba(0,0,0,0.25)]">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,255,154,0.8)]" />
                  Decision Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 p-4 pt-0">
                {reminderError && <p className="text-sm text-amber-200">{reminderError}</p>}
                {recommendations.map(recommendation => (
                  <div key={recommendation.id} className="group relative overflow-hidden rounded-[0.95rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,27,34,0.94),rgba(7,12,17,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_rgba(0,0,0,0.22)]">
                    <div className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full bg-emerald-300/70 shadow-[0_0_18px_rgba(52,255,154,0.55)]" />
                    <div className="relative flex gap-4">
                      <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full border border-emerald-300/[0.24] bg-black/[0.22] text-emerald-200 shadow-[0_0_28px_rgba(52,255,154,0.14),inset_0_0_24px_rgba(52,255,154,0.07)]">
                        <span className="absolute inset-2.5 rounded-full border border-emerald-300/[0.20]" />
                        <span className="absolute inset-5 rounded-full border border-emerald-300/[0.14]" />
                        {severityIcon(recommendation.severity)}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-white">{recommendation.title}</h3>
                            <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-300">{recommendation.summary}</p>
                            <p className="mt-1 text-sm font-semibold leading-5 text-emerald-100">{recommendation.action}</p>
                          </div>
                          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-emerald-200" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {recommendation.usedData.map(item => (
                            <span key={item} className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-normal text-slate-300">{item}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="min-w-0 space-y-3">
              <Card className="min-w-0 rounded-[1.1rem] border-white/10 bg-[#090f14]/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_52px_rgba(0,0,0,0.25)]">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,255,154,0.8)]" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 p-4 pt-0">
                  {recentActivity.length > 0 ? recentActivity.map(item => (
                    <div key={item.id} className="relative overflow-hidden rounded-[0.95rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,27,34,0.92),rgba(7,12,17,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
                      <div className="pointer-events-none absolute inset-x-5 bottom-0 h-8 border-b border-emerald-300/[0.12] bg-[linear-gradient(90deg,transparent,rgba(52,255,154,0.08),transparent)]" />
                      <div className="relative flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-3">
                          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-emerald-300/[0.22] bg-emerald-300/[0.08] text-emerald-200">
                            <Clock3 className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{item.title}</div>
                            <div className="mt-1 text-xs text-slate-400">
                            {item.label}{item.plantName ? ` • ${item.plantName}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</div>
                      </div>
                      <p className="relative mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{item.detail}</p>
                    </div>
                  )) : (
                    <div className="relative min-h-[11rem] overflow-hidden rounded-[0.95rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,27,34,0.92),rgba(7,12,17,0.94))] p-6 text-sm text-slate-300">
                      <div className="relative flex h-full min-h-[8rem] items-center justify-center gap-8">
                        <span className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full border border-emerald-300/[0.22] bg-emerald-300/[0.06] shadow-[0_0_38px_rgba(52,255,154,0.10)]">
                          <span className="absolute inset-3 rounded-full border border-emerald-300/[0.24]" />
                          <span className="absolute inset-7 rounded-full border border-emerald-300/[0.20] bg-emerald-300/5" />
                          <span className="absolute -inset-5 rounded-full border border-dashed border-emerald-300/[0.12]" />
                          <span className="relative h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(52,255,154,0.9)]" />
                        </span>
                        <span className="max-w-[16rem] text-base leading-6 text-slate-200">No events or measurements<br />in the active grow yet.</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
        )}

        {mode === 'lab' && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            {labSignals.map(signal => (
              <Card key={signal.id} className={cn(
                "rounded-[1rem] border-white/10 bg-[linear-gradient(145deg,rgba(18,27,34,0.94),rgba(7,12,17,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_rgba(0,0,0,0.22)]",
                signal.available && "border-emerald-300/[0.22] bg-emerald-300/10",
              )}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">{signal.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-xs font-semibold ${signal.available ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {signal.available ? 'Data source active' : 'Foundation ready'}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{signal.source}</p>
                  <p className="mt-2 text-xs text-slate-200">{signal.nextStep}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {grow ? (
            <div className="space-y-6">
              <LabModeTelemetry growId={grow.id} />
              <PhenotypeComparison growId={grow.id} plants={plants} />
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Create a grow to see sensor charts, event overlays and Lab Mode correlations.
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-[1.1rem] border-white/10 bg-[#090f14]/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_52px_rgba(0,0,0,0.25)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,255,154,0.8)]" />
                  Core Entities
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {PRODUCT_ENTITIES.map(entity => (
                  <span key={entity} className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs text-slate-300">
                    {entity}
                  </span>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[1.1rem] border-white/10 bg-[#090f14]/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_52px_rgba(0,0,0,0.25)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,255,154,0.8)]" />
                  Product Modules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {PRODUCT_MODULES.map(module => (
                  <div key={module.id} className="rounded-[0.95rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,27,34,0.94),rgba(7,12,17,0.96))] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-white">{module.title}</div>
                      <span className="rounded-full border border-emerald-300/[0.18] bg-emerald-300/10 px-2 py-1 text-xs text-emerald-200">{module.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{module.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}

export default ProductOSDashboard;
