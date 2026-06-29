"use client";

import { useEffect, useRef, useState } from "react";
import { useGrows } from "@/hooks/useGrows";
import { Grow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, List, PlusCircle, Loader2 } from "lucide-react";
import { CustomDropdown, DropdownOption } from "@/components/ui/custom-dropdown";
import { formatDate } from "@/lib/utils";
import { createInitialPhaseHistory, GROWTH_PHASES } from "@/lib/growth-utils";

export function GrowSelector() {
    const {
        grows,
        activeGrowId,
        isLoading,
        error,
        addGrow,
        setActiveGrow
    } = useGrows();

    const [isNewGrowDialogOpen, setIsNewGrowDialogOpen] = useState(false);
    const [newGrow, setNewGrow] = useState<Partial<Grow>>({
        name: "",
        startDate: new Date().toISOString().split("T")[0],
        currentPhase: "Seedling",
        phaseHistory: createInitialPhaseHistory("Seedling", new Date().toISOString().split("T")[0])
    });
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleGrowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewGrow({
            ...newGrow,
            [e.target.name]: e.target.value
        });
    };

    const handlePhaseChange = (phase: string) => {
        setNewGrow({
            ...newGrow,
            currentPhase: phase
        });
    };

    const handleCreateGrow = async () => {
        const name = newGrow.name?.trim();
        const startDate = newGrow.startDate;

        if (!name || !startDate || !newGrow.currentPhase) {
            setCreateError("Name, start date, and phase are required.");
            return;
        }

        const parsedStartDate = new Date(startDate);
        if (!Number.isFinite(parsedStartDate.getTime())) {
            setCreateError("Start date is invalid.");
            return;
        }

        setIsCreating(true);
        setCreateError(null);
        try {
            const growToCreate = {
                ...newGrow,
                name,
                startDate,
                phaseHistory: createInitialPhaseHistory(newGrow.currentPhase, startDate),
            } as Omit<Grow, "id">;

            await addGrow(growToCreate);
            if (!isMounted.current) {
                return;
            }

            setIsNewGrowDialogOpen(false);
            setNewGrow({
                name: "",
                startDate: new Date().toISOString().split("T")[0],
                currentPhase: "Seedling",
                phaseHistory: createInitialPhaseHistory("Seedling", new Date().toISOString().split("T")[0])
            });
        } catch (error) {
            console.error("Error creating grow:", error);
            if (isMounted.current) {
                setCreateError(error instanceof Error ? error.message : "Could not create grow.");
            }
        } finally {
            if (isMounted.current) {
                setIsCreating(false);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                Error loading grows: {error.message}
            </div>
        );
    }

    const activeGrow = grows.find(grow => grow.id === activeGrowId);

    const phaseOptions: DropdownOption[] = GROWTH_PHASES.filter(phase => phase !== "Done").map(phase => ({
        id: phase,
        label: phase
    }));

    const growOptions: DropdownOption[] = grows.map(grow => ({
        id: grow.id,
        label: grow.name,
        description: `Phase: ${grow.currentPhase} | Start: ${formatDate(grow.startDate)}`
    }));

    return (
        <div className="rounded-[1.1rem] border border-white/10 bg-[#090f14]/92 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_52px_rgba(0,0,0,0.25)]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-foreground">My Grows</h3>
                <Dialog
                    open={isNewGrowDialogOpen}
                    onOpenChange={(open) => {
                        if (isCreating) return;
                        setIsNewGrowDialogOpen(open);
                        if (open) {
                            setCreateError(null);
                        }
                    }}
                >
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="border-primary/45 text-primary hover:bg-primary/10"
                            size="sm"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Grow
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Grow</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {createError && (
                                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                    {createError}
                                </div>
                            )}
                            <div className="grid w-full gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={newGrow.name || ""}
                                    onChange={handleGrowChange}
                                    placeholder="e.g. Summer Grow 2023"
                                    disabled={isCreating}
                                />
                            </div>
                            <div className="grid w-full gap-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <div className="relative">
                                    <Input
                                        id="startDate"
                                        name="startDate"
                                        type="date"
                                        value={newGrow.startDate || ""}
                                        onChange={handleGrowChange}
                                        disabled={isCreating}
                                    />
                                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>
                            <div className="grid w-full gap-2">
                                <Label htmlFor="phase">Current Phase</Label>
                                <CustomDropdown
                                    options={phaseOptions}
                                    value={newGrow.currentPhase || "Seedling"}
                                    onChange={handlePhaseChange}
                                    width="w-full"
                                    buttonClassName="mt-1"
                                    disabled={isCreating}
                                />
                            </div>
                            <div className="pt-4">
                                <Button
                                    onClick={handleCreateGrow}
                                    disabled={isCreating}
                                    className="w-full"
                                >
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Grow
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {grows.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-white/[0.12] bg-white/[0.035] p-6 text-center text-muted-foreground">
                    <List className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="mb-4">No grows available yet</p>
                    <Button
                        onClick={() => setIsNewGrowDialogOpen(true)}
                        className=""
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Grow
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                        <Label htmlFor="activeGrow">Active Grow</Label>
                        <CustomDropdown
                            options={growOptions}
                            value={activeGrowId || ""}
                            onChange={setActiveGrow}
                        placeholder="Select a grow…"
                            width="w-full"
                            buttonClassName="mt-1"
                        />
                    </div>

                    {activeGrow && (
                        <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 text-sm">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium text-foreground">{activeGrow.name}</h4>
                                <div className="text-xs text-muted-foreground">
                                    Start: {formatDate(activeGrow.startDate)}
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                                    {activeGrow.currentPhase}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
