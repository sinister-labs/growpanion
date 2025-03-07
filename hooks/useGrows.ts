import { useState, useEffect, useCallback } from 'react';
import {
    Grow,
    getAllGrows,
    saveGrow,
    deleteGrow,
    generateId,
    populateDBWithDemoDataIfEmpty
} from '@/lib/db';

export function useGrows() {
    const [grows, setGrows] = useState<Grow[]>([]);
    const [activeGrowId, setActiveGrowId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Hilfsfunktion um zu prüfen, ob ein Grow aktiv (nicht abgeschlossen) ist
    const isGrowActive = useCallback((grow: Grow) => {
        return grow.currentPhase !== "Done";
    }, []);

    // Laden aller Grows aus der Datenbank
    const loadGrows = useCallback(async () => {
        setIsLoading(true);
        try {
            await populateDBWithDemoDataIfEmpty();
            const loadedGrows = await getAllGrows();
            setGrows(loadedGrows);

            // Wenn keine aktive Grow gesetzt ist, aber aktive Grows vorhanden sind, 
            // setze die erste aktive Grow als aktiv
            if (!activeGrowId) {
                const activeGrows = loadedGrows.filter(isGrowActive);
                if (activeGrows.length > 0) {
                    setActiveGrowId(activeGrows[0].id);
                } else if (loadedGrows.length > 0) {
                    // Fallback, wenn es keine aktiven Grows gibt
                    setActiveGrowId(loadedGrows[0].id);
                }
            } else {
                // Wenn der aktuell aktive Grow jetzt "Done" ist,
                // wähle einen anderen aktiven Grow, falls vorhanden
                const currentActiveGrow = loadedGrows.find(g => g.id === activeGrowId);
                if (currentActiveGrow && !isGrowActive(currentActiveGrow)) {
                    const activeGrows = loadedGrows.filter(isGrowActive);
                    if (activeGrows.length > 0) {
                        setActiveGrowId(activeGrows[0].id);
                    }
                }
            }

            setError(null);
        } catch (err) {
            console.error('Error loading grows:', err);
            setError(err instanceof Error ? err : new Error('Unknown error loading grows'));
        } finally {
            setIsLoading(false);
        }
    }, [activeGrowId, isGrowActive]);

    // Hinzufügen eines neuen Grows
    const addGrow = useCallback(async (growData: Omit<Grow, 'id'>) => {
        try {
            const newGrow: Grow = {
                ...growData,
                id: generateId(),
            };

            await saveGrow(newGrow);
            setGrows(prev => [...prev, newGrow]);

            // Setze den neuen Grow als aktiv
            setActiveGrowId(newGrow.id);

            return newGrow;
        } catch (err) {
            console.error('Error adding grow:', err);
            throw err;
        }
    }, []);

    // Aktualisieren eines vorhandenen Grows
    const updateGrow = useCallback(async (updatedGrow: Grow) => {
        try {
            await saveGrow(updatedGrow);
            setGrows(prev =>
                prev.map(grow => grow.id === updatedGrow.id ? updatedGrow : grow)
            );

            // Wenn ein Grow auf "Done" gesetzt wird und es der aktive Grow ist,
            // wähle einen anderen aktiven Grow
            if (updatedGrow.id === activeGrowId && updatedGrow.currentPhase === "Done") {
                const otherActiveGrows = grows.filter(g => g.id !== updatedGrow.id && isGrowActive(g));
                if (otherActiveGrows.length > 0) {
                    setActiveGrowId(otherActiveGrows[0].id);
                }
            }

            return updatedGrow;
        } catch (err) {
            console.error('Error updating grow:', err);
            throw err;
        }
    }, [activeGrowId, grows, isGrowActive]);

    // Löschen eines Grows
    const removeGrow = useCallback(async (id: string) => {
        try {
            await deleteGrow(id);
            setGrows(prev => prev.filter(grow => grow.id !== id));

            // Wenn der aktive Grow gelöscht wurde, setze einen anderen aktiven Grow als aktiv
            if (activeGrowId === id) {
                const activeGrows = grows.filter(g => g.id !== id && isGrowActive(g));
                if (activeGrows.length > 0) {
                    setActiveGrowId(activeGrows[0].id);
                } else {
                    const remainingGrows = grows.filter(grow => grow.id !== id);
                    if (remainingGrows.length > 0) {
                        setActiveGrowId(remainingGrows[0].id);
                    } else {
                        setActiveGrowId(null);
                    }
                }
            }
        } catch (err) {
            console.error('Error deleting grow:', err);
            throw err;
        }
    }, [activeGrowId, grows, isGrowActive]);

    // Aktiven Grow setzen
    const setActiveGrow = useCallback((id: string) => {
        setActiveGrowId(id);
    }, []);

    // Aktiven Grow abrufen
    const getActiveGrow = useCallback(() => {
        return grows.find(grow => grow.id === activeGrowId) || null;
    }, [grows, activeGrowId]);

    // Holt nur aktive Grows (nicht "Done")
    const getActiveGrows = useCallback(() => {
        return grows.filter(isGrowActive);
    }, [grows, isGrowActive]);

    // Initialisieren der Daten beim ersten Laden
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