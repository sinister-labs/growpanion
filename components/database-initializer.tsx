"use client";

import { useEffect, useState } from 'react';
import { populateDBWithDemoDataIfEmpty } from '@/lib/db';
import { Loader2 } from 'lucide-react';

interface DatabaseInitializerProps {
    children: React.ReactNode;
}

export function DatabaseInitializer({ children }: DatabaseInitializerProps) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initDatabase = async () => {
            try {
                await populateDBWithDemoDataIfEmpty();
                setIsInitialized(true);
            } catch (err) {
                console.error('Error initializing database:', err);
                setError(err instanceof Error ? err.message : 'Unknown error initializing database');
            } finally {
                setLoading(false);
            }
        };

        initDatabase();
    }, []);

    if (error) {
        return (
            <div className="bg-red-900/30 text-red-300 p-4 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-2">Database Error</h2>
                <p>{error}</p>
            </div>
        );
    }

    if (!isInitialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black bg-opacity-90">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
                    <p className="text-white text-lg">Datenbank wird initialisiert...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
} 