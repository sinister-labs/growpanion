"use client"

import { useState, useCallback, createContext, useContext, useEffect } from 'react';

export type AppView = 'dashboard' | 'grows' | 'growDetail' | 'settings' | 'statistics' | 'tools';

const APP_VIEWS: AppView[] = ['dashboard', 'grows', 'growDetail', 'settings', 'statistics', 'tools'];

interface RoutingContextType {
    currentView: AppView;
    params: Record<string, string>;
    navigateTo: (view: AppView, params?: Record<string, string>) => void;
}

const STORAGE_KEY = 'growpanion-routing';

export const RoutingContext = createContext<RoutingContextType | undefined>(undefined);

const getLocalStorage = (): Storage | null => {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
};

const removeSavedRouteState = () => {
    try {
        getLocalStorage()?.removeItem(STORAGE_KEY);
    } catch {
        // Storage can be unavailable even after the window object exists.
    }
};

export const normalizeRouteParams = (routeParams: unknown): Record<string, string> => {
    if (!routeParams || typeof routeParams !== 'object' || Array.isArray(routeParams)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(routeParams)
            .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
            .map(([key, value]) => [key, value.trim()])
            .filter(([, value]) => value.length > 0)
    );
};

export const isValidSavedRoute = (view: unknown, routeParams: Record<string, string>): view is AppView => {
    if (!APP_VIEWS.includes(view as AppView)) {
        return false;
    }

    return view !== 'growDetail' || Boolean(routeParams.id);
};

export const normalizeRouteState = (
    view: AppView,
    routeParams: Record<string, string> = {}
): { view: AppView; routeParams: Record<string, string> } => {
    const normalizedParams = normalizeRouteParams(routeParams);
    if (!isValidSavedRoute(view, normalizedParams)) {
        return { view: 'dashboard', routeParams: {} };
    }

    return { view, routeParams: normalizedParams };
};

export const getRouteBoundaryKey = (
    view: AppView,
    routeParams: Record<string, string> = {}
): string => {
    const normalizedState = normalizeRouteState(view, routeParams);
    return `${normalizedState.view}:${normalizedState.routeParams.id ?? ''}`;
};

export const parseSavedRouteState = (savedState: string | null): { view: AppView; routeParams: Record<string, string> } | null => {
    if (!savedState) {
        return null;
    }

    let parsedState: unknown;
    try {
        parsedState = JSON.parse(savedState);
    } catch {
        return null;
    }

    if (!parsedState || typeof parsedState !== 'object' || Array.isArray(parsedState)) {
        return null;
    }

    const { view, routeParams } = parsedState as { view?: unknown; routeParams?: unknown };
    const normalizedParams = normalizeRouteParams(routeParams);
    if (!isValidSavedRoute(view, normalizedParams)) {
        return null;
    }

    return { view, routeParams: normalizedParams };
};

export const useRouting = () => {
    const context = useContext(RoutingContext);
    if (!context) {
        throw new Error('useRouting must be used within a RoutingProvider');
    }
    return context;
};

export const useRoutingProvider = () => {
    const [currentView, setCurrentView] = useState<AppView>('dashboard');
    const [params, setParams] = useState<Record<string, string>>({});

    useEffect(() => {
        try {
            const storage = getLocalStorage();
            const restoredState = parseSavedRouteState(storage?.getItem(STORAGE_KEY) ?? null);
            if (restoredState) {
                setCurrentView(restoredState.view);
                setParams(restoredState.routeParams);
            } else {
                removeSavedRouteState();
            }
        } catch (err) {
            console.error('Failed to restore routing state:', err);
            removeSavedRouteState();
        }
    }, []);

    const navigateTo = useCallback((view: AppView, newParams: Record<string, string> = {}) => {
        const { view: nextView, routeParams: nextParams } = normalizeRouteState(view, newParams);

        setCurrentView(nextView);
        setParams(nextParams);

        try {
            getLocalStorage()?.setItem(STORAGE_KEY, JSON.stringify({ view: nextView, routeParams: nextParams }));
        } catch (err) {
            console.error('Failed to save routing state:', err);
        }
    }, []);

    return {
        currentView,
        params,
        navigateTo,
    };
};
