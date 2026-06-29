"use client"

import type { KeyboardEvent } from "react"
import {
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Grow } from "@/lib/db"
import { PhaseBadge } from "@/components/ui/phase-badge"
import { useDateUtils } from "@/hooks/useDateUtils"
import { getGrowElapsedDays } from "@/lib/growth-utils"

interface GrowCardProps {
    grow: Grow;
    onClick: () => void;
    onSetActive?: () => void;
    isActive?: boolean;
}

export function GrowCard({ grow, onClick, onSetActive, isActive }: GrowCardProps) {
    const { formatDate } = useDateUtils();

    const formattedDate = formatDate(grow.startDate);
    const daysSinceStart = getGrowElapsedDays(grow);
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
        }
    };

    if (isActive === undefined || isActive) {
        return (
            <article
                role="button"
                tabIndex={0}
                onClick={onClick}
                onKeyDown={handleKeyDown}
                className={`os-card cursor-pointer transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-emerald-300/[0.28] hover:shadow-[0_0_28px_rgba(52,255,154,0.12),0_14px_34px_rgba(0,0,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'border-emerald-300/[0.32] bg-emerald-300/10 ring-1 ring-emerald-300/20' : ''}`}
            >
                <CardHeader className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <CardTitle className="truncate text-base font-semibold text-foreground sm:text-lg">
                                {grow.name}
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground">
                                Started {formattedDate}
                            </CardDescription>
                        </div>
                        {isActive && (
                            <Badge className="shrink-0 bg-primary/[0.12] text-xs text-primary">Active</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                        <PhaseBadge phase={grow.currentPhase} />
                        <div className="text-right">
                            <div className="text-lg font-semibold tabular-nums text-foreground">{daysSinceStart}</div>
                            <div className="text-xs text-muted-foreground">days</div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                        {onSetActive && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onSetActive();
                                }}
                                className={isActive
                                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                                    : "text-muted-foreground hover:text-foreground"
                                }
                            >
                                {isActive ? "Active grow" : "Set active"}
                            </Button>
                        )}
                        <span className="ml-auto flex items-center gap-1 text-sm font-medium text-muted-foreground">
                            Open
                            <ArrowRight className="h-4 w-4" />
                        </span>
                    </div>
                </CardContent>
            </article>
        );
    } else {
        return (
            <article
                role="button"
                tabIndex={0}
                onClick={onClick}
                onKeyDown={handleKeyDown}
                className="os-card cursor-pointer opacity-90 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-emerald-300/[0.22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <CardHeader className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <CardTitle className="truncate text-base font-semibold text-foreground sm:text-lg">
                                {grow.name}
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground">
                                Started {formattedDate}
                            </CardDescription>
                        </div>
                        <Badge className="shrink-0 bg-muted text-xs text-muted-foreground">Completed</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0">
                    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                        <span className="flex items-center gap-1 rounded-full bg-muted/70 px-2 py-1 text-xs text-muted-foreground">
                            <CheckCircle className="h-3 w-3" /> Completed
                        </span>
                        <div className="text-right">
                            <div className="text-lg font-semibold tabular-nums text-foreground">{daysSinceStart}</div>
                            <div className="text-xs text-muted-foreground">days</div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end border-t border-white/10 pt-3">
                        <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                            Open
                            <ArrowRight className="h-4 w-4" />
                        </span>
                    </div>
                </CardContent>
            </article>
        );
    }
}
