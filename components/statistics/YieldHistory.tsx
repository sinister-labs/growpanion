"use client";

import React, { useMemo } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import {
  getRunningYieldHistory,
  getYieldHistory,
  type HarvestedPlant,
} from '@/lib/statistics-utils';

interface YieldHistoryProps {
  plants: HarvestedPlant[];
}

export function YieldHistory({ plants }: YieldHistoryProps) {
  const history = useMemo(() => {
    return getYieldHistory(plants);
  }, [plants]);

  // Calculate running average
  const runningStats = useMemo(() => {
    return getRunningYieldHistory(history);
  }, [history]);

  // Find max yield for scaling
  const maxYield = useMemo(() => {
    return Math.max(...history.map(h => h.yieldDry), 1);
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p>No harvest history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 text-sm text-muted-foreground">
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
          const entryDate = new Date(entry.date);
          const formattedDate = Number.isFinite(entryDate.getTime())
            ? entryDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
            : 'Unknown date';

          return (
            <div
              key={`${entry.date}-${entry.plantName}-${index}`}
              className="relative"
            >
              {index < history.length - 1 && (
                <div className="absolute left-[11px] top-8 h-full w-0.5 bg-border" />
              )}

              <div className="flex gap-4">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                  <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                </div>

                <div className="relative flex-1 overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/10"
                    style={{ width: `${barWidth}%` }}
                  />

                  <div className="relative z-10">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <div className="font-semibold text-foreground">
                          {entry.plantName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.strainName} • {entry.growName}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formattedDate}
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <div className="text-xl font-semibold text-primary">
                          {entry.yieldDry}g
                        </div>
                        {entry.yieldWet && (
                          <div className="text-xs text-muted-foreground">
                            ({entry.yieldWet}g wet)
                          </div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
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
