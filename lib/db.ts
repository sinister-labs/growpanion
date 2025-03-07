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

// Definition der GrowPanion-Datenbank
export class GrowPanionDB extends Dexie {
    grows!: Table<Grow, string>;
    plants!: Table<PlantDB, string>;
    fertilizerMixes!: Table<FertilizerMixDB, string>;

    constructor() {
        super('GrowPanionDB');

        // Schema-Definition
        this.version(1).stores({
            grows: 'id, name, currentPhase',
            plants: 'id, name, genetic, type, propagationMethod, growId',
            fertilizerMixes: 'id, name, growId'
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

// Hilfsfunktion zur Generierung einer eindeutigen ID
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Demo-Daten, falls die Datenbank leer ist
export async function populateDBWithDemoDataIfEmpty(): Promise<void> {
    const growCount = await db.grows.count();

    if (growCount === 0) {
        // Demo-Grow erstellen
        const demoGrow: Grow = {
            id: 'grow1',
            name: 'Erstes Indoor Growing',
            startDate: '2023-02-01',
            currentPhase: 'Vegetative',
            phaseHistory: [
                { phase: 'Seedling', startDate: '2023-02-01' },
                { phase: 'Vegetative', startDate: '2023-02-15' },
            ],
            description: 'Mein erstes Indoor-Growing in 2023',
            environmentSettings: {
                temperature: 23,
                humidity: 60,
                lightSchedule: '18/6'
            }
        };

        // Grow speichern
        await db.grows.put(demoGrow);

        // Fertilizer mixes for demo grow
        const demoMixes: FertilizerMixDB[] = [
            {
                id: 'mix1',
                growId: 'grow1',
                name: 'Vegetative Growth',
                waterAmount: '1000',
                description: 'Standard mix for growth phase',
                fertilizers: [
                    { name: 'Grow', amount: '3' },
                    { name: 'Micro', amount: '2' }
                ]
            },
            {
                id: 'mix2',
                growId: 'grow1',
                name: 'Bloom',
                waterAmount: '1000',
                description: 'Standard-Mix für die Blütephase',
                fertilizers: [
                    { name: 'Bloom', amount: '4' },
                    { name: 'Micro', amount: '2' }
                ]
            }
        ];

        // Plants for the demo grow
        const demoPlants: PlantDB[] = [
            {
                id: 'plant1',
                growId: 'grow1',
                name: 'Northern Lights',
                genetic: 'Indica',
                manufacturer: 'Sensi Seeds',
                type: 'feminized',
                propagationMethod: 'seed',
                waterings: [
                    { date: '2023-02-15', amount: '500' },
                    { date: '2023-02-18', amount: '600', mixId: 'mix1' }
                ],
                hstRecords: [
                    { date: '2023-02-20', method: 'Topping' }
                ],
                substrateRecords: [
                    { date: '2023-02-10', substrateType: 'Coco/Perlite 70/30', potSize: '3' }
                ]
            },
            {
                id: 'plant2',
                growId: 'grow1',
                name: 'Amnesia Haze',
                genetic: 'Sativa dominant',
                manufacturer: 'Royal Queen Seeds',
                type: 'autoflowering',
                propagationMethod: 'seed',
                waterings: [
                    { date: '2023-02-16', amount: '400' }
                ]
            }
        ];

        // Daten speichern
        for (const mix of demoMixes) {
            await db.fertilizerMixes.put(mix);
        }

        for (const plant of demoPlants) {
            await db.plants.put(plant);
        }
    }
}

// Create demo grow
export async function createDefaultGrow(): Promise<Grow> {
    const grow: Grow = {
        id: uuidv4(),
        name: "Demo Grow",
        description: "This is an auto-generated demo grow to help you get started.",
        plantCount: 0,
        environment: "indoor",
        startDate: new Date().toISOString(),
        estimatedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        currentPhase: "Vegetative",
        isActive: true,
        isCompleted: false,
        phaseHistory: [
            { phase: "Seedling", startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
            { phase: "Vegetative", startDate: new Date().toISOString() }
        ]
    };

    const db = await getDb();
    await db.put('grows', grow);

    // Create plants for demo grow
    const plants: Plant[] = [
        {
            id: uuidv4(),
            growId: grow.id,
            name: "Demo Plant 1",
            strain: "Demo Strain",
            type: "photoperiod",
            propagation: "seed",
            startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            estimatedEndDate: new Date(Date.now() + 76 * 24 * 60 * 60 * 1000).toISOString(),
            currentPhase: "Vegetative",
            phaseHistory: [
                { phase: "Seedling", startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
                { phase: "Vegetative", startDate: new Date().toISOString() }
            ],
            waterings: [
                {
                    id: uuidv4(),
                    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    amount: "500ml",
                    ph: "6.5",
                    ec: "1.2",
                    notes: "First watering"
                },
                {
                    id: uuidv4(),
                    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    amount: "750ml",
                    ph: "6.3",
                    ec: "1.5",
                    notes: "Plant is growing well"
                }
            ]
        }
    ];

    await Promise.all(plants.map(plant => db.put('plants', plant)));

    return grow;
} 