import { describe, expect, it } from 'vitest';
import type { Grow, GrowEvent, IrrigationEvent, Phenotype, PlantDB, Reminder, SensorBinding, TelemetryReading } from '@/lib/db';
import {
  buildGrowModeStatus,
  buildLabSignals,
  buildRecentActivity,
  buildRecommendations,
  PRODUCT_ENTITIES,
  PRODUCT_MODULES,
  WIZARD_CATALOG,
  productRecommendationToRecord,
} from '@/lib/product-os';

const grow: Grow = {
  id: 'grow-1',
  name: 'Test Grow',
  startDate: '2024-01-01T00:00:00.000Z',
  currentPhase: 'Flowering',
  phaseHistory: [
    { phase: 'Seedling', startDate: '2024-01-01T00:00:00.000Z' },
    { phase: 'Flowering', startDate: '2024-02-01T00:00:00.000Z' },
  ],
};

const plant: PlantDB = {
  id: 'plant-1',
  growId: 'grow-1',
  name: 'Plant 1',
  genetic: 'Blueberry Pancake',
  manufacturer: 'HSC',
  type: 'feminized',
  propagationMethod: 'seed',
};

const dueReminder: Reminder = {
  id: 'reminder-1',
  growId: 'grow-1',
  type: 'watering',
  title: 'Water plants',
  intervalDays: 2,
  nextDue: '2024-02-20T09:00:00.000Z',
  enabled: true,
  createdAt: '2024-02-01T00:00:00.000Z',
  updatedAt: '2024-02-01T00:00:00.000Z',
};

