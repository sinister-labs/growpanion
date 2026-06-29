"use client";

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import { Grow, PlantDB, getPlantsForGrow } from '@/lib/db';
import { useGrows } from '@/hooks/useGrows';
import ComparisonCard from './ComparisonCard';
import { Scale, Calendar, Timer, Thermometer, Award, ArrowLeftRight, Loader2, AlertCircle } from 'lucide-react';
import { calculateGrowTotalDays, calculatePhaseDurations } from '@/lib/growth-utils';

interface GrowComparisonProps {
  initialGrow1Id?: string;
  initialGrow2Id?: string;
}

interface GrowWithPlants extends Grow {
  plants: PlantDB[];
  totalDays: number;
  phaseDurations: Record<string, number>;
}

const formatStartDate = (startDate: string): string => {
  const date = new Date(startDate);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : 'Unknown start';
};

const GrowComparison: React.FC<GrowComparisonProps> = ({
  initialGrow1Id,
  initialGrow2Id,
}) => {
  const { grows, isLoading } = useGrows();
  const [grow1Id, setGrow1Id] = useState<string | undefined>(initialGrow1Id);
  const [grow2Id, setGrow2Id] = useState<string | undefined>(initialGrow2Id);
  const [grow1Data, setGrow1Data] = useState<GrowWithPlants | null>(null);
  const [grow2Data, setGrow2Data] = useState<GrowWithPlants | null>(null);
  const [loadingGrow1, setLoadingGrow1] = useState(false);
  const [loadingGrow2, setLoadingGrow2] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const grow1RequestId = useRef(0);
  const grow2RequestId = useRef(0);
  const isMounted = useRef(false);
  const loadingPlants = loadingGrow1 || loadingGrow2;

  // Dropdown options
  const growOptions = useMemo(() => {
    return grows.map(grow => ({
      id: grow.id,
      label: grow.name,
      description: `${grow.currentPhase} • Started ${formatStartDate(grow.startDate)}`,
    }));
  }, [grows]);

  // Load grow data with plants
  const loadGrowData = useCallback(async (growId: string): Promise<GrowWithPlants | null> => {
    const grow = grows.find(g => g.id === growId);
    if (!grow) return null;

    const plants = await getPlantsForGrow(growId);
    return {
      ...grow,
      plants,
      totalDays: calculateGrowTotalDays(grow),
      phaseDurations: calculatePhaseDurations(grow),
    };
  }, [grows]);

  // Handle grow selection
  const handleGrow1Change = useCallback(async (id: string) => {
    const requestId = ++grow1RequestId.current;
    setGrow1Id(id);
    if (id) {
      setLoadingGrow1(true);
      setLoadError(null);
      try {
        const data = await loadGrowData(id);
        if (!isMounted.current || requestId !== grow1RequestId.current) {
          return;
        }
        setGrow1Data(data);
      } catch (error) {
        if (!isMounted.current || requestId !== grow1RequestId.current) {
          return;
        }
        console.error('Error loading plants:', error);
        setGrow1Data(null);
        setLoadError(error instanceof Error ? error.message : 'Could not load plants for the selected grow');
      } finally {
        if (isMounted.current && requestId === grow1RequestId.current) {
          setLoadingGrow1(false);
        }
      }
    } else {
      setGrow1Data(null);
      setLoadingGrow1(false);
    }
  }, [loadGrowData]);

  const handleGrow2Change = useCallback(async (id: string) => {
    const requestId = ++grow2RequestId.current;
    setGrow2Id(id);
    if (id) {
      setLoadingGrow2(true);
      setLoadError(null);
      try {
        const data = await loadGrowData(id);
        if (!isMounted.current || requestId !== grow2RequestId.current) {
          return;
        }
        setGrow2Data(data);
      } catch (error) {
        if (!isMounted.current || requestId !== grow2RequestId.current) {
          return;
        }
        console.error('Error loading plants:', error);
        setGrow2Data(null);
        setLoadError(error instanceof Error ? error.message : 'Could not load plants for the selected grow');
      } finally {
        if (isMounted.current && requestId === grow2RequestId.current) {
          setLoadingGrow2(false);
        }
      }
    } else {
      setGrow2Data(null);
      setLoadingGrow2(false);
    }
  }, [loadGrowData]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      grow1RequestId.current += 1;
      grow2RequestId.current += 1;
    };
  }, []);

  useEffect(() => {
    if (isLoading || grows.length === 0) return;

    if (grow1Id && !grow1Data) {
      handleGrow1Change(grow1Id);
    }
    if (grow2Id && !grow2Data) {
      handleGrow2Change(grow2Id);
    }
  }, [grow1Id, grow1Data, grow2Id, grow2Data, grows.length, handleGrow1Change, handleGrow2Change, isLoading]);

  // Swap grows
  const handleSwap = () => {
    grow1RequestId.current += 1;
    grow2RequestId.current += 1;
    const temp1 = grow1Id;
    const tempData1 = grow1Data;
    setGrow1Id(grow2Id);
    setGrow1Data(grow2Data);
    setGrow2Id(temp1);
    setGrow2Data(tempData1);
    setLoadingGrow1(false);
    setLoadingGrow2(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-2">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg text-foreground">Grow Comparison</CardTitle>
            <p className="text-sm text-muted-foreground">
              Compare two grows side by side
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Grow Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
          <div>
            <label className="text-sm text-muted-foreground block mb-2">Grow 1</label>
            <CustomDropdown
              options={growOptions.filter(g => g.id !== grow2Id)}
              value={grow1Id || ''}
              onChange={handleGrow1Change}
              placeholder="Select first grow"
              width="w-full"
              buttonClassName="mt-1"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwap}
            disabled={!grow1Id || !grow2Id}
            className="h-10 w-10 rounded-full bg-secondary hover:bg-secondary/80"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          <div>
            <label className="text-sm text-muted-foreground block mb-2">Grow 2</label>
            <CustomDropdown
              options={growOptions.filter(g => g.id !== grow1Id)}
              value={grow2Id || ''}
              onChange={handleGrow2Change}
              placeholder="Select second grow"
              width="w-full"
              buttonClassName="mt-1"
            />
          </div>
        </div>

        {loadError && (
          <div className="flex items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-foreground">Comparison data could not be loaded</p>
              <p className="text-sm">{loadError}</p>
            </div>
          </div>
        )}

        {/* Grow Headers */}
        {grow1Data && grow2Data && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4 text-center">
                <h3 className="text-lg font-semibold text-primary">{grow1Data.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {grow1Data.currentPhase} • {grow1Data.plants.length} plants
                </p>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-4 text-center">
                <h3 className="text-lg font-semibold text-accent">{grow2Data.name}</h3>
                <p className="text-sm text-muted-foreground">
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
                    value1: grow1Data.phaseDurations[phase] ?? '-',
                    value2: grow2Data.phaseDurations[phase] ?? '-',
                    unit: 'd',
                  }))
                }
              />

              {(grow1Data.expectedYield != null || grow2Data.expectedYield != null || grow1Data.actualYield != null || grow2Data.actualYield != null) && (
                <ComparisonCard
                  title="Yield"
                  icon={<Award className="h-4 w-4" />}
                  metrics={[
                    {
                      label: 'Expected',
                      value1: grow1Data.expectedYield ?? '-',
                      value2: grow2Data.expectedYield ?? '-',
                      unit: 'g',
                      higherIsBetter: true,
                    },
                    {
                      label: 'Actual',
                      value1: grow1Data.actualYield ?? '-',
                      value2: grow2Data.actualYield ?? '-',
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
                      value1: grow1Data.environmentSettings?.temperature ?? '-',
                      value2: grow2Data.environmentSettings?.temperature ?? '-',
                      unit: '°C',
                    },
                    {
                      label: 'Humidity',
                      value1: grow1Data.environmentSettings?.humidity ?? '-',
                      value2: grow2Data.environmentSettings?.humidity ?? '-',
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
            <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Select Two Grows to Compare
            </h3>
            <p className="text-muted-foreground text-sm">
              Choose grows from the dropdowns above to see a side-by-side comparison.
            </p>
          </div>
        )}

        {loadingPlants && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

GrowComparison.displayName = 'GrowComparison';

export default GrowComparison;
