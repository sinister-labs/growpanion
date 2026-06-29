"use client"

import { useState } from "react"
import { useGrows } from "@/hooks/useGrows"
import { Button } from "@/components/ui/button"
import { CalendarDays, CheckCircle2, ChevronRight, Layers3, Plus, Sprout } from "lucide-react"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { useRouting } from "@/hooks/useRouting"
import { NewGrowDialog } from "@/components/grow/new-grow-dialog"
import { GrowCard } from "@/components/grow/grow-card"

export default function GrowOverview() {
    const {
        grows,
        activeGrowId,
        isLoading,
        error,
        addGrow,
        setActiveGrow,
        isGrowActive
    } = useGrows();

    const { navigateTo } = useRouting();

    const [isNewGrowDialogOpen, setIsNewGrowDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("active");

    // Filter the grows by status
    const activeGrows = grows.filter(isGrowActive);
    const completedGrows = grows.filter(grow => !isGrowActive(grow));

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="max-w-md rounded-3xl border border-destructive/35 bg-destructive/10 p-8 text-destructive">
                    <h2 className="mb-4 text-xl font-semibold">Error</h2>
                    <p>{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <div className="w-full">
                <div className="mt-2 space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-foreground">Grow workspaces</h2>
                            <p className="text-sm text-muted-foreground">
                                {activeGrows.length} active, {completedGrows.length} completed
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsNewGrowDialogOpen(true)}
                            className="self-start sm:self-auto"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            New Grow
                        </Button>
                    </div>

                    <NewGrowDialog
                        isOpen={isNewGrowDialogOpen}
                        onClose={() => setIsNewGrowDialogOpen(false)}
                        onCreateGrow={addGrow}
                    />

                    {grows.length === 0 ? (
                        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                            <div className="infotainment-panel overflow-hidden p-0">
                                <div className="border-b border-white/10 p-4 sm:p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-xl border border-emerald-300/[0.20] bg-emerald-300/[0.12] p-3 text-emerald-200 shadow-[0_0_24px_rgba(52,255,154,0.12)]">
                                            <Layers3 className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="text-2xl font-semibold text-foreground">No grow workspace yet</h2>
                                            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                                                Start one grow first. Plants, diary events, lab telemetry and recommendations attach to that workspace.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
                                    <GrowPrepCard icon={Sprout} label="Create grow" text="Name, date and starting phase." />
                                    <GrowPrepCard icon={CalendarDays} label="Track phase" text="Age and phase stay visible." />
                                    <GrowPrepCard icon={CheckCircle2} label="Add plants" text="Plants feed Home and Stats." />
                                </div>
                            </div>

                            <aside className="infotainment-panel p-4 sm:p-5">
                                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                    <Sprout className="h-4 w-4" />
                                    Next action
                                </div>
                                <h3 className="mt-2 text-xl font-semibold text-foreground">Start a grow</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    This unlocks the dashboard and plant list.
                                </p>
                                <Button
                                    onClick={() => setIsNewGrowDialogOpen(true)}
                                    className="mt-4 h-11 w-full rounded-2xl"
                                >
                                    Create your first grow
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </aside>
                        </section>
                    ) : (
                        <div className="relative">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full max-w-md grid-cols-2">
                                    <TabsTrigger value="active">
                                        Active ({activeGrows.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="completed">
                                        Completed ({completedGrows.length})
                                    </TabsTrigger>
                                </TabsList>

                                <div className="mt-4">
                                    <TabsContent
                                        value="active"
                                        className="w-full"
                                    >
                                        {activeGrows.length === 0 ? (
                                            <div className="infotainment-panel p-6 text-center">
                                                <p className="mb-4 text-lg font-semibold text-foreground">
                                                    No active grows
                                                </p>
                                                <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
                                                    Create a grow workspace to activate the dashboard, plant list and recommendations.
                                                </p>
                                                <Button
                                                    onClick={() => setIsNewGrowDialogOpen(true)}
                                                    className="rounded-2xl"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Create grow
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                                {activeGrows.map(grow => (
                                                    <GrowCard
                                                        key={grow.id}
                                                        grow={grow}
                                                        isActive={grow.id === activeGrowId}
                                                        onSetActive={() => setActiveGrow(grow.id)}
                                                        onClick={() => navigateTo('growDetail', { id: grow.id })}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent
                                        value="completed"
                                        className="w-full"
                                    >
                                        {completedGrows.length === 0 ? (
                                            <div className="infotainment-panel p-6 text-center">
                                                <p className="mb-2 text-lg font-semibold text-foreground">
                                                    No completed grows
                                                </p>
                                                <p className="mb-4 text-sm text-muted-foreground">
                                                    Grows are marked as completed when they reach the &quot;Done&quot; phase.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                                {completedGrows.map(grow => (
                                                    <GrowCard
                                                        key={grow.id}
                                                        grow={grow}
                                                        isActive={false}
                                                        onClick={() => navigateTo('growDetail', { id: grow.id })}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function GrowPrepCard({ icon: Icon, label, text }: { icon: typeof Sprout; label: string; text: string }) {
    return (
        <div className="os-card p-4">
            <Icon className="h-5 w-5 text-primary" />
            <div className="mt-3 text-sm font-semibold text-foreground">{label}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
        </div>
    );
}
