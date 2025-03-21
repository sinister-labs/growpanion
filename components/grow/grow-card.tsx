"use client"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Grow } from "@/lib/db"
import { PhaseBadge } from "@/components/ui/phase-badge"
import { useDateUtils } from "@/hooks/useDateUtils"

interface GrowCardProps {
    grow: Grow;
    onClick: () => void;
    onSetActive?: () => void;
    isActive?: boolean;
}

export function GrowCard({ grow, onClick, onSetActive, isActive }: GrowCardProps) {
    const { formatDate, getDaysSince } = useDateUtils();

    const formattedDate = formatDate(grow.startDate);
    const daysSinceStart = getDaysSince(grow.startDate);

    if (isActive === undefined || isActive) {
        return (
            <Card
                className={`bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-green-400 transition-all duration-300 transform hover:scale-105 cursor-pointer ${isActive ? 'border-green-500 ring-1 ring-green-500' : ''}`}
            >
                <CardHeader>
                    <CardTitle className="text-base sm:text-lg font-medium text-green-400 flex justify-between">
                        {grow.name}
                        {isActive && (
                            <Badge className="bg-green-600 text-xs">Active</Badge>
                        )}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        Started on {formattedDate}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Current Phase:</span>
                        <PhaseBadge phase={grow.currentPhase} />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-400 text-sm">Duration:</span>
                        <span className="text-white text-sm">
                            {daysSinceStart} Days
                        </span>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
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
                                    ? "bg-green-900/20 text-green-400 hover:bg-green-900/30"
                                    : "text-gray-400 hover:text-white"
                                }
                            >
                                {isActive ? "Active Grow" : "Set as active"}
                            </Button>
                        )}
                        <ArrowRight className="h-4 w-4 text-gray-500" />
                    </div>
                </CardContent>
            </Card>
        );
    } else {
        return (
            <Card
                className="bg-gray-800/50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-gray-500 transition-all duration-300 transform hover:scale-105 cursor-pointer opacity-80"
            >
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base sm:text-lg font-medium text-gray-300">
                            {grow.name}
                        </CardTitle>
                        <Badge className="bg-gray-600 text-xs">Completed</Badge>
                    </div>
                    <CardDescription className="text-gray-500">
                        Started on {formattedDate}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Status:</span>
                        <span className="bg-gray-600/30 text-gray-400 rounded px-2 py-1 text-xs flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Completed
                        </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-500 text-sm">Total Duration:</span>
                        <span className="text-gray-300 text-sm">
                            {daysSinceStart} Days
                        </span>
                    </div>

                    <div className="mt-4 flex justify-end items-center">
                        <ArrowRight className="h-4 w-4 text-gray-500" />
                    </div>
                </CardContent>
            </Card>
        );
    }
} 