"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { populateDBWithDemoDataIfEmpty } from '@/lib/db';

interface DatabaseInitializerProps {
    children: React.ReactNode;
}

export function DatabaseInitializer({ children }: DatabaseInitializerProps) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [dbInitComplete, setDbInitComplete] = useState(false);

    useEffect(() => {
        const isTauri = typeof window !== 'undefined' && 'window' in globalThis && !!(window as any).__TAURI__;

        const interval = setInterval(() => {
            setLoadingProgress((prev) => {
                const increment = dbInitComplete ? 5 : Math.random() * 7;
                const maxValue = dbInitComplete ? 100 : 85;
                const next = prev + increment;
                return next > maxValue ? maxValue : next;
            });
        }, 200);

        const initDatabase = async () => {
            try {
                if (isTauri && sessionStorage.getItem('dbInitialized') !== 'true') {
                    sessionStorage.setItem('dbInitialized', 'true');

                    setTimeout(() => {
                        setDbInitComplete(true);
                    }, 1500);
                    return;
                }

                await populateDBWithDemoDataIfEmpty();

                setTimeout(() => {
                    setDbInitComplete(true);
                }, 1200);
            } catch (err) {
                console.error('Error initializing database:', err);
                setError(err instanceof Error ? err.message : 'Unknown error initializing database');
                setLoading(false);
            }
        };

        initDatabase();

        return () => clearInterval(interval);
    }, [dbInitComplete]);

    useEffect(() => {
        if (loadingProgress >= 100) {
            setTimeout(() => {
                setIsInitialized(true);
                setLoading(false);
            }, 300);
        }
    }, [loadingProgress]);

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
            <AnimatePresence>
                <motion.div
                    className="flex min-h-screen items-center justify-center bg-black bg-opacity-95"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="flex flex-col items-center">
                        <div className="relative mb-8">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{
                                    scale: [0.9, 1.05, 1],
                                    opacity: 1
                                }}
                                transition={{
                                    duration: 1.2,
                                    ease: "easeOut"
                                }}
                                className="relative z-10"
                            >
                                <Image
                                    src="/logo-light.svg"
                                    alt="GrowPanion Logo"
                                    width={200}
                                    height={60}
                                    className="w-48 sm:w-64"
                                    priority
                                />
                            </motion.div>

                            <motion.div
                                className="absolute inset-0 rounded-full bg-green-500/20 blur-xl z-0"
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.4, 0.7, 0.4]
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 2,
                                    ease: "easeInOut"
                                }}
                            />
                        </div>

                        <div className="w-48 sm:w-64 h-1.5 bg-gray-800 rounded-full mb-4 overflow-hidden">
                            <motion.div
                                className="h-full bg-green-500 rounded-full"
                                initial={{ width: "5%" }}
                                animate={{ width: `${loadingProgress}%` }}
                                transition={{ type: "spring", damping: 10 }}
                            />
                        </div>

                        <motion.p
                            className="text-white text-lg"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            Initializing database...
                        </motion.p>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return <>{children}</>;
} 