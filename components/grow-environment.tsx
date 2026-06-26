"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EnvironmentIcon } from "@/components/environment-icon"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HistoricalChart } from "@/components/historical-chart"
import { useSensorData } from "@/hooks/useSensorData"
import { Grow } from "@/lib/db"
import { Loader2 } from "lucide-react"
import {
  VpdStatus
} from "@/lib/vpd-utils"
import { getDaysInPhase } from "@/lib/growth-utils"
import { buildEnvironmentData, DEFAULT_ENVIRONMENT_DATA, EnvironmentData } from "@/lib/environment-utils"

interface GrowEnvironmentProps {
  grow?: Grow & {
    currentPhase?: string;
    currentDay?: number;
  };
  onPhaseChange?: (phase: string) => void;
}

export default function GrowEnvironment({ grow }: GrowEnvironmentProps) {
  const { sensorData, isLoading: sensorsLoading, error: sensorsError } = useSensorData(60000)

  const [environmentData, setEnvironmentData] = useState<EnvironmentData[]>(DEFAULT_ENVIRONMENT_DATA)

  useEffect(() => {
    if (!sensorData) return;
    if (sensorData.length === 0) {
      setEnvironmentData(DEFAULT_ENVIRONMENT_DATA);
      return;
    }

    const currentDay = grow ? getDaysInPhase(grow) : undefined
    const updatedData = buildEnvironmentData(sensorData, grow?.currentPhase, currentDay);

    if (updatedData.length > 0) {
      setEnvironmentData(updatedData);
    }
  }, [sensorData, grow]);

  if (sensorsLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {DEFAULT_ENVIRONMENT_DATA.map((item) => (
          <Card key={item.title} className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-green-400 transition-all duration-300 transform hover:scale-105 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium text-gray-200">{item.title}</CardTitle>
              <EnvironmentIcon icon={item.icon} className="w-8 h-8 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="font-semibold text-white relative">
                <span className="opacity-50">{item.value}</span>
                <Loader2 className="h-5 w-5 animate-spin text-green-500 absolute top-2 right-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (sensorsError) {
    return (
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="text-red-400">
            <p className="font-medium">Error loading sensor data</p>
            <p className="text-sm mt-1">{sensorsError}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {environmentData.map((item) => (
        <Dialog key={item.title}>
          <DialogTrigger asChild>
            <Card className={`bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-green-400 transition-all duration-300 transform hover:scale-105 cursor-pointer ${item.title.includes('VPD') && item.status ? getVpdBorderClass(item.status) : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium text-gray-200">{item.title}</CardTitle>
                <EnvironmentIcon icon={item.icon} className={`w-8 h-8 ${item.title.includes('VPD') && item.statusClass ? item.statusClass : 'text-green-400'}`} />
              </CardHeader>
              <CardContent>
                <div className="font-semibold text-white">{item.value}</div>
                {item.title.includes('VPD') && item.statusText && (
                  <div className={`text-sm mt-1 ${item.statusClass}`}>
                    {item.statusText}
                  </div>
                )}
                {item.title.includes('VPD') && item.optimalRange && (
                  <div className="text-xs text-gray-400 mt-1">
                    {item.optimalRange}
                  </div>
                )}
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-green-400">{item.title} History</DialogTitle>
              {item.title.includes('VPD') && item.phaseDescription && (
                <div className="text-sm text-gray-300 mt-1">
                  Optimal range for: {item.phaseDescription}
                </div>
              )}
            </DialogHeader>
            <HistoricalChart data={undefined} />
            {item.title.includes('VPD') && (
              <div className="mt-4 space-y-2 text-sm text-gray-300">
                <p><span className="text-green-400 font-semibold">0.4-0.8 kPa:</span> Low Transpiration (Propagation / Early Growth Phase)</p>
                <p><span className="text-green-400 font-semibold">0.8-1.2 kPa:</span> Healthy Transpiration (Late Growth Phase / Early Flower Phase)</p>
                <p><span className="text-green-400 font-semibold">1.2-1.6 kPa:</span> High Transpiration (Mid / Late Flower Phase)</p>
                <p><span className="text-red-400 font-semibold">&lt;0.4 / &gt;1.6 kPa:</span> Danger Zone (Transpiration too low / too high)</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      ))}
    </div>
  )
}

function getVpdBorderClass(status: VpdStatus): string {
  switch (status) {
    case 'optimal':
      return 'border-l-4 border-l-green-400';
    case 'low':
      return 'border-l-4 border-l-amber-400';
    case 'high':
      return 'border-l-4 border-l-red-400';
    default:
      return '';
  }
}
