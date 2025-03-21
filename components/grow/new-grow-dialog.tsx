"use client"

import { useState } from "react"
import { Grow } from "@/lib/db"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CustomDropdown } from "@/components/ui/custom-dropdown"
import { phaseOptions } from "@/components/ui/phase-badge"
import { useDateUtils } from "@/hooks/useDateUtils"
import { Calendar } from "lucide-react"

interface NewGrowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateGrow: (growData: Omit<Grow, "id">) => Promise<Grow | void>;
}

export function NewGrowDialog({ isOpen, onClose, onCreateGrow }: NewGrowDialogProps) {
    const { todayISOString } = useDateUtils();

    const [newGrow, setNewGrow] = useState<Partial<Grow>>({
        name: "",
        startDate: todayISOString(),
        currentPhase: "Seedling",
        phaseHistory: [
            { phase: "Seedling", startDate: new Date().toISOString() }
        ]
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

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

        setIsSubmitting(true);

        try {
            await onCreateGrow(newGrow as Omit<Grow, "id">);
            resetForm();
            onClose();
        } catch (error) {
            console.error("Error creating grow:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setNewGrow({
            name: "",
            startDate: todayISOString(),
            currentPhase: "Seedling",
            phaseHistory: [
                { phase: "Seedling", startDate: new Date().toISOString() }
            ]
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                onClose();
                resetForm();
            }
        }}>
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-green-400">Create new Grow</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid w-full gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            name="name"
                            value={newGrow.name}
                            onChange={handleGrowChange}
                            placeholder="e.g. Summer Grow 2023"
                        />
                    </div>
                    <div className="grid w-full gap-2">
                        <Label htmlFor="startDate">Start date</Label>
                        <div className="relative">
                            <Input
                                id="startDate"
                                name="startDate"
                                type="date"
                                value={newGrow.startDate}
                                onChange={handleGrowChange}
                            />
                            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="grid w-full gap-2">
                        <Label htmlFor="phase">Current phase</Label>
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
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creating..." : "Create Grow"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 