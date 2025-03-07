import { useState, useEffect, useCallback } from 'react';
import { FertilizerMix } from '@/components/plant-modal/types';
import {
    FertilizerMixDB,
    getFertilizerMixesForGrow,
    saveFertilizerMix,
    deleteFertilizerMix,
    generateId
} from '@/lib/db';

export function useFertilizerMixes(growId: string | null) {
    const [mixes, setMixes] = useState<FertilizerMixDB[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Laden aller Mischungen für einen bestimmten Grow
    const loadMixes = useCallback(async () => {
        if (!growId) {
            setMixes([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const loadedMixes = await getFertilizerMixesForGrow(growId);
            setMixes(loadedMixes);
            setError(null);
        } catch (err) {
            console.error('Error loading fertilizer mixes:', err);
            setError(err instanceof Error ? err : new Error('Unknown error loading fertilizer mixes'));
        } finally {
            setIsLoading(false);
        }
    }, [growId]);

    // Hinzufügen einer neuen Mischung
    const addMix = useCallback(async (mixData: Omit<FertilizerMix, 'id'> & { description?: string }) => {
        if (!growId) {
            throw new Error('Kein aktiver Grow ausgewählt');
        }

        try {
            const newMix: FertilizerMixDB = {
                ...mixData,
                id: generateId(),
                growId
            };

            await saveFertilizerMix(newMix);
            setMixes(prev => [...prev, newMix]);
            return newMix;
        } catch (err) {
            console.error('Error adding fertilizer mix:', err);
            throw err;
        }
    }, [growId]);

    // Aktualisieren einer vorhandenen Mischung
    const updateMix = useCallback(async (updatedMix: FertilizerMixDB) => {
        if (!growId) {
            throw new Error('Kein aktiver Grow ausgewählt');
        }

        try {
            // Stelle sicher, dass die Mischung dem aktuellen Grow zugeordnet ist
            const mixWithGrowId: FertilizerMixDB = {
                ...updatedMix,
                growId
            };

            await saveFertilizerMix(mixWithGrowId);
            setMixes(prev =>
                prev.map(mix => mix.id === updatedMix.id ? mixWithGrowId : mix)
            );
            return mixWithGrowId;
        } catch (err) {
            console.error('Error updating fertilizer mix:', err);
            throw err;
        }
    }, [growId]);

    // Löschen einer Mischung
    const removeMix = useCallback(async (id: string) => {
        try {
            await deleteFertilizerMix(id);
            setMixes(prev => prev.filter(mix => mix.id !== id));
        } catch (err) {
            console.error('Error deleting fertilizer mix:', err);
            throw err;
        }
    }, []);

    // Neu laden der Mischungen, wenn sich der growId ändert
    useEffect(() => {
        loadMixes();
    }, [loadMixes, growId]);

    return {
        mixes,
        isLoading,
        error,
        loadMixes,
        addMix,
        updateMix,
        removeMix
    };
} 