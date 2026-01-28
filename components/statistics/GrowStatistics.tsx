"use client";

import React, { useMemo } from 'react';
import { HarvestedPlant } from './index';
import { Grow } from '@/lib/db';
import { Scale, Calendar, Leaf } from 'lucide-react';

interface GrowStatisticsProps {
  plants: HarvestedPlant[];
  grows: Grow[];
}

interface GrowStats {
  id: string;
  name: string;
  startDate: string;
  plantCount: number;
  totalYield: number;
  avgYieldPerPlant: number;
  strains: string[];
}

export function GrowStatistics({ plants, grows }: GrowStatisticsProps) {
  const growStats = useMemo<GrowStats[]>(() => {
    const groupedByGrow = plants.reduce((acc, plant) => {
      if (!acc[plant.growId]) {
        acc[plant.growId] = [];
      }
      acc[plant.growId].push(plant);
      return acc;
    }, {} as Record<string, HarvestedPlant[]>);

    return Object.entries(groupedByGrow)
      .map(([growId, growPlants]) => {
        const grow = grows.find(g => g.id === growId);
        const yields = growPlants.map(p => p.harvest?.yieldDryGrams || 0);
        const totalYield = yields.reduce((sum, y) => sum + y, 0);
        const uniqueStrains = [...new Set(growPlants.map(p => p.genetic))];

        return {
          id: growId,
          name: grow?.name || 'Unknown Grow',
          startDate: grow?.startDate || '',
          plantCount: growPlants.length,
          totalYield: Math.round(totalYield),
          avgYieldPerPlant: Math.round(totalYield / growPlants.length),
          strains: uniqueStrains,
        };
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [plants, grows]);

  if (growStats.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No grow data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grow Cards */}
      {growStats.map((grow) => {
        const formattedDate = grow.startDate 
          ? new Date(grow.startDate).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            })
          : 'Unknown date';

        return (
          <div
            key={grow.id}
            className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-white text-lg">{grow.name}</h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Leaf className="h-4 w-4" />
                    {grow.plantCount} plant{grow.plantCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {grow.strains.map(strain => (
                    <span
                      key={strain}
                      className="text-xs px-2 py-1 bg-gray-700 rounded-full text-gray-300"
                    >
                      {strain}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-6 sm:text-right">
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {grow.totalYield}g
                  </div>
                  <div className="text-xs text-gray-400">Total Yield</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {grow.avgYieldPerPlant}g
                  </div>
                  <div className="text-xs text-gray-400">Per Plant</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Summary Row */}
      {growStats.length > 1 && (
        <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              <strong>{growStats.length}</strong> grows with harvest data
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-green-400">
                {growStats.reduce((sum, g) => sum + g.totalYield, 0)}g
              </span>
              <span className="text-sm text-gray-400 ml-2">total yield</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
