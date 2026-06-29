/**
 * Export/Import utilities for GrowPanion data
 * Handles data collection, serialization, and import with conflict resolution
 */

import {
    db,
    Grow,
    PlantDB,
    FertilizerMixDB,
    Settings,
    Strain,
    Reminder,
    NotificationSettings,
    Genetics,
    GeneticsOverride,
    LineageEdge,
    Phenotype,
    GrowEvent,
    TelemetryReading,
    DeviceIntegration,
    Device,
    SensorBinding,
    FertilizerProduct,
    MixRecipe,
    PreparedBatch,
    IrrigationEvent,
    Photo,
    Recommendation,
    PowerConsumer,
    PowerCostProfile
} from '@/lib/db';
import { encrypt, decrypt, isEncryptedFormat } from '@/lib/crypto-utils';
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
import { normalizeSensorConfig } from '@/lib/sensor-utils';

// Current export schema version
export const EXPORT_SCHEMA_VERSION = '1.0';
export const APP_VERSION = '0.1.0';

// File extensions
export const PLAIN_EXTENSION = '.json';
export const ENCRYPTED_EXTENSION = '.growpanion';

/**
 * Export data structure
 */
export interface ExportData {
    metadata: ExportMetadata;
    data: {
        grows: Grow[];
        plants: PlantDB[];
        fertilizerMixes: FertilizerMixDB[];
        settings: Settings | null;
        strains?: Strain[];
        reminders?: Reminder[];
        notificationSettings?: NotificationSettings | null;
        genetics?: Genetics[];
        geneticsOverrides?: GeneticsOverride[];
        lineageEdges?: LineageEdge[];
        phenotypes?: Phenotype[];
        growEvents?: GrowEvent[];
        telemetryReadings?: TelemetryReading[];
        deviceIntegrations?: DeviceIntegration[];
        devices?: Device[];
        sensorBindings?: SensorBinding[];
        fertilizerProducts?: FertilizerProduct[];
        mixRecipes?: MixRecipe[];
        preparedBatches?: PreparedBatch[];
        irrigationEvents?: IrrigationEvent[];
        photos?: Photo[];
        recommendations?: Recommendation[];
        powerConsumers?: PowerConsumer[];
        powerCostProfiles?: PowerCostProfile[];
    };
}

export interface ExportMetadata {
    version: string;
    appVersion: string;
    exportedAt: string;
    encrypted: boolean;
    description?: string;
}

/**
 * Import conflict resolution strategy
 */
export type ConflictStrategy = 'replace' | 'merge' | 'skip';

/**
 * Import result details
 */
export interface ImportResult {
    success: boolean;
    imported: {
        grows: number;
        plants: number;
        fertilizerMixes: number;
        settings: boolean;
        strains: number;
        reminders: number;
        notificationSettings: boolean;
        genetics: number;
        geneticsOverrides: number;
        lineageEdges: number;
        phenotypes: number;
        growEvents: number;
        telemetryReadings: number;
        deviceIntegrations: number;
        devices: number;
        sensorBindings: number;
        fertilizerProducts: number;
        mixRecipes: number;
        preparedBatches: number;
        irrigationEvents: number;
        photos: number;
        recommendations: number;
        powerConsumers: number;
        powerCostProfiles: number;
    };
    skipped: {
        grows: number;
        plants: number;
        fertilizerMixes: number;
        strains: number;
        reminders: number;
        productEntities: number;
    };
    errors: string[];
}

const normalizeImportSettings = (settings: Settings): Settings => ({
    ...settings,
    id: 'global',
    sensors: settings.sensors?.map(normalizeSensorConfig)
});

