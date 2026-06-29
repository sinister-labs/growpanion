"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CalendarDays, TreesIcon as Plant } from "lucide-react"
import { formatDate } from "@/lib/utils"
import React, { ReactNode } from "react"
import { CustomDropdown } from "@/components/ui/custom-dropdown"
import { PHASE_ICONS, getDaysInPhase, getGrowElapsedDays, getPhaseOptions } from "@/lib/growth-utils"

export interface GrowInfoProps {
  grow: {
    id: string;
    name: string;
    startDate: string;
    currentPhase: string;
    phaseHistory: Array<{
      phase: string;
      startDate: string;
    }>;
    plants?: Array<{ id: string }>;
  };
  onPhaseChange?: (phase: string) => void;
}

interface InfoCardProps {
  icon: ReactNode;
  title: string;
  value: string | number | undefined;
  subtitle: string;
}

export function GrowInfo({ grow, onPhaseChange }: GrowInfoProps) {
  const [selectedPhase, setSelectedPhase] = useState(grow.currentPhase)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const currentDay = getGrowElapsedDays(grow)
  const currentWeek = Math.ceil(currentDay / 7)
  const daysInCurrentPhase = getDaysInPhase(grow)

  const lastCompletedPhase = grow.phaseHistory
    .filter((ph) => ph.phase !== grow.currentPhase)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]

  const handlePhaseSelect = (phase: string) => {
    setSelectedPhase(phase)
    if (phase !== grow.currentPhase) {
      setShowConfirmDialog(true)
    }
  }

  const confirmPhaseChange = () => {
    if (onPhaseChange) {
      onPhaseChange(selectedPhase)
    }
    setShowConfirmDialog(false)
  }

  const CurrentPhaseIcon = PHASE_ICONS[grow.currentPhase] || PHASE_ICONS.Seedling

  const phaseOptions = getPhaseOptions()

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{grow.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Started {formatDate(grow.startDate)}</p>
          </div>
          <div className="flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1">
            <CurrentPhaseIcon className="mr-2 h-4 w-4 text-primary" />
            <CustomDropdown
              options={phaseOptions}
              value={grow.currentPhase}
              onChange={handlePhaseSelect}
              placeholder="Select phase"
              width="w-[150px]"
              className="min-w-0"
              buttonClassName="border-none bg-transparent hover:bg-transparent"
              renderItem={(option, isSelected) => (
                <div className="flex items-center">
                  {option.icon}
                  <span className={isSelected ? "text-primary" : "text-foreground"}>
                    {option.label}
                  </span>
                </div>
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon={<CalendarDays className="h-5 w-5 text-primary sm:h-6 sm:w-6" />}
            title="Total Days"
            value={currentDay}
            subtitle={`Week ${currentWeek}`}
          />
          <InfoCard
            icon={<CurrentPhaseIcon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />}
            title="Current Phase"
            value={daysInCurrentPhase}
            subtitle="Days"
          />
          {lastCompletedPhase && (
            <InfoCard
              icon={<CalendarDays className="h-5 w-5 text-primary sm:h-6 sm:w-6" />}
              title="Last Completed"
              value={lastCompletedPhase.phase}
              subtitle={formatDate(lastCompletedPhase.startDate)}
            />
          )}
          <InfoCard
            icon={<Plant className="h-5 w-5 text-primary sm:h-6 sm:w-6" />}
            title="Plants"
            value={grow.plants?.length || 0}
            subtitle="Total"
          />
        </div>
      </CardContent>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="infotainment-overlay border-white/10 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Phase Change</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to change the phase to {selectedPhase}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPhaseChange} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function InfoCard({ icon, title, value, subtitle }: InfoCardProps) {
  return (
    <div className="flex items-center rounded-[1rem] border border-white/10 bg-white/[0.045] p-3">
      <div className="mr-3 rounded-2xl bg-primary/10 p-2">{icon}</div>
      <div>
        <div className="text-xs font-semibold text-muted-foreground">{title}</div>
        <div className="text-lg font-semibold text-foreground sm:text-xl">{value}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  )
}
