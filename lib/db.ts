import Dexie, { Table } from 'dexie';
import { Plant, FertilizerMix } from '@/components/plant-modal/types';
import { GrowSchema, SettingsSchema } from '@/lib/validation-schemas';
import { validateOrThrow } from '@/lib/validation-utils';

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
}

export interface FertilizerMixDB extends FertilizerMix {
    growId: string;
    description?: string;
}

export interface Settings {
    id: string;
    tuyaClientId?: string;
    tuyaClientSecret?: string;
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

export class GrowPanionDB extends Dexie {
    grows!: Table<Grow, string>;
    plants!: Table<PlantDB, string>;
    fertilizerMixes!: Table<FertilizerMixDB, string>;
    settings!: Table<Settings, string>;
    strains!: Table<Strain, string>;

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

        // Handle database upgrade events
        this.on('blocked', () => {
            console.warn('Database is blocked - another tab might be using an older version');
        });

        this.on('versionchange', () => {
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
        
        // Also deletes all associated plants and mixes in transaction
        await db.transaction('rw', [db.grows, db.plants, db.fertilizerMixes], async () => {
            await db.plants.where({ growId: id }).delete();
            await db.fertilizerMixes.where({ growId: id }).delete();
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
        // Validate plant data before saving (PlantDB extends Plant with growId)
        if (!plant.id || !plant.growId) {
            throw new Error('Invalid plant data: id and growId are required');
        }
        return await db.plants.put(plant);
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
        
        await db.plants.delete(id);
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
        // Basic validation for fertilizer mix (FertilizerMixDB extends FertilizerMix with growId)
        if (!mix || !mix.id || !mix.growId) {
            throw new Error('Invalid fertilizer mix data: id and growId are required');
        }
        return await db.fertilizerMixes.put(mix);
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
        
        await db.fertilizerMixes.delete(id);
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
            lastUpdated: new Date().toISOString()
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
        if (!strain || !strain.id || !strain.name) {
            throw new Error('Invalid strain data: id and name are required');
        }
        
        const strainToSave: Strain = {
            ...strain,
            updatedAt: new Date().toISOString(),
            createdAt: strain.createdAt || new Date().toISOString(),
        };
        
        return await db.strains.put(strainToSave);
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
        const lowerQuery = query.toLowerCase();
        return allStrains.filter(strain => 
            strain.name.toLowerCase().includes(lowerQuery) ||
            strain.breeder.toLowerCase().includes(lowerQuery) ||
            strain.genetics.toLowerCase().includes(lowerQuery)
        );
    } catch (error) {
        console.error('Failed to search strains:', error);
        throw new Error('Unable to search strains in database');
    }
}

export async function populateDBWithDemoDataIfEmpty(): Promise<void> {
    return;
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