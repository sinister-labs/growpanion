"use client";

import { useState } from "react";
import { useGrows } from "@/hooks/useGrows";
import { Grow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, List, PlusCircle, Loader2 } from "lucide-react";
import { CustomDropdown, DropdownOption } from "@/components/ui/custom-dropdown";

export function GrowSelector() {
    const {
        grows,
        activeGrowId,
        isLoading,
        error,
        addGrow,
        updateGrow,
        removeGrow,
        setActiveGrow
    } = useGrows();

    const [isNewGrowDialogOpen, setIsNewGrowDialogOpen] = useState(false);
    const [newGrow, setNewGrow] = useState<Partial<Grow>>({
        name: "",
        startDate: new Date().toISOString().split("T")[0],
        currentPhase: "Seedling",
        phaseHistory: [
            { phase: "Seedling", startDate: new Date().toISOString() }
        ]
    });

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
        if (!newGrow.name || !newGrow.startDate || !newGrow.currentPhase) {
            return;
        }

        try {
            await addGrow(newGrow as Omit<Grow, "id">);
            setIsNewGrowDialogOpen(false);
            setNewGrow({
                name: "",
                startDate: new Date().toISOString().split("T")[0],
                currentPhase: "Seedling",
                phaseHistory: [
                    { phase: "Seedling", startDate: new Date().toISOString() }
                ]
            });
        } catch (error) {
            console.error("Fehler beim Erstellen des Grows:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/30 text-red-300 p-4 rounded-md">
                Fehler beim Laden der Grows: {error.message}
            </div>
        );
    }

    const activeGrow = grows.find(grow => grow.id === activeGrowId);

    // Phasen-Optionen für das Dropdown
    const phaseOptions: DropdownOption[] = [
        { id: "Seedling", label: "Keimling" },
        { id: "Vegetative", label: "Vegetativ" },
        { id: "Flowering", label: "Blüte" },
        { id: "Flushing", label: "Spülen" },
        { id: "Drying", label: "Trocknen" },
        { id: "Curing", label: "Aushärten" }
    ];

    // Grow-Optionen für das Dropdown
    const growOptions: DropdownOption[] = grows.map(grow => ({
        id: grow.id,
        label: grow.name,
        description: `Phase: ${grow.currentPhase} | Start: ${new Date(grow.startDate).toLocaleDateString()}`
    }));

    return (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-green-400">Meine Grows</h3>
                <Dialog open={isNewGrowDialogOpen} onOpenChange={setIsNewGrowDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="border-green-600 text-green-500 hover:bg-green-900/20 hover:text-green-400"
                            size="sm"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Neuer Grow
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-700 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-green-400">Neuen Grow erstellen</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid w-full gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={newGrow.name || ""}
                                    onChange={handleGrowChange}
                                    placeholder="z.B. Sommer Grow 2023"
                                    className="bg-gray-700 border-gray-600"
                                />
                            </div>
                            <div className="grid w-full gap-2">
                                <Label htmlFor="startDate">Startdatum</Label>
                                <div className="relative">
                                    <Input
                                        id="startDate"
                                        name="startDate"
                                        type="date"
                                        value={newGrow.startDate || ""}
                                        onChange={handleGrowChange}
                                        className="bg-gray-700 border-gray-600"
                                    />
                                    <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="grid w-full gap-2">
                                <Label htmlFor="phase">Aktuelle Phase</Label>
                                <CustomDropdown
                                    options={phaseOptions}
                                    value={newGrow.currentPhase || "Seedling"}
                                    onChange={handlePhaseChange}
                                    width="w-full"
                                    buttonClassName="bg-gray-700 border-gray-600"
                                />
                            </div>
                            <div className="pt-4">
                                <Button
                                    onClick={handleCreateGrow}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    Grow erstellen
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {grows.length === 0 ? (
                <div className="bg-gray-900 p-6 rounded-lg text-center text-gray-400">
                    <List className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p className="mb-4">Noch keine Grows vorhanden</p>
                    <Button
                        onClick={() => setIsNewGrowDialogOpen(true)}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Grow erstellen
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                        <Label htmlFor="activeGrow" className="text-white">Aktiver Grow</Label>
                        <CustomDropdown
                            options={growOptions}
                            value={activeGrowId || ""}
                            onChange={setActiveGrow}
                            placeholder="Wähle einen Grow aus"
                            width="w-full"
                            buttonClassName="bg-gray-700 border-gray-600"
                        />
                    </div>

                    {activeGrow && (
                        <div className="mt-4 bg-gray-900/60 rounded-lg p-3 text-sm">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium text-green-400">{activeGrow.name}</h4>
                                <div className="text-xs text-gray-400">
                                    Start: {new Date(activeGrow.startDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="bg-green-600/30 text-green-400 rounded px-2 py-1 text-xs">
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