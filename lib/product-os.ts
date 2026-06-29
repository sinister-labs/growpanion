import type { Grow, GrowEvent, IrrigationEvent, Phenotype, PlantDB, Recommendation, Reminder, SensorBinding, TelemetryReading } from '@/lib/db';
import { getDLIRating, type GrowLightPhase } from '@/lib/dli-utils';
import { calculateGrowTotalDays, getDaysInPhase, isGrowActive } from '@/lib/growth-utils';
import { getReminderDueTime } from '@/lib/reminder-utils';
import { getOptimalVpdRange, getVpdStatus } from '@/lib/vpd-utils';

export type GrowPanionMode = 'grow' | 'lab';

export type ProductEntity =
  | 'Grow'
  | 'Plant'
  | 'Phenotype'
  | 'Genetics'
  | 'GeneticsOverride'
  | 'LineageEdge'
  | 'GrowEvent'
  | 'TelemetryReading'
  | 'Device'
  | 'DeviceIntegration'
  | 'SensorBinding'
  | 'FertilizerProduct'
  | 'MixRecipe'
  | 'PreparedBatch'
  | 'IrrigationEvent'
  | 'Photo'
  | 'Recommendation'
  | 'PowerConsumer'
  | 'PowerCostProfile';

export type RecommendationSeverity = 'info' | 'success' | 'warning' | 'critical' | 'action';

export interface ProductRecommendation {
  id: string;
  title: string;
  severity: RecommendationSeverity;
  summary: string;
  action: string;
  usedData: string[];
  relatedEvents: string[];
  supportingMeasurements: string[];
}

export interface RecommendationContext {
  telemetryReadings?: TelemetryReading[];
  growEvents?: GrowEvent[];
  irrigationEvents?: IrrigationEvent[];
  phenotypes?: Phenotype[];
  storedRecommendations?: Recommendation[];
}

export interface GrowModeStatusCard {
  id: string;
  title: string;
  value: string;
  status: RecommendationSeverity;
  detail: string;
}

export interface ProductActivityItem {
  id: string;
  title: string;
  category: 'event' | 'irrigation' | 'telemetry';
  timestamp: string;
  label: string;
  detail: string;
  plantName?: string;
}

export interface LabModeSignal {
  id: string;
  label: string;
  category: 'climate' | 'light' | 'irrigation' | 'nutrition' | 'devices' | 'timeline';
  available: boolean;
  source: string;
  nextStep: string;
}

export interface WizardDefinition {
  id: string;
  label: string;
  category: 'irrigation' | 'nutrition' | 'training' | 'observation' | 'lifecycle' | 'device' | 'genetics';
  steps: string[];
}

export interface ProductModule {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'foundation' | 'planned';
}

export const PRODUCT_ENTITIES: ProductEntity[] = [
  'Grow',
  'Plant',
  'Phenotype',
  'Genetics',
  'GeneticsOverride',
  'LineageEdge',
  'GrowEvent',
  'TelemetryReading',
  'Device',
  'DeviceIntegration',
  'SensorBinding',
  'FertilizerProduct',
  'MixRecipe',
  'PreparedBatch',
  'IrrigationEvent',
  'Photo',
  'Recommendation',
  'PowerConsumer',
  'PowerCostProfile',
];

export const PRODUCT_MODULES: ProductModule[] = [
  {
    id: 'device-layer',
    title: 'Device Layer',
    description: 'Adapter-based integrations for AC Infinity, Tuya Legacy, manual sensors and future MQTT/ESP32 devices.',
    status: 'active',
  },
  {
    id: 'telemetry-layer',
    title: 'Telemetry Layer',
    description: 'Time-series readings for climate, VPD, PPFD, DLI, pot weight, EC, pH and drain values.',
    status: 'active',
  },
  {
    id: 'genetics-registry',
    title: 'Genetics Registry',
    description: 'Central genetics pool with default data, user overrides, phenotypes and lineage relationships.',
    status: 'active',
  },
  {
    id: 'feeding-model',
    title: 'Fertilizer / Feeding Model',
    description: 'Separation of recipe, prepared nutrient batch and per-plant irrigation event.',
    status: 'active',
  },
  {
    id: 'insight-layer',
    title: 'Insight Layer',
    description: 'Explainable recommendations based on events, reminders, telemetry, plant status and grow phase.',
    status: 'active',
  },
  {
    id: 'power-cost',
    title: 'Power Cost Model',
    description: 'Phase-aware electricity estimates with device-runtime import, cost per plant and optional cost per gram.',
    status: 'active',
  },
];

