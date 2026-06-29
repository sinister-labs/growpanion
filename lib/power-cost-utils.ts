export interface PowerConsumerInput {
  id: string;
  label: string;
  watts: number;
  hoursPerDay: number;
  count?: number;
  phase?: 'growth' | 'flower' | 'both';
}

export interface PhasePowerInput {
  name: string;
  days: number;
  consumers: PowerConsumerInput[];
}

export interface PowerCostInput {
  vegDays: number;
  flowerDays: number;
  vegLightWatts: number;
  flowerLightWatts: number;
  vegLightHours: number;
  flowerLightHours: number;
  ballastMultiplier: number;
  centPerKwh: number;
  plantCount?: number;
  harvestGrams?: number;
  additionalConsumers: PowerConsumerInput[];
}

export interface PhasePowerCost {
  name: string;
  days: number;
  kwhPerDay: number;
  kwhTotal: number;
  costPerDay: number;
  costTotal: number;
}

export interface PowerCostResult {
  dailyKwhAverage: number;
  weeklyKwhAverage: number;
  totalKwh: number;
  dailyCostAverage: number;
  weeklyCostAverage: number;
  totalCost: number;
  costPerPlant: number | null;
  costPerGram: number | null;
  phases: PhasePowerCost[];
}

export interface PowerProfileInput {
  id?: string;
  growId?: string;
  name: string;
  centPerKwh: number;
  vegDays: number;
  flowerDays: number;
  plantCount?: number;
  harvestGrams?: number;
}

export const POWER_CONSUMER_TEMPLATES: PowerConsumerInput[] = [
  { id: 'exhaust', label: 'Abluftanlage', watts: 45, hoursPerDay: 24, phase: 'both' },
  { id: 'intake', label: 'Aktive Zuluft', watts: 20, hoursPerDay: 24, phase: 'both' },
  { id: 'circulation', label: 'Umluft-Ventilation', watts: 30, hoursPerDay: 24, phase: 'both' },
  { id: 'humidifier', label: 'Luftbefeuchter', watts: 25, hoursPerDay: 4, phase: 'growth' },
  { id: 'dehumidifier', label: 'Luftentfeuchter', watts: 250, hoursPerDay: 3, phase: 'flower' },
  { id: 'air_conditioner', label: 'Klimagerät', watts: 0, hoursPerDay: 0, phase: 'both' },
  { id: 'heating_mat', label: 'Heizmatte', watts: 0, hoursPerDay: 0, phase: 'growth' },
  { id: 'pumps', label: 'Pumpen', watts: 10, hoursPerDay: 1, phase: 'both' },
  { id: 'other_consumers', label: 'Sonstige Verbraucher', watts: 0, hoursPerDay: 0, phase: 'both' },
];

export function clampPowerNumber(value: number, min: number, max: number, fallback = min): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function calculateConsumerDailyKwh(consumer: PowerConsumerInput): number {
  const watts = clampPowerNumber(consumer.watts, 0, 10000);
  const hours = clampPowerNumber(consumer.hoursPerDay, 0, 24);
  const count = Math.round(clampPowerNumber(consumer.count ?? 1, 1, 100, 1));

  return (watts * hours * count) / 1000;
}

export function calculatePhasePowerCost(phase: PhasePowerInput, centPerKwh: number): PhasePowerCost {
  const days = Math.round(clampPowerNumber(phase.days, 0, 1000));
  const euroPerKwh = clampPowerNumber(centPerKwh, 0, 200) / 100;
  const kwhPerDay = phase.consumers.reduce((sum, consumer) => sum + calculateConsumerDailyKwh(consumer), 0);
  const kwhTotal = kwhPerDay * days;
  const costPerDay = kwhPerDay * euroPerKwh;
  const costTotal = kwhTotal * euroPerKwh;

  return {
    name: phase.name,
    days,
    kwhPerDay: round(kwhPerDay),
    kwhTotal: round(kwhTotal),
    costPerDay: round(costPerDay),
    costTotal: round(costTotal),
  };
}

export function calculatePowerCost(input: PowerCostInput): PowerCostResult {
  const vegDays = Math.round(clampPowerNumber(input.vegDays, 0, 365));
  const flowerDays = Math.round(clampPowerNumber(input.flowerDays, 0, 365));
  const ballastMultiplier = clampPowerNumber(input.ballastMultiplier, 1, 1.5, 1);

  const normalizedConsumers = input.additionalConsumers.map(consumer => ({
    ...consumer,
    watts: clampPowerNumber(consumer.watts, 0, 10000),
    hoursPerDay: clampPowerNumber(consumer.hoursPerDay, 0, 24),
    phase: consumer.phase ?? 'both',
  }));
  const growthConsumers = normalizedConsumers.filter(consumer => consumer.phase === 'growth' || consumer.phase === 'both');
  const flowerConsumers = normalizedConsumers.filter(consumer => consumer.phase === 'flower' || consumer.phase === 'both');

  const vegPhase = calculatePhasePowerCost({
    name: 'Growth',
    days: vegDays,
    consumers: [
      {
        id: 'veg-light',
        label: 'Growth lighting',
        watts: clampPowerNumber(input.vegLightWatts, 0, 5000) * ballastMultiplier,
        hoursPerDay: clampPowerNumber(input.vegLightHours, 0, 24),
      },
      ...growthConsumers,
    ],
  }, input.centPerKwh);

  const flowerPhase = calculatePhasePowerCost({
    name: 'Flower',
    days: flowerDays,
    consumers: [
      {
        id: 'flower-light',
        label: 'Flower lighting',
        watts: clampPowerNumber(input.flowerLightWatts, 0, 5000) * ballastMultiplier,
        hoursPerDay: clampPowerNumber(input.flowerLightHours, 0, 24),
      },
      ...flowerConsumers,
    ],
  }, input.centPerKwh);

  const totalDays = vegPhase.days + flowerPhase.days;
  const totalKwh = vegPhase.kwhTotal + flowerPhase.kwhTotal;
  const totalCost = vegPhase.costTotal + flowerPhase.costTotal;
  const dailyKwhAverage = totalDays > 0 ? totalKwh / totalDays : 0;
  const dailyCostAverage = totalDays > 0 ? totalCost / totalDays : 0;
  const plantCount = input.plantCount && Number.isFinite(input.plantCount) && input.plantCount > 0
    ? Math.round(clampPowerNumber(input.plantCount, 1, 1000))
    : null;
  const harvestGrams = input.harvestGrams && Number.isFinite(input.harvestGrams) && input.harvestGrams > 0
    ? clampPowerNumber(input.harvestGrams, 0.1, 100000)
    : null;

  return {
    dailyKwhAverage: round(dailyKwhAverage),
    weeklyKwhAverage: round(dailyKwhAverage * 7),
    totalKwh: round(totalKwh),
    dailyCostAverage: round(dailyCostAverage),
    weeklyCostAverage: round(dailyCostAverage * 7),
    totalCost: round(totalCost),
    costPerPlant: plantCount ? round(totalCost / plantCount) : null,
    costPerGram: harvestGrams ? round(totalCost / harvestGrams) : null,
    phases: [vegPhase, flowerPhase],
  };
}

export function createPowerConsumerInputFromRecord(record: {
  id: string;
  name: string;
  watts: number;
  hoursPerDay: number;
  phase?: 'growth' | 'flower' | 'both';
}): PowerConsumerInput {
  return {
    id: record.id,
    label: record.name,
    watts: record.watts,
    hoursPerDay: record.hoursPerDay,
    phase: record.phase ?? 'both',
  };
}

export function createPowerConsumerRecord(input: {
  id: string;
  growId?: string;
  label: string;
  watts: number;
  hoursPerDay: number;
  phase?: 'growth' | 'flower' | 'both';
  timestamp?: string;
}) {
  const timestamp = input.timestamp ?? new Date().toISOString();
  return {
    id: input.id,
    growId: input.growId,
    name: input.label.trim(),
    watts: clampPowerNumber(input.watts, 0, 10000),
    hoursPerDay: clampPowerNumber(input.hoursPerDay, 0, 24),
    phase: input.phase ?? 'both',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createPowerCostProfileRecord(input: PowerProfileInput & { timestamp?: string }) {
  const timestamp = input.timestamp ?? new Date().toISOString();
  return {
    id: input.id || `power-profile-${Date.now().toString(36)}`,
    growId: input.growId,
    name: input.name.trim() || 'Power Cost Profile',
    centPerKwh: clampPowerNumber(input.centPerKwh, 0, 200),
    vegDays: Math.round(clampPowerNumber(input.vegDays, 0, 365)),
    flowerDays: Math.round(clampPowerNumber(input.flowerDays, 0, 365)),
    plantCount: input.plantCount && input.plantCount > 0 ? Math.round(clampPowerNumber(input.plantCount, 1, 1000)) : undefined,
    harvestGrams: input.harvestGrams && input.harvestGrams > 0 ? clampPowerNumber(input.harvestGrams, 0.1, 100000) : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createPowerConsumerInputFromDevice(device: { id: string; name: string; type: string }): PowerConsumerInput {
  return {
    id: `device-${device.id}`,
    label: device.name,
    watts: getDefaultWattsForDeviceType(device.type),
    hoursPerDay: getDefaultHoursForDeviceType(device.type),
  };
}

export function createPowerConsumerInputFromRuntimeTelemetry(
  device: { id: string; name: string; type: string },
  readings: Array<{ deviceId?: string; metric: string; value: number; recordedAt: string }>,
): PowerConsumerInput | null {
  const runtimeMetrics = getRuntimeMetricsForDeviceType(device.type);
  if (runtimeMetrics.length === 0) return null;

  const scopedReadings = readings
    .filter(reading => (
      reading.deviceId === device.id &&
      runtimeMetrics.includes(reading.metric) &&
      Number.isFinite(reading.value) &&
      Number.isFinite(Date.parse(reading.recordedAt))
    ));
  if (scopedReadings.length === 0) return null;

  const averagePowerPercent = scopedReadings.reduce((sum, reading) => (
    sum + clampPowerNumber(reading.value, 0, 100, 0)
  ), 0) / scopedReadings.length;
  const hoursPerDay = round((averagePowerPercent / 100) * 24);

  return {
    id: `runtime-${device.id}`,
    label: `${device.name} runtime`,
    watts: getDefaultWattsForDeviceType(device.type),
    hoursPerDay,
  };
}

function getDefaultWattsForDeviceType(type: string): number {
  const wattsByType: Record<string, number> = {
    lamp: 300,
    fan: 35,
    filter: 20,
    humidifier: 25,
    dehumidifier: 250,
    pump: 15,
    controller: 5,
    sensor: 2,
  };

  return wattsByType[type] ?? 10;
}

function getDefaultHoursForDeviceType(type: string): number {
  const hoursByType: Record<string, number> = {
    lamp: 12,
    fan: 24,
    filter: 24,
    humidifier: 4,
    dehumidifier: 3,
    pump: 1,
    controller: 24,
    sensor: 24,
  };

  return hoursByType[type] ?? 24;
}

function getRuntimeMetricsForDeviceType(type: string): string[] {
  if (type === 'lamp') return ['light_power'];
  if (type === 'fan') return ['fan_power', 'exhaust_power', 'circulation_power'];
  if (type === 'filter') return ['exhaust_power', 'fan_power'];
  return [];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
