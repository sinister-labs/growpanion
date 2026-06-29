"use client"

import { useRef, useState } from "react"
import { Grow } from "@/lib/db"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CustomDropdown } from "@/components/ui/custom-dropdown"
import { createInitialPhaseHistory, GROWTH_PHASES } from "@/lib/growth-utils"
import { useDateUtils } from "@/hooks/useDateUtils"
import { Calendar, Loader2, Sprout } from "lucide-react"

interface NewGrowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateGrow: (growData: Omit<Grow, "id">) => Promise<Grow | void>;
}

export function NewGrowDialog({ isOpen, onClose, onCreateGrow }: NewGrowDialogProps) {
    const { todayISOString } = useDateUtils();
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [newGrow, setNewGrow] = useState<Partial<Grow>>({
        name: "",
        startDate: todayISOString(),
        currentPhase: "Seedling",
        phaseHistory: createInitialPhaseHistory("Seedling", todayISOString())
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

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

    const handleCreateGrow = async (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        setSubmitted(true);

        if (!newGrow.name?.trim() || !newGrow.startDate || !newGrow.currentPhase) {
            window.setTimeout(() => nameInputRef.current?.focus(), 0);
            return;
        }

        setIsSubmitting(true);

        try {
            const growToCreate = {
                ...newGrow,
                name: newGrow.name.trim(),
                phaseHistory: createInitialPhaseHistory(newGrow.currentPhase, newGrow.startDate),
            } as Omit<Grow, "id">;

            await onCreateGrow(growToCreate);
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
            phaseHistory: createInitialPhaseHistory("Seedling", todayISOString())
        });
        setSubmitted(false);
    };

    const phaseOptions = GROWTH_PHASES.filter(phase => phase !== "Done").map(phase => ({
        id: phase,
        label: phase
    }));

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                onClose();
                resetForm();
            }
        }}>
            <DialogContent className="max-w-xl overflow-hidden p-0">
                <DialogHeader>
                    <div className="border-b border-white/10 bg-white/[0.035] px-6 py-5">
                        <div className="flex items-start gap-3">
                            <div className="rounded-[0.95rem] border border-emerald-300/[0.20] bg-emerald-300/10 p-3 text-emerald-200">
                                <Sprout className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle>Create new Grow</DialogTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Set the workspace name, start date and first phase.
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogHeader>
                <form className="space-y-5 p-6" onSubmit={handleCreateGrow}>
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
                        <div className="grid w-full gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                ref={nameInputRef}
                                id="name"
                                name="name"
                                autoComplete="off"
                                value={newGrow.name}
                                onChange={handleGrowChange}
                                placeholder="e.g. Summer Grow 2026…"
                                aria-invalid={submitted && !newGrow.name?.trim()}
                                aria-describedby="new-grow-name-error"
                            />
                            {submitted && !newGrow.name?.trim() && (
                                <p id="new-grow-name-error" className="text-sm text-destructive" aria-live="polite">
                                    Add a grow name before creating the workspace.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 rounded-[1rem] border border-white/10 bg-white/[0.045] p-4 sm:grid-cols-2">
                        <div className="grid w-full gap-2">
                            <Label htmlFor="startDate">Start date</Label>
                            <div className="relative">
                                <Input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    value={newGrow.startDate}
                                    onChange={handleGrowChange}
                                    aria-invalid={submitted && !newGrow.startDate}
                                />
                                <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="grid w-full gap-2">
                            <Label htmlFor="phase">Current phase</Label>
                            <CustomDropdown
                                options={phaseOptions}
                                value={newGrow.currentPhase || "Seedling"}
                                onChange={handlePhaseChange}
                                width="w-full"
                                buttonClassName="mt-1"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                onClose();
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="gap-2"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Grow
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