const normalizeExportDataForImport = (exportData: ExportData): ExportData => ({
    metadata: {
        ...exportData.metadata,
        version: exportData.metadata.version.trim(),
        appVersion: typeof exportData.metadata.appVersion === 'string'
            ? exportData.metadata.appVersion.trim()
            : APP_VERSION,
        exportedAt: exportData.metadata.exportedAt.trim(),
        description: typeof exportData.metadata.description === 'string'
            ? exportData.metadata.description.trim()
            : undefined,
    },
    data: {
        grows: exportData.data.grows.map(grow => GrowSchema.parse(grow)),
        plants: exportData.data.plants.map(plant => PlantDBSchema.parse(plant)),
        fertilizerMixes: exportData.data.fertilizerMixes.map(mix => FertilizerMixDBSchema.parse(mix)),
        settings: exportData.data.settings ? normalizeImportSettings(SettingsSchema.parse(exportData.data.settings)) : null,
        strains: exportData.data.strains?.map(strain => StrainSchema.parse(strain)),
        reminders: exportData.data.reminders?.map(reminder => ReminderSchema.parse(reminder)),
        notificationSettings: exportData.data.notificationSettings
            ? NotificationSettingsSchema.parse(exportData.data.notificationSettings)
            : null,
        genetics: exportData.data.genetics?.map(item => GeneticsSchema.parse(item)),
        geneticsOverrides: exportData.data.geneticsOverrides?.map(item => GeneticsOverrideSchema.parse(item)),
        lineageEdges: exportData.data.lineageEdges?.map(item => LineageEdgeSchema.parse(item)),
        phenotypes: exportData.data.phenotypes?.map(item => PhenotypeSchema.parse(item)),
        growEvents: exportData.data.growEvents?.map(item => GrowEventSchema.parse(item)),
        telemetryReadings: exportData.data.telemetryReadings?.map(item => TelemetryReadingSchema.parse(item)),
        deviceIntegrations: exportData.data.deviceIntegrations?.map(item => DeviceIntegrationSchema.parse(item)),
        devices: exportData.data.devices?.map(item => DeviceSchema.parse(item)),
        sensorBindings: exportData.data.sensorBindings?.map(item => SensorBindingSchema.parse(item)),
        fertilizerProducts: exportData.data.fertilizerProducts?.map(item => FertilizerProductSchema.parse(item)),
        mixRecipes: exportData.data.mixRecipes?.map(item => MixRecipeSchema.parse(item)),
        preparedBatches: exportData.data.preparedBatches?.map(item => PreparedBatchSchema.parse(item)),
        irrigationEvents: exportData.data.irrigationEvents?.map(item => IrrigationEventSchema.parse(item)),
        photos: exportData.data.photos?.map(item => PhotoSchema.parse(item)),
        recommendations: exportData.data.recommendations?.map(item => RecommendationSchema.parse(item)),
        powerConsumers: exportData.data.powerConsumers?.map(item => PowerConsumerSchema.parse(item)),
        powerCostProfiles: exportData.data.powerCostProfiles?.map(item => PowerCostProfileSchema.parse(item)),
    },
});

/**
 * Collects all data from the database for export
 */
export async function collectExportData(description?: string): Promise<ExportData> {
    const [
        grows,
        plants,
        fertilizerMixes,
        settings,
        strains,
        reminders,
        notificationSettings,
        genetics,
        geneticsOverrides,
        lineageEdges,
        phenotypes,
        growEvents,
        telemetryReadings,
        deviceIntegrations,
        devices,
        sensorBindings,
        fertilizerProducts,
        mixRecipes,
        preparedBatches,
        irrigationEvents,
        photos,
        recommendations,
        powerConsumers,
        powerCostProfiles
    ] = await Promise.all([
        db.grows.toArray(),
        db.plants.toArray(),
        db.fertilizerMixes.toArray(),
        db.settings.get('global'),
        db.strains.toArray(),
        db.reminders.toArray(),
        db.notificationSettings.get('notification-settings'),
        db.genetics.toArray(),
        db.geneticsOverrides.toArray(),
        db.lineageEdges.toArray(),
        db.phenotypes.toArray(),
        db.growEvents.toArray(),
        db.telemetryReadings.toArray(),
        db.deviceIntegrations.toArray(),
        db.devices.toArray(),
        db.sensorBindings.toArray(),
        db.fertilizerProducts.toArray(),
        db.mixRecipes.toArray(),
        db.preparedBatches.toArray(),
        db.irrigationEvents.toArray(),
        db.photos.toArray(),
        db.recommendations.toArray(),
        db.powerConsumers.toArray(),
        db.powerCostProfiles.toArray()
    ]);

    return {
        metadata: {
            version: EXPORT_SCHEMA_VERSION,
            appVersion: APP_VERSION,
            exportedAt: new Date().toISOString(),
            encrypted: false,
            description
        },
        data: {
            grows,
            plants,
            fertilizerMixes,
            settings: settings || null,
            strains,
            reminders,
            notificationSettings: notificationSettings || null,
            genetics,
            geneticsOverrides,
            lineageEdges,
            phenotypes,
            growEvents,
            telemetryReadings,
            deviceIntegrations,
            devices,
            sensorBindings,
            fertilizerProducts,
            mixRecipes,
            preparedBatches,
            irrigationEvents,
            photos,
            recommendations,
            powerConsumers,
            powerCostProfiles
        }
    };
}

/**
 * Creates an export file (plain JSON or encrypted)
 */
export async function createExportFile(
    password?: string,
    description?: string
): Promise<{ content: string; filename: string; encrypted: boolean }> {
    const exportData = await collectExportData(description);
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (password) {
        // Encrypt the data
        exportData.metadata.encrypted = true;
        const jsonString = JSON.stringify(exportData);
        const encryptedContent = await encrypt(jsonString, password);
        
        return {
            content: encryptedContent,
            filename: `growpanion-backup-${timestamp}${ENCRYPTED_EXTENSION}`,
            encrypted: true
        };
    } else {
        // Plain JSON export
        return {
            content: JSON.stringify(exportData, null, 2),
            filename: `growpanion-backup-${timestamp}${PLAIN_EXTENSION}`,
            encrypted: false
        };
    }
}

/**
 * Triggers file download in browser
 */
export function downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Parses and validates import file content
 */
export async function parseImportFile(
    content: string,
    password?: string
): Promise<{ data: ExportData; wasEncrypted: boolean }> {
    let jsonContent = content;
    let wasEncrypted = false;

    // Check if content is encrypted
    if (isEncryptedFormat(content)) {
        if (!password) {
            throw new Error('ENCRYPTED_FILE_NEEDS_PASSWORD');
        }
        try {
            jsonContent = await decrypt(content, password);
            wasEncrypted = true;
        } catch {
            throw new Error('DECRYPTION_FAILED');
        }
    }

    // Parse JSON
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonContent);
    } catch {
        throw new Error('INVALID_JSON');
    }

    // Validate schema
    const validationResult = validateExportSchema(parsed);
    if (!validationResult.valid) {
        throw new Error(`INVALID_SCHEMA: ${validationResult.errors.join(', ')}`);
    }

    return {
        data: parsed as ExportData,
        wasEncrypted
    };
}

/**
 * Validates the export data schema
 */
export function validateExportSchema(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
        value !== null && typeof value === 'object' && !Array.isArray(value);
    const hasString = (record: Record<string, unknown>, key: string) =>
        typeof record[key] === 'string' && record[key].trim().length > 0;
    const getTrimmedString = (record: Record<string, unknown>, key: string) =>
        typeof record[key] === 'string' ? record[key].trim() : undefined;
    const hasArray = (record: Record<string, unknown>, key: string) =>
        Array.isArray(record[key]);
    const hasNumber = (record: Record<string, unknown>, key: string) =>
        typeof record[key] === 'number' && Number.isFinite(record[key]);
    const hasBoolean = (record: Record<string, unknown>, key: string) =>
        typeof record[key] === 'boolean';
    const addDuplicateErrors = (ids: string[], sectionName: string) => {
        const seen = new Set<string>();
        const duplicateIds = new Set<string>();

        ids.forEach(id => {
            if (seen.has(id)) {
                duplicateIds.add(id);
            }
            seen.add(id);
        });

        duplicateIds.forEach(id => errors.push(`Duplicate ${sectionName} id: ${id}`));
    };
    const optionalArraySections = [
        'genetics',
        'geneticsOverrides',
        'lineageEdges',
        'phenotypes',
        'growEvents',
        'telemetryReadings',
        'deviceIntegrations',
        'devices',
        'sensorBindings',
        'fertilizerProducts',
        'mixRecipes',
        'preparedBatches',
        'irrigationEvents',
        'photos',
        'recommendations',
        'powerConsumers',
        'powerCostProfiles'
    ];
    const validateOptionalSectionSchema = (
        dataSection: Record<string, unknown>,
        sectionName: string,
        schema: { safeParse: (value: unknown) => { success: boolean } }
    ) => {
        validateRecords(dataSection[sectionName], `data.${sectionName}`, (record, index) => {
            if (!hasString(record, 'id')) errors.push(`Missing data.${sectionName}[${index}].id`);
            if (!schema.safeParse(record).success) errors.push(`Invalid data.${sectionName}[${index}] schema`);
        });
    };
    const validateRecords = (
        value: unknown,
        sectionName: string,
        validateRecord: (record: Record<string, unknown>, index: number) => void
    ) => {
        if (!Array.isArray(value)) return;

        value.forEach((item, index) => {
            if (!isObjectRecord(item)) {
                errors.push(`Invalid ${sectionName}[${index}]`);
                return;
            }

            validateRecord(item, index);
        });
    };

    if (!isObjectRecord(data)) {
        return { valid: false, errors: ['Data must be an object'] };
    }

    const obj = data;

    // Check metadata
    if (!isObjectRecord(obj.metadata)) {
        errors.push('Missing or invalid metadata');
    } else {
        const meta = obj.metadata;
        if (!hasString(meta, 'version')) errors.push('Missing metadata.version');
        if (!hasString(meta, 'exportedAt')) errors.push('Missing metadata.exportedAt');
        if (!hasBoolean(meta, 'encrypted')) errors.push('Missing or invalid metadata.encrypted');
    }

    // Check data structure
    if (!isObjectRecord(obj.data)) {
        errors.push('Missing or invalid data section');
    } else {
        const dataSection = obj.data;
        if (!Array.isArray(dataSection.grows)) errors.push('Missing or invalid data.grows');
        if (!Array.isArray(dataSection.plants)) errors.push('Missing or invalid data.plants');
        if (!Array.isArray(dataSection.fertilizerMixes)) errors.push('Missing or invalid data.fertilizerMixes');
        if (dataSection.settings !== undefined && dataSection.settings !== null && !isObjectRecord(dataSection.settings)) {
            errors.push('Invalid data.settings');
        }
        if (dataSection.strains !== undefined && !Array.isArray(dataSection.strains)) {
            errors.push('Invalid data.strains');
        }
        if (dataSection.reminders !== undefined && !Array.isArray(dataSection.reminders)) {
            errors.push('Invalid data.reminders');
        }
        optionalArraySections.forEach(sectionName => {
            if (dataSection[sectionName] !== undefined && !Array.isArray(dataSection[sectionName])) {
                errors.push(`Invalid data.${sectionName}`);
            }
        });
        if (
            dataSection.notificationSettings !== undefined &&
            dataSection.notificationSettings !== null &&
            !isObjectRecord(dataSection.notificationSettings)
        ) {
            errors.push('Invalid data.notificationSettings');
        }

        const growIds: string[] = [];
        const validGrowIds = new Set<string>();
        const plantIds: string[] = [];
        const validPlantIds = new Set<string>();
        const plantGrowIds = new Map<string, string>();
        const mixIds: string[] = [];
        const validMixIds = new Set<string>();
        const mixGrowIds = new Map<string, string>();
        const strainIds: string[] = [];
        const reminderIds: string[] = [];
        const plantRecords: Record<string, unknown>[] = [];

        validateRecords(dataSection.grows, 'data.grows', (grow, index) => {
            const growId = getTrimmedString(grow, 'id');
            if (!hasString(grow, 'id')) errors.push(`Missing data.grows[${index}].id`);
            else if (growId) {
                growIds.push(growId);
                validGrowIds.add(growId);
            }
            if (!hasString(grow, 'name')) errors.push(`Missing data.grows[${index}].name`);
            if (!hasString(grow, 'startDate')) errors.push(`Missing data.grows[${index}].startDate`);
            if (!hasString(grow, 'currentPhase')) errors.push(`Missing data.grows[${index}].currentPhase`);
            if (!hasArray(grow, 'phaseHistory')) errors.push(`Missing or invalid data.grows[${index}].phaseHistory`);
            if (!GrowSchema.safeParse(grow).success) errors.push(`Invalid data.grows[${index}] schema`);
        });

        validateRecords(dataSection.plants, 'data.plants', (plant, index) => {
            plantRecords.push(plant);
            const plantId = getTrimmedString(plant, 'id');
            const plantGrowId = getTrimmedString(plant, 'growId');
            if (!hasString(plant, 'id')) errors.push(`Missing data.plants[${index}].id`);
            else if (plantId) {
                plantIds.push(plantId);
                validPlantIds.add(plantId);
            }
            if (!hasString(plant, 'growId')) errors.push(`Missing data.plants[${index}].growId`);
            else if (plantGrowId) {
                plantGrowIds.set(plantId ?? `__invalid_${index}`, plantGrowId);
                if (!validGrowIds.has(plantGrowId)) errors.push(`Invalid data.plants[${index}].growId reference`);
            }
            if (!hasString(plant, 'name')) errors.push(`Missing data.plants[${index}].name`);
            if (!PlantDBSchema.safeParse(plant).success) errors.push(`Invalid data.plants[${index}] schema`);
        });

        validateRecords(dataSection.fertilizerMixes, 'data.fertilizerMixes', (mix, index) => {
            const mixId = getTrimmedString(mix, 'id');
            const mixGrowId = getTrimmedString(mix, 'growId');
            if (!hasString(mix, 'id')) errors.push(`Missing data.fertilizerMixes[${index}].id`);
            else if (mixId) {
                mixIds.push(mixId);
                validMixIds.add(mixId);
            }
            if (!hasString(mix, 'growId')) errors.push(`Missing data.fertilizerMixes[${index}].growId`);
            else if (mixGrowId) {
                if (mixId) {
                    mixGrowIds.set(mixId, mixGrowId);
                }
                if (!validGrowIds.has(mixGrowId)) errors.push(`Invalid data.fertilizerMixes[${index}].growId reference`);
            }
            if (!hasString(mix, 'name')) errors.push(`Missing data.fertilizerMixes[${index}].name`);
            if (!hasString(mix, 'waterAmount')) errors.push(`Missing data.fertilizerMixes[${index}].waterAmount`);
            if (!hasArray(mix, 'fertilizers')) errors.push(`Missing or invalid data.fertilizerMixes[${index}].fertilizers`);
            if (!FertilizerMixDBSchema.safeParse(mix).success) errors.push(`Invalid data.fertilizerMixes[${index}] schema`);
        });

        plantRecords.forEach((plant, plantIndex) => {
            if (!Array.isArray(plant.waterings)) return;

            plant.waterings.forEach((watering, wateringIndex) => {
                if (!isObjectRecord(watering) || typeof watering.mixId !== 'string' || watering.mixId.trim() === '') {
                    return;
                }

                const mixId = watering.mixId.trim();
                const plantGrowId = getTrimmedString(plant, 'growId');

                if (!validMixIds.has(mixId)) {
                    errors.push(`Invalid data.plants[${plantIndex}].waterings[${wateringIndex}].mixId reference`);
                    return;
                }

                if (plantGrowId && mixGrowIds.get(mixId) !== plantGrowId) {
                    errors.push(`Invalid data.plants[${plantIndex}].waterings[${wateringIndex}].mixId grow reference`);
                }
            });
        });

        validateRecords(dataSection.strains, 'data.strains', (strain, index) => {
            const strainId = getTrimmedString(strain, 'id');
            if (!hasString(strain, 'id')) errors.push(`Missing data.strains[${index}].id`);
            else if (strainId) strainIds.push(strainId);
            if (!hasString(strain, 'name')) errors.push(`Missing data.strains[${index}].name`);
            if (!hasString(strain, 'breeder')) errors.push(`Missing data.strains[${index}].breeder`);
            if (!hasString(strain, 'genetics')) errors.push(`Missing data.strains[${index}].genetics`);
            if (!StrainSchema.safeParse(strain).success) errors.push(`Invalid data.strains[${index}] schema`);
        });

        validateRecords(dataSection.reminders, 'data.reminders', (reminder, index) => {
            const reminderGrowId = getTrimmedString(reminder, 'growId');
            const reminderPlantId = getTrimmedString(reminder, 'plantId');
            const reminderId = getTrimmedString(reminder, 'id');
            if (!hasString(reminder, 'id')) errors.push(`Missing data.reminders[${index}].id`);
            else if (reminderId) reminderIds.push(reminderId);
            if (!hasString(reminder, 'growId')) errors.push(`Missing data.reminders[${index}].growId`);
            else if (reminderGrowId && !validGrowIds.has(reminderGrowId)) errors.push(`Invalid data.reminders[${index}].growId reference`);
            if (reminderPlantId) {
                if (!validPlantIds.has(reminderPlantId)) {
                    errors.push(`Invalid data.reminders[${index}].plantId reference`);
                } else if (reminderGrowId && plantGrowIds.get(reminderPlantId) !== reminderGrowId) {
                    errors.push(`Invalid data.reminders[${index}].plantId grow reference`);
                }
            }
            if (!hasString(reminder, 'type')) errors.push(`Missing data.reminders[${index}].type`);
            if (!hasString(reminder, 'title')) errors.push(`Missing data.reminders[${index}].title`);
            if (!hasNumber(reminder, 'intervalDays')) errors.push(`Missing or invalid data.reminders[${index}].intervalDays`);
            if (!hasString(reminder, 'nextDue')) errors.push(`Missing data.reminders[${index}].nextDue`);
            if (!hasBoolean(reminder, 'enabled')) errors.push(`Missing or invalid data.reminders[${index}].enabled`);
            if (!hasString(reminder, 'createdAt')) errors.push(`Missing data.reminders[${index}].createdAt`);
            if (!hasString(reminder, 'updatedAt')) errors.push(`Missing data.reminders[${index}].updatedAt`);
            if (!ReminderSchema.safeParse(reminder).success) errors.push(`Invalid data.reminders[${index}] schema`);
        });

        validateOptionalSectionSchema(dataSection, 'genetics', GeneticsSchema);
        validateOptionalSectionSchema(dataSection, 'geneticsOverrides', GeneticsOverrideSchema);
        validateOptionalSectionSchema(dataSection, 'lineageEdges', LineageEdgeSchema);
        validateOptionalSectionSchema(dataSection, 'phenotypes', PhenotypeSchema);
        validateOptionalSectionSchema(dataSection, 'growEvents', GrowEventSchema);
        validateOptionalSectionSchema(dataSection, 'telemetryReadings', TelemetryReadingSchema);
        validateOptionalSectionSchema(dataSection, 'deviceIntegrations', DeviceIntegrationSchema);
        validateOptionalSectionSchema(dataSection, 'devices', DeviceSchema);
        validateOptionalSectionSchema(dataSection, 'sensorBindings', SensorBindingSchema);
        validateOptionalSectionSchema(dataSection, 'fertilizerProducts', FertilizerProductSchema);
        validateOptionalSectionSchema(dataSection, 'mixRecipes', MixRecipeSchema);
        validateOptionalSectionSchema(dataSection, 'preparedBatches', PreparedBatchSchema);
        validateOptionalSectionSchema(dataSection, 'irrigationEvents', IrrigationEventSchema);
        validateOptionalSectionSchema(dataSection, 'photos', PhotoSchema);
        validateOptionalSectionSchema(dataSection, 'recommendations', RecommendationSchema);
        validateOptionalSectionSchema(dataSection, 'powerConsumers', PowerConsumerSchema);
        validateOptionalSectionSchema(dataSection, 'powerCostProfiles', PowerCostProfileSchema);

        addDuplicateErrors(growIds, 'data.grows');
        addDuplicateErrors(plantIds, 'data.plants');
        addDuplicateErrors(mixIds, 'data.fertilizerMixes');
        addDuplicateErrors(strainIds, 'data.strains');
        addDuplicateErrors(reminderIds, 'data.reminders');

        if (isObjectRecord(dataSection.settings) && dataSection.settings.id !== 'global') {
            errors.push('Invalid data.settings.id');
        }
        if (isObjectRecord(dataSection.settings) && !SettingsSchema.safeParse(dataSection.settings).success) {
            errors.push('Invalid data.settings schema');
        }

        if (isObjectRecord(dataSection.notificationSettings)) {
            if (dataSection.notificationSettings.id !== 'notification-settings') {
                errors.push('Invalid data.notificationSettings.id');
            }
            if (!hasBoolean(dataSection.notificationSettings, 'enabled')) {
                errors.push('Missing or invalid data.notificationSettings.enabled');
            }
            if (!hasString(dataSection.notificationSettings, 'permission')) {
                errors.push('Missing data.notificationSettings.permission');
            }
            if (!hasString(dataSection.notificationSettings, 'defaultReminderTime')) {
                errors.push('Missing data.notificationSettings.defaultReminderTime');
            }
            if (!hasBoolean(dataSection.notificationSettings, 'soundEnabled')) {
                errors.push('Missing or invalid data.notificationSettings.soundEnabled');
            }
            if (!NotificationSettingsSchema.safeParse(dataSection.notificationSettings).success) {
                errors.push('Invalid data.notificationSettings schema');
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Imports data into the database with conflict resolution
 */
export async function importData(
    exportData: ExportData,
    strategy: ConflictStrategy,
    progressCallback?: (progress: number, message: string) => void
): Promise<ImportResult> {
    const result: ImportResult = {
        success: true,
        imported: {
            grows: 0,
            plants: 0,
            fertilizerMixes: 0,
            settings: false,
            strains: 0,
            reminders: 0,
            notificationSettings: false,
            genetics: 0,
            geneticsOverrides: 0,
            lineageEdges: 0,
            phenotypes: 0,
            growEvents: 0,
            telemetryReadings: 0,
            deviceIntegrations: 0,
            devices: 0,
            sensorBindings: 0,
            fertilizerProducts: 0,
            mixRecipes: 0,
            preparedBatches: 0,
            irrigationEvents: 0,
            photos: 0,
            recommendations: 0,
            powerConsumers: 0,
            powerCostProfiles: 0
        },
        skipped: { grows: 0, plants: 0, fertilizerMixes: 0, strains: 0, reminders: 0, productEntities: 0 },
        errors: []
    };

    const validation = validateExportSchema(exportData);
    if (!validation.valid) {
        return {
            ...result,
            success: false,
            errors: validation.errors
        };
    }

    try {
        const { data } = normalizeExportDataForImport(exportData);
        const strains = data.strains ?? [];
        const reminders = data.reminders ?? [];
        const productImportSections = [
            { key: 'genetics' as const, label: 'genetics', table: db.genetics, records: data.genetics ?? [] },
            { key: 'geneticsOverrides' as const, label: 'genetics override', table: db.geneticsOverrides, records: data.geneticsOverrides ?? [] },
            { key: 'lineageEdges' as const, label: 'lineage edge', table: db.lineageEdges, records: data.lineageEdges ?? [] },
            { key: 'phenotypes' as const, label: 'phenotype', table: db.phenotypes, records: data.phenotypes ?? [] },
            { key: 'growEvents' as const, label: 'grow event', table: db.growEvents, records: data.growEvents ?? [] },
            { key: 'telemetryReadings' as const, label: 'telemetry reading', table: db.telemetryReadings, records: data.telemetryReadings ?? [] },
            { key: 'deviceIntegrations' as const, label: 'device integration', table: db.deviceIntegrations, records: data.deviceIntegrations ?? [] },
            { key: 'devices' as const, label: 'device', table: db.devices, records: data.devices ?? [] },
            { key: 'sensorBindings' as const, label: 'sensor binding', table: db.sensorBindings, records: data.sensorBindings ?? [] },
            { key: 'fertilizerProducts' as const, label: 'fertilizer product', table: db.fertilizerProducts, records: data.fertilizerProducts ?? [] },
            { key: 'mixRecipes' as const, label: 'mix recipe', table: db.mixRecipes, records: data.mixRecipes ?? [] },
            { key: 'preparedBatches' as const, label: 'prepared batch', table: db.preparedBatches, records: data.preparedBatches ?? [] },
            { key: 'irrigationEvents' as const, label: 'irrigation event', table: db.irrigationEvents, records: data.irrigationEvents ?? [] },
            { key: 'photos' as const, label: 'photo', table: db.photos, records: data.photos ?? [] },
            { key: 'recommendations' as const, label: 'recommendation', table: db.recommendations, records: data.recommendations ?? [] },
            { key: 'powerConsumers' as const, label: 'power consumer', table: db.powerConsumers, records: data.powerConsumers ?? [] },
            { key: 'powerCostProfiles' as const, label: 'power cost profile', table: db.powerCostProfiles, records: data.powerCostProfiles ?? [] },
        ];
        const totalItems =
            data.grows.length +
            data.plants.length +
            data.fertilizerMixes.length +
            strains.length +
            reminders.length +
            productImportSections.reduce((sum, section) => sum + section.records.length, 0) +
            (data.settings ? 1 : 0) +
            (data.notificationSettings ? 1 : 0);
        let processedItems = 0;

        const updateProgress = (message: string) => {
            processedItems++;
            progressCallback?.(totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 100, message);
        };

        // Use transaction for atomic operations
        await db.transaction('rw', [
            db.grows,
            db.plants,
            db.fertilizerMixes,
            db.settings,
            db.strains,
            db.reminders,
            db.notificationSettings,
            db.genetics,
            db.geneticsOverrides,
            db.lineageEdges,
            db.phenotypes,
            db.growEvents,
            db.telemetryReadings,
            db.deviceIntegrations,
            db.devices,
            db.sensorBindings,
            db.fertilizerProducts,
            db.mixRecipes,
            db.preparedBatches,
            db.irrigationEvents,
            db.photos,
            db.recommendations,
            db.powerConsumers,
            db.powerCostProfiles
        ], async () => {
            // Handle based on strategy
            if (strategy === 'replace') {
                // Clear all existing data first
                progressCallback?.(5, 'Clearing existing data...');
                await Promise.all([
                    db.grows.clear(),
                    db.plants.clear(),
                    db.fertilizerMixes.clear(),
                    db.settings.clear(),
                    db.strains.clear(),
                    db.reminders.clear(),
                    db.notificationSettings.clear(),
                    db.genetics.clear(),
                    db.geneticsOverrides.clear(),
                    db.lineageEdges.clear(),
                    db.phenotypes.clear(),
                    db.growEvents.clear(),
                    db.telemetryReadings.clear(),
                    db.deviceIntegrations.clear(),
                    db.devices.clear(),
                    db.sensorBindings.clear(),
                    db.fertilizerProducts.clear(),
                    db.mixRecipes.clear(),
                    db.preparedBatches.clear(),
                    db.irrigationEvents.clear(),
                    db.photos.clear(),
                    db.recommendations.clear(),
                    db.powerConsumers.clear(),
                    db.powerCostProfiles.clear()
                ]);
            }

            // Import grows
            progressCallback?.(10, 'Importing grows...');
            for (const grow of data.grows) {
                const exists = await db.grows.get(grow.id);
                if (exists) {
                    if (strategy === 'skip') {
                        result.skipped.grows++;
                    } else {
                        // merge or replace - update existing
                        await db.grows.put(grow);
                        result.imported.grows++;
                    }
                } else {
                    await db.grows.put(grow);
                    result.imported.grows++;
                }
                updateProgress(`Imported grow: ${grow.name}`);
            }

            // Import plants
            progressCallback?.(40, 'Importing plants...');
            for (const plant of data.plants) {
                const exists = await db.plants.get(plant.id);
                if (exists) {
                    if (strategy === 'skip') {
                        result.skipped.plants++;
                    } else {
                        await db.plants.put(plant);
                        result.imported.plants++;
                    }
                } else {
                    await db.plants.put(plant);
                    result.imported.plants++;
                }
                updateProgress(`Imported plant: ${plant.name}`);
            }

            // Import fertilizer mixes
            progressCallback?.(70, 'Importing fertilizer mixes...');
            for (const mix of data.fertilizerMixes) {
                const exists = await db.fertilizerMixes.get(mix.id);
                if (exists) {
                    if (strategy === 'skip') {
                        result.skipped.fertilizerMixes++;
                    } else {
                        await db.fertilizerMixes.put(mix);
                        result.imported.fertilizerMixes++;
                    }
                } else {
                    await db.fertilizerMixes.put(mix);
                    result.imported.fertilizerMixes++;
                }
                updateProgress(`Imported mix: ${mix.name}`);
            }

            // Import settings
            if (data.settings) {
                const importSettings = normalizeImportSettings(data.settings);
                progressCallback?.(90, 'Importing settings...');
                if (strategy === 'skip') {
                    const existingSettings = await db.settings.get('global');
                    if (!existingSettings) {
                        await db.settings.put(importSettings);
                        result.imported.settings = true;
                    }
                } else {
                    // For merge, we combine settings
                    if (strategy === 'merge') {
                        const existingSettings = await db.settings.get('global');
                        if (existingSettings) {
                            const normalizedExistingSettings = normalizeImportSettings(existingSettings);
                            const mergedSettings = {
                                ...normalizedExistingSettings,
                                ...importSettings,
                                id: 'global',
                                // Merge sensors arrays
                                sensors: [
                                    ...(normalizedExistingSettings.sensors || []),
                                    ...(importSettings.sensors || []).filter(
                                        newSensor => !(normalizedExistingSettings.sensors || []).some(s => s.id === newSensor.id)
                                    )
                                ]
                            };
                            await db.settings.put(mergedSettings);
                        } else {
                            await db.settings.put(importSettings);
                        }
                    } else {
                        await db.settings.put(importSettings);
                    }
                    result.imported.settings = true;
                }
                updateProgress('Imported settings');
            }

            // Import strains
            progressCallback?.(92, 'Importing strains...');
            for (const strain of strains) {
                const exists = await db.strains.get(strain.id);
                if (exists) {
                    if (strategy === 'skip') {
                        result.skipped.strains++;
                    } else {
                        await db.strains.put(strain);
                        result.imported.strains++;
                    }
                } else {
                    await db.strains.put(strain);
                    result.imported.strains++;
                }
                updateProgress(`Imported strain: ${strain.name}`);
            }

            // Import reminders
            progressCallback?.(95, 'Importing reminders...');
            for (const reminder of reminders) {
                const exists = await db.reminders.get(reminder.id);
                if (exists) {
                    if (strategy === 'skip') {
                        result.skipped.reminders++;
                    } else {
                        await db.reminders.put(reminder);
                        result.imported.reminders++;
                    }
                } else {
                    await db.reminders.put(reminder);
                    result.imported.reminders++;
                }
                updateProgress(`Imported reminder: ${reminder.title}`);
            }

            // Import notification settings
            if (data.notificationSettings) {
                progressCallback?.(98, 'Importing notification settings...');
                if (strategy === 'skip') {
                    const existingNotificationSettings = await db.notificationSettings.get('notification-settings');
                    if (!existingNotificationSettings) {
                        await db.notificationSettings.put(data.notificationSettings);
                        result.imported.notificationSettings = true;
                    }
                } else {
                    await db.notificationSettings.put({
                        ...data.notificationSettings,
                        id: 'notification-settings'
                    });
                    result.imported.notificationSettings = true;
                }
                updateProgress('Imported notification settings');
            }

            for (const section of productImportSections) {
                if (section.records.length === 0) continue;

                progressCallback?.(99, `Importing ${section.label}s...`);
                for (const record of section.records) {
                    const exists = await section.table.get(record.id);
                    if (exists && strategy === 'skip') {
                        result.skipped.productEntities++;
                    } else {
                        await section.table.put(record as never);
                        result.imported[section.key]++;
                    }
                    updateProgress(`Imported ${section.label}: ${record.id}`);
                }
            }
        });

        progressCallback?.(100, 'Import complete!');
    } catch (error) {
        result.success = false;
        result.errors.push(error instanceof Error ? error.message : 'Unknown error during import');
    }

    return result;
}

/**
 * Reads a file and returns its content as string
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Detects if a file is encrypted based on extension or content
 */
export function detectFileType(filename: string, content: string): 'encrypted' | 'plain' | 'unknown' {
    const normalizedFilename = filename.toLowerCase();

    if (normalizedFilename.endsWith(ENCRYPTED_EXTENSION)) {
        return 'encrypted';
    }
    if (normalizedFilename.endsWith(PLAIN_EXTENSION)) {
        // Could still be encrypted content with wrong extension
        if (isEncryptedFormat(content)) {
            return 'encrypted';
        }
        return 'plain';
    }
    // Unknown extension, check content
    if (isEncryptedFormat(content)) {
        return 'encrypted';
    }
    try {
        JSON.parse(content);
        return 'plain';
    } catch {
        return 'unknown';
    }
}

/**
 * Gets summary statistics from export data
 */
export function getExportSummary(data: ExportData): {
    grows: number;
    plants: number;
    fertilizerMixes: number;
    strains: number;
    reminders: number;
    hasSettings: boolean;
    hasNotificationSettings: boolean;
    exportDate: string;
    version: string;
} {
    return {
        grows: data.data.grows.length,
        plants: data.data.plants.length,
        fertilizerMixes: data.data.fertilizerMixes.length,
        strains: data.data.strains?.length ?? 0,
        reminders: data.data.reminders?.length ?? 0,
        hasSettings: data.data.settings != null,
        hasNotificationSettings: data.data.notificationSettings != null,
        exportDate: data.metadata.exportedAt,
        version: data.metadata.version
    };
}
