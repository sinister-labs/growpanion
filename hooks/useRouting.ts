"use client"

import { useState, useCallback, createContext, useContext, useEffect } from 'react';

export type AppView = 'dashboard' | 'grows' | 'growDetail' | 'settings';

interface RoutingContextType {
    currentView: AppView;
    params: Record<string, string>;
    navigateTo: (view: AppView, params?: Record<string, string>) => void;
}

const STORAGE_KEY = 'growpanion-routing';

export const RoutingContext = createContext<RoutingContextType | undefined>(undefined);

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
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                const { view, routeParams } = JSON.parse(savedState);
                setCurrentView(view);
                setParams(routeParams);
            }
        } catch (err) {
            console.error('Failed to restore routing state:', err);
        }
    }, []);

    const navigateTo = useCallback((view: AppView, newParams: Record<string, string> = {}) => {
        setCurrentView(view);
        setParams(newParams);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ view, routeParams: newParams }));
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