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
import { calculateVPD } from '@/lib/vpd-utils';

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
export const generateDemoData = (): ChartDataPoint[] => {
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
    <div className="rounded-2xl border border-border/[0.70] bg-popover p-3 shadow-lg">
      <p className="text-muted-foreground text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-foreground">
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
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg text-foreground">{title}</CardTitle>
          </div>
          {isDemo && (
            <span className="rounded-full bg-accent/10 px-2 py-1 text-xs text-accent">
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
                stroke="#17876D" 
                vertical={false}
              />
              <XAxis 
                dataKey="time" 
                stroke="#00DF81"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#17876D' }}
              />
              <YAxis 
                yAxisId="left"
                stroke="#00DF81"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#17876D' }}
                domain={['auto', 'auto']}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#00DF81"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#17876D' }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => (
                  <span className="text-muted-foreground text-sm">{value}</span>
                )}
              />
              
              {showTemperature && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature"
                  stroke="#00DF81"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#00DF81' }}
                />
              )}
              
              {showHumidity && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  name="Humidity"
                  stroke="#2FA98C"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#2FA98C' }}
                />
              )}
              
              {showVpd && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="vpd"
                  name="VPD"
                  stroke="#00DF81"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#00DF81' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend explanation */}
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/10 pt-4 text-xs text-muted-foreground">
          {showTemperature && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-amber-500 rounded" />
              <span>Temperature (°C)</span>
            </div>
          )}
          {showHumidity && (
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-3 rounded bg-[#2FA98C]" />
              <span>Humidity (%)</span>
            </div>
          )}
          {showVpd && (
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-3 rounded bg-primary" />
              <span>VPD (kPa)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default HistoricalChart;
