"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import { Grow, PlantDB, getPlantsForGrow } from '@/lib/db';
import { useGrows } from '@/hooks/useGrows';
import ComparisonCard from './ComparisonCard';
import { Scale, Calendar, Timer, Thermometer, Award, ArrowLeftRight, Loader2 } from 'lucide-react';

interface GrowComparisonProps {
  initialGrow1Id?: string;
  initialGrow2Id?: string;
}

interface GrowWithPlants extends Grow {
  plants: PlantDB[];
  totalDays: number;
  phaseDurations: Record<string, number>;
}

const GrowComparison: React.FC<GrowComparisonProps> = ({
  initialGrow1Id,
  initialGrow2Id,
}) => {
  const { grows, isLoading } = useGrows();
  const [grow1Id, setGrow1Id] = useState<string | undefined>(initialGrow1Id);
  const [grow2Id, setGrow2Id] = useState<string | undefined>(initialGrow2Id);
  const [grow1Data, setGrow1Data] = useState<GrowWithPlants | null>(null);
  const [grow2Data, setGrow2Data] = useState<GrowWithPlants | null>(null);
  const [loadingPlants, setLoadingPlants] = useState(false);

  // Dropdown options
  const growOptions = useMemo(() => {
    return grows.map(grow => ({
      id: grow.id,
      label: grow.name,
      description: `${grow.currentPhase} • Started ${new Date(grow.startDate).toLocaleDateString()}`,
    }));
  }, [grows]);

  // Calculate phase durations
  const calculatePhaseDurations = (grow: Grow): Record<string, number> => {
    const durations: Record<string, number> = {};
    
    for (let i = 0; i < grow.phaseHistory.length; i++) {
      const phase = grow.phaseHistory[i];
      const startDate = new Date(phase.startDate);
      const endDate = i < grow.phaseHistory.length - 1
        ? new Date(grow.phaseHistory[i + 1].startDate)
        : new Date();
      
      durations[phase.phase] = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return durations;
  };

  // Calculate total days
  const calculateTotalDays = (grow: Grow): number => {
    const start = new Date(grow.startDate);
    const end = grow.currentPhase === 'Done' 
      ? new Date(grow.phaseHistory[grow.phaseHistory.length - 1]?.startDate || new Date())
      : new Date();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Load grow data with plants
  const loadGrowData = async (growId: string): Promise<GrowWithPlants | null> => {
    const grow = grows.find(g => g.id === growId);
    if (!grow) return null;

    try {
      const plants = await getPlantsForGrow(growId);
      return {
        ...grow,
        plants,
        totalDays: calculateTotalDays(grow),
        phaseDurations: calculatePhaseDurations(grow),
      };
    } catch (error) {
      console.error('Error loading plants:', error);
      return {
        ...grow,
        plants: [],
        totalDays: calculateTotalDays(grow),
        phaseDurations: calculatePhaseDurations(grow),
      };
    }
  };

  // Handle grow selection
  const handleGrow1Change = async (id: string) => {
    setGrow1Id(id);
    if (id) {
      setLoadingPlants(true);
      const data = await loadGrowData(id);
      setGrow1Data(data);
      setLoadingPlants(false);
    } else {
      setGrow1Data(null);
    }
  };

  const handleGrow2Change = async (id: string) => {
    setGrow2Id(id);
    if (id) {
      setLoadingPlants(true);
      const data = await loadGrowData(id);
      setGrow2Data(data);
      setLoadingPlants(false);
    } else {
      setGrow2Data(null);
    }
  };

  // Swap grows
  const handleSwap = () => {
    const temp1 = grow1Id;
    const tempData1 = grow1Data;
    setGrow1Id(grow2Id);
    setGrow1Data(grow2Data);
    setGrow2Id(temp1);
    setGrow2Data(tempData1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-600/20 rounded-lg">
            <Scale className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">Grow Comparison</CardTitle>
            <p className="text-sm text-gray-400">
              Compare two grows side by side
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Grow Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Grow 1</label>
            <CustomDropdown
              options={growOptions.filter(g => g.id !== grow2Id)}
              value={grow1Id || ''}
              onChange={handleGrow1Change}
              placeholder="Select first grow"
              width="w-full"
              buttonClassName="bg-gray-700 border-gray-600"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwap}
            disabled={!grow1Id || !grow2Id}
            className="h-10 w-10 rounded-full bg-gray-700 hover:bg-gray-600"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Grow 2</label>
            <CustomDropdown
              options={growOptions.filter(g => g.id !== grow1Id)}
              value={grow2Id || ''}
              onChange={handleGrow2Change}
              placeholder="Select second grow"
              width="w-full"
              buttonClassName="bg-gray-700 border-gray-600"
            />
          </div>
        </div>

        {/* Grow Headers */}
        {grow1Data && grow2Data && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900/50 rounded-lg text-center">
                <h3 className="text-lg font-semibold text-green-400">{grow1Data.name}</h3>
                <p className="text-sm text-gray-400">
                  {grow1Data.currentPhase} • {grow1Data.plants.length} plants
                </p>
              </div>
              <div className="p-4 bg-gray-900/50 rounded-lg text-center">
                <h3 className="text-lg font-semibold text-blue-400">{grow2Data.name}</h3>
                <p className="text-sm text-gray-400">
                  {grow2Data.currentPhase} • {grow2Data.plants.length} plants
                </p>
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ComparisonCard
                title="Overview"
                icon={<Calendar className="h-4 w-4" />}
                metrics={[
                  {
                    label: 'Total Days',
                    value1: grow1Data.totalDays,
                    value2: grow2Data.totalDays,
                    unit: 'd',
                    higherIsBetter: false,
                  },
                  {
                    label: 'Plants',
                    value1: grow1Data.plants.length,
                    value2: grow2Data.plants.length,
                  },
                  {
                    label: 'Phase',
                    value1: grow1Data.currentPhase,
                    value2: grow2Data.currentPhase,
                  },
                ]}
              />

              <ComparisonCard
                title="Phase Durations"
                icon={<Timer className="h-4 w-4" />}
                metrics={
                  ['Seedling', 'Vegetative', 'Flowering'].map(phase => ({
                    label: phase,
                    value1: grow1Data.phaseDurations[phase] || '-',
                    value2: grow2Data.phaseDurations[phase] || '-',
                    unit: 'd',
                  }))
                }
              />

              {(grow1Data.expectedYield || grow2Data.expectedYield) && (
                <ComparisonCard
                  title="Yield"
                  icon={<Award className="h-4 w-4" />}
                  metrics={[
                    {
                      label: 'Expected',
                      value1: grow1Data.expectedYield || '-',
                      value2: grow2Data.expectedYield || '-',
                      unit: 'g',
                      higherIsBetter: true,
                    },
                    {
                      label: 'Actual',
                      value1: grow1Data.actualYield || '-',
                      value2: grow2Data.actualYield || '-',
                      unit: 'g',
                      higherIsBetter: true,
                    },
                  ]}
                />
              )}

              {(grow1Data.environmentSettings || grow2Data.environmentSettings) && (
                <ComparisonCard
                  title="Environment"
                  icon={<Thermometer className="h-4 w-4" />}
                  metrics={[
                    {
                      label: 'Temperature',
                      value1: grow1Data.environmentSettings?.temperature || '-',
                      value2: grow2Data.environmentSettings?.temperature || '-',
                      unit: '°C',
                    },
                    {
                      label: 'Humidity',
                      value1: grow1Data.environmentSettings?.humidity || '-',
                      value2: grow2Data.environmentSettings?.humidity || '-',
                      unit: '%',
                    },
                  ]}
                />
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {(!grow1Data || !grow2Data) && (
          <div className="text-center py-12">
            <Scale className="h-12 w-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              Select Two Grows to Compare
            </h3>
            <p className="text-gray-500 text-sm">
              Choose grows from the dropdowns above to see a side-by-side comparison.
            </p>
          </div>
        )}

        {loadingPlants && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-green-500" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

GrowComparison.displayName = 'GrowComparison';

export default GrowComparison;
