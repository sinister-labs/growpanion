import Dexie, { Table } from 'dexie';
import { Plant, FertilizerMix } from '@/components/plant-modal/types';
import {
    FertilizerMixDBSchema,
    FertilizerProductSchema,
    GeneticsOverrideSchema,
    GeneticsSchema,
    GrowSchema,
    GrowEventSchema,
    IrrigationEventSchema,
    LineageEdgeSchema,
    MixRecipeSchema,
    NotificationSettingsSchema,
    PhenotypeSchema,
    PhotoSchema,
    PlantDBSchema,
    PowerConsumerSchema,
    PowerCostProfileSchema,
    PreparedBatchSchema,
    RecommendationSchema,
    ReminderSchema,
    SensorBindingSchema,
    SettingsSchema,
    StrainSchema,
    TelemetryReadingSchema,
    DeviceIntegrationSchema,
    DeviceSchema
} from '@/lib/validation-schemas';
import { validateOrThrow } from '@/lib/validation-utils';
import { normalizeSensorConfig } from '@/lib/sensor-utils';
import {
    getFertilizerMixReferenceError,
    getPlantReferenceError,
    getReminderReferenceError,
    isDueAt,
    removeFertilizerMixReferences
} from '@/lib/persistence-utils';
import { filterStrains } from '@/lib/strain-utils';
import { DEFAULT_GENETICS } from '@/lib/genetics-registry';
import { notifyTelemetryUpdated } from '@/lib/telemetry-events';

export interface Grow {
    id: string;
    name: string;
    startDate: string;
    currentPhase: string;
    phaseHistory: Array<{
        phase: string;
        startDate: string;
    }>;
    description?: string;
    environmentSettings?: {
        temperature?: number;
        humidity?: number;
        lightSchedule?: string;
    };
    // Harvest yield tracking
    expectedYield?: number;
    actualYield?: number;
}

export interface PlantDB extends Plant {
    growId: string;
    geneticsId?: string;
    phenotypeId?: string;
    label?: string;
    location?: string;
    tent?: string;
    sensorBindingIds?: string[];
    lifecycleStatus?: string;
    currentPhase?: string;
}

export interface FertilizerMixDB extends FertilizerMix {
    growId: string;
    description?: string;
}

export interface Settings {
    id: string;
    tuyaClientId?: string;
    tuyaClientSecret?: string;
    acInfinityEmail?: string;
    /** When true, AC Infinity polling continues while the tab/window is hidden. Default: true. */
    backgroundPollingEnabled?: boolean;
    lastUpdated?: string;
    sensors?: TuyaSensor[];
}

export interface TuyaSensor {
    id: string;
    name: string;
    tuyaId: string;
    type: 'Lamp' | 'Carbon Filter' | 'Fan' | 'Temperature' | 'Humidity' | 'Boolean' | 'Number';
    values: Array<{
        code: string;
        decimalPlaces?: number;
    }>;
}

export interface Strain {
    id: string;
    name: string;
    breeder: string;
    genetics: 'Indica' | 'Sativa' | 'Hybrid';
    indicaPercent?: number;
    sativaPercent?: number;
    thcPercent?: number;
    cbdPercent?: number;
    floweringWeeks?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type ReminderType = 'watering' | 'feeding' | 'photo' | 'training' | 'custom';

export interface Reminder {
    id: string;
    growId: string;
    plantId?: string; // Optional: reminder can be for specific plant or whole grow
    type: ReminderType;
    title: string;
    description?: string;
    intervalDays: number; // How often to remind (0 = one-time)
    lastTriggered?: string; // ISO date string
    nextDue: string; // ISO date string
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationSettings {
    id: string; // Always 'notification-settings'
    enabled: boolean;
    permission: NotificationPermission | 'default';
    defaultReminderTime: string; // HH:MM format, e.g., "09:00"
    soundEnabled: boolean;
}

export interface Genetics {
    id: string;
    name: string;
    breeder?: string;
    type: 'Indica' | 'Sativa' | 'Hybrid' | 'Unknown';
    floweringWeeks?: number;
    stretch?: string;
    terpeneProfile?: string[];
    cannabinoids?: string;
    origin?: string;
    notes?: string;
    source: 'default' | 'user';
    createdAt: string;
    updatedAt: string;
}

export interface GeneticsOverride {
    id: string;
    geneticsId: string;
    patch: Record<string, unknown>;
    updatedAt: string;
}

export interface LineageEdge {
    id: string;
    parentGeneticsId: string;
    childGeneticsId: string;
    relationType: 'parent' | 'cross' | 'child';
    notes?: string;
    createdAt: string;
}

export interface Phenotype {
    id: string;
    geneticsId: string;
    plantId: string;
    growId: string;
    label: string;
    growthStructure?: string;
    stretch?: string;
    vigor?: string;
    internodeSpacing?: string;
    trainingResponse?: string;
    floweringTime?: string;
    aroma?: string;
    terpenes?: string[];
    yieldGrams?: number;
    qualityNotes?: string;
    photos?: string[];
    observations?: string[];
    issues?: string[];
    traits?: string[];
    createdAt: string;
    updatedAt: string;
}

export type GrowEventType =
    | 'watering'
    | 'feeding'
    | 'prepared_batch'
    | 'training'
    | 'topping'
    | 'lst'
    | 'hst'
    | 'defoliation'
    | 'lollipopping'
    | 'scrog'
    | 'transplant'
    | 'flowering_start'
    | 'harvest'
    | 'photo'
    | 'note'
    | 'diagnosis'
    | 'problem'
    | 'treatment'
    | 'measurement'
    | 'substrate_change'
    | 'light_adjustment';

export interface GrowEvent {
    id: string;
    growId: string;
    plantId?: string;
    phenotypeId?: string;
    type: GrowEventType;
    title: string;
    description?: string;
    occurredAt: string;
    payload?: Record<string, unknown>;
    photoIds?: string[];
    createdAt: string;
}

export type TelemetryMetric =
    | 'temperature'
    | 'humidity'
    | 'air_vpd'
    | 'leaf_temperature'
    | 'leaf_vpd'
    | 'pot_weight'
    | 'water_consumption'
    | 'ppfd'
    | 'dli'
    | 'light_power'
    | 'fan_power'
    | 'exhaust_power'
    | 'circulation_power'
    | 'ec'
    | 'ph'
    | 'drain_ec'
    | 'drain_ph'
    | 'drain_volume';

export interface TelemetryReading {
    id: string;
    growId: string;
    plantId?: string;
    phenotypeId?: string;
    deviceId?: string;
    sensorBindingId?: string;
    metric: TelemetryMetric;
    value: number;
    unit: string;
    recordedAt: string;
    source: 'sensor' | 'manual' | 'calculated';
}

export interface DeviceIntegration {
    id: string;
    type: 'ac_infinity' | 'tuya_legacy' | 'manual' | 'mqtt_esp32' | 'third_party';
    name: string;
    status: 'planned' | 'configured' | 'active' | 'error';
    config?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface Device {
    id: string;
    integrationId: string;
    name: string;
    type: 'sensor' | 'lamp' | 'fan' | 'filter' | 'humidifier' | 'dehumidifier' | 'pump' | 'controller' | 'other';
    room?: string;
    tent?: string;
    growId?: string;
    plantId?: string;
    status: 'active' | 'inactive' | 'planned' | 'error';
    createdAt: string;
    updatedAt: string;
}

export interface SensorBinding {
    id: string;
    deviceId: string;
    growId?: string;
    plantId?: string;
    metric: TelemetryMetric;
    label: string;
    unit: string;
    createdAt: string;
}

export interface FertilizerProduct {
    id: string;
    name: string;
    brand?: string;
    fertilizerType: 'mineral' | 'organic' | 'hybrid';
    npk?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface MixRecipe {
    id: string;
    growId?: string;
    name: string;
    fertilizerType: 'mineral' | 'organic' | 'hybrid';
    substrateType: 'soil' | 'coco' | 'hydro' | 'living_soil' | 'other';
    products: Array<{ productId: string; dosePerLiter: number }>;
    targetEc?: number;
    targetPh?: number;
    phase?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PreparedBatch {
    id: string;
    recipeId?: string;
    growId: string;
    totalLiters: number;
    measuredEc?: number;
    measuredPh?: number;
    waterEc?: number;
    waterPh?: number;
    temperature?: number;
    preparedAt: string;
    notes?: string;
}

export interface IrrigationEvent {
    id: string;
    batchId?: string;
    growId: string;
    plantId: string;
    phenotypeId?: string;
    liters: number;
    potWeightBefore?: number;
    potWeightAfter?: number;
    drainVolume?: number;
    drainEc?: number;
    drainPh?: number;
    photoId?: string;
    notes?: string;
    occurredAt: string;
}

export interface Photo {
    id: string;
    growId?: string;
    plantId?: string;
    phenotypeId?: string;
    uri: string;
    caption?: string;
    takenAt: string;
    createdAt: string;
}

export interface Recommendation {
    id: string;
    growId: string;
    plantId?: string;
    phenotypeId?: string;
    title: string;
    severity: 'info' | 'success' | 'warning' | 'critical' | 'action';
    summary: string;
    suggestedAction: string;
    usedData: string[];
    relatedEventIds?: string[];
    supportingMeasurements?: string[];
    createdAt: string;
    dismissedAt?: string;
}

export interface PowerConsumer {
    id: string;
    growId?: string;
    name: string;
    watts: number;
    hoursPerDay: number;
    phase: 'growth' | 'flower' | 'both';
    createdAt: string;
    updatedAt: string;
}

export interface PowerCostProfile {
    id: string;
    growId?: string;
    name: string;
    centPerKwh: number;
    vegDays: number;
    flowerDays: number;
    plantCount?: number;
    harvestGrams?: number;
    createdAt: string;
    updatedAt: string;
}

export class GrowPanionDB extends Dexie {
    grows!: Table<Grow, string>;
    plants!: Table<PlantDB, string>;
    fertilizerMixes!: Table<FertilizerMixDB, string>;
    settings!: Table<Settings, string>;
    strains!: Table<Strain, string>;
    reminders!: Table<Reminder, string>;
    notificationSettings!: Table<NotificationSettings, string>;
    genetics!: Table<Genetics, string>;
    geneticsOverrides!: Table<GeneticsOverride, string>;
    lineageEdges!: Table<LineageEdge, string>;
    phenotypes!: Table<Phenotype, string>;
    growEvents!: Table<GrowEvent, string>;
    telemetryReadings!: Table<TelemetryReading, string>;
    deviceIntegrations!: Table<DeviceIntegration, string>;
    devices!: Table<Device, string>;
    sensorBindings!: Table<SensorBinding, string>;
    fertilizerProducts!: Table<FertilizerProduct, string>;
    mixRecipes!: Table<MixRecipe, string>;
    preparedBatches!: Table<PreparedBatch, string>;
    irrigationEvents!: Table<IrrigationEvent, string>;
    photos!: Table<Photo, string>;
    recommendations!: Table<Recommendation, string>;
    powerConsumers!: Table<PowerConsumer, string>;
    powerCostProfiles!: Table<PowerCostProfile, string>;

    constructor() {
        super('GrowPanionDB');

        this.version(1).stores({
            grows: 'id, name, currentPhase',
            plants: 'id, name, genetic, type, propagationMethod, growId',
            fertilizerMixes: 'id, name, growId'
        });

        this.version(2).stores({
            grows: 'id, name, currentPhase',
            plants: 'id, name, genetic, type, propagationMethod, growId',
            fertilizerMixes: 'id, name, growId',
            settings: 'id'
        });

        this.version(3).stores({
            grows: 'id, name, currentPhase',
            plants: 'id, name, genetic, type, propagationMethod, growId',
            fertilizerMixes: 'id, name, growId',
            settings: 'id'
        });

        this.version(4).stores({
            grows: 'id, name, currentPhase',
            plants: 'id, name, genetic, type, propagationMethod, growId',
            fertilizerMixes: 'id, name, growId',
            settings: 'id',
            strains: 'id, name, breeder, genetics'
        });

        this.version(5).stores({
            grows: 'id, name, currentPhase',
            plants: 'id, name, genetic, type, propagationMethod, growId',
            fertilizerMixes: 'id, name, growId',
            settings: 'id',
            strains: 'id, name, breeder, genetics',
            reminders: 'id, growId, plantId, type, nextDue, enabled',
            notificationSettings: 'id'
        });

        this.version(6).stores({
            grows: 'id, name, currentPhase',
            plants: 'id, name, genetic, geneticsId, phenotypeId, type, propagationMethod, growId',
            fertilizerMixes: 'id, name, growId',
            settings: 'id',
            strains: 'id, name, breeder, genetics',
            reminders: 'id, growId, plantId, type, nextDue, enabled',
            notificationSettings: 'id',
            genetics: 'id, name, breeder, type, source',
            geneticsOverrides: 'id, geneticsId',
            lineageEdges: 'id, parentGeneticsId, childGeneticsId, relationType',
            phenotypes: 'id, geneticsId, plantId, growId',
            growEvents: 'id, growId, plantId, phenotypeId, type, occurredAt',
            telemetryReadings: 'id, growId, plantId, phenotypeId, deviceId, sensorBindingId, metric, recordedAt',
            deviceIntegrations: 'id, type, status',
            devices: 'id, integrationId, growId, plantId, type, status',
            sensorBindings: 'id, deviceId, growId, plantId, metric',
            fertilizerProducts: 'id, name, brand, fertilizerType',
            mixRecipes: 'id, growId, name, fertilizerType, substrateType',
            preparedBatches: 'id, recipeId, growId, preparedAt',
            irrigationEvents: 'id, batchId, growId, plantId, phenotypeId, occurredAt',
            photos: 'id, growId, plantId, phenotypeId, takenAt',
            recommendations: 'id, growId, plantId, phenotypeId, severity, createdAt, dismissedAt',
            powerConsumers: 'id, growId, phase',
            powerCostProfiles: 'id, growId, name'
        });

        // Handle database upgrade events
        this.on('blocked', () => {
            // eslint-disable-next-line no-console -- Database lifecycle diagnostics should be visible during local troubleshooting.
            console.warn('Database is blocked - another tab might be using an older version');
        });

        this.on('versionchange', () => {
            // eslint-disable-next-line no-console -- Database lifecycle diagnostics should be visible during local troubleshooting.
            console.info('Database version changed, closing connection');
            this.close();
        });
    }
}

export const db = new GrowPanionDB();

export async function getAllGrows(): Promise<Grow[]> {
    try {
        return await db.grows.toArray();
    } catch (error) {
        console.error('Failed to get all grows:', error);
        throw new Error('Unable to retrieve grows from database');
    }
}

export async function getGrowById(id: string): Promise<Grow | undefined> {
    try {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid grow ID provided');
        }
        return await db.grows.get(id);
    } catch (error) {
        console.error(`Failed to get grow by id ${id}:`, error);
        throw new Error('Unable to retrieve grow from database');
    }
}

export async function saveGrow(grow: Grow): Promise<string> {
    try {
        // Validate grow data before saving
        const validatedGrow = validateOrThrow(GrowSchema, grow);
        return await db.grows.put(validatedGrow);
    } catch (error) {
        console.error('Failed to save grow:', error);
        throw new Error('Unable to save grow to database');
    }
}

export async function deleteGrow(id: string): Promise<void> {
    try {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid grow ID provided');
        }

        // Check if grow exists before deleting
        const grow = await db.grows.get(id);
        if (!grow) {
            throw new Error(`Grow with id ${id} not found`);
        }

        // Also deletes all associated plants, mixes, and reminders in one transaction.
        await db.transaction('rw', [db.grows, db.plants, db.fertilizerMixes, db.reminders], async () => {
            await db.plants.where({ growId: id }).delete();
            await db.fertilizerMixes.where({ growId: id }).delete();
            await db.reminders.where({ growId: id }).delete();
            await db.grows.delete(id);
        });
    } catch (error) {
        console.error(`Failed to delete grow ${id}:`, error);
        throw new Error('Unable to delete grow from database');
    }
}

export async function getAllPlants(): Promise<PlantDB[]> {
    try {
        return await db.plants.toArray();
    } catch (error) {
        console.error('Failed to get all plants:', error);
        throw new Error('Unable to retrieve plants from database');
    }
}

export async function getPlantsForGrow(growId: string): Promise<PlantDB[]> {
    try {
        if (!growId || typeof growId !== 'string') {
            throw new Error('Invalid grow ID provided');
        }
        return await db.plants.where({ growId }).toArray();
    } catch (error) {
        console.error(`Failed to get plants for grow ${growId}:`, error);
        throw new Error('Unable to retrieve plants from database');
    }
}

export async function getPlantById(id: string): Promise<PlantDB | undefined> {
    try {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid plant ID provided');
        }
        return await db.plants.get(id);
    } catch (error) {
        console.error(`Failed to get plant by id ${id}:`, error);
        throw new Error('Unable to retrieve plant from database');
    }
}

export async function savePlant(plant: PlantDB): Promise<string> {
    try {
        const validatedPlant = validateOrThrow(PlantDBSchema, plant);
        const grow = await db.grows.get(validatedPlant.growId);
        const referenceError = getPlantReferenceError(validatedPlant, Boolean(grow));

        if (referenceError) {
            throw new Error(referenceError);
        }

        return await db.plants.put(validatedPlant);
    } catch (error) {
        console.error('Failed to save plant:', error);
        throw new Error('Unable to save plant to database');
    }
}

export async function deletePlant(id: string): Promise<void> {
    try {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid plant ID provided');
        }

        // Check if plant exists before deleting
        const plant = await db.plants.get(id);
        if (!plant) {
            throw new Error(`Plant with id ${id} not found`);
        }

        await db.transaction('rw', [db.plants, db.reminders], async () => {
            await db.reminders.where({ plantId: id }).delete();
            await db.plants.delete(id);
        });
    } catch (error) {
        console.error(`Failed to delete plant ${id}:`, error);
        throw new Error('Unable to delete plant from database');
    }
}

export async function getAllFertilizerMixes(): Promise<FertilizerMixDB[]> {
    try {
        return await db.fertilizerMixes.toArray();
    } catch (error) {
        console.error('Failed to get all fertilizer mixes:', error);
        throw new Error('Unable to retrieve fertilizer mixes from database');
    }
}

export async function getFertilizerMixesForGrow(growId: string): Promise<FertilizerMixDB[]> {
    try {
        if (!growId || typeof growId !== 'string') {
            throw new Error('Invalid grow ID provided');
        }
        return await db.fertilizerMixes.where({ growId }).toArray();
    } catch (error) {
        console.error(`Failed to get fertilizer mixes for grow ${growId}:`, error);
        throw new Error('Unable to retrieve fertilizer mixes from database');
    }
}

export async function getFertilizerMixById(id: string): Promise<FertilizerMixDB | undefined> {
    try {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid fertilizer mix ID provided');
        }
        return await db.fertilizerMixes.get(id);
    } catch (error) {
        console.error(`Failed to get fertilizer mix by id ${id}:`, error);
        throw new Error('Unable to retrieve fertilizer mix from database');
    }
}

export async function saveFertilizerMix(mix: FertilizerMixDB): Promise<string> {
    try {
        const validatedMix = validateOrThrow(FertilizerMixDBSchema, mix);
        const grow = await db.grows.get(validatedMix.growId);
        const referenceError = getFertilizerMixReferenceError(validatedMix, Boolean(grow));

        if (referenceError) {
            throw new Error(referenceError);
        }

        return await db.fertilizerMixes.put(validatedMix);
    } catch (error) {
        console.error('Failed to save fertilizer mix:', error);
        throw new Error('Unable to save fertilizer mix to database');
    }
}

export async function deleteFertilizerMix(id: string): Promise<void> {
    try {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid fertilizer mix ID provided');
        }

        // Check if fertilizer mix exists before deleting
        const mix = await db.fertilizerMixes.get(id);
        if (!mix) {
            throw new Error(`Fertilizer mix with id ${id} not found`);
        }

        await db.transaction('rw', [db.fertilizerMixes, db.plants], async () => {
            const plantsInGrow = await db.plants.where({ growId: mix.growId }).toArray();
            const plantsToUpdate = removeFertilizerMixReferences(plantsInGrow, id);

            if (plantsToUpdate.length > 0) {
                await db.plants.bulkPut(plantsToUpdate);
            }

            await db.fertilizerMixes.delete(id);
        });
    } catch (error) {
        console.error(`Failed to delete fertilizer mix ${id}:`, error);
        throw new Error('Unable to delete fertilizer mix from database');
    }
}

export async function getSettings(): Promise<Settings | undefined> {
    try {
        return await db.settings.get('global');
    } catch (error) {
        console.error('Failed to get settings:', error);
        throw new Error('Unable to retrieve settings from database');
    }
}

export async function saveSettings(settings: Partial<Settings>): Promise<string> {
    try {
        if (!settings || typeof settings !== 'object') {
            throw new Error('Invalid settings data provided');
        }

        const currentSettings = await getSettings() || { id: 'global' };
        const updatedSettings: Settings = {
            ...currentSettings,
            ...settings,
            id: 'global', // Ensure ID is always set
            lastUpdated: new Date().toISOString(),
            sensors: settings.sensors
                ? settings.sensors.map(normalizeSensorConfig)
                : currentSettings.sensors?.map(normalizeSensorConfig)
        };

        // Validate complete settings object before saving
        const validatedSettings = validateOrThrow(SettingsSchema.partial(), updatedSettings);

        return await db.settings.put({ ...currentSettings, ...validatedSettings });
    } catch (error) {
        console.error('Failed to save settings:', error);
        throw new Error('Unable to save settings to database');
    }
}

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// ============== STRAIN FUNCTIONS ==============

export async function getAllStrains(): Promise<Strain[]> {
    try {
        return await db.strains.toArray();
    } catch (error) {
        console.error('Failed to get all strains:', error);
        throw new Error('Unable to retrieve strains from database');
    }
}

export async function getStrainById(id: string): Promise<Strain | undefined> {
    try {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid strain ID provided');
        }
        return await db.strains.get(id);
    } catch (error) {
        console.error(`Failed to get strain by id ${id}:`, error);
        throw new Error('Unable to retrieve strain from database');
    }
}

export async function saveStrain(strain: Strain): Promise<string> {
    try {
        const strainToSave: Strain = {
            ...strain,
            updatedAt: new Date().toISOString(),
            createdAt: strain.createdAt || new Date().toISOString(),
        };
        const validatedStrain = validateOrThrow(StrainSchema, strainToSave);

        return await db.strains.put(validatedStrain);
    } catch (error) {
        console.error('Failed to save strain:', error);
        throw new Error('Unable to save strain to database');
    }
}

export async function deleteStrain(id: string): Promise<void> {
    try {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid strain ID provided');
        }

        const strain = await db.strains.get(id);
        if (!strain) {
            throw new Error(`Strain with id ${id} not found`);
        }

        await db.strains.delete(id);
    } catch (error) {
        console.error(`Failed to delete strain ${id}:`, error);
        throw new Error('Unable to delete strain from database');
    }
}

export async function searchStrains(query: string): Promise<Strain[]> {
    try {
        const allStrains = await db.strains.toArray();
        return filterStrains(allStrains, query);
    } catch (error) {
        console.error('Failed to search strains:', error);
        throw new Error('Unable to search strains in database');
    }
}

export async function populateDBWithDemoDataIfEmpty(): Promise<void> {
    try {
        const existingDefaultCount = await db.genetics
            .where('source')
            .equals('default')
            .count();

        if (existingDefaultCount === 0) {
            await db.genetics.bulkPut(DEFAULT_GENETICS);
        }
    } catch (error) {
        console.error('Failed to populate default genetics:', error);
    }
}

// ============== REMINDER FUNCTIONS ==============

export async function getAllReminders(): Promise<Reminder[]> {
    try {
        return await db.reminders.toArray();
    } catch (error) {
        console.error('Failed to get all reminders:', error);
        throw new Error('Unable to retrieve reminders from database');
    }
}

export async function getRemindersForGrow(growId: string): Promise<Reminder[]> {
    try {
        if (!growId || typeof growId !== 'string') {
            throw new Error('Invalid grow ID provided');
        }
        return await db.reminders.where({ growId }).toArray();
    } catch (error) {
        console.error(`Failed to get reminders for grow ${growId}:`, error);
        throw new Error('Unable to retrieve reminders from database');
    }
}

export async function getRemindersForPlant(plantId: string): Promise<Reminder[]> {
    try {
        if (!plantId || typeof plantId !== 'string') {
            throw new Error('Invalid plant ID provided');
        }
        return await db.reminders.where({ plantId }).toArray();
    } catch (error) {
        console.error(`Failed to get reminders for plant ${plantId}:`, error);
        throw new Error('Unable to retrieve reminders from database');
    }
}

export async function getDueReminders(): Promise<Reminder[]> {
    try {
        const now = new Date();
        return await db.reminders
            .filter(reminder => reminder.enabled && isDueAt(reminder.nextDue, now))
            .toArray();
    } catch (error) {
        console.error('Failed to get due reminders:', error);
        throw new Error('Unable to retrieve due reminders from database');
    }
}

export async function getReminderById(id: string): Promise<Reminder | undefined> {
    try {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid reminder ID provided');
        }
        return await db.reminders.get(id);
    } catch (error) {
        console.error(`Failed to get reminder by id ${id}:`, error);
        throw new Error('Unable to retrieve reminder from database');
    }
}

export async function saveReminder(reminder: Reminder): Promise<string> {
    try {
        const reminderToSave: Reminder = {
            ...reminder,
            updatedAt: new Date().toISOString(),
            createdAt: reminder.createdAt || new Date().toISOString(),
        };
        const validatedReminder = validateOrThrow(ReminderSchema, reminderToSave);
        const [grow, plant] = await Promise.all([
            db.grows.get(validatedReminder.growId),
            validatedReminder.plantId?.trim()
                ? db.plants.get(validatedReminder.plantId)
                : Promise.resolve(undefined)
        ]);
        const referenceError = getReminderReferenceError(validatedReminder, Boolean(grow), plant);

        if (referenceError) {
            throw new Error(referenceError);
        }

        return await db.reminders.put(validatedReminder);
    } catch (error) {
        console.error('Failed to save reminder:', error);
        throw new Error('Unable to save reminder to database');
    }
}

export async function deleteReminder(id: string): Promise<void> {
    try {
        if (!id || typeof id !== 'string') {
            throw new Error('Invalid reminder ID provided');
        }

        const reminder = await db.reminders.get(id);
        if (!reminder) {
            throw new Error(`Reminder with id ${id} not found`);
        }

        await db.reminders.delete(id);
    } catch (error) {
        console.error(`Failed to delete reminder ${id}:`, error);
        throw new Error('Unable to delete reminder from database');
    }
}

export async function deleteRemindersForGrow(growId: string): Promise<void> {
    try {
        if (!growId || typeof growId !== 'string') {
            throw new Error('Invalid grow ID provided');
        }
        await db.reminders.where({ growId }).delete();
    } catch (error) {
        console.error(`Failed to delete reminders for grow ${growId}:`, error);
        throw new Error('Unable to delete reminders from database');
    }
}

async function putValidatedRecord<T>(schema: { parse: (value: unknown) => T }, table: Table<T, string>, value: T, errorMessage: string): Promise<string> {
    try {
        return await table.put(schema.parse(value));
    } catch (error) {
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
}

async function getRecordsForIndex<T>(table: Table<T, string>, index: string, value: string, errorMessage: string): Promise<T[]> {
    try {
        if (!value || typeof value !== 'string') {
            throw new Error('Invalid index value provided');
        }
        return await table.where(index).equals(value).toArray();
    } catch (error) {
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
}

// ============== PRODUCT OS ENTITY FUNCTIONS ==============

export async function getAllGenetics(): Promise<Genetics[]> {
    try {
        return await db.genetics.toArray();
    } catch (error) {
        console.error('Failed to get genetics:', error);
        throw new Error('Unable to retrieve genetics from database');
    }
}

/**
 * Replaces the bundled default genetics and their lineage edges in a single transaction.
 *
 * User-created genetics, overrides and user-created lineage edges are preserved: only
 * records with `source === 'default'` and seed lineage edges (id prefixed with `edge:`)
 * are removed before the fresh seed is written. Records are written via bulkPut without
 * per-record validation for performance, mirroring populateDBWithDemoDataIfEmpty.
 */
export async function replaceDefaultGeneticsAndLineage(
    genetics: Genetics[],
    edges: LineageEdge[],
): Promise<void> {
    try {
        await db.transaction('rw', db.genetics, db.lineageEdges, async () => {
            const defaultKeys = await db.genetics.where('source').equals('default').primaryKeys();
            if (defaultKeys.length > 0) {
                await db.genetics.bulkDelete(defaultKeys);
            }
            if (genetics.length > 0) {
                await db.genetics.bulkPut(genetics);
            }

            const existingEdgeKeys = await db.lineageEdges.toCollection().primaryKeys();
            const seedEdgeKeys = existingEdgeKeys.filter(key => String(key).startsWith('edge:'));
            if (seedEdgeKeys.length > 0) {
                await db.lineageEdges.bulkDelete(seedEdgeKeys);
            }
            if (edges.length > 0) {
                await db.lineageEdges.bulkPut(edges);
            }
        });
    } catch (error) {
        console.error('Failed to replace default genetics seed:', error);
        throw new Error('Unable to import default genetics seed into database');
    }
}

export async function saveGenetics(genetics: Genetics): Promise<string> {
    return putValidatedRecord(GeneticsSchema, db.genetics, genetics, 'Unable to save genetics to database');
}

export async function saveGeneticsOverride(override: GeneticsOverride): Promise<string> {
    return putValidatedRecord(GeneticsOverrideSchema, db.geneticsOverrides, override, 'Unable to save genetics override to database');
}

export async function getAllGeneticsOverrides(): Promise<GeneticsOverride[]> {
    try {
        return await db.geneticsOverrides.toArray();
    } catch (error) {
        console.error('Failed to get genetics overrides:', error);
        throw new Error('Unable to retrieve genetics overrides from database');
    }
}

export async function deleteGeneticsOverride(id: string): Promise<void> {
    try {
        await db.geneticsOverrides.delete(id);
    } catch (error) {
        console.error('Failed to delete genetics override:', error);
        throw new Error('Unable to delete genetics override from database');
    }
}

export async function saveLineageEdge(edge: LineageEdge): Promise<string> {
    return putValidatedRecord(LineageEdgeSchema, db.lineageEdges, edge, 'Unable to save lineage edge to database');
}

export async function getAllLineageEdges(): Promise<LineageEdge[]> {
    try {
        return await db.lineageEdges.toArray();
    } catch (error) {
        console.error('Failed to get lineage edges:', error);
        throw new Error('Unable to retrieve lineage edges from database');
    }
}

export async function getPhenotypesForGenetics(geneticsId: string): Promise<Phenotype[]> {
    return getRecordsForIndex(db.phenotypes, 'geneticsId', geneticsId, 'Unable to retrieve phenotypes from database');
}

export async function getPhenotypesForPlant(plantId: string): Promise<Phenotype[]> {
    return getRecordsForIndex(db.phenotypes, 'plantId', plantId, 'Unable to retrieve phenotypes from database');
}

export async function getPhenotypesForGrow(growId: string): Promise<Phenotype[]> {
    return getRecordsForIndex(db.phenotypes, 'growId', growId, 'Unable to retrieve phenotypes from database');
}

export async function savePhenotype(phenotype: Phenotype): Promise<string> {
    return putValidatedRecord(PhenotypeSchema, db.phenotypes, phenotype, 'Unable to save phenotype to database');
}

export async function getGrowEventsForGrow(growId: string): Promise<GrowEvent[]> {
    return getRecordsForIndex(db.growEvents, 'growId', growId, 'Unable to retrieve grow events from database');
}

export async function getGrowEventsForPlant(plantId: string): Promise<GrowEvent[]> {
    return getRecordsForIndex(db.growEvents, 'plantId', plantId, 'Unable to retrieve plant events from database');
}

export async function saveGrowEvent(event: GrowEvent): Promise<string> {
    return putValidatedRecord(GrowEventSchema, db.growEvents, event, 'Unable to save grow event to database');
}

export async function getTelemetryForGrow(growId: string): Promise<TelemetryReading[]> {
    return getRecordsForIndex(db.telemetryReadings, 'growId', growId, 'Unable to retrieve telemetry from database');
}

export async function getTelemetryForPlant(plantId: string): Promise<TelemetryReading[]> {
    return getRecordsForIndex(db.telemetryReadings, 'plantId', plantId, 'Unable to retrieve plant telemetry from database');
}

export async function saveTelemetryReading(reading: TelemetryReading): Promise<string> {
    const id = await putValidatedRecord(TelemetryReadingSchema, db.telemetryReadings, reading, 'Unable to save telemetry reading to database');
    notifyTelemetryUpdated({ source: 'manual', growIds: [reading.growId] });
    return id;
}

export async function saveDeviceIntegration(integration: DeviceIntegration): Promise<string> {
    return putValidatedRecord(DeviceIntegrationSchema, db.deviceIntegrations, integration, 'Unable to save device integration to database');
}

export async function getAllDeviceIntegrations(): Promise<DeviceIntegration[]> {
    try {
        return await db.deviceIntegrations.toArray();
    } catch (error) {
        console.error('Failed to get device integrations:', error);
        throw new Error('Unable to retrieve device integrations from database');
    }
}

export async function saveDevice(device: Device): Promise<string> {
    return putValidatedRecord(DeviceSchema, db.devices, device, 'Unable to save device to database');
}

export async function getAllDevices(): Promise<Device[]> {
    try {
        return await db.devices.toArray();
    } catch (error) {
        console.error('Failed to get devices:', error);
        throw new Error('Unable to retrieve devices from database');
    }
}

export async function deleteDevice(id: string): Promise<void> {
    try {
        await db.transaction('rw', db.devices, db.sensorBindings, db.telemetryReadings, async () => {
            await db.telemetryReadings.where({ deviceId: id }).delete();
            await db.sensorBindings.where({ deviceId: id }).delete();
            await db.devices.delete(id);
        });
    } catch (error) {
        console.error(`Failed to delete device ${id}:`, error);
        throw new Error('Unable to delete device from database');
    }
}

export async function saveSensorBinding(binding: SensorBinding): Promise<string> {
    return putValidatedRecord(SensorBindingSchema, db.sensorBindings, binding, 'Unable to save sensor binding to database');
}

export async function getAllSensorBindings(): Promise<SensorBinding[]> {
    try {
        return await db.sensorBindings.toArray();
    } catch (error) {
        console.error('Failed to get sensor bindings:', error);
        throw new Error('Unable to retrieve sensor bindings from database');
    }
}

export async function deleteSensorBinding(id: string): Promise<void> {
    try {
        await db.transaction('rw', db.sensorBindings, db.telemetryReadings, async () => {
            await db.telemetryReadings.where({ sensorBindingId: id }).delete();
            await db.sensorBindings.delete(id);
        });
    } catch (error) {
        console.error(`Failed to delete sensor binding ${id}:`, error);
        throw new Error('Unable to delete sensor binding from database');
    }
}

export async function getDevicesForGrow(growId: string): Promise<Device[]> {
    return getRecordsForIndex(db.devices, 'growId', growId, 'Unable to retrieve devices from database');
}

export async function saveFertilizerProduct(product: FertilizerProduct): Promise<string> {
    return putValidatedRecord(FertilizerProductSchema, db.fertilizerProducts, product, 'Unable to save fertilizer product to database');
}

export async function saveMixRecipe(recipe: MixRecipe): Promise<string> {
    return putValidatedRecord(MixRecipeSchema, db.mixRecipes, recipe, 'Unable to save mix recipe to database');
}

export async function getMixRecipesForGrow(growId: string): Promise<MixRecipe[]> {
    return getRecordsForIndex(db.mixRecipes, 'growId', growId, 'Unable to retrieve mix recipes from database');
}

export async function savePreparedBatch(batch: PreparedBatch): Promise<string> {
    return putValidatedRecord(PreparedBatchSchema, db.preparedBatches, batch, 'Unable to save prepared batch to database');
}

export async function getPreparedBatchesForGrow(growId: string): Promise<PreparedBatch[]> {
    return getRecordsForIndex(db.preparedBatches, 'growId', growId, 'Unable to retrieve prepared batches from database');
}

export async function saveIrrigationEvent(event: IrrigationEvent): Promise<string> {
    return putValidatedRecord(IrrigationEventSchema, db.irrigationEvents, event, 'Unable to save irrigation event to database');
}

export async function getIrrigationEventsForPlant(plantId: string): Promise<IrrigationEvent[]> {
    return getRecordsForIndex(db.irrigationEvents, 'plantId', plantId, 'Unable to retrieve irrigation events from database');
}

export async function getIrrigationEventsForGrow(growId: string): Promise<IrrigationEvent[]> {
    return getRecordsForIndex(db.irrigationEvents, 'growId', growId, 'Unable to retrieve irrigation events from database');
}

export async function savePhoto(photo: Photo): Promise<string> {
    return putValidatedRecord(PhotoSchema, db.photos, photo, 'Unable to save photo to database');
}

export async function getPhotosForGrow(growId: string): Promise<Photo[]> {
    return getRecordsForIndex(db.photos, 'growId', growId, 'Unable to retrieve photos from database');
}

export async function saveRecommendation(recommendation: Recommendation): Promise<string> {
    return putValidatedRecord(RecommendationSchema, db.recommendations, recommendation, 'Unable to save recommendation to database');
}

export async function getRecommendationsForGrow(growId: string): Promise<Recommendation[]> {
    return getRecordsForIndex(db.recommendations, 'growId', growId, 'Unable to retrieve recommendations from database');
}

export async function savePowerConsumer(consumer: PowerConsumer): Promise<string> {
    return putValidatedRecord(PowerConsumerSchema, db.powerConsumers, consumer, 'Unable to save power consumer to database');
}

export async function getPowerConsumersForGrow(growId?: string): Promise<PowerConsumer[]> {
    try {
        if (!growId) {
            return await db.powerConsumers.filter(consumer => !consumer.growId).toArray();
        }
        return await db.powerConsumers.filter(consumer => !consumer.growId || consumer.growId === growId).toArray();
    } catch (error) {
        console.error('Failed to get power consumers:', error);
        throw new Error('Unable to retrieve power consumers from database');
    }
}

export async function savePowerCostProfile(profile: PowerCostProfile): Promise<string> {
    return putValidatedRecord(PowerCostProfileSchema, db.powerCostProfiles, profile, 'Unable to save power cost profile to database');
}

export async function getPowerCostProfilesForGrow(growId?: string): Promise<PowerCostProfile[]> {
    try {
        if (!growId) {
            return await db.powerCostProfiles.filter(profile => !profile.growId).toArray();
        }
        return await db.powerCostProfiles.filter(profile => !profile.growId || profile.growId === growId).toArray();
    } catch (error) {
        console.error('Failed to get power cost profiles:', error);
        throw new Error('Unable to retrieve power cost profiles from database');
    }
}

// ============== NOTIFICATION SETTINGS FUNCTIONS ==============

export async function getNotificationSettings(): Promise<NotificationSettings | undefined> {
    try {
        return await db.notificationSettings.get('notification-settings');
    } catch (error) {
        console.error('Failed to get notification settings:', error);
        throw new Error('Unable to retrieve notification settings from database');
    }
}

export async function saveNotificationSettings(settings: Partial<NotificationSettings>): Promise<string> {
    try {
        const currentSettings = await getNotificationSettings() || {
            id: 'notification-settings',
            enabled: false,
            permission: 'default' as NotificationPermission,
            defaultReminderTime: '09:00',
            soundEnabled: true
        };

        const updatedSettings: NotificationSettings = {
            ...currentSettings,
            ...settings,
            id: 'notification-settings'
        };
        const validatedSettings = validateOrThrow(NotificationSettingsSchema, updatedSettings);

        return await db.notificationSettings.put(validatedSettings);
    } catch (error) {
        console.error('Failed to save notification settings:', error);
        throw new Error('Unable to save notification settings to database');
    }
}

/**
 * Health check function to verify database connectivity and integrity
 * @returns Promise<boolean> indicating if database is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
    try {
        // Test database connection by performing a simple read operation
        await db.open();

        // Test each table is accessible
        await db.grows.limit(1).toArray();
        await db.plants.limit(1).toArray();
        await db.fertilizerMixes.limit(1).toArray();
        await db.settings.limit(1).toArray();
        await db.strains.limit(1).toArray();
        await db.reminders.limit(1).toArray();
        await db.notificationSettings.limit(1).toArray();
        await db.genetics.limit(1).toArray();
        await db.geneticsOverrides.limit(1).toArray();
        await db.lineageEdges.limit(1).toArray();
        await db.phenotypes.limit(1).toArray();
        await db.growEvents.limit(1).toArray();
        await db.telemetryReadings.limit(1).toArray();
        await db.deviceIntegrations.limit(1).toArray();
        await db.devices.limit(1).toArray();
        await db.sensorBindings.limit(1).toArray();
        await db.fertilizerProducts.limit(1).toArray();
        await db.mixRecipes.limit(1).toArray();
        await db.preparedBatches.limit(1).toArray();
        await db.irrigationEvents.limit(1).toArray();
        await db.photos.limit(1).toArray();
        await db.recommendations.limit(1).toArray();
        await db.powerConsumers.limit(1).toArray();
        await db.powerCostProfiles.limit(1).toArray();

        return true;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}

/**
 * Database error types for better error handling
 */
export enum DatabaseErrorType {
    CONNECTION_ERROR = 'CONNECTION_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
    TRANSACTION_ERROR = 'TRANSACTION_ERROR'
}

/**
 * Custom database error class
 */
export class DatabaseError extends Error {
    constructor(
        message: string,
        public type: DatabaseErrorType,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'DatabaseError';
    }
}
