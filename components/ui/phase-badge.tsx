"use client"

import { Badge } from "@/components/ui/badge"

type PhaseType = "Seedling" | "Vegetative" | "Flowering" | "Flushing" | "Drying" | "Curing" | "Done" | string;

interface PhaseBadgeProps {
    phase: PhaseType;
    className?: string;
}

export function PhaseBadge({ phase, className = "" }: PhaseBadgeProps) {
    const getPhaseColor = (phase: PhaseType) => {
        switch (phase) {
            case "Seedling": return "bg-blue-600/30 text-blue-400";
            case "Vegetative": return "bg-green-600/30 text-green-400";
            case "Flowering": return "bg-purple-600/30 text-purple-400";
            case "Flushing": return "bg-yellow-600/30 text-yellow-400";
            case "Drying": return "bg-orange-600/30 text-orange-400";
            case "Curing": return "bg-amber-600/30 text-amber-400";
            case "Done": return "bg-gray-600/30 text-gray-400";
            default: return "bg-green-600/30 text-green-400";
        }
    };

    return (
        <span className={`rounded-full px-2 py-1 text-xs ${getPhaseColor(phase)} ${className}`}>
            {phase}
        </span>
    );
}

export const phaseOptions = [
    { id: "Seedling", label: "Seedling" },
    { id: "Vegetative", label: "Vegetative" },
    { id: "Flowering", label: "Flowering" },
    { id: "Flushing", label: "Flushing" },
    { id: "Drying", label: "Drying" },
    { id: "Curing", label: "Curing" },
    { id: "Done", label: "Done" }
]; 