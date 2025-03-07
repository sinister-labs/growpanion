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
import { CalendarDays, Sprout, Leaf, Cannabis, Wind, Package, CheckCircle, TreesIcon as Plant } from "lucide-react"
import { cn } from "@/lib/utils"
import React, { ReactNode } from "react"
import { CustomDropdown, DropdownOption } from "@/components/ui/custom-dropdown"

// Correct order of growth phases
const phases = ["Seedling", "Vegetative", "Flowering", "Flushing", "Drying", "Curing", "Done"]
const phaseIcons: Record<string, React.ForwardRefExoticComponent<any>> = {
  Seedling: Sprout,
  Vegetative: Leaf,
  Flowering: Cannabis,
  Flushing: Wind,
  Drying: Wind,
  Curing: Package,
  Done: CheckCircle,
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}

function calculateDuration(startDate: string) {
  const start = new Date(startDate)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

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
    plants?: Array<any>;
  };
  onPhaseChange: (phase: string) => void;
}

interface InfoCardProps {
  icon: ReactNode;
  title: string;
  value: string | number | undefined;
  subtitle: string;
}

export function GrowInfo({ grow, onPhaseChange }: GrowInfoProps) {
  console.log(grow);
  const [selectedPhase, setSelectedPhase] = useState(grow.currentPhase)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const currentPhaseStart = grow.phaseHistory.find((ph) => ph.phase === grow.currentPhase)?.startDate
  const currentDay = calculateDuration(grow.startDate)
  const currentWeek = Math.ceil(currentDay / 7)
  const daysInCurrentPhase = currentPhaseStart ? calculateDuration(currentPhaseStart) : 0

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
    onPhaseChange(selectedPhase)
    setShowConfirmDialog(false)
  }

  const CurrentPhaseIcon = phaseIcons[grow.currentPhase] || Sprout

  const phaseOptions: DropdownOption[] = phases.map(phase => ({
    id: phase,
    label: phase,
    icon: React.createElement(phaseIcons[phase] || Sprout, {
      className: "w-4 h-4 text-green-400 mr-2"
    })
  }))

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-green-400 mb-2 sm:mb-0">{grow.name}</h2>
          <div className="flex items-center bg-gray-800 rounded-full px-3 py-1 sm:px-4 sm:py-2 mt-2 sm:mt-0">
            <CurrentPhaseIcon className="w-4 h-4 sm:w-6 sm:h-6 text-green-400 mr-2" />
            <CustomDropdown
              options={phaseOptions}
              value={grow.currentPhase}
              onChange={handlePhaseSelect}
              placeholder="Phase wählen"
              width="w-[150px]"
              className="min-w-0"
              buttonClassName="border-none bg-transparent hover:bg-transparent"
              renderItem={(option, isSelected) => (
                <div className="flex items-center">
                  {option.icon}
                  <span className={isSelected ? "text-green-400" : "text-white"}>
                    {option.label}
                  </span>
                </div>
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <InfoCard
            icon={<CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />}
            title="Total Days"
            value={currentDay}
            subtitle={`Week ${currentWeek}`}
          />
          <InfoCard
            icon={<CurrentPhaseIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />}
            title="Current Phase"
            value={daysInCurrentPhase}
            subtitle="Days"
          />
          {lastCompletedPhase && (
            <InfoCard
              icon={<CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />}
              title="Last Completed"
              value={lastCompletedPhase.phase}
              subtitle={formatDate(lastCompletedPhase.startDate)}
            />
          )}
          <InfoCard
            icon={<Plant className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />}
            title="Plants"
            value={grow.plants?.length || 0}
            subtitle="Total"
          />
        </div>
      </CardContent>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Phasenwechsel bestätigen</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Bist du sicher, dass du die Phase zu {selectedPhase} ändern möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPhaseChange} className="bg-green-500 text-white hover:bg-green-600">
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function InfoCard({ icon, title, value, subtitle }: InfoCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 sm:p-4 flex items-center">
      <div className="mr-3 sm:mr-4">{icon}</div>
      <div>
        <div className="text-xs sm:text-sm font-medium text-gray-400">{title}</div>
        <div className="text-lg sm:text-2xl font-bold text-white">{value}</div>
        <div className="text-xs sm:text-sm text-gray-400">{subtitle}</div>
      </div>
    </div>
  )
}

