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
    }
}

export const db = new GrowPanionDB();

export async function getAllGrows(): Promise<Grow[]> {
    return await db.grows.toArray();
}

export async function getGrowById(id: string): Promise<Grow | undefined> {
    return await db.grows.get(id);
}

export async function saveGrow(grow: Grow): Promise<string> {
    return await db.grows.put(grow);
}

export async function deleteGrow(id: string): Promise<void> {
    // Also deletes all associated plants and mixes
    await db.transaction('rw', [db.grows, db.plants, db.fertilizerMixes], async () => {
        await db.plants.where({ growId: id }).delete();
        await db.fertilizerMixes.where({ growId: id }).delete();
        await db.grows.delete(id);
    });
}

export async function getAllPlants(): Promise<PlantDB[]> {
    return await db.plants.toArray();
}

export async function getPlantsForGrow(growId: string): Promise<PlantDB[]> {
    return await db.plants.where({ growId }).toArray();
}

export async function getPlantById(id: string): Promise<PlantDB | undefined> {
    return await db.plants.get(id);
}

export async function savePlant(plant: PlantDB): Promise<string> {
    return await db.plants.put(plant);
}

export async function deletePlant(id: string): Promise<void> {
    await db.plants.delete(id);
}

export async function getAllFertilizerMixes(): Promise<FertilizerMixDB[]> {
    return await db.fertilizerMixes.toArray();
}

export async function getFertilizerMixesForGrow(growId: string): Promise<FertilizerMixDB[]> {
    return await db.fertilizerMixes.where({ growId }).toArray();
}

export async function getFertilizerMixById(id: string): Promise<FertilizerMixDB | undefined> {
    return await db.fertilizerMixes.get(id);
}

export async function saveFertilizerMix(mix: FertilizerMixDB): Promise<string> {
    return await db.fertilizerMixes.put(mix);
}

export async function deleteFertilizerMix(id: string): Promise<void> {
    await db.fertilizerMixes.delete(id);
}

export async function getSettings(): Promise<Settings | undefined> {
    return await db.settings.get('global');
}

export async function saveSettings(settings: Partial<Settings>): Promise<string> {
    const currentSettings = await getSettings() || { id: 'global' };
    const updatedSettings: Settings = {
        ...currentSettings,
        ...settings,
        lastUpdated: new Date().toISOString()
    };
    return await db.settings.put(updatedSettings);
}

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export async function populateDBWithDemoDataIfEmpty(): Promise<void> {
    return;
} 