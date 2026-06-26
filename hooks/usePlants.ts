import { useState, useEffect, useCallback, useRef } from 'react';
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
    const loadRequestId = useRef(0);
    const isMounted = useRef(false);

    const loadPlants = useCallback(async () => {
        const requestId = ++loadRequestId.current;

        if (!growId) {
            setPlants([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const loadedPlants = await getPlantsForGrow(growId);
            if (!isMounted.current || requestId !== loadRequestId.current) return;

            setPlants(loadedPlants);
            setError(null);
        } catch (err) {
            if (!isMounted.current || requestId !== loadRequestId.current) return;

            console.error('Error loading plants:', err);
            setError(err instanceof Error ? err : new Error('Unknown error loading plants'));
        } finally {
            if (isMounted.current && requestId === loadRequestId.current) {
                setIsLoading(false);
            }
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
            if (isMounted.current) {
                setPlants(prev => [...prev, newPlant]);
            }
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
            if (isMounted.current) {
                setPlants(prev =>
                    prev.map(plant => plant.id === updatedPlant.id ? plantWithGrowId : plant)
                );
            }
            return plantWithGrowId;
        } catch (err) {
            console.error('Error updating plant:', err);
            throw err;
        }
    }, [growId]);

    const removePlant = useCallback(async (id: string) => {
        try {
            await deletePlant(id);
            if (isMounted.current) {
                setPlants(prev => prev.filter(plant => plant.id !== id));
            }
        } catch (err) {
            console.error('Error deleting plant:', err);
            throw err;
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;
        loadPlants();

        return () => {
            isMounted.current = false;
            loadRequestId.current += 1;
        };
    }, [loadPlants]);

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