describe('product os utilities', () => {
  it('defines the central entities and wizard catalog from the product concept', () => {
    expect(PRODUCT_ENTITIES).toEqual(expect.arrayContaining([
      'Phenotype',
      'Genetics',
      'GrowEvent',
      'TelemetryReading',
      'DeviceIntegration',
      'MixRecipe',
      'PreparedBatch',
      'IrrigationEvent',
      'Recommendation',
      'PowerCostProfile',
    ]));
    expect(WIZARD_CATALOG.map(wizard => wizard.id)).toEqual(expect.arrayContaining([
      'watering',
      'prepared-batch',
      'training',
      'defoliation',
      'lollipopping',
      'scrog',
      'substrate-change',
      'harvest',
      'device-connect',
      'genetics-add',
      'phenotype-assessment',
    ]));
    expect(PRODUCT_MODULES.filter(module => module.status === 'active').map(module => module.id)).toEqual(expect.arrayContaining([
      'device-layer',
      'telemetry-layer',
      'genetics-registry',
      'feeding-model',
      'insight-layer',
      'power-cost',
    ]));
  });

  it('builds Grow Mode status cards from grow, plant and reminder state', () => {
    const cards = buildGrowModeStatus(grow, [plant], [dueReminder], new Date('2024-02-21T10:00:00.000Z'));

    expect(cards.find(card => card.id === 'grow-status')).toMatchObject({
      value: 'Aktiv',
      status: 'success',
    });
    expect(cards.find(card => card.id === 'today')).toMatchObject({
      value: '1 Aufgabe(n)',
      status: 'action',
    });
  });

  it('builds Grow Mode status cards from telemetry, irrigation and training events', () => {
    const telemetry: TelemetryReading[] = [
      {
        id: 'temperature-1',
        growId: 'grow-1',
        metric: 'temperature',
        value: 25,
        unit: '°C',
        recordedAt: '2024-02-21T08:00:00.000Z',
        source: 'manual',
      },
      {
        id: 'humidity-1',
        growId: 'grow-1',
        metric: 'humidity',
        value: 55,
        unit: '%',
        recordedAt: '2024-02-21T08:05:00.000Z',
        source: 'manual',
      },
      {
        id: 'vpd-1',
        growId: 'grow-1',
        metric: 'air_vpd',
        value: 1.3,
        unit: 'kPa',
        recordedAt: '2024-02-21T08:10:00.000Z',
        source: 'manual',
      },
      {
        id: 'drain-ec-1',
        growId: 'grow-1',
        metric: 'drain_ec',
        value: 2.8,
        unit: 'mS/cm',
        recordedAt: '2024-02-21T08:15:00.000Z',
        source: 'manual',
      },
    ];
    const irrigationEvents: IrrigationEvent[] = [{
      id: 'irrigation-1',
      growId: 'grow-1',
      plantId: 'plant-1',
      liters: 1.4,
      drainVolume: 0.2,
      occurredAt: '2024-02-21T08:00:00.000Z',
    }];
    const growEvents: GrowEvent[] = [{
      id: 'hst-1',
      growId: 'grow-1',
      plantId: 'plant-1',
      type: 'hst',
      title: 'HST: Topping',
      occurredAt: '2024-02-21T07:00:00.000Z',
      createdAt: '2024-02-21T07:00:00.000Z',
    }];

    const cards = buildGrowModeStatus(grow, [plant], [], new Date('2024-02-21T10:00:00.000Z'), {
      telemetryReadings: telemetry,
      irrigationEvents,
      growEvents,
    });

    expect(cards.find(card => card.id === 'climate')).toMatchObject({
      title: 'Klima',
      value: '1.3kPa',
      status: 'success',
    });
    expect(cards.find(card => card.id === 'irrigation')).toMatchObject({
      title: 'Bewässerung',
      value: '1.4 L',
      status: 'success',
    });
    expect(cards.find(card => card.id === 'nutrition')).toMatchObject({
      title: 'Nährstoffe',
      value: 'Drain EC 2.8',
      status: 'warning',
    });
    expect(cards.find(card => card.id === 'training')).toMatchObject({
      title: 'Training',
      value: 'HST: Topping',
      status: 'info',
    });
  });

  it('builds recent dashboard activity from structured events, irrigation and telemetry', () => {
    const activities = buildRecentActivity([plant], {
      growEvents: [{
        id: 'event-1',
        growId: 'grow-1',
        plantId: 'plant-1',
        type: 'training',
        title: 'Training: LST',
        description: 'Canopy adjusted',
        occurredAt: '2024-02-21T08:00:00.000Z',
        createdAt: '2024-02-21T08:00:00.000Z',
      }],
      irrigationEvents: [{
        id: 'irrigation-1',
        growId: 'grow-1',
        plantId: 'plant-1',
        liters: 1.2,
        drainEc: 1.8,
        occurredAt: '2024-02-21T09:00:00.000Z',
      }],
      telemetryReadings: [{
        id: 'reading-1',
        growId: 'grow-1',
        plantId: 'plant-1',
        metric: 'air_vpd',
        value: 1.25,
        unit: 'kPa',
        recordedAt: '2024-02-21T10:00:00.000Z',
        source: 'manual',
      }],
    });

    expect(activities.map(activity => activity.id)).toEqual([
      'telemetry-reading-1',
      'irrigation-irrigation-1',
      'event-event-1',
    ]);
    expect(activities[0]).toMatchObject({
      title: 'Air Vpd',
      category: 'telemetry',
      plantName: 'Plant 1',
      detail: '1.25 kPa',
    });
    expect(activities[1].detail).toContain('Drain EC 1.8');
  });

  it('creates explainable recommendations from current app data', () => {
    const recommendations = buildRecommendations(grow, [plant], [dueReminder], new Date('2024-02-21T10:00:00.000Z'));

    expect(recommendations[0]).toMatchObject({
      id: 'due-reminders',
      severity: 'action',
    });
    expect(recommendations[0].usedData).toContain('Reminder.nextDue');
  });

  it('creates explainable recommendations from telemetry and irrigation data', () => {
    const telemetry: TelemetryReading[] = [
      {
        id: 'reading-1',
        growId: 'grow-1',
        metric: 'humidity',
        value: 68,
        unit: '%',
        recordedAt: '2024-02-21T10:00:00.000Z',
        source: 'manual',
      },
      {
        id: 'reading-2',
        growId: 'grow-1',
        metric: 'drain_ec',
        value: 2.8,
        unit: 'mS/cm',
        recordedAt: '2024-02-21T10:05:00.000Z',
        source: 'manual',
      },
    ];

    const recommendations = buildRecommendations(grow, [plant], [], new Date('2024-02-21T10:00:00.000Z'), {
      telemetryReadings: telemetry,
      irrigationEvents: [{
        id: 'irrigation-1',
        growId: 'grow-1',
        plantId: 'plant-1',
        liters: 1.4,
        drainEc: 2.8,
        occurredAt: '2024-02-21T10:05:00.000Z',
      }],
    });

    expect(recommendations.map(recommendation => recommendation.id)).toEqual(expect.arrayContaining([
      'flowering-humidity-high',
      'drain-ec-high',
    ]));
    expect(recommendations.find(recommendation => recommendation.id === 'drain-ec-high')?.usedData).toContain('IrrigationEvent.drainEc');
  });

  it('creates explainable recommendations from phenotype issues', () => {
    const phenotype: Phenotype = {
      id: 'phenotype-1',
      geneticsId: 'genetics-1',
      plantId: 'plant-1',
      growId: 'grow-1',
      label: 'Pheno A',
      vigor: 'low vigor',
      issues: ['EC-sensitive', 'slow recovery after training'],
      traits: ['berry aroma'],
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-21T00:00:00.000Z',
    };

    const recommendations = buildRecommendations(grow, [plant], [], new Date('2024-02-21T10:00:00.000Z'), {
      phenotypes: [phenotype],
    });

    expect(recommendations.find(recommendation => recommendation.id === 'phenotype-issues')).toMatchObject({
      title: 'Phänotyp-Probleme dokumentiert',
      severity: 'info',
      usedData: ['Phenotype.issues', 'Phenotype.vigor', 'Plant.phenotypeId'],
      relatedEvents: ['Plant 1 (Pheno A)'],
      supportingMeasurements: ['EC-sensitive', 'slow recovery after training'],
    });
  });

  it('recommends linking legacy active plants to genetics and phenotypes', () => {
    const recommendations = buildRecommendations(grow, [
      {
        ...plant,
        geneticsId: undefined,
        phenotypeId: undefined,
      },
    ], [], new Date('2024-02-21T10:00:00.000Z'));

    expect(recommendations.find(recommendation => recommendation.id === 'link-genetics-phenotypes')).toMatchObject({
      title: 'Genetik- und Phänotyp-Verknüpfung offen',
      severity: 'action',
      usedData: ['Plant.geneticsId', 'Plant.phenotypeId', 'Genetics Registry'],
      relatedEvents: ['Plant 1'],
      supportingMeasurements: ['Plant 1: Genetik fehlt, Phänotyp fehlt'],
    });
  });

  it('creates recommendations for stable VPD and low light intensity', () => {
    const telemetry: TelemetryReading[] = [
      {
        id: 'vpd-1',
        growId: 'grow-1',
        metric: 'air_vpd',
        value: 1.3,
        unit: 'kPa',
        recordedAt: '2024-02-21T10:00:00.000Z',
        source: 'manual',
      },
      {
        id: 'vpd-2',
        growId: 'grow-1',
        metric: 'air_vpd',
        value: 1.35,
        unit: 'kPa',
        recordedAt: '2024-02-21T11:00:00.000Z',
        source: 'manual',
      },
      {
        id: 'vpd-3',
        growId: 'grow-1',
        metric: 'air_vpd',
        value: 1.32,
        unit: 'kPa',
        recordedAt: '2024-02-21T12:00:00.000Z',
        source: 'manual',
      },
      {
        id: 'dli-1',
        growId: 'grow-1',
        metric: 'dli',
        value: 30,
        unit: 'mol/m²/day',
        recordedAt: '2024-02-21T12:00:00.000Z',
        source: 'manual',
      },
    ];

    const recommendations = buildRecommendations(grow, [plant], [], new Date('2024-02-21T12:00:00.000Z'), {
      telemetryReadings: telemetry,
    });

    expect(recommendations.map(recommendation => recommendation.id)).toEqual(expect.arrayContaining([
      'vpd-stable',
      'light-intensity-low',
    ]));
    expect(recommendations.find(recommendation => recommendation.id === 'vpd-stable')?.severity).toBe('success');
  });

  it('flags unresolved problem or diagnosis events as explainable recommendations', () => {
    const recommendations = buildRecommendations(grow, [plant], [], new Date('2024-02-21T10:00:00.000Z'), {
      growEvents: [{
        id: 'problem-1',
        growId: 'grow-1',
        plantId: 'plant-1',
        type: 'problem',
        title: 'Leaf spots',
        description: 'Brown spots on upper leaves',
        occurredAt: '2024-02-21T08:00:00.000Z',
        createdAt: '2024-02-21T08:00:00.000Z',
      }],
    });

    expect(recommendations.find(recommendation => recommendation.id === 'open-observation-issue')).toMatchObject({
      title: 'Offenes Problem dokumentiert',
      severity: 'warning',
      usedData: ['GrowEvent.problem', 'GrowEvent.diagnosis', 'GrowEvent.treatment'],
      relatedEvents: ['problem-1'],
      supportingMeasurements: ['Brown spots on upper leaves'],
    });
  });

  it('does not flag problem events that have a later treatment event for the same plant', () => {
    const recommendations = buildRecommendations(grow, [plant], [], new Date('2024-02-21T10:00:00.000Z'), {
      growEvents: [
        {
          id: 'problem-1',
          growId: 'grow-1',
          plantId: 'plant-1',
          type: 'problem',
          title: 'Leaf spots',
          occurredAt: '2024-02-21T08:00:00.000Z',
          createdAt: '2024-02-21T08:00:00.000Z',
        },
        {
          id: 'treatment-1',
          growId: 'grow-1',
          plantId: 'plant-1',
          type: 'treatment',
          title: 'Foliar treatment',
          occurredAt: '2024-02-21T09:00:00.000Z',
          createdAt: '2024-02-21T09:00:00.000Z',
        },
      ],
    });

    expect(recommendations.map(recommendation => recommendation.id)).not.toContain('open-observation-issue');
  });

  it('predicts upcoming watering from irrigation cadence and flags post-training slowdown', () => {
    const recommendations = buildRecommendations(grow, [plant], [], new Date('2024-02-21T10:00:00.000Z'), {
      irrigationEvents: [
        {
          id: 'irrigation-1',
          growId: 'grow-1',
          plantId: 'plant-1',
          liters: 1.3,
          occurredAt: '2024-02-16T10:00:00.000Z',
        },
        {
          id: 'irrigation-2',
          growId: 'grow-1',
          plantId: 'plant-1',
          liters: 1.4,
          occurredAt: '2024-02-19T10:00:00.000Z',
        },
      ],
      growEvents: [{
        id: 'lst-1',
        growId: 'grow-1',
        plantId: 'plant-1',
        type: 'lst',
        title: 'LST',
        occurredAt: '2024-02-20T10:00:00.000Z',
        createdAt: '2024-02-20T10:00:00.000Z',
      }],
      telemetryReadings: [
        {
          id: 'water-1',
          growId: 'grow-1',
          plantId: 'plant-1',
          metric: 'water_consumption',
          value: 1.5,
          unit: 'L',
          recordedAt: '2024-02-19T10:00:00.000Z',
          source: 'manual',
        },
        {
          id: 'water-2',
          growId: 'grow-1',
          plantId: 'plant-1',
          metric: 'water_consumption',
          value: 1,
          unit: 'L',
          recordedAt: '2024-02-21T09:00:00.000Z',
          source: 'manual',
        },
      ],
    });

    expect(recommendations.map(recommendation => recommendation.id)).toEqual(expect.arrayContaining([
      'watering-likely-tomorrow',
      'training-growth-slowdown',
    ]));
    expect(recommendations.find(recommendation => recommendation.id === 'training-growth-slowdown')?.relatedEvents).toEqual(['lst-1']);
  });

  it('maps product recommendations to persistent recommendation records', () => {
    const record = productRecommendationToRecord({
      id: 'temperature-high',
      title: 'Temperature high',
      severity: 'warning',
      summary: 'Warm',
      action: 'Check exhaust',
      usedData: ['TelemetryReading.temperature'],
      relatedEvents: ['event-1'],
      supportingMeasurements: ['31°C'],
    }, 'grow-1', '2024-02-21T10:00:00.000Z');

    expect(record).toMatchObject({
      id: 'insight-grow-1-temperature-high',
      growId: 'grow-1',
      suggestedAction: 'Check exhaust',
      relatedEventIds: ['event-1'],
      supportingMeasurements: ['31°C'],
      createdAt: '2024-02-21T10:00:00.000Z',
    });
  });

  it('marks Lab Mode telemetry signals according to available sensor data', () => {
    expect(buildLabSignals(true).find(signal => signal.id === 'climate')).toMatchObject({
      available: true,
      source: 'Sensor Adapter',
    });
    expect(buildLabSignals(false).find(signal => signal.id === 'light')).toMatchObject({
      available: false,
      source: 'DLI Calculator',
    });
  });

  it('marks Lab Mode signals available from SensorBindings', () => {
    const bindings: SensorBinding[] = [{
      id: 'binding-1',
      deviceId: 'device-1',
      growId: 'grow-1',
      metric: 'ppfd',
      label: 'PPFD Sensor',
      unit: 'µmol/m²/s',
      createdAt: '2024-01-01T00:00:00.000Z',
    }];

    expect(buildLabSignals(false, bindings).find(signal => signal.id === 'light')).toMatchObject({
      available: true,
      source: 'SensorBinding + DLI Calculator',
    });
  });

  it('marks Lab Mode climate available from leaf VPD sensor bindings', () => {
    const bindings: SensorBinding[] = [{
      id: 'binding-leaf-vpd',
      deviceId: 'device-1',
      growId: 'grow-1',
      metric: 'leaf_vpd',
      label: 'Leaf VPD Sensor',
      unit: 'kPa',
      createdAt: '2024-01-01T00:00:00.000Z',
    }];

    expect(buildLabSignals(false, bindings).find(signal => signal.id === 'climate')).toMatchObject({
      available: true,
      label: 'Temperatur / Luftfeuchtigkeit / Air VPD / Leaf VPD',
      source: 'SensorBinding',
    });
  });
});
