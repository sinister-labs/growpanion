"use client"

import { useEffect } from "react"
import ProductOSDashboard from "@/components/product-os-dashboard"
import { useGrows } from "@/hooks/useGrows"
import { usePlants } from "@/hooks/usePlants"
import { Loader2, ArrowRight, Sprout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { CustomDropdown } from "@/components/ui/custom-dropdown"
import { useToast } from "@/hooks/use-toast"
import { useRouting } from "@/hooks/useRouting"
import { calculateDuration } from "@/lib/utils"
import { getDashboardActiveGrow } from "@/lib/growth-utils"

export default function DashboardContent() {
    const { grows, activeGrowId, getActiveGrows, isLoading, error, setActiveGrow } = useGrows();
    const activeGrows = getActiveGrows();
    const activeGrow = getDashboardActiveGrow(grows, activeGrowId);
    const dashboardGrowId = activeGrow?.id ?? null;
    const { plants } = usePlants(dashboardGrowId);
    const { toast } = useToast();
    const { navigateTo } = useRouting();

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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="max-w-md rounded-3xl border border-destructive/35 bg-destructive/10 p-8 text-destructive">
                    <h2 className="mb-4 text-xl font-semibold">Error</h2>
                    <p>{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 space-y-3">
            {activeGrows.length > 1 && (
                <div className="infotainment-panel flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-col">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                            <Sprout className="h-4 w-4 text-primary" />
                            Active grow selector
                        </div>
                        <div className="mt-2 max-w-md">
                            <CustomDropdown
                                options={activeGrows.map((grow) => ({
                                    id: grow.id,
                                    label: grow.name,
                                    description: `${grow.currentPhase} • ${calculateDuration(grow.startDate)} Tage`
                                }))}
                                value={dashboardGrowId || ""}
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
                                        <DropdownMenuItem className="cursor-pointer rounded-2xl py-2 text-foreground">
                                            Manage all Grows
                                            <ArrowRight className="ml-auto h-3.5 w-3.5" />
                                        </DropdownMenuItem>
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                    <Button
                        className="w-full gap-2 sm:w-auto"
                        onClick={() => navigateTo('grows')}
                    >
                        Manage Grows
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <ProductOSDashboard
                grow={activeGrow}
                plants={plants}
                onOpenGrows={() => navigateTo('grows')}
                onOpenGrow={() => activeGrow ? navigateTo('growDetail', { id: activeGrow.id }) : navigateTo('grows')}
                onOpenTools={() => navigateTo('tools')}
                showHeader={false}
            />
        </div>
    );
}
