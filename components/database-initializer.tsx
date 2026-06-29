"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { populateDBWithDemoDataIfEmpty } from '@/lib/db';

interface DatabaseInitializerProps {
    children: React.ReactNode;
}

const isDatabaseMarkedInitialized = (): boolean => {
    try {
        return sessionStorage.getItem('dbInitialized') === 'true';
    } catch {
        return false;
    }
};

const markDatabaseInitialized = () => {
    try {
        sessionStorage.setItem('dbInitialized', 'true');
    } catch {
        // Storage can be unavailable in restricted browser contexts; DB init itself still succeeded.
    }
};

export function DatabaseInitializer({ children }: DatabaseInitializerProps) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [dbInitComplete, setDbInitComplete] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setLoadingProgress((prev) => {
                const increment = dbInitComplete ? 5 : Math.random() * 7;
                const maxValue = dbInitComplete ? 100 : 85;
                const next = prev + increment;
                return next > maxValue ? maxValue : next;
            });
        }, 200);

        return () => clearInterval(interval);
    }, [dbInitComplete]);

    useEffect(() => {
        let isMounted = true;
        let completeTimeout: ReturnType<typeof setTimeout> | null = null;
        let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

        const initDatabase = async () => {
            try {
                fallbackTimeout = setTimeout(() => {
                    if (isMounted) {
                        console.warn('Database initialization timed out; continuing with available local data.');
                        markDatabaseInitialized();
                        setDbInitComplete(true);
                    }
                }, 9000);

                if (!isDatabaseMarkedInitialized()) {
                    await populateDBWithDemoDataIfEmpty();
                    markDatabaseInitialized();
                }

                if (!isMounted) {
                    return;
                }

                completeTimeout = setTimeout(() => {
                    if (isMounted) {
                        if (fallbackTimeout) {
                            clearTimeout(fallbackTimeout);
                            fallbackTimeout = null;
                        }
                        setDbInitComplete(true);
                    }
                }, 1200);
            } catch (err) {
                console.error('Error initializing database:', err);
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Unknown error initializing database');
                }
            }
        };

        initDatabase();

        return () => {
            isMounted = false;
            if (completeTimeout) {
                clearTimeout(completeTimeout);
            }
            if (fallbackTimeout) {
                clearTimeout(fallbackTimeout);
            }
        };
    }, []);

    useEffect(() => {
        let initTimeout: ReturnType<typeof setTimeout> | null = null;

        if (loadingProgress >= 100) {
            initTimeout = setTimeout(() => {
                setIsInitialized(true);
            }, 300);
        }

        return () => {
            if (initTimeout) {
                clearTimeout(initTimeout);
            }
        };
    }, [loadingProgress]);

    if (error) {
        return (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-destructive shadow-lg">
                <h2 className="text-xl font-semibold mb-2">Database Error</h2>
                <p>{error}</p>
            </div>
        );
    }

    if (!isInitialized) {
        return (
            <AnimatePresence>
                <motion.div
                    className="flex min-h-screen items-center justify-center bg-background/95"
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
                                className="absolute inset-0 rounded-full bg-primary/20 blur-xl z-0"
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

                        <div className="w-48 sm:w-64 h-1.5 bg-secondary rounded-full mb-4 overflow-hidden">
                            <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: "5%" }}
                                animate={{ width: `${loadingProgress}%` }}
                                transition={{ type: "spring", damping: 10 }}
                            />
                        </div>

                        <motion.p
                            className="text-foreground text-lg"
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
