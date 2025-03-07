"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function HistoricalChart({ data }) {
  // Dummy historical data - replace with real data in a production app
  const historicalData = [
    { time: "00:00", value: 20 },
    { time: "04:00", value: 22 },
    { time: "08:00", value: 25 },
    { time: "12:00", value: 28 },
    { time: "16:00", value: 26 },
    { time: "20:00", value: 23 },
    { time: "24:00", value: 21 },
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={historicalData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis dataKey="time" stroke="#888" />
        <YAxis stroke="#888" />
        <Tooltip contentStyle={{ backgroundColor: "#333", border: "none" }} itemStyle={{ color: "#4ade80" }} />
        <Line type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

