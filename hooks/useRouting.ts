"use client"

import { useState, useCallback, createContext, useContext } from 'react';

export type AppView = 'dashboard' | 'grows' | 'growDetail' | 'settings';

interface RoutingContextType {
    currentView: AppView;
    params: Record<string, string>;
    navigateTo: (view: AppView, params?: Record<string, string>) => void;
}

// Erstelle einen Context für das Routing
export const RoutingContext = createContext<RoutingContextType | undefined>(undefined);

// Hook zum Verwalten des Routings
export const useRouting = () => {
    const context = useContext(RoutingContext);
    if (!context) {
        throw new Error('useRouting must be used within a RoutingProvider');
    }
    return context;
};

// Provider-Hook für die Komponente, die den Routing-State verwaltet
export const useRoutingProvider = () => {
    const [currentView, setCurrentView] = useState<AppView>('dashboard');
    const [params, setParams] = useState<Record<string, string>>({});

    const navigateTo = useCallback((view: AppView, newParams: Record<string, string> = {}) => {
        setCurrentView(view);
        setParams(newParams);
    }, []);

    return {
        currentView,
        params,
        navigateTo,
    };
}; 