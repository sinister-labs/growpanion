"use client"

import { useState, useEffect } from "react"
import { useGrows } from "@/hooks/useGrows"
import { usePlants } from "@/hooks/usePlants"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlantList } from "@/components/plant-list"
import { FertilizerMixesManager } from "@/components/fertilizer-mixes"
import { GrowInfo } from "@/components/grow-info"
import { Loader2, Home, ArrowLeft, ChevronLeft } from "lucide-react"
import { getGrowById } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { Grow } from "@/lib/db"
import { useRouting } from "@/hooks/useRouting"

interface GrowDetailClientProps {
    growId: string;
}

export default function GrowDetailClient(props: GrowDetailClientProps) {
    const { growId } = props;
    const { toast } = useToast();
    const { navigateTo } = useRouting();

    const [activeTab, setActiveTab] = useState<string>('plants');
    const { grows, updateGrow } = useGrows();
    const { plants, isLoading: plantsLoading } = usePlants(growId);
    const [grow, setGrow] = useState<Grow | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadGrow = async () => {
            try {
                const grow = await getGrowById(growId);
                if (grow) {
                    setGrow(grow);
                }
            } catch (err) {
                console.error("Error loading grow:", err);
                setError(err instanceof Error ? err : new Error("Unknown error"));
            } finally {
                setIsLoading(false);
            }
        };

        loadGrow();
    }, [growId]);

    const handlePhaseChange = (newPhase: string) => {
        if (!grow) return;

        const updatedGrow = {
            ...grow,
            currentPhase: newPhase,
            phaseHistory: [...grow.phaseHistory, { phase: newPhase, startDate: new Date().toISOString() }],
        };

        updateGrow(updatedGrow)
            .then(() => {
                setGrow(updatedGrow);
                toast({
                    variant: "success",
                    title: "Phase changed",
                    description: `The phase was successfully changed to "${newPhase}".`,
                });
            })
            .catch((error) => {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message,
                });
            });
    };

    if (isLoading || plantsLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/30 text-red-300 p-8 rounded-lg max-w-md">
                <h2 className="text-xl font-semibold mb-4">Error</h2>
                <p>{error.message}</p>
                <div className="mt-4">
                    <Button
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-900/20"
                        onClick={() => navigateTo('grows')}
                    >
                        Back to overview
                    </Button>
                </div>
            </div>
        );
    }

    if (!grow) {
        return (
            <div className="bg-red-900/30 text-red-300 p-8 rounded-lg max-w-md">
                <h2 className="text-xl font-semibold mb-4">Grow Not Found</h2>
                <p>The requested grow could not be found.</p>
                <div className="mt-4">
                    <Button
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-900/20"
                        onClick={() => navigateTo('grows')}
                    >
                        Back to overview
                    </Button>
                </div>
            </div>
        );
    }

    const safeGrow: Grow = grow;

    return (
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
                        <Button
                            variant="link"
                            className="text-gray-400 hover:text-white p-0 h-auto"
                            onClick={() => navigateTo('grows')}
                        >
                            Grows
                        </Button>
                        <span className="text-gray-600">/</span>
                        <h1 className="font-semibold text-white">{safeGrow.name}</h1>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                        <span className="bg-green-600/30 text-green-400 rounded px-2 py-1 text-xs">
                            {safeGrow.currentPhase}
                        </span>
                        <span className="text-gray-400 text-sm">
                            Duration: {Math.floor((new Date().getTime() - new Date(safeGrow.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days
                        </span>
                    </div>
                </div>

                <Button
                    variant="outline"
                    className="border-gray-700 text-gray-400 hover:text-white rounded-full"
                    onClick={() => navigateTo('grows')}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to overview
                </Button>
            </div>

            <GrowInfo
                grow={{
                    id: safeGrow.id,
                    name: safeGrow.name,
                    startDate: safeGrow.startDate,
                    currentPhase: safeGrow.currentPhase,
                    phaseHistory: safeGrow.phaseHistory,
                    plants: plants
                }}
                onPhaseChange={handlePhaseChange}
            />

            <div className="relative">
                <Tabs defaultValue="plants" className="w-full">
                    <TabsList className="grid grid-cols-2 bg-gray-800 rounded-full">
                        <TabsTrigger
                            value="plants"
                            className="data-[state=active]:bg-green-500 shadow-3xl shadow-green-500 data-[state=active]:text-gray-800 rounded-full"
                        >
                            Plants
                        </TabsTrigger>
                        <TabsTrigger
                            value="mixes"
                            className="data-[state=active]:bg-green-500 shadow-3xl shadow-green-500 data-[state=active]:text-gray-800 rounded-full"
                        >
                            Fertilizer mixes
                        </TabsTrigger>
                    </TabsList>

                    <div className="relative min-h-[500px] mt-4">
                        <TabsContent
                            value="plants"
                            className="absolute top-0 left-0 w-full transition-opacity duration-300 opacity-100"
                        >
                            <PlantList growId={growId} />
                        </TabsContent>
                        <TabsContent
                            value="mixes"
                            className="absolute top-0 left-0 w-full transition-opacity duration-300 opacity-100"
                        >
                            <FertilizerMixesManager growId={growId} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
} 