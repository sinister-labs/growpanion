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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function HistoricalChart(_props: HistoricalChartProps) {
  return (
    <div className="h-32 bg-gray-900 rounded flex items-center justify-center">
      <p className="text-gray-400 text-sm">Historical data will be available soon</p>
    </div>
  );
}

