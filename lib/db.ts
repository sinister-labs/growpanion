import Dexie, { Table } from 'dexie';
import { Plant, FertilizerMix } from '@/components/plant-modal/types';
import { v4 as uuidv4 } from 'uuid';

// Grow-Schnittstelle für die Datenbank
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

// Erweiterte Plant-Schnittstelle für die Datenbank
export interface PlantDB extends Plant {
    growId: string;
}

// Erweiterte FertilizerMix-Schnittstelle für die Datenbank
export interface FertilizerMixDB extends FertilizerMix {
    growId: string;
    description?: string;
}

// Settings-Schnittstelle für die Datenbank
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

// Definition der GrowPanion-Datenbank
export class GrowPanionDB extends Dexie {
    grows!: Table<Grow, string>;
    plants!: Table<PlantDB, string>;
    fertilizerMixes!: Table<FertilizerMixDB, string>;
    settings!: Table<Settings, string>;

    constructor() {
        super('GrowPanionDB');

        // Schema-Definition
        this.version(1).stores({
            grows: 'id, name, currentPhase',
            plants: 'id, name, genetic, type, propagationMethod, growId',
            fertilizerMixes: 'id, name, growId'
        });

        // Füge settings zur Datenbank hinzu (Version 2)
        this.version(2).stores({
            grows: 'id, name, currentPhase',
            plants: 'id, name, genetic, type, propagationMethod, growId',
            fertilizerMixes: 'id, name, growId',
            settings: 'id'
        });

        // Update für TuyaSensors (Version 3)
        this.version(3).stores({
            grows: 'id, name, currentPhase',
            plants: 'id, name, genetic, type, propagationMethod, growId',
            fertilizerMixes: 'id, name, growId',
            settings: 'id'
        });
    }
}

// Datenbank-Instanz
export const db = new GrowPanionDB();

// Hilfsfunktionen für Grows
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

// Hilfsfunktionen für Plants
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

// Hilfsfunktionen für FertilizerMixes
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

// Hilfsfunktionen für Settings
export async function getSettings(): Promise<Settings | undefined> {
    // Es gibt immer nur einen Settings-Eintrag mit der ID 'global'
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

// Hilfsfunktion zur Generierung einer eindeutigen ID
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Demo-Daten, falls die Datenbank leer ist
export async function populateDBWithDemoDataIfEmpty(): Promise<void> {
    // Keine Demo-Daten mehr erstellen
    return;
} 