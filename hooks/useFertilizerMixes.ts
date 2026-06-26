import { useState, useEffect, useCallback, useRef } from 'react';
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
    const loadRequestId = useRef(0);
    const isMounted = useRef(false);

    const loadMixes = useCallback(async () => {
        const requestId = ++loadRequestId.current;

        if (!growId) {
            setMixes([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const loadedMixes = await getFertilizerMixesForGrow(growId);
            if (!isMounted.current || requestId !== loadRequestId.current) return;

            setMixes(loadedMixes);
            setError(null);
        } catch (err) {
            if (!isMounted.current || requestId !== loadRequestId.current) return;

            console.error('Error loading fertilizer mixes:', err);
            setError(err instanceof Error ? err : new Error('Unknown error loading fertilizer mixes'));
        } finally {
            if (isMounted.current && requestId === loadRequestId.current) {
                setIsLoading(false);
            }
        }
    }, [growId]);

    const addMix = useCallback(async (mixData: Omit<FertilizerMix, 'id'>) => {
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
            if (isMounted.current) {
                setMixes(prev => [...prev, newMix]);
            }
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
            if (isMounted.current) {
                setMixes(prev =>
                    prev.map(mix => mix.id === updatedMix.id ? mixWithGrowId : mix)
                );
            }
            return mixWithGrowId;
        } catch (err) {
            console.error('Error updating fertilizer mix:', err);
            throw err;
        }
    }, [growId]);

    const removeMix = useCallback(async (id: string) => {
        try {
            await deleteFertilizerMix(id);
            if (isMounted.current) {
                setMixes(prev => prev.filter(mix => mix.id !== id));
            }
        } catch (err) {
            console.error('Error deleting fertilizer mix:', err);
            throw err;
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;
        loadMixes();

        return () => {
            isMounted.current = false;
            loadRequestId.current += 1;
        };
    }, [loadMixes]);

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