export const WIZARD_CATALOG: WizardDefinition[] = [
  {
    id: 'watering',
    label: 'Watering',
    category: 'irrigation',
    steps: ['Select plants', 'Choose batch or clear water', 'Enter liters per plant', 'Add pot weight and runoff values', 'Save note or photo'],
  },
  {
    id: 'prepared-batch',
    label: 'Nutrient Mix',
    category: 'nutrition',
    steps: ['Choose recipe', 'Enter total volume', 'Measure EC and pH', 'Capture source water and temperature', 'Save batch'],
  },
  {
    id: 'training',
    label: 'Training',
    category: 'training',
    steps: ['Select plants', 'Choose training type', 'Set intensity', 'Add optional photo', 'Save note'],
  },
  {
    id: 'defoliation',
    label: 'Defoliation',
    category: 'training',
    steps: ['Select plant', 'Choose defoliation', 'Set intensity', 'Add optional photo', 'Save note'],
  },
  {
    id: 'lollipopping',
    label: 'Lollipopping',
    category: 'training',
    steps: ['Select plant', 'Choose lollipopping', 'Set intensity', 'Add optional photo', 'Save note'],
  },
  {
    id: 'scrog',
    label: 'ScrOG',
    category: 'training',
    steps: ['Pflanze auswählen', 'ScrOG als Trainingstyp wählen', 'Methode und Intensität erfassen', 'Foto optional hinzufügen', 'Notiz speichern'],
  },
  {
    id: 'observation',
    label: 'Photo / Observation',
    category: 'observation',
    steps: ['Choose plant or grow', 'Add optional photo', 'Write observation', 'Mark issue or diagnosis', 'Save event'],
  },
  {
    id: 'flowering',
    label: 'Start Flowering',
    category: 'lifecycle',
    steps: ['Confirm grow', 'Set flip date', 'Check light schedule', 'Adjust reminders', 'Save phase'],
  },
  {
    id: 'substrate-change',
    label: 'Repot / Substrate',
    category: 'lifecycle',
    steps: ['Select plant', 'Choose action', 'Capture substrate', 'Add pot size', 'Update timeline'],
  },
  {
    id: 'harvest',
    label: 'Harvest',
    category: 'lifecycle',
    steps: ['Select plants', 'Capture wet weight', 'Add photos and notes', 'Prepare drying', 'Update phenotype'],
  },
  {
    id: 'device-connect',
    label: 'Connect Device',
    category: 'device',
    steps: ['Choose integration', 'Check credentials', 'Detect device', 'Assign grow, tent or plant', 'Enable sensor values'],
  },
  {
    id: 'genetics-add',
    label: 'Add Genetics',
    category: 'genetics',
    steps: ['Enter breeder and name', 'Add type and traits', 'Link parents or crosses', 'Save notes', 'Update genetics pool'],
  },
  {
    id: 'phenotype-assessment',
    label: 'Assess Phenotype',
    category: 'observation',
    steps: ['Select plant', 'Capture growth, internodes and stretch', 'Add training response and flowering time', 'Record aroma, photos and observations', 'Save phenotype'],
  },
];

export function getRecommendedMode(hasTelemetry: boolean, activeGrow: Grow | null): GrowPanionMode {
  if (!activeGrow) return 'grow';
  return hasTelemetry ? 'lab' : 'grow';
}

export function buildGrowModeStatus(
  grow: Grow | null,
  plants: PlantDB[],
  reminders: Reminder[],
  now = new Date(),
  context: RecommendationContext = {},
): GrowModeStatusCard[] {
  if (!grow) {
    return [
      {
        id: 'grow-status',
        title: 'Grow Status',
        value: 'No active grow',
        status: 'info',
        detail: 'Create or select a grow to unlock the operating view.',
      },
    ];
  }

  const harvestedPlants = plants.filter(plant => plant.isHarvested).length;
  const activePlants = Math.max(0, plants.length - harvestedPlants);
  const enabledReminders = reminders.filter(reminder => reminder.enabled);
  const dueReminders = enabledReminders.filter(reminder => getReminderDueTime(reminder) <= now.getTime());
  const nextReminder = enabledReminders
    .filter(reminder => getReminderDueTime(reminder) > now.getTime())
    .sort((a, b) => getReminderDueTime(a) - getReminderDueTime(b))[0];
  const telemetry = context.telemetryReadings ?? [];
  const growEvents = context.growEvents ?? [];
  const irrigationEvents = context.irrigationEvents ?? [];
  const latestTemperature = newestTelemetry(telemetry, 'temperature');
  const latestHumidity = newestTelemetry(telemetry, 'humidity');
  const latestAirVpd = newestTelemetry(telemetry, 'air_vpd');
  const latestWater = newestTelemetry(telemetry, 'water_consumption');
  const latestDrainEc = newestTelemetry(telemetry, 'drain_ec');
  const latestDrainPh = newestTelemetry(telemetry, 'drain_ph');
  const latestIrrigation = newestByDate(irrigationEvents, event => event.occurredAt);
  const latestTraining = newestByDate(
    growEvents.filter(isTrainingEvent),
    event => event.occurredAt,
  );

  const optimalVpdRange = getOptimalVpdRange(grow.currentPhase, getDaysInPhase(grow));
  const vpdStatus = latestAirVpd ? getVpdStatus(latestAirVpd.value, optimalVpdRange) : 'unknown';
  const climateStatus: RecommendationSeverity = (
    latestTemperature && latestTemperature.value >= 34
  ) || (
    latestHumidity && grow.currentPhase === 'Flowering' && latestHumidity.value >= 75
  ) || vpdStatus === 'high'
    ? 'critical'
    : latestTemperature || latestHumidity || latestAirVpd
      ? 'success'
      : 'info';
  const irrigationHoursAgo = latestIrrigation
    ? Math.round((now.getTime() - Date.parse(latestIrrigation.occurredAt)) / 36e5)
    : null;
  const nutritionStatus: RecommendationSeverity = latestDrainEc && latestDrainEc.value >= 3.5
    ? 'critical'
    : latestDrainEc && latestDrainEc.value >= 2.5
      ? 'warning'
      : latestDrainEc || latestDrainPh
        ? 'success'
        : 'info';

  return [
    {
      id: 'grow-status',
      title: 'Grow Status',
      value: isGrowActive(grow) ? 'Active' : 'Complete',
      status: isGrowActive(grow) ? 'success' : 'info',
      detail: `${grow.currentPhase}, day ${calculateGrowTotalDays(grow, now)} since start.`,
    },
    {
      id: 'plants',
      title: 'Plants',
      value: `${activePlants}/${plants.length}`,
      status: plants.length > 0 ? 'success' : 'info',
      detail: plants.length > 0 ? `${harvestedPlants} harvested, ${activePlants} operational.` : 'No plants in this grow yet.',
    },
    {
      id: 'today',
      title: 'Today',
      value: dueReminders.length > 0 ? `${dueReminders.length} task${dueReminders.length === 1 ? '' : 's'}` : 'Clear',
      status: dueReminders.length > 0 ? 'action' : 'success',
      detail: dueReminders.length > 0 ? 'At least one reminder is due.' : 'No due reminders today.',
    },
    {
      id: 'next',
      title: 'Next',
      value: nextReminder ? nextReminder.title : 'Observe',
      status: nextReminder ? 'info' : 'success',
      detail: nextReminder ? `Next planned step: ${nextReminder.type}.` : 'Keep collecting readings and checking plant status.',
    },
    {
      id: 'climate',
      title: 'Climate',
      value: latestAirVpd ? `${latestAirVpd.value}${latestAirVpd.unit}` : latestTemperature ? `${latestTemperature.value}${latestTemperature.unit}` : 'No data',
      status: climateStatus,
      detail: latestAirVpd
        ? `VPD ${vpdStatus}${latestHumidity ? `, RH ${latestHumidity.value}${latestHumidity.unit}` : ''}.`
        : 'Capture temperature, humidity or VPD telemetry.',
    },
    {
      id: 'irrigation',
      title: 'Irrigation',
      value: latestIrrigation ? `${latestIrrigation.liters} L` : latestWater ? `${latestWater.value}${latestWater.unit}` : 'No data',
      status: latestIrrigation || latestWater ? 'success' : 'info',
      detail: latestIrrigation
        ? `Last watering ${irrigationHoursAgo ?? '?'} hours ago${latestIrrigation.drainVolume ? `, runoff ${latestIrrigation.drainVolume} L` : ''}.`
        : 'Use the watering wizard to capture water use and runoff.',
    },
    {
      id: 'nutrition',
      title: 'Nutrition',
      value: latestDrainEc ? `Runoff EC ${latestDrainEc.value}` : latestDrainPh ? `Runoff pH ${latestDrainPh.value}` : 'No data',
      status: nutritionStatus,
      detail: latestDrainEc || latestDrainPh
        ? `${latestDrainEc ? `EC ${latestDrainEc.value}${latestDrainEc.unit}` : ''}${latestDrainEc && latestDrainPh ? ', ' : ''}${latestDrainPh ? `pH ${latestDrainPh.value}` : ''}`
        : 'Capture batch, EC/pH and runoff values in a wizard.',
    },
    {
      id: 'training',
      title: 'Training',
      value: latestTraining ? latestTraining.title : 'No event',
      status: latestTraining ? 'info' : 'success',
      detail: latestTraining
        ? `Last training was ${Math.round((now.getTime() - Date.parse(latestTraining.occurredAt)) / 36e5)} hours ago.`
        : 'No recent training events in this grow.',
    },
  ];
}

export function buildRecentActivity(
  plants: PlantDB[],
  context: RecommendationContext = {},
  limit = 6,
): ProductActivityItem[] {
  const plantNameById = new Map(plants.map(plant => [plant.id, plant.name]));
  const activities: ProductActivityItem[] = [];

  for (const event of context.growEvents ?? []) {
    activities.push({
      id: `event-${event.id}`,
      title: event.title,
      category: 'event',
      timestamp: event.occurredAt,
      label: formatEventType(event.type),
      detail: event.description || 'Structured grow event saved.',
      plantName: event.plantId ? plantNameById.get(event.plantId) : undefined,
    });
  }

  for (const event of context.irrigationEvents ?? []) {
    activities.push({
      id: `irrigation-${event.id}`,
      title: 'Watering',
      category: 'irrigation',
      timestamp: event.occurredAt,
      label: 'Irrigation',
      detail: `${event.liters} L${event.drainEc !== undefined ? `, runoff EC ${event.drainEc}` : ''}${event.drainPh !== undefined ? `, runoff pH ${event.drainPh}` : ''}`,
      plantName: plantNameById.get(event.plantId),
    });
  }

  for (const reading of context.telemetryReadings ?? []) {
    activities.push({
      id: `telemetry-${reading.id}`,
      title: formatTelemetryMetric(reading.metric),
      category: 'telemetry',
      timestamp: reading.recordedAt,
      label: reading.source === 'sensor' ? 'Sensorwert' : 'Messung',
      detail: `${reading.value} ${reading.unit}`,
      plantName: reading.plantId ? plantNameById.get(reading.plantId) : undefined,
    });
  }

  return activities
    .filter(activity => Number.isFinite(Date.parse(activity.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, limit);
}

function formatEventType(type: GrowEvent['type']): string {
  return type
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTelemetryMetric(metric: TelemetryReading['metric']): string {
  return metric
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function newestByDate<T>(items: T[], getDate: (item: T) => string): T | undefined {
  return [...items].sort((a, b) => Date.parse(getDate(b)) - Date.parse(getDate(a)))[0];
}

function newestTelemetry(readings: TelemetryReading[], metric: TelemetryReading['metric']): TelemetryReading | undefined {
  return newestByDate(readings.filter(reading => reading.metric === metric), reading => reading.recordedAt);
}

function newestTelemetrySeries(readings: TelemetryReading[], metric: TelemetryReading['metric'], limit: number): TelemetryReading[] {
  return readings
    .filter(reading => reading.metric === metric)
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
    .slice(0, limit);
}

function getLightPhase(growPhase: string): GrowLightPhase {
  if (growPhase === 'Seedling') return 'seedling';
  if (growPhase === 'Flowering') return 'flower';
  return 'veg';
}

function getAverageIntervalHours(dates: string[]): number | null {
  const sortedTimes = dates
    .map(date => Date.parse(date))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (sortedTimes.length < 2) return null;

  const intervals = sortedTimes.slice(1).map((time, index) => time - sortedTimes[index]);
  const averageMs = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  return averageMs / 36e5;
}

function getWaterConsumptionAroundTraining(readings: TelemetryReading[], trainingAt: string): { before?: TelemetryReading; after?: TelemetryReading } {
  const trainingTime = Date.parse(trainingAt);
  if (!Number.isFinite(trainingTime)) return {};

  const waterReadings = readings
    .filter(reading => reading.metric === 'water_consumption')
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));

  return {
    before: [...waterReadings].reverse().find(reading => Date.parse(reading.recordedAt) < trainingTime),
    after: waterReadings.find(reading => Date.parse(reading.recordedAt) > trainingTime),
  };
}

function isTrainingEvent(event: GrowEvent): boolean {
  return ['training', 'topping', 'lst', 'hst', 'defoliation', 'lollipopping', 'scrog'].includes(event.type);
}

function hasTreatmentAfterIssue(events: GrowEvent[], issueEvent: GrowEvent): boolean {
  const issueTime = Date.parse(issueEvent.occurredAt);
  if (!Number.isFinite(issueTime)) return false;

  return events.some(event => (
    event.type === 'treatment' &&
    event.plantId === issueEvent.plantId &&
    Date.parse(event.occurredAt) > issueTime
  ));
}

export function productRecommendationToRecord(recommendation: ProductRecommendation, growId: string, createdAt = new Date().toISOString()): Recommendation {
  return {
    id: `insight-${growId}-${recommendation.id}`,
    growId,
    title: recommendation.title,
    severity: recommendation.severity,
    summary: recommendation.summary,
    suggestedAction: recommendation.action,
    usedData: recommendation.usedData,
    relatedEventIds: recommendation.relatedEvents,
    supportingMeasurements: recommendation.supportingMeasurements,
    createdAt,
  };
}

export function buildRecommendations(
  grow: Grow | null,
  plants: PlantDB[],
  reminders: Reminder[],
  now = new Date(),
  context: RecommendationContext = {},
): ProductRecommendation[] {
  if (!grow) {
    return [
      {
        id: 'create-grow',
        title: 'Create Grow',
        severity: 'action',
        summary: 'GrowPanion needs an active grow before it can build status, timeline and recommendations.',
        action: 'Create or activate a grow.',
        usedData: ['Grows'],
        relatedEvents: [],
        supportingMeasurements: [],
      },
    ];
  }

  const recommendations: ProductRecommendation[] = [];
  const dueReminders = reminders.filter(reminder => reminder.enabled && getReminderDueTime(reminder) <= now.getTime());
  const daysInPhase = getDaysInPhase(grow);
  const activePlants = plants.filter(plant => !plant.isHarvested);
  const telemetry = context.telemetryReadings ?? [];
  const growEvents = context.growEvents ?? [];
  const irrigationEvents = context.irrigationEvents ?? [];
  const phenotypes = context.phenotypes ?? [];
  const latestHumidity = newestTelemetry(telemetry, 'humidity');
  const latestTemperature = newestTelemetry(telemetry, 'temperature');
  const latestDrainEc = newestTelemetry(telemetry, 'drain_ec');
  const latestPotWeight = newestTelemetry(telemetry, 'pot_weight');
  const latestDli = newestTelemetry(telemetry, 'dli');
  const latestPpfd = newestTelemetry(telemetry, 'ppfd');
  const vpdSeries = newestTelemetrySeries(telemetry, 'air_vpd', 3);
  const waterReadings = telemetry
    .filter(reading => reading.metric === 'water_consumption')
    .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
  const latestTraining = newestByDate(
    growEvents.filter(isTrainingEvent),
    event => event.occurredAt,
  );
  const latestIrrigation = newestByDate(irrigationEvents, event => event.occurredAt);
  const latestIssueEvent = newestByDate(
    growEvents.filter(event => event.type === 'problem' || event.type === 'diagnosis'),
    event => event.occurredAt,
  );
  const irrigationAverageHours = getAverageIntervalHours(irrigationEvents.map(event => event.occurredAt));

  if (dueReminders.length > 0) {
    recommendations.push({
      id: 'due-reminders',
      title: 'Action Required',
      severity: 'action',
      summary: `${dueReminders.length} reminder${dueReminders.length === 1 ? ' is' : 's are'} due or overdue.`,
      action: 'Open reminders and complete or reschedule the due tasks.',
      usedData: ['Reminder.nextDue', 'Reminder.enabled'],
      relatedEvents: dueReminders.map(reminder => reminder.title),
      supportingMeasurements: [],
    });
  }

  if (activePlants.length === 0) {
    recommendations.push({
      id: 'add-plants',
      title: 'Plants Missing',
      severity: 'info',
      summary: 'This grow does not have any active operational plants yet.',
      action: 'Create plants, then link genetics and phenotypes when they are ready.',
      usedData: ['Plant.isHarvested', 'Grow.id'],
      relatedEvents: [],
      supportingMeasurements: [],
    });
  }

  const unlinkedPlants = activePlants.filter(plant => !plant.geneticsId || !plant.phenotypeId);
  if (unlinkedPlants.length > 0) {
    recommendations.push({
      id: 'link-genetics-phenotypes',
      title: 'Genetics and Phenotype Links Open',
      severity: 'action',
      summary: `${unlinkedPlants.length} active plant${unlinkedPlants.length === 1 ? '' : 's'} still need a Genetics Registry or phenotype link.`,
      action: 'Open plant details, choose genetics from the registry and save the related phenotype.',
      usedData: ['Plant.geneticsId', 'Plant.phenotypeId', 'Genetics Registry'],
      relatedEvents: unlinkedPlants.map(plant => plant.name),
      supportingMeasurements: unlinkedPlants.map(plant => (
        `${plant.name}: ${plant.geneticsId ? 'genetics linked' : 'genetics missing'}, ${plant.phenotypeId ? 'phenotype linked' : 'phenotype missing'}`
      )),
    });
  }

  const phenotypeIssues = phenotypes
    .filter(phenotype => phenotype.growId === grow.id && (phenotype.issues?.length || isLowVigor(phenotype.vigor)))
    .slice(0, 4);
  if (phenotypeIssues.length > 0) {
    const phenotypeLabels = phenotypeIssues.map(phenotype => {
      const plantName = plants.find(plant => plant.id === phenotype.plantId)?.name;
      return plantName ? `${plantName} (${phenotype.label})` : phenotype.label;
    });
    const issues = phenotypeIssues.flatMap(phenotype => phenotype.issues ?? []);

    recommendations.push({
      id: 'phenotype-issues',
      title: 'Phenotype Issues Documented',
      severity: issues.length >= 3 ? 'warning' : 'info',
      summary: `${phenotypeIssues.length} phenotype${phenotypeIssues.length === 1 ? '' : 's'} have documented issues or low vigor.`,
      action: 'Compare these phenotypes in Lab Mode against irrigation, EC, VPD and training events.',
      usedData: ['Phenotype.issues', 'Phenotype.vigor', 'Plant.phenotypeId'],
      relatedEvents: phenotypeLabels,
      supportingMeasurements: issues.length > 0 ? issues.slice(0, 6) : phenotypeIssues.map(phenotype => `Vigor ${phenotype.vigor}`),
    });
  }

  if (grow.currentPhase === 'Flowering' && daysInPhase > 21) {
    recommendations.push({
      id: 'flowering-environment',
      title: 'Check Flowering Climate',
      severity: 'warning',
      summary: 'The grow has been flowering for more than three weeks. Humidity, VPD and runoff values matter more now.',
      action: 'Check climate, runoff EC/pH and switch to trend views in Lab Mode.',
      usedData: ['Grow.currentPhase', 'Grow.phaseHistory'],
      relatedEvents: ['Phase: Flowering'],
      supportingMeasurements: ['VPD', 'Humidity', 'Drain EC', 'Drain pH'],
    });
  }

  if (grow.currentPhase === 'Flowering' && latestHumidity && latestHumidity.value >= 65) {
    recommendations.push({
      id: 'flowering-humidity-high',
      title: 'Flowering Humidity Elevated',
      severity: latestHumidity.value >= 75 ? 'critical' : 'warning',
      summary: `The latest humidity reading is ${latestHumidity.value}${latestHumidity.unit}. During flowering this raises risk.`,
      action: 'Check exhaust, dehumidification and airflow; review humidity and VPD trends in Lab Mode.',
      usedData: ['TelemetryReading.humidity', 'Grow.currentPhase'],
      relatedEvents: [],
      supportingMeasurements: [`Humidity ${latestHumidity.value}${latestHumidity.unit}`],
    });
  }

  if (latestTemperature && latestTemperature.value >= 30) {
    recommendations.push({
      id: 'temperature-high',
      title: 'Temperature Elevated',
      severity: latestTemperature.value >= 34 ? 'critical' : 'warning',
      summary: `The latest temperature reading is ${latestTemperature.value}${latestTemperature.unit}.`,
      action: 'Check light output, exhaust and lamp distance.',
      usedData: ['TelemetryReading.temperature'],
      relatedEvents: [],
      supportingMeasurements: [`Temperature ${latestTemperature.value}${latestTemperature.unit}`],
    });
  }

  if (latestDli) {
    const dliRating = getDLIRating(latestDli.value, getLightPhase(grow.currentPhase));
    if (dliRating.rating === 'too_low' || dliRating.rating === 'low') {
      recommendations.push({
        id: 'light-intensity-low',
        title: 'Light Intensity Could Increase',
        severity: dliRating.rating === 'too_low' ? 'action' : 'info',
        summary: `The latest DLI reading is ${latestDli.value}${latestDli.unit}. ${dliRating.ratingLabel}.`,
        action: dliRating.suggestion,
        usedData: ['TelemetryReading.dli', 'Grow.currentPhase'],
        relatedEvents: [],
        supportingMeasurements: [`DLI ${latestDli.value}${latestDli.unit}`],
      });
    }
  } else if (latestPpfd && grow.currentPhase !== 'Flowering' && latestPpfd.value < 350) {
    recommendations.push({
      id: 'ppfd-low',
      title: 'PPFD Low',
      severity: 'info',
      summary: `The latest PPFD reading is ${latestPpfd.value}${latestPpfd.unit}.`,
      action: 'Check lamp distance and dimming, or capture DLI for a phase-aware rating.',
      usedData: ['TelemetryReading.ppfd', 'Grow.currentPhase'],
      relatedEvents: [],
      supportingMeasurements: [`PPFD ${latestPpfd.value}${latestPpfd.unit}`],
    });
  }

  if (vpdSeries.length >= 3) {
    const latestVpd = vpdSeries[0];
    const values = vpdSeries.map(reading => reading.value);
    const spread = Math.max(...values) - Math.min(...values);
    const optimalRange = getOptimalVpdRange(grow.currentPhase, daysInPhase);
    const status = getVpdStatus(latestVpd.value, optimalRange);

    if (status === 'optimal' && spread <= 0.2) {
      recommendations.push({
        id: 'vpd-stable',
        title: 'VPD Stable',
        severity: 'success',
        summary: `The latest ${vpdSeries.length} VPD readings are tightly grouped and the current value is in range.`,
        action: 'Keep climate settings and continue watching the trend.',
        usedData: ['TelemetryReading.air_vpd', 'Grow.currentPhase'],
        relatedEvents: [],
        supportingMeasurements: vpdSeries.map(reading => `VPD ${reading.value}${reading.unit}`),
      });
    }
  }

  if (latestDrainEc && latestDrainEc.value >= 2.5) {
    recommendations.push({
      id: 'drain-ec-high',
      title: 'Runoff EC Rising',
      severity: latestDrainEc.value >= 3.5 ? 'critical' : 'warning',
      summary: `The latest runoff EC is ${latestDrainEc.value}${latestDrainEc.unit}. This can indicate salt buildup.`,
      action: 'Compare the next irrigation against recipe, input EC and runoff values.',
      usedData: ['TelemetryReading.drain_ec', 'IrrigationEvent.drainEc'],
      relatedEvents: latestIrrigation ? [latestIrrigation.id] : [],
      supportingMeasurements: [`Drain EC ${latestDrainEc.value}${latestDrainEc.unit}`],
    });
  }

  if (latestIssueEvent && !hasTreatmentAfterIssue(growEvents, latestIssueEvent)) {
    recommendations.push({
      id: 'open-observation-issue',
      title: latestIssueEvent.type === 'problem' ? 'Open Issue Documented' : 'Diagnosis Without Treatment',
      severity: latestIssueEvent.type === 'problem' ? 'warning' : 'info',
      summary: `${latestIssueEvent.title}: ${latestIssueEvent.description ?? 'No treatment event documented after it yet.'}`,
      action: 'Check the plant and document treatment or all-clear as a structured event.',
      usedData: ['GrowEvent.problem', 'GrowEvent.diagnosis', 'GrowEvent.treatment'],
      relatedEvents: [latestIssueEvent.id],
      supportingMeasurements: latestIssueEvent.description ? [latestIssueEvent.description] : [],
    });
  }

  if (waterReadings.length >= 2 && waterReadings[0].value < waterReadings[1].value * 0.7) {
    recommendations.push({
      id: 'water-consumption-drop',
      title: 'Water Consumption Dropped',
      severity: 'warning',
      summary: `The latest water amount (${waterReadings[0].value}${waterReadings[0].unit}) is well below the previous value (${waterReadings[1].value}${waterReadings[1].unit}).`,
      action: 'Compare pot weight, root zone, EC and recent training or repot events.',
      usedData: ['TelemetryReading.water_consumption'],
      relatedEvents: latestTraining ? [latestTraining.id] : [],
      supportingMeasurements: [
        `Latest water ${waterReadings[0].value}${waterReadings[0].unit}`,
        `Previous water ${waterReadings[1].value}${waterReadings[1].unit}`,
      ],
    });
  }

  if (latestIrrigation && irrigationAverageHours !== null) {
    const lastIrrigationTime = Date.parse(latestIrrigation.occurredAt);
    const hoursSinceLastIrrigation = (now.getTime() - lastIrrigationTime) / 36e5;
    const hoursUntilExpected = irrigationAverageHours - hoursSinceLastIrrigation;

    if (hoursUntilExpected > 0 && hoursUntilExpected <= 36) {
      recommendations.push({
        id: 'watering-likely-tomorrow',
        title: 'Watering Likely Tomorrow',
        severity: 'info',
        summary: `The current watering rhythm is about ${Math.round(irrigationAverageHours)} hours. The next watering window is approaching.`,
        action: 'Tomorrow, check pot weight and substrate before watering.',
        usedData: ['IrrigationEvent.occurredAt'],
        relatedEvents: [latestIrrigation.id],
        supportingMeasurements: [`Expected in ${Math.round(hoursUntilExpected)}h`],
      });
    }
  }

  if (latestTraining) {
    const waterAroundTraining = getWaterConsumptionAroundTraining(telemetry, latestTraining.occurredAt);
    if (
      waterAroundTraining.before &&
      waterAroundTraining.after &&
      waterAroundTraining.after.value < waterAroundTraining.before.value * 0.8
    ) {
      recommendations.push({
        id: 'training-growth-slowdown',
        title: 'Growth Slowed After Training',
        severity: 'info',
        summary: `After the last training event, water consumption dropped from ${waterAroundTraining.before.value}${waterAroundTraining.before.unit} to ${waterAroundTraining.after.value}${waterAroundTraining.after.unit}.`,
        action: 'Watch the plant and allow recovery before more intensive intervention.',
        usedData: ['GrowEvent.training', 'TelemetryReading.water_consumption'],
        relatedEvents: [latestTraining.id],
        supportingMeasurements: [
          `Before ${waterAroundTraining.before.value}${waterAroundTraining.before.unit}`,
          `After ${waterAroundTraining.after.value}${waterAroundTraining.after.unit}`,
        ],
      });
    }
  }

  if (latestPotWeight && latestIrrigation) {
    recommendations.push({
      id: 'pot-weight-context',
      title: 'Pot Weight Available',
      severity: 'info',
      summary: `Latest pot weight: ${latestPotWeight.value}${latestPotWeight.unit}. This improves watering timing and consumption analysis.`,
      action: 'Keep capturing pot weight before and after each watering.',
      usedData: ['TelemetryReading.pot_weight', 'IrrigationEvent'],
      relatedEvents: [latestIrrigation.id],
      supportingMeasurements: [`Pot weight ${latestPotWeight.value}${latestPotWeight.unit}`],
    });
  }

  const activeStoredRecommendations = (context.storedRecommendations ?? [])
    .filter(recommendation => (
      !recommendation.dismissedAt &&
      !recommendations.some(generated => recommendation.id === `insight-${grow.id}-${generated.id}`)
    ))
    .map(recommendation => ({
      id: `stored-${recommendation.id}`,
      title: recommendation.title,
      severity: recommendation.severity,
      summary: recommendation.summary,
      action: recommendation.suggestedAction,
      usedData: recommendation.usedData,
      relatedEvents: recommendation.relatedEventIds ?? [],
      supportingMeasurements: recommendation.supportingMeasurements ?? [],
    }));
  recommendations.push(...activeStoredRecommendations);

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'all-clear',
      title: 'All Clear',
      severity: 'success',
      summary: 'No due tasks or critical deviations were found in the current app data.',
      action: 'Keep observing and capture new events through structured workflows.',
      usedData: ['Grow', 'Plant', 'Reminder'],
      relatedEvents: [],
      supportingMeasurements: [],
    });
  }

  return recommendations;
}

function isLowVigor(vigor?: string): boolean {
  if (!vigor) return false;
  const normalized = vigor.trim().toLowerCase();
  return ['low', 'niedrig', 'weak', 'schwach', 'slow', 'langsam'].some(token => normalized.includes(token));
}

export function buildLabSignals(hasSensorData: boolean, sensorBindings: SensorBinding[] = []): LabModeSignal[] {
  const boundMetrics = new Set(sensorBindings.map(binding => binding.metric));
  const hasBinding = (metrics: string[]) => metrics.some(metric => boundMetrics.has(metric as SensorBinding['metric']));
  const hasClimateBinding = hasBinding(['temperature', 'humidity', 'air_vpd', 'leaf_temperature', 'leaf_vpd']);

  return [
    {
      id: 'climate',
      label: 'Temperature / Humidity / Air VPD / Leaf VPD',
      category: 'climate',
      available: hasSensorData || hasClimateBinding,
      source: hasSensorData ? 'Sensor Adapter' : hasClimateBinding ? 'SensorBinding' : 'Telemetry Layer',
      nextStep: hasSensorData || hasClimateBinding ? 'Check trends, Air VPD and Leaf VPD in the climate panel.' : 'Connect a sensor or manual measurement.',
    },
    {
      id: 'light',
      label: 'PPFD / DLI / Light Output',
      category: 'light',
      available: hasBinding(['ppfd', 'dli', 'light_power']),
      source: hasBinding(['ppfd', 'dli', 'light_power']) ? 'SensorBinding + DLI Calculator' : 'DLI Calculator',
      nextStep: hasBinding(['ppfd', 'dli', 'light_power']) ? 'Review light data as a Lab Mode trend.' : 'Save DLI values as telemetry readings.',
    },
    {
      id: 'irrigation',
      label: 'Pot Weight / Water Use / Runoff',
      category: 'irrigation',
      available: hasBinding(['pot_weight', 'water_consumption', 'drain_volume']),
      source: 'IrrigationEvent',
      nextStep: hasBinding(['pot_weight', 'water_consumption', 'drain_volume']) ? 'Correlate water use against events.' : 'Extend watering workflow with batch and runoff data.',
    },
    {
      id: 'nutrition',
      label: 'EC / pH / Recipe / Batch',
      category: 'nutrition',
      available: hasBinding(['ec', 'ph', 'drain_ec', 'drain_ph']),
      source: 'MixRecipe + PreparedBatch',
      nextStep: hasBinding(['ec', 'ph', 'drain_ec', 'drain_ph']) ? 'Compare EC/pH trends with batch and runoff values.' : 'Save mix recipes and prepared batches as first-class entities.',
    },
    {
      id: 'timeline',
      label: 'Timeline Correlations',
      category: 'timeline',
      available: true,
      source: 'Events + Telemetry',
      nextStep: 'Visualize events and measurements together in the plant or phenotype timeline.',
    },
  ];
}
