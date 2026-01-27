"use client";

import React, { useMemo } from 'react';
import { HarvestedPlant } from './index';
import { Leaf, TrendingUp, TrendingDown } from 'lucide-react';

interface StrainStatisticsProps {
  plants: HarvestedPlant[];
}

interface StrainStats {
  name: string;
  plantCount: number;
  totalYield: number;
  avgYield: number;
  minYield: number;
  maxYield: number;
}

export function StrainStatistics({ plants }: StrainStatisticsProps) {
  const strainStats = useMemo<StrainStats[]>(() => {
    const groupedByStrain = plants.reduce((acc, plant) => {
      const strain = plant.genetic || 'Unknown';
      if (!acc[strain]) {
        acc[strain] = [];
      }
      acc[strain].push(plant);
      return acc;
    }, {} as Record<string, HarvestedPlant[]>);

    return Object.entries(groupedByStrain)
      .map(([name, strainPlants]) => {
        const yields = strainPlants.map(p => p.harvest?.yieldDryGrams || 0);
        const totalYield = yields.reduce((sum, y) => sum + y, 0);
        
        return {
          name,
          plantCount: strainPlants.length,
          totalYield: Math.round(totalYield),
          avgYield: Math.round(totalYield / strainPlants.length),
          minYield: Math.round(Math.min(...yields)),
          maxYield: Math.round(Math.max(...yields)),
        };
      })
      .sort((a, b) => b.avgYield - a.avgYield); // Sort by average yield descending
  }, [plants]);

  // Calculate overall average for comparison
  const overallAvg = useMemo(() => {
    if (plants.length === 0) return 0;
    const total = plants.reduce((sum, p) => sum + (p.harvest?.yieldDryGrams || 0), 0);
    return Math.round(total / plants.length);
  }, [plants]);

  if (strainStats.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Leaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No strain data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center justify-end gap-4 text-xs text-gray-400 mb-4">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-green-400" />
          Above avg ({overallAvg}g)
        </span>
        <span className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-red-400" />
          Below avg
        </span>
      </div>

      {/* Strain List */}
      <div className="space-y-3">
        {strainStats.map((strain, index) => {
          const isAboveAvg = strain.avgYield >= overallAvg;
          const percentDiff = Math.round(((strain.avgYield - overallAvg) / overallAvg) * 100);
          
          // Calculate bar width as percentage of max
          const maxAvgYield = Math.max(...strainStats.map(s => s.avgYield));
          const barWidth = (strain.avgYield / maxAvgYield) * 100;

          return (
            <div
              key={strain.name}
              className="bg-gray-900/50 rounded-lg p-4 relative overflow-hidden"
            >
              {/* Background bar */}
              <div
                className={`absolute inset-y-0 left-0 ${
                  isAboveAvg ? 'bg-green-600/10' : 'bg-gray-700/30'
                }`}
                style={{ width: `${barWidth}%` }}
              />

              {/* Content */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      {strain.name}
                      {isAboveAvg ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {strain.plantCount} plant{strain.plantCount !== 1 ? 's' : ''} • 
                      Range: {strain.minYield}g - {strain.maxYield}g
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xl font-bold ${
                    isAboveAvg ? 'text-green-400' : 'text-white'
                  }`}>
                    {strain.avgYield}g
                  </div>
                  <div className={`text-xs ${
                    isAboveAvg ? 'text-green-400' : 'text-red-400'
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
