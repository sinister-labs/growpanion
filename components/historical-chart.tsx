"use client"

import React from 'react';

interface ChartDataPoint {
  time: string;
  value: number;
  [key: string]: string | number; // Allow additional properties
}

interface HistoricalChartProps {
  data?: ChartDataPoint[];
}

export function HistoricalChart({ data }: HistoricalChartProps) {
  const historicalData = [
    { time: "00:00", value: 20 },
    { time: "04:00", value: 22 },
    { time: "08:00", value: 25 },
    { time: "12:00", value: 28 },
    { time: "16:00", value: 26 },
    { time: "20:00", value: 23 },
    { time: "24:00", value: 21 },
  ];

  return (
    <div className="h-32 bg-gray-900 rounded flex items-center justify-center">
      <p className="text-gray-400 text-sm">Historical data will be available soon</p>
    </div>
  );
}

