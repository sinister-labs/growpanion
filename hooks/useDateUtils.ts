"use client"

import { useCallback } from 'react';

export function useDateUtils() {
    const formatDate = useCallback((dateString: string) => {
        const date = new Date(dateString);
        if (!Number.isFinite(date.getTime())) {
            return 'Unknown date';
        }

        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }, []);

    const getDaysSince = useCallback((dateString: string) => {
        const startDate = new Date(dateString);
        if (Number.isNaN(startDate.getTime())) {
            return 0;
        }

        const diffTime = Date.now() - startDate.getTime();
        if (diffTime <= 0) {
            return 0;
        }

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
