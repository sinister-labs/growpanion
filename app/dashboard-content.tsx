"use client"

import { useEffect } from "react"
import GrowEnvironment from "@/components/grow-environment"
import { PlantList } from "@/components/plant-list"
import { GrowInfo } from "@/components/grow-info"
import { useGrows } from "@/hooks/useGrows"
import { usePlants } from "@/hooks/usePlants"
import { Loader2, ArrowRight, TreesIcon as Plant, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { CustomDropdown } from "@/components/ui/custom-dropdown"
import { useToast } from "@/hooks/use-toast"
import { useRouting } from "@/hooks/useRouting"

export default function DashboardContent() {
    const { grows, activeGrowId, getActiveGrow, getActiveGrows, isLoading, error, updateGrow, setActiveGrow } = useGrows();
    const { plants } = usePlants(activeGrowId);
    const activeGrow = getActiveGrow();
    const activeGrows = getActiveGrows();
    const { toast } = useToast();
    const { navigateTo } = useRouting();

    // Callback für Phasenänderungen im aktiven Grow
    const handlePhaseChange = (newPhase: string) => {
        if (!activeGrow) return;

        const updatedGrow = {
            ...activeGrow,
            currentPhase: newPhase,
            phaseHistory: [...activeGrow.phaseHistory, { phase: newPhase, startDate: new Date().toISOString() }],
        };

        updateGrow(updatedGrow)
            .then(() => {
                toast({
                    variant: "success",
                    title: "Phase changed",
                    description: `The phase was successfully changed to "${newPhase}".`,
                });

                // Wenn die Phase auf "Done" gesetzt wurde, informiere den Benutzer
                if (newPhase === "Done") {
                    toast({
                        variant: "default",
                        title: "Grow completed",
                        description: `The Grow "${updatedGrow.name}" was marked as completed and will no longer appear in the dashboard.`,
                    });
                }
            })
            .catch((error) => {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "The phase could not be changed: " + error.message,
                });
            });
    };

    useEffect(() => {
        if (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        }
    }, [error, toast]);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="bg-red-900/30 text-red-300 p-8 rounded-lg max-w-md">
                    <h2 className="text-xl font-semibold mb-4">Error</h2>
                    <p>{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 mt-6">
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
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
                        </div>
                    </div>
                    {activeGrows.length > 0 ? (
                        <div className="mt-2">
                            <CustomDropdown
                                options={activeGrows.map((grow) => ({
                                    id: grow.id,
                                    label: grow.name,
                                    description: `${grow.currentPhase} • ${Math.floor((new Date().getTime() - new Date(grow.startDate).getTime()) / (1000 * 60 * 60 * 24))} Tage`
                                }))}
                                value={activeGrowId || ""}
                                onChange={(value) => {
                                    setActiveGrow(value);
                                    toast({
                                        title: "Grow switched",
                                        description: `Active Grow: ${grows.find(g => g.id === value)?.name}`,
                                    });
                                }}
                                placeholder="Grow select"
                                renderFooter={() => (
                                    <div onClick={() => navigateTo('grows')}>
                                        <DropdownMenuItem className="py-2 cursor-pointer text-gray-300 hover:text-white">
                                            Manage all Grows
                                            <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                                        </DropdownMenuItem>
                                    </div>
                                )}
                            />
                        </div>
                    ) : (
                        <div className="mt-2 text-sm text-gray-400">
                            No active grows available. Create a new grow or check completed grows.
                        </div>
                    )}
                </div>
                <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => navigateTo('grows')}
                >
                    Manage Grows
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

            <GrowEnvironment grow={activeGrow || undefined} onPhaseChange={handlePhaseChange} />

            {activeGrow ? (
                <>
                    <GrowInfo
                        grow={{
                            ...activeGrow,
                            plants: plants
                        }}
                        onPhaseChange={handlePhaseChange}
                    />

                    <PlantList growId={activeGrowId} />
                </>
            ) : (
                <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 text-center">
                    <Plant className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-xl font-semibold mb-2 text-white">No plants yet</h3>
                    <p className="text-gray-400 mb-4">
                        {grows.length === 0
                            ? "Create a grow first to add plants."
                            : "All your grows are completed. Create a new grow to get started."}
                    </p>
                    <Button
                        onClick={() => navigateTo('grows')}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {grows.length > 0 ? "Create new grow" : "Select grow"}
                    </Button>
                </div>
            )}
        </div>
    );
} 