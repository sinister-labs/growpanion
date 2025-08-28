import Dexie, { Table } from 'dexie';
import { Plant, FertilizerMix } from '@/components/plant-modal/types';
import { v4 as uuidv4 } from 'uuid';
import { apiRequest } from '@/lib/apiClient';

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

export class GrowPanionDB extends Dexie {
    grows!: Table<Grow, string>;
    plants!: Table<PlantDB, string>;
    fertilizerMixes!: Table<FertilizerMixDB, string>;
    settings!: Table<Settings, string>;

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
        if (!grow || !grow.id || !grow.name) {
            throw new Error('Invalid grow data: id and name are required');
        }
        return await db.grows.put(grow);
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
        if (!plant || !plant.id || !plant.growId) {
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
        
        return await db.settings.put(updatedSettings);
    } catch (error) {
        console.error('Failed to save settings:', error);
        throw new Error('Unable to save settings to database');
    }
}

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
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