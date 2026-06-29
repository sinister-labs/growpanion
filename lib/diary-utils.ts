/**
 * Diary utilities for aggregating grow events into a timeline
 */

import { Grow, GrowEvent, GrowEventType, Photo, PlantDB, TelemetryMetric, TelemetryReading } from '@/lib/db';

export type DiaryEventType = 'phase' | 'watering' | 'hst' | 'lst' | 'substrate' | 'harvest' | 'grow_event' | 'telemetry';

export const DIARY_EVENT_TYPES: DiaryEventType[] = [
  'phase',
  'watering',
  'hst',
  'lst',
  'substrate',
  'harvest',
  'grow_event',
  'telemetry',
];

export interface DiaryEvent {
  id: string;
  type: DiaryEventType;
  date: string;
  title: string;
  description: string;
  plantName?: string;
  plantId?: string;
  phenotypeId?: string;
  structuredEventType?: GrowEventType;
  details?: Record<string, string | number | undefined>;
  mediaUris?: string[];
  icon?: string;
}

export interface SensorTimelinePoint {
  id: string;
  timestamp: number;
  label: string;
  value: number;
  unit: string;
  positionPercent: number;
}

export interface SensorTimelineLane {
  metric: TelemetryMetric;
  label: string;
  unit: string;
  min: number;
  max: number;
  points: SensorTimelinePoint[];
}

export interface TimelineBeforeAfterMetric {
  metric: TelemetryMetric;
  label: string;
  unit: string;
  beforeAverage?: number;
  afterAverage?: number;
  beforeCount: number;
  afterCount: number;
  delta?: number;
  deltaPercent?: number;
  direction: 'up' | 'down' | 'flat' | 'unknown';
}

export const DEFAULT_SENSOR_TIMELINE_METRICS: TelemetryMetric[] = [
  'temperature',
  'humidity',
  'air_vpd',
  'leaf_temperature',
  'leaf_vpd',
  'pot_weight',
  'water_consumption',
  'ppfd',
  'dli',
  'ec',
  'ph',
  'drain_ec',
  'drain_ph',
  'drain_volume',
];

/**
 * Aggregates all events from a grow and its plants into a chronological timeline
 */
export function aggregateGrowEvents(grow: Grow, plants: PlantDB[]): DiaryEvent[] {
  const events: DiaryEvent[] = [];

  // Add phase change events from grow
  grow.phaseHistory.forEach((phase, index) => {
    events.push({
      id: `phase-${index}`,
      type: 'phase',
      date: phase.startDate,
      title: `Phase: ${phase.phase}`,
      description: index === 0 
        ? `Grow "${grow.name}" started in ${phase.phase} phase`
        : `Transitioned to ${phase.phase} phase`,
      icon: getPhaseIcon(phase.phase),
    });
  });

  // Add events from each plant
  plants.forEach((plant) => {
    // Watering events
    plant.waterings?.forEach((watering, index) => {
      events.push({
        id: `watering-${plant.id}-${index}`,
        type: 'watering',
        date: watering.date,
        title: 'Watering',
        description: `${watering.amount}ml${watering.mixId ? ' with fertilizer mix' : ''}`,
        plantName: plant.name,
        plantId: plant.id,
        phenotypeId: plant.phenotypeId,
        details: {
          amount: watering.amount,
          mixId: watering.mixId,
        },
        icon: '💧',
      });
    });

    // HST events
    plant.hstRecords?.forEach((hst, index) => {
      events.push({
        id: `hst-${plant.id}-${index}`,
        type: 'hst',
        date: hst.date,
        title: `HST: ${hst.method}`,
        description: hst.notes || `Performed ${hst.method}`,
        plantName: plant.name,
        plantId: plant.id,
        phenotypeId: plant.phenotypeId,
        details: {
          method: hst.method,
          notes: hst.notes,
        },
        icon: '✂️',
      });
    });

    // LST events
    plant.lstRecords?.forEach((lst, index) => {
      events.push({
        id: `lst-${plant.id}-${index}`,
        type: 'lst',
        date: lst.date,
        title: `LST: ${lst.method}`,
        description: lst.notes || `Applied ${lst.method}`,
        plantName: plant.name,
        plantId: plant.id,
        phenotypeId: plant.phenotypeId,
        details: {
          method: lst.method,
          notes: lst.notes,
        },
        icon: '🌱',
      });
    });

    // Substrate events
    plant.substrateRecords?.forEach((substrate, index) => {
      events.push({
        id: `substrate-${plant.id}-${index}`,
        type: 'substrate',
        date: substrate.date,
        title: substrate.action === 'repotting' ? 'Repotting' : 'Initial Potting',
        description: `${substrate.substrateType} in ${substrate.potSize} pot`,
        plantName: plant.name,
        plantId: plant.id,
        phenotypeId: plant.phenotypeId,
        details: {
          action: substrate.action,
          substrateType: substrate.substrateType,
          potSize: substrate.potSize,
          notes: substrate.notes,
        },
        icon: '🪴',
      });
    });

    if (plant.harvest) {
      const yieldText = plant.harvest.yieldDryGrams
        ? `${plant.harvest.yieldDryGrams}g dry`
        : plant.harvest.yieldWetGrams
          ? `${plant.harvest.yieldWetGrams}g wet`
          : 'Harvest recorded';

      events.push({
        id: `harvest-${plant.id}`,
        type: 'harvest',
        date: plant.harvest.date,
        title: 'Harvest',
        description: plant.harvest.notes ? `${yieldText} - ${plant.harvest.notes}` : yieldText,
        plantName: plant.name,
        plantId: plant.id,
        phenotypeId: plant.phenotypeId,
        details: {
          yieldWetGrams: plant.harvest.yieldWetGrams,
          yieldDryGrams: plant.harvest.yieldDryGrams,
          notes: plant.harvest.notes,
        },
        icon: '⚖️',
      });
    }
  });

  return sortDiaryEvents(events);
}

export function aggregateProductTimeline(
  grow: Grow,
  plants: PlantDB[],
  growEvents: GrowEvent[] = [],
  telemetryReadings: TelemetryReading[] = [],
  photos: Photo[] = [],
): DiaryEvent[] {
  const events = aggregateGrowEvents(grow, plants);
  const plantNameById = new Map(plants.map(plant => [plant.id, plant.name]));
  const photoById = new Map(photos.map(photo => [photo.id, photo]));

  growEvents.forEach(event => {
    const photoUri = typeof event.payload?.photoUri === 'string' ? event.payload.photoUri : undefined;
    const photoUris = [
      ...event.photoIds?.map(photoId => photoById.get(photoId)?.uri).filter((uri): uri is string => Boolean(uri)) ?? [],
      ...(photoUri ? [photoUri] : []),
    ];
    events.push({
      id: `grow-event-${event.id}`,
      type: 'grow_event',
      date: event.occurredAt,
      title: event.title,
      description: event.description || getStructuredEventDescription(event),
      plantName: event.plantId ? plantNameById.get(event.plantId) : undefined,
      plantId: event.plantId,
      phenotypeId: event.phenotypeId,
      structuredEventType: event.type,
      details: {
        eventType: event.type,
        phenotypeId: event.phenotypeId,
        photoIds: event.photoIds?.join(', '),
      },
      mediaUris: photoUris.length > 0 ? Array.from(new Set(photoUris)) : undefined,
      icon: getStructuredEventIcon(event.type),
    });
  });

  telemetryReadings.forEach(reading => {
    events.push({
      id: `telemetry-${reading.id}`,
      type: 'telemetry',
      date: reading.recordedAt,
      title: formatTelemetryMetric(reading.metric),
      description: `${reading.value} ${reading.unit}`,
      plantName: reading.plantId ? plantNameById.get(reading.plantId) : undefined,
      plantId: reading.plantId,
      phenotypeId: reading.phenotypeId,
      details: {
        metric: reading.metric,
        value: reading.value,
        unit: reading.unit,
        source: reading.source,
      },
      icon: '📈',
    });
  });

  // Sort events by date (newest first)
  return sortDiaryEvents(events);
}

export function buildSensorTimelineLanes(
  readings: TelemetryReading[],
  metrics: TelemetryMetric[] = DEFAULT_SENSOR_TIMELINE_METRICS,
  limitPerMetric = 24,
): SensorTimelineLane[] {
  const validReadings = readings
    .map(reading => ({ reading, timestamp: Date.parse(reading.recordedAt) }))
    .filter(item => Number.isFinite(item.timestamp));

  return metrics.map((metric): SensorTimelineLane | null => {
    const metricReadings = validReadings
      .filter(item => item.reading.metric === metric)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limitPerMetric);

    if (metricReadings.length === 0) return null;

    const values = metricReadings.map(item => item.reading.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    const unit = metricReadings[metricReadings.length - 1].reading.unit;

    return {
      metric,
      label: formatTelemetryMetric(metric),
      unit,
      min,
      max,
      points: metricReadings.map(item => ({
        id: item.reading.id,
        timestamp: item.timestamp,
        label: formatDiaryDate(item.reading.recordedAt, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        value: item.reading.value,
        unit: item.reading.unit,
        positionPercent: span === 0 ? 50 : Math.round(((item.reading.value - min) / span) * 100),
      })),
    };
  }).filter((lane): lane is SensorTimelineLane => Boolean(lane));
}

export function buildTimelineBeforeAfterAnalysis(
  readings: TelemetryReading[],
  event: Pick<DiaryEvent, 'date' | 'plantId' | 'phenotypeId'>,
  metrics: TelemetryMetric[] = ['temperature', 'humidity', 'air_vpd', 'leaf_vpd', 'pot_weight', 'water_consumption', 'ppfd', 'dli', 'drain_ec', 'drain_ph'],
  windowHours = 72,
): TimelineBeforeAfterMetric[] {
  const eventTime = Date.parse(event.date);
  if (!Number.isFinite(eventTime)) return [];

  const safeWindowHours = Number.isFinite(windowHours) && windowHours > 0 ? windowHours : 72;
  const windowMs = safeWindowHours * 36e5;

  return metrics.map((metric): TimelineBeforeAfterMetric | null => {
    const scopedReadings = readings.filter(reading => {
      if (reading.metric !== metric) return false;
      const readingTime = Date.parse(reading.recordedAt);
      if (!Number.isFinite(readingTime)) return false;
      if (event.plantId && reading.plantId && reading.plantId !== event.plantId) return false;
      if (event.phenotypeId && reading.phenotypeId && reading.phenotypeId !== event.phenotypeId) return false;
      return readingTime >= eventTime - windowMs && readingTime <= eventTime + windowMs;
    });

    const beforeValues = scopedReadings
      .filter(reading => Date.parse(reading.recordedAt) < eventTime)
      .map(reading => reading.value);
    const afterValues = scopedReadings
      .filter(reading => Date.parse(reading.recordedAt) > eventTime)
      .map(reading => reading.value);

    if (beforeValues.length === 0 && afterValues.length === 0) return null;

    const beforeAverage = averageTimelineValues(beforeValues);
    const afterAverage = averageTimelineValues(afterValues);
    const delta = beforeAverage !== undefined && afterAverage !== undefined
      ? roundTimelineNumber(afterAverage - beforeAverage)
      : undefined;
    const deltaPercent = delta !== undefined && beforeAverage !== undefined && beforeAverage !== 0
      ? roundTimelineNumber((delta / beforeAverage) * 100, 1)
      : undefined;
    const direction: TimelineBeforeAfterMetric['direction'] = delta === undefined
      ? 'unknown'
      : Math.abs(delta) < 0.01
        ? 'flat'
        : delta > 0
          ? 'up'
          : 'down';
    const unit = scopedReadings[scopedReadings.length - 1]?.unit ?? '';

    return {
      metric,
      label: formatTelemetryMetric(metric),
      unit,
      beforeAverage,
      afterAverage,
      beforeCount: beforeValues.length,
      afterCount: afterValues.length,
      delta,
      deltaPercent,
      direction,
    };
  }).filter((item): item is TimelineBeforeAfterMetric => Boolean(item));
}

function averageTimelineValues(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return roundTimelineNumber(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function roundTimelineNumber(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sortDiaryEvents(events: DiaryEvent[]): DiaryEvent[] {
  return events
    .filter(event => Number.isFinite(new Date(event.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Filters events by type
 */
export function filterEventsByType(events: DiaryEvent[], types: DiaryEventType[]): DiaryEvent[] {
  if (types.length === 0) return events;
  return events.filter(event => types.includes(event.type));
}

export function filterEventsByStructuredType(events: DiaryEvent[], types: GrowEventType[]): DiaryEvent[] {
  if (types.length === 0) return events;
  return events.filter(event => event.structuredEventType ? types.includes(event.structuredEventType) : true);
}

export function filterEventsByPlant(events: DiaryEvent[], plantId?: string): DiaryEvent[] {
  if (!plantId) return events;
  return events.filter(event => event.plantId === plantId);
}

export function filterEventsByPhenotype(events: DiaryEvent[], phenotypeId?: string): DiaryEvent[] {
  if (!phenotypeId) return events;
  return events.filter(event => event.phenotypeId === phenotypeId);
}

/**
 * Filters events by date range
 */
export function filterEventsByDateRange(events: DiaryEvent[], startDate?: string, endDate?: string): DiaryEvent[] {
  const parsedStartTime = startDate ? new Date(startDate).getTime() : undefined;
  const startTime = Number.isFinite(parsedStartTime) ? parsedStartTime : undefined;
  let endTime: number | undefined;

  if (endDate) {
    const end = new Date(endDate);
    if (!endDate.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }
    const parsedEndTime = end.getTime();
    endTime = Number.isFinite(parsedEndTime) ? parsedEndTime : undefined;
  }

  return events.filter(event => {
    const eventDate = new Date(event.date).getTime();
    if (Number.isNaN(eventDate)) return false;
    if (startTime !== undefined && eventDate < startTime) return false;
    if (endTime !== undefined && eventDate > endTime) return false;
    return true;
  });
}

/**
 * Groups events by date
 */
export function groupEventsByDate(events: DiaryEvent[]): Map<string, DiaryEvent[]> {
  const grouped = new Map<string, DiaryEvent[]>();
  
  events.forEach(event => {
    const eventDate = new Date(event.date);
    if (!Number.isFinite(eventDate.getTime())) {
      return;
    }

    const dateKey = eventDate.toISOString().split('T')[0];
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, event]);
  });

  return grouped;
}

export function formatDiaryDate(
  dateValue: string,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'Unknown date'
): string {
  const date = new Date(dateValue);

  if (!Number.isFinite(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString('en-US', options);
}

export function formatDiaryTime(dateValue: string, fallback = ''): string {
  const date = new Date(dateValue);

  if (!Number.isFinite(date.getTime())) {
    return fallback;
  }

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Gets event statistics for a grow
 */
export function getEventStats(events: DiaryEvent[]): Record<DiaryEventType, number> {
  const stats = Object.fromEntries(
    DIARY_EVENT_TYPES.map(type => [type, 0])
  ) as Record<DiaryEventType, number>;

  events.forEach(event => {
    stats[event.type]++;
  });

  return stats;
}

/**
 * Returns an appropriate icon for a phase
 */
function getPhaseIcon(phase: string): string {
  switch (phase) {
    case 'Seedling': return '🌱';
    case 'Vegetative': return '🌿';
    case 'Flowering': return '🌸';
    case 'Flushing': return '💦';
    case 'Drying': return '🍂';
    case 'Curing': return '📦';
    case 'Done': return '✅';
    default: return '🌱';
  }
}

/**
 * Formats event for export
 */
export function formatEventForExport(event: DiaryEvent): string {
  const date = formatDiaryDate(event.date);
  const plant = event.plantName ? ` [${event.plantName}]` : '';
  return `${date}${plant}: ${event.title} - ${event.description}`;
}

/**
 * Gets a color class for event type
 */
export function getEventTypeColor(type: DiaryEventType): string {
  switch (type) {
    case 'phase': return 'bg-primary/10 text-primary border-primary/35';
    case 'watering': return 'bg-accent/10 text-accent border-accent/35';
    case 'hst': return 'bg-destructive/10 text-destructive border-destructive/35';
    case 'lst': return 'bg-primary/10 text-primary border-primary/35';
    case 'substrate': return 'bg-secondary text-secondary-foreground border-border/70';
    case 'harvest': return 'bg-primary/10 text-primary border-primary/35';
    case 'grow_event': return 'bg-accent/10 text-accent border-accent/35';
    case 'telemetry': return 'bg-accent/10 text-accent border-accent/35';
    default: return 'bg-secondary text-muted-foreground border-border/70';
  }
}

/**
 * Gets a label for event type
 */
export function getEventTypeLabel(type: DiaryEventType): string {
  switch (type) {
    case 'phase': return 'Phase Change';
    case 'watering': return 'Watering';
    case 'hst': return 'HST Training';
    case 'lst': return 'LST Training';
    case 'substrate': return 'Substrate';
    case 'harvest': return 'Harvest';
    case 'grow_event': return 'Grow Event';
    case 'telemetry': return 'Telemetry';
    default: return 'Unknown';
  }
}

function getStructuredEventDescription(event: GrowEvent): string {
  if (event.type === 'prepared_batch') return 'Nährlösung angesetzt';
  if (event.type === 'watering') return 'Gießereignis erfasst';
  if (event.type === 'training' || event.type === 'topping' || event.type === 'lst' || event.type === 'hst') return 'Training erfasst';
  if (event.type === 'measurement') return 'Manuelle Messung erfasst';
  return 'Strukturiertes Grow-Event';
}

function getStructuredEventIcon(type: GrowEvent['type']): string {
  switch (type) {
    case 'watering': return '💧';
    case 'feeding':
    case 'prepared_batch': return '🧪';
    case 'training':
    case 'topping':
    case 'lst':
    case 'hst':
    case 'defoliation':
    case 'lollipopping':
    case 'scrog': return '✂️';
    case 'transplant':
    case 'substrate_change': return '🪴';
    case 'flowering_start': return '🌸';
    case 'harvest': return '⚖️';
    case 'photo': return '📷';
    case 'diagnosis':
    case 'problem':
    case 'treatment': return '⚠️';
    case 'measurement':
    case 'light_adjustment': return '📈';
    default: return '📝';
  }
}

export function formatTelemetryMetric(metric: TelemetryReading['metric']): string {
  return metric
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
