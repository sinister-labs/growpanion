"use client"

type PhaseType = "Seedling" | "Vegetative" | "Flowering" | "Flushing" | "Drying" | "Curing" | "Done" | string;

interface PhaseBadgeProps {
    phase: PhaseType;
    className?: string;
}

export function PhaseBadge({ phase, className = "" }: PhaseBadgeProps) {
    const getPhaseColor = (phase: PhaseType) => {
        switch (phase) {
            case "Seedling": return "border border-emerald-300/[0.18] bg-emerald-300/10 text-emerald-100";
            case "Vegetative": return "border border-emerald-300/[0.22] bg-emerald-300/[0.12] text-emerald-100";
            case "Flowering": return "border border-sky-300/25 bg-sky-300/12 text-sky-100";
            case "Flushing": return "border border-cyan-300/25 bg-cyan-300/12 text-cyan-100";
            case "Drying": return "border border-amber-300/30 bg-amber-300/12 text-amber-100";
            case "Curing": return "border border-violet-300/25 bg-violet-300/12 text-violet-100";
            case "Done": return "border border-white/[0.12] bg-white/[0.045] text-slate-200";
            default: return "border border-emerald-300/[0.18] bg-emerald-300/10 text-emerald-100";
        }
    };

    return (
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getPhaseColor(phase)} ${className}`}>
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
