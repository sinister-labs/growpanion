"use client";

import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouting } from '@/hooks/useRouting';
import { DLICalculator } from '@/components/dli-calculator';
import HarvestCalculator from '@/components/harvest-calculator/HarvestCalculator';

export default function ToolsPage() {
    const { navigateTo } = useRouting();

    return (
        <div className="flex min-h-screen flex-col items-center space-y-8">
            <div className="w-full">
                <div className="space-y-8 mt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Button
                                    variant="link"
                                    className="text-gray-400 hover:text-white p-0 h-auto flex items-center gap-1"
                                    onClick={() => navigateTo('dashboard')}
                                >
                                    <Home className="h-4 w-4" />
                                    <span>Dashboard</span>
                                </Button>
                                <span className="text-gray-600">/</span>
                                <h1 className="font-semibold text-white">Tools</h1>
                            </div>
                            <p className="text-gray-400">Calculators and utilities for your grow</p>
                        </div>
                    </div>

                    {/* DLI Calculator */}
                    <DLICalculator />

                    {/* Harvest Yield Calculator */}
                    <HarvestCalculator />
                </div>
            </div>
        </div>
    );
}
