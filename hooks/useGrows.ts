import { useState, useEffect, useCallback } from 'react';
import {
    Grow,
    getAllGrows,
    saveGrow,
    deleteGrow,
    generateId,
    populateDBWithDemoDataIfEmpty
} from '@/lib/db';
import { isGrowActive as isGrowActiveUtil } from '@/lib/growth-utils';

/**
 * Hook for managing grows (growing cycles)
 * Provides functions for loading, adding, updating and deleting grows
 * as well as managing the active grow
 */
export function useGrows() {
    const [grows, setGrows] = useState<Grow[]>([]);
    const [activeGrowId, setActiveGrowId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    /**
     * Checks if a grow is active (not completed)
     * Using the utility function for consistency
     */
    const isGrowActive = useCallback((grow: Grow) => {
        return isGrowActiveUtil(grow);
    }, []);

    /**
     * Automatically selects an active grow
     * Prefers active grows, then uses inactive as fallback
     */
    const selectActiveGrow = useCallback((loadedGrows: Grow[]) => {
        const activeGrows = loadedGrows.filter(isGrowActive);
        
        if (activeGrows.length > 0) {
            return activeGrows[0].id;
        } else if (loadedGrows.length > 0) {
            return loadedGrows[0].id;
        }
        
        return null;
    }, [isGrowActive]);

    /**
     * Loads all grows from the database and manages the active grow
     */
    const loadGrows = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            await populateDBWithDemoDataIfEmpty();
            const loadedGrows = await getAllGrows();
            setGrows(loadedGrows);

            // Active grow management
            if (!activeGrowId) {
                // If no active grow is set, select one
                setActiveGrowId(selectActiveGrow(loadedGrows));
            } else {
                // Check if the current active grow is still active
                const currentActiveGrow = loadedGrows.find(g => g.id === activeGrowId);
                if (currentActiveGrow && !isGrowActive(currentActiveGrow)) {
                    // If not, select a new active grow
                    const activeGrows = loadedGrows.filter(isGrowActive);
                    if (activeGrows.length > 0) {
                        setActiveGrowId(activeGrows[0].id);
                    }
                }
            }
        } catch (err) {
            console.error('Error loading grows:', err);
            setError(err instanceof Error ? err : new Error('Unknown error loading grows'));
        } finally {
            setIsLoading(false);
        }
    }, [activeGrowId, isGrowActive, selectActiveGrow]);

    /**
     * Adds a new grow
     */
    const addGrow = useCallback(async (growData: Omit<Grow, 'id'>) => {
        try {
            const newGrow: Grow = {
                ...growData,
                id: generateId(),
            };

            await saveGrow(newGrow);
            setGrows(prev => [...prev, newGrow]);

            // Set the new grow as active
            setActiveGrowId(newGrow.id);

            return newGrow;
        } catch (err) {
            console.error('Error adding grow:', err);
            throw err instanceof Error ? err : new Error('Failed to add grow');
        }
    }, []);

    /**
     * Updates an existing grow
     */
    const updateGrow = useCallback(async (updatedGrow: Grow) => {
        try {
            await saveGrow(updatedGrow);
            setGrows(prev =>
                prev.map(grow => grow.id === updatedGrow.id ? updatedGrow : grow)
            );

            // If a grow is set to "Done" and it is the active grow,
            // select another active grow
            if (updatedGrow.id === activeGrowId && !isGrowActive(updatedGrow)) {
                const otherActiveGrows = grows.filter(g => g.id !== updatedGrow.id && isGrowActive(g));
                if (otherActiveGrows.length > 0) {
                    setActiveGrowId(otherActiveGrows[0].id);
                }
            }

            return updatedGrow;
        } catch (err) {
            console.error('Error updating grow:', err);
            throw err instanceof Error ? err : new Error('Failed to update grow');
        }
    }, [activeGrowId, grows, isGrowActive]);

    /**
     * Deletes a grow
     */
    const removeGrow = useCallback(async (id: string) => {
        try {
            await deleteGrow(id);
            setGrows(prev => prev.filter(grow => grow.id !== id));

            // If the active grow is deleted, select a new one
            if (activeGrowId === id) {
                // First filter out the deleted grow
                const remainingGrows = grows.filter(grow => grow.id !== id);
                
                // Prefer active grows
                const activeGrows = remainingGrows.filter(isGrowActive);
                
                if (activeGrows.length > 0) {
                    setActiveGrowId(activeGrows[0].id);
                } else if (remainingGrows.length > 0) {
                    setActiveGrowId(remainingGrows[0].id);
                } else {
                    setActiveGrowId(null);
                }
            }
        } catch (err) {
            console.error('Error deleting grow:', err);
            throw err instanceof Error ? err : new Error('Failed to delete grow');
        }
    }, [activeGrowId, grows, isGrowActive]);

    /**
     * Sets the active grow
     */
    const setActiveGrow = useCallback((id: string) => {
        setActiveGrowId(id);
    }, []);

    /**
     * Returns the active grow or null if none is set
     */
    const getActiveGrow = useCallback(() => {
        return grows.find(grow => grow.id === activeGrowId) || null;
    }, [grows, activeGrowId]);

    /**
     * Returns only active grows (without "Done" status)
     */
    const getActiveGrows = useCallback(() => {
        return grows.filter(isGrowActive);
    }, [grows, isGrowActive]);

    // Initialize data on first load
    useEffect(() => {
        loadGrows();
    }, [loadGrows]);

    return {
        grows,
        activeGrowId,
        isLoading,
        error,
        loadGrows,
        addGrow,
        updateGrow,
        removeGrow,
        setActiveGrow,
        getActiveGrow,
        getActiveGrows,
        isGrowActive
    };
} 