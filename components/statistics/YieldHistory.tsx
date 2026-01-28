"use client";

import React, { useMemo } from 'react';
import { HarvestedPlant } from './index';
import { Calendar, TrendingUp } from 'lucide-react';

interface YieldHistoryProps {
  plants: HarvestedPlant[];
}

interface HistoryEntry {
  date: string;
  plantName: string;
  strainName: string;
  growName: string;
  yieldDry: number;
  yieldWet?: number;
}

export function YieldHistory({ plants }: YieldHistoryProps) {
  const history = useMemo<HistoryEntry[]>(() => {
    return plants
      .filter(p => p.harvest?.date)
      .map(plant => ({
        date: plant.harvest!.date,
        plantName: plant.name,
        strainName: plant.genetic || 'Unknown Strain',
        growName: plant.grow?.name || 'Unknown Grow',
        yieldDry: plant.harvest?.yieldDryGrams || 0,
        yieldWet: plant.harvest?.yieldWetGrams,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [plants]);

  // Calculate running average
  const runningStats = useMemo(() => {
    let total = 0;
    let count = 0;
    
    // Reverse to process chronologically
    return [...history].reverse().map(entry => {
      total += entry.yieldDry;
      count++;
      return {
        ...entry,
        runningAvg: Math.round(total / count),
      };
    }).reverse();
  }, [history]);

  // Find max yield for scaling
  const maxYield = useMemo(() => {
    return Math.max(...history.map(h => h.yieldDry), 1);
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No harvest history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between text-sm text-gray-400 pb-2 border-b border-gray-700">
        <span>Harvest Timeline</span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-4 w-4" />
          {history.length} harvests
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {runningStats.map((entry, index) => {
          const barWidth = (entry.yieldDry / maxYield) * 100;
          const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <div
              key={`${entry.date}-${entry.plantName}-${index}`}
              className="relative"
            >
              {/* Timeline connector */}
              {index < history.length - 1 && (
                <div className="absolute left-[11px] top-8 w-0.5 h-full bg-gray-700" />
              )}

              <div className="flex gap-4">
                {/* Timeline dot */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-900/50 rounded-lg p-4 relative overflow-hidden">
                  {/* Yield bar background */}
                  <div
                    className="absolute inset-y-0 left-0 bg-green-600/10"
                    style={{ width: `${barWidth}%` }}
                  />

                  {/* Content overlay */}
                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-white">
                          {entry.plantName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {entry.strainName} • {entry.growName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formattedDate}
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <div className="text-xl font-bold text-green-400">
                          {entry.yieldDry}g
                        </div>
                        {entry.yieldWet && (
                          <div className="text-xs text-gray-500">
                            ({entry.yieldWet}g wet)
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Avg: {entry.runningAvg}g
                        </div>
                      </div>
                    </div>
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
