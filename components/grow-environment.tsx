"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EnvironmentIcon } from "@/components/environment-icon"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HistoricalChart } from "@/components/historical-chart"
import { useSensorData } from "@/hooks/useSensorData"
import { Grow } from "@/lib/db"
import { Loader2 } from "lucide-react"
import { calculateDuration } from "@/lib/utils"
import {
  calculateVPD,
  getOptimalVpdRange,
  getVpdStatus,
  getVpdStatusClass,
  getVpdStatusText,
  VpdRange,
  VpdStatus
} from "@/lib/vpd-utils"

interface GrowEnvironmentProps {
  grow?: Grow & {
    currentPhase?: string;
    currentDay?: number;
  };
  onPhaseChange?: (phase: string) => void;
}

interface EnvironmentData {
  title: string;
  value: string;
  icon: string;
  unit: string;
  status?: VpdStatus;
  statusClass?: string;
  statusText?: string;
  optimalRange?: string;
  phaseDescription?: string;
}

export default function GrowEnvironment({ grow, onPhaseChange }: GrowEnvironmentProps) {
  const [selectedData, setSelectedData] = useState(null)
  const { sensorData, isLoading: sensorsLoading, error: sensorsError } = useSensorData(60000)

  const defaultEnvironmentData: EnvironmentData[] = [
    { title: "Temperature", value: "25°C", icon: "temperature", unit: "°C" },
    { title: "Humidity", value: "60%", icon: "humidity", unit: "%" },
    { title: "VPD", value: "1.2 kPa", icon: "vpd", unit: "kPa" },
    { title: "Carbon Filter", value: "Active", icon: "filter", unit: "" },
    { title: "Fan", value: "On", icon: "fan", unit: "" }
  ]

  const [environmentData, setEnvironmentData] = useState<EnvironmentData[]>(defaultEnvironmentData)

  useEffect(() => {
    if (!sensorData) return;

    let updatedData: EnvironmentData[] = [];
    let temperatureValue: number | null = null;
    let humidityValue: number | null = null;
    let vpdValue: number | null = null;

    const currentPhaseStart = grow?.phaseHistory.find((ph) => ph.phase === grow.currentPhase)?.startDate
    const currentDay = currentPhaseStart ? calculateDuration(currentPhaseStart) : 0
    const optimalVpdRange = getOptimalVpdRange(grow?.currentPhase, currentDay);

    sensorData.forEach(sensor => {
      if (!sensor.values || sensor.values.length === 0) return;

      const sensorValue = sensor.values[0].value;
      const unit = sensor.values[0].unit || '';

      let sensorData: EnvironmentData | null = null;

      if (sensor.type === 'Temperature') {
        temperatureValue = typeof sensorValue === 'number' ? sensorValue : parseFloat(sensorValue.toString());
        sensorData = {
          title: sensor.name || 'Temperature',
          value: `${temperatureValue}${unit || '°C'}`,
          icon: 'temperature',
          unit: unit || '°C'
        };
      } else if (sensor.type === 'Humidity') {
        humidityValue = typeof sensorValue === 'number' ? sensorValue : parseFloat(sensorValue.toString());
        sensorData = {
          title: sensor.name || 'Humidity',
          value: `${humidityValue}${unit || '%'}`,
          icon: 'humidity',
          unit: unit || '%'
        };
      } else if (sensor.type === 'Carbon Filter') {
        sensorData = {
          title: sensor.name || 'Carbon Filter',
          value: sensorValue ? 'On' : 'Off',
          icon: 'filter',
          unit: ''
        };
      } else if (sensor.type === 'Fan') {
        sensorData = {
          title: sensor.name || 'Fan',
          value: sensorValue ? 'On' : 'Off',
          icon: 'fan',
          unit: ''
        };
      } else if (sensor.type === 'Lamp') {
        sensorData = {
          title: sensor.name || 'Lamp',
          value: sensorValue ? 'On' : 'Off',
          icon: 'lamp',
          unit: ''
        };
      } else {
        // Other type of sensor, just show the raw value
        sensorData = {
          title: sensor.name || 'Sensor',
          value: `${sensorValue}${unit || ''}`,
          icon: 'light', // Fallback to light icon
          unit: unit || ''
        };
      }

      if (sensorData) {
        updatedData.push(sensorData);
      }
    });

    if (temperatureValue !== null && humidityValue !== null) {
      vpdValue = calculateVPD(temperatureValue, humidityValue);

      let vpdStatus: VpdStatus = 'unknown';
      let statusClass = '';
      let statusText = '';

      if (optimalVpdRange) {
        vpdStatus = getVpdStatus(vpdValue, optimalVpdRange);
        statusClass = getVpdStatusClass(vpdStatus);
        statusText = getVpdStatusText(vpdStatus, optimalVpdRange);
      }

      const vpdData: EnvironmentData = {
        title: "VPD",
        value: `${vpdValue} kPa`,
        icon: "vpd",
        unit: "kPa",
        status: vpdStatus,
        statusClass,
        statusText,
        optimalRange: optimalVpdRange ? `${optimalVpdRange.min}-${optimalVpdRange.max} kPa` : undefined,
        phaseDescription: optimalVpdRange ? optimalVpdRange.description : undefined
      };

      updatedData.push(vpdData);
    }

    if (updatedData.length > 0) {
      setEnvironmentData(updatedData);
    }
  }, [sensorData, grow]);

  if (sensorsLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {defaultEnvironmentData.map((item) => (
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
            <Card className={`bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-green-400 transition-all duration-300 transform hover:scale-105 cursor-pointer ${item.title.includes('VPD') && item.statusClass ? `border-l-4 border-l-${item.statusClass.replace('text-', '')}` : ''}`}>
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

