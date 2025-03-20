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

    const addMix = useCallback(async (mixData: Omit<FertilizerMix, 'id'> & { description?: string }) => {
        if (!growId) {
            throw new Error('No active grow selected');
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

    const updateMix = useCallback(async (updatedMix: FertilizerMixDB) => {
        if (!growId) {
            throw new Error('No active grow selected');
        }

        try {
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

    const removeMix = useCallback(async (id: string) => {
        try {
            await deleteFertilizerMix(id);
            setMixes(prev => prev.filter(mix => mix.id !== id));
        } catch (err) {
            console.error('Error deleting fertilizer mix:', err);
            throw err;
        }
    }, []);

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