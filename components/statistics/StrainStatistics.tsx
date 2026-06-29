"use client";

import React, { useMemo } from 'react';
import { Leaf, TrendingUp, TrendingDown } from 'lucide-react';
import { getStrainStats, type HarvestedPlant } from '@/lib/statistics-utils';

interface StrainStatisticsProps {
  plants: HarvestedPlant[];
}

export function StrainStatistics({ plants }: StrainStatisticsProps) {
  const strainStats = useMemo(() => {
    return getStrainStats(plants);
  }, [plants]);

  // Calculate overall average for comparison
  const overallAvg = useMemo(() => {
    if (plants.length === 0) return 0;
    const total = plants.reduce((sum, p) => sum + p.harvest.yieldDryGrams, 0);
    return Math.round(total / plants.length);
  }, [plants]);

  if (strainStats.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Leaf className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p>No strain data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4 flex items-center justify-end gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-primary" />
          Above avg ({overallAvg}g)
        </span>
        <span className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-destructive" />
          Below avg
        </span>
      </div>

      <div className="space-y-3">
        {strainStats.map((strain, index) => {
          const isAboveAvg = strain.avgYield >= overallAvg;
          const percentDiff = overallAvg > 0 
            ? Math.round(((strain.avgYield - overallAvg) / overallAvg) * 100)
            : 0;
          
          // Calculate bar width as percentage of max
          const maxAvgYield = Math.max(...strainStats.map(s => s.avgYield));
          const barWidth = maxAvgYield > 0 ? (strain.avgYield / maxAvgYield) * 100 : 0;

          return (
            <div
              key={strain.name}
              className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.045] p-4"
            >
              <div
                className={`absolute inset-y-0 left-0 ${
                  isAboveAvg ? 'bg-primary/10' : 'bg-destructive/8'
                }`}
                style={{ width: `${barWidth}%` }}
              />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      {strain.name}
                      {isAboveAvg ? (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {strain.plantCount} plant{strain.plantCount !== 1 ? 's' : ''} • 
                      Range: {strain.minYield}g - {strain.maxYield}g
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xl font-semibold ${
                    isAboveAvg ? 'text-primary' : 'text-foreground'
                  }`}>
                    {strain.avgYield}g
                  </div>
                  <div className={`text-xs ${
                    isAboveAvg ? 'text-primary' : 'text-destructive'
                  }`}>
                    {percentDiff >= 0 ? '+' : ''}{percentDiff}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
