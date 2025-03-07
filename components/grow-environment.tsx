"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EnvironmentIcon } from "@/components/environment-icon"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HistoricalChart } from "@/components/historical-chart"

export default function GrowEnvironment() {
  const [selectedData, setSelectedData] = useState(null)

  const environmentData = [
    { title: "Temperature", value: "25°C", icon: "temperature", unit: "°C" },
    { title: "Humidity", value: "60%", icon: "humidity", unit: "%" },
    { title: "VPD", value: "1.2 kPa", icon: "vpd", unit: "kPa" },
    { title: "Carbon Filter", value: "Active", icon: "filter", unit: "" },
    { title: "Fan", value: "On", icon: "fan", unit: "" },
    { title: "Light", value: "On", icon: "light", unit: "" },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {environmentData.map((item) => (
        <Dialog key={item.title}>
          <DialogTrigger asChild>
            <Card className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 hover:border-green-400 transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium text-gray-200">{item.title}</CardTitle>
                <EnvironmentIcon icon={item.icon} className="w-8 h-8 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{item.value}</div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-green-400">{item.title} History</DialogTitle>
            </DialogHeader>
            <HistoricalChart data={item} />
          </DialogContent>
        </Dialog>
      ))}
    </div>
  )
}

