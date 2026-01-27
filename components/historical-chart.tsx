"use client"

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export interface ChartDataPoint {
  time: string;
  timestamp: number;
  temperature?: number;
  humidity?: number;
  vpd?: number;
  [key: string]: string | number | undefined;
}

export interface HistoricalChartProps {
  data?: ChartDataPoint[];
  title?: string;
  showTemperature?: boolean;
  showHumidity?: boolean;
  showVpd?: boolean;
  height?: number;
}

// Demo data generator for when no data is available
const generateDemoData = (): ChartDataPoint[] => {
  const now = Date.now();
  const data: ChartDataPoint[] = [];
  
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now - i * 60 * 60 * 1000);
    const hour = time.getHours();
    
    // Simulate day/night temperature fluctuation
    const baseTemp = 24;
    const tempVariation = Math.sin((hour - 6) * Math.PI / 12) * 3;
    const temperature = Math.round((baseTemp + tempVariation + (Math.random() - 0.5)) * 10) / 10;
    
    // Humidity inversely related to temperature
    const baseHumidity = 60;
    const humidityVariation = -tempVariation * 2;
    const humidity = Math.round((baseHumidity + humidityVariation + (Math.random() - 0.5) * 2) * 10) / 10;
    
    // Calculate VPD
    const vpd = calculateVPD(temperature, humidity);
    
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp: time.getTime(),
      temperature,
      humidity,
      vpd,
    });
  }
  
  return data;
};

// VPD calculation helper
const calculateVPD = (tempC: number, humidity: number): number => {
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const vpd = svp * (1 - humidity / 100);
  return Math.round(vpd * 100) / 100;
};

// Custom tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300">
            {entry.name}: {entry.value}
            {entry.dataKey === 'temperature' && '°C'}
            {entry.dataKey === 'humidity' && '%'}
            {entry.dataKey === 'vpd' && ' kPa'}
          </span>
        </div>
      ))}
    </div>
  );
};

export function HistoricalChart({
  data,
  title = "Environmental History",
  showTemperature = true,
  showHumidity = true,
  showVpd = true,
  height = 300,
}: HistoricalChartProps) {
  // Use demo data if no data provided
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;
    return generateDemoData();
  }, [data]);

  const isDemo = !data || data.length === 0;

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <CardTitle className="text-lg text-white">{title}</CardTitle>
          </div>
          {isDemo && (
            <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded">
              Demo Data
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#374151" 
                vertical={false}
              />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis 
                yAxisId="left"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
                domain={['auto', 'auto']}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#9CA3AF"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span className="text-gray-300 text-sm">{value}</span>
                )}
              />
              
              {showTemperature && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#f59e0b' }}
                />
              )}
              
              {showHumidity && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  name="Humidity"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#3b82f6' }}
                />
              )}
              
              {showVpd && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="vpd"
                  name="VPD"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#22c55e' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend explanation */}
        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-4 text-xs text-gray-400">
          {showTemperature && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-amber-500 rounded" />
              <span>Temperature (°C)</span>
            </div>
          )}
          {showHumidity && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-500 rounded" />
              <span>Humidity (%)</span>
            </div>
          )}
          {showVpd && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-500 rounded" />
              <span>VPD (kPa)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default HistoricalChart;
