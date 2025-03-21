"use client"

import { useCallback } from 'react';

export function useDateUtils() {
    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }, []);

    const getDaysSince = useCallback((dateString: string) => {
        const startDate = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }, []);

    const toISODateString = useCallback((date: Date = new Date()) => {
        return date.toISOString().split('T')[0];
    }, []);

    const todayISOString = useCallback(() => {
        return toISODateString(new Date());
    }, [toISODateString]);

    return {
        formatDate,
        getDaysSince,
        toISODateString,
        todayISOString
    };
} 