import { useState, useEffect, useCallback } from 'react';
import { Plant } from '@/components/plant-modal/types';
import {
    PlantDB,
    getPlantsForGrow,
    savePlant,
    deletePlant,
    generateId
} from '@/lib/db';

export function usePlants(growId: string | null) {
    const [plants, setPlants] = useState<PlantDB[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const loadPlants = useCallback(async () => {
        if (!growId) {
            setPlants([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const loadedPlants = await getPlantsForGrow(growId);
            setPlants(loadedPlants);
            setError(null);
        } catch (err) {
            console.error('Error loading plants:', err);
            setError(err instanceof Error ? err : new Error('Unknown error loading plants'));
        } finally {
            setIsLoading(false);
        }
    }, [growId]);

    const addPlant = useCallback(async (plantData: Omit<Plant, 'id'>) => {
        if (!growId) {
            throw new Error('No active grow selected');
        }

        try {
            const newPlant: PlantDB = {
                ...plantData,
                id: generateId(),
                growId
            };

            await savePlant(newPlant);
            setPlants(prev => [...prev, newPlant]);
            return newPlant;
        } catch (err) {
            console.error('Error adding plant:', err);
            throw err;
        }
    }, [growId]);

    const updatePlant = useCallback(async (updatedPlant: Plant) => {
        if (!growId) {
            throw new Error('No active grow selected');
        }

        try {
            const plantWithGrowId: PlantDB = {
                ...updatedPlant,
                growId
            };

            await savePlant(plantWithGrowId);
            setPlants(prev =>
                prev.map(plant => plant.id === updatedPlant.id ? plantWithGrowId : plant)
            );
            return plantWithGrowId;
        } catch (err) {
            console.error('Error updating plant:', err);
            throw err;
        }
    }, [growId]);

    const removePlant = useCallback(async (id: string) => {
        try {
            await deletePlant(id);
            setPlants(prev => prev.filter(plant => plant.id !== id));
        } catch (err) {
            console.error('Error deleting plant:', err);
            throw err;
        }
    }, []);

    useEffect(() => {
        loadPlants();
    }, [loadPlants, growId]);

    return {
        plants,
        isLoading,
        error,
        loadPlants,
        addPlant,
        updatePlant,
        removePlant
    };
} 