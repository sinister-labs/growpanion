"use client";

import React, { useMemo } from 'react';
import { Grow } from '@/lib/db';
import { Scale, Calendar, Leaf } from 'lucide-react';
import { getGrowStats, type HarvestedPlant } from '@/lib/statistics-utils';

interface GrowStatisticsProps {
  plants: HarvestedPlant[];
  grows: Grow[];
}

export function GrowStatistics({ plants, grows }: GrowStatisticsProps) {
  const growStats = useMemo(() => {
    return getGrowStats(plants, grows);
  }, [plants, grows]);

  if (growStats.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Scale className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <p>No grow data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {growStats.map((grow) => {
        const startDate = new Date(grow.startDate);
        const formattedDate = Number.isFinite(startDate.getTime())
          ? new Date(grow.startDate).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            })
          : 'Unknown date';

        return (
          <div
            key={grow.id}
            className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">{grow.name}</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Leaf className="h-4 w-4" />
                    {grow.plantCount} plant{grow.plantCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {grow.strains.map(strain => (
                    <span
                      key={strain}
                      className="rounded-full bg-muted/[0.65] px-2 py-1 text-xs text-muted-foreground"
                    >
                      {strain}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-6 sm:text-right">
                <div>
                  <div className="text-2xl font-semibold text-primary">
                    {grow.totalYield}g
                  </div>
                  <div className="text-xs text-muted-foreground">Total Yield</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-foreground">
                    {grow.avgYieldPerPlant}g
                  </div>
                  <div className="text-xs text-muted-foreground">Per Plant</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {growStats.length > 1 && (
        <div className="mt-6 rounded-3xl border border-primary/35 bg-primary/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-foreground">
              <strong>{growStats.length}</strong> grows with harvest data
            </div>
            <div className="text-right">
              <span className="text-lg font-semibold text-primary">
                {growStats.reduce((sum, g) => sum + g.totalYield, 0)}g
              </span>
              <span className="ml-2 text-sm text-muted-foreground">total yield</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
