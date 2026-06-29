"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Scale, 
  Leaf, 
  ClipboardList,
  ChevronRight,
  Loader2,
  Award,
  Calendar,
  AlertCircle,
  Sprout
} from 'lucide-react';
import { useRouting } from '@/hooks/useRouting';
import { getAllGrows, getAllPlants, Grow, PlantDB } from '@/lib/db';
import { StrainStatistics } from './StrainStatistics';
import { GrowStatistics } from './GrowStatistics';
import { YieldHistory } from './YieldHistory';
import { getHarvestedPlants, getYieldSummary } from '@/lib/statistics-utils';

export default function Statistics() {
  const { navigateTo } = useRouting();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grows, setGrows] = useState<Grow[]>([]);
  const [plants, setPlants] = useState<PlantDB[]>([]);
  const loadRequestId = useRef(0);
  const isMounted = useRef(false);

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setIsLoading(true);
    try {
      const [growsData, plantsData] = await Promise.all([
        getAllGrows(),
        getAllPlants(),
      ]);

      if (!isMounted.current || requestId !== loadRequestId.current) {
        return;
      }

      setGrows(growsData);
      setPlants(plantsData);
      setError(null);
    } catch (error) {
      if (!isMounted.current || requestId !== loadRequestId.current) {
        return;
      }

      console.error('Failed to load statistics data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load statistics data');
    } finally {
      if (isMounted.current && requestId === loadRequestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadData();

    return () => {
      isMounted.current = false;
      loadRequestId.current += 1;
    };
  }, [loadData]);

  // Filter to only harvested plants with dry yield data
  const harvestedPlants = useMemo(() => {
    return getHarvestedPlants(plants, grows);
  }, [plants, grows]);

  // Summary statistics
  const summary = useMemo(() => {
    return getYieldSummary(harvestedPlants);
  }, [harvestedPlants]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 space-y-7">
        <Card className="border-destructive/35 bg-destructive/10">
          <CardContent className="py-10 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">Statistics could not be loaded</h2>
            <p className="mb-6 text-destructive">{error}</p>
            <Button
              variant="outline"
              className="border-destructive/45 text-destructive hover:bg-destructive/10"
              onClick={loadData}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-5">
      {!summary && (
        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="infotainment-panel overflow-hidden p-0">
            <div className="border-b border-white/10 p-4">
              <div className="os-section-title">
                <Scale className="h-4 w-4" />
                Analysis console
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">No harvest signal yet</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Statistics unlock after the first plant harvest is recorded. Until then, the console shows the data path that will feed yield, strain and grow analysis.
              </p>
            </div>

            <div className="grid gap-2 p-4 sm:grid-cols-3">
              <StatPrepCard label="Harvested plants" value="0" helper="Need dry yield" />
              <StatPrepCard label="Yield records" value="0" helper="Awaiting input" />
              <StatPrepCard label="Analysis tabs" value="3" helper="Ready to populate" />
            </div>

            <div className="grid gap-2 px-4 pb-4 md:grid-cols-3">
              {[
                ['Open a grow', 'Choose the grow workspace where the harvested plant lives.', Sprout],
                ['Record harvest', 'Open the plant and save wet or dry yield data.', ClipboardList],
                ['Return to stats', 'Compare strains, grows and the harvest timeline.', BarChart3],
              ].map(([title, detail, Icon]) => (
                <div key={title as string} className="os-card p-3">
                  {typeof Icon !== 'string' && <Icon className="h-5 w-5 text-primary" />}
                  <div className="mt-2 text-sm font-semibold text-foreground">{title as string}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{detail as string}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="infotainment-panel p-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Leaf className="h-4 w-4" />
                Next action
              </div>
              <h3 className="mt-2 text-xl font-semibold text-foreground">Go to grows</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create or open a grow, add plants, then record harvest values from the plant detail panel.
              </p>
            </div>
            <Button
              onClick={() => navigateTo('grows')}
              className="mt-4 h-12 w-full rounded-2xl"
            >
              Open grow workspace
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </aside>
        </section>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-semibold text-primary">
                  {summary.totalDryYield}g
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Total Yield</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-semibold text-foreground">
                  {summary.avgYieldPerPlant}g
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Avg per Plant</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-semibold text-foreground">
                  {summary.totalPlants}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Plants Harvested</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-semibold text-foreground">
                  {summary.uniqueStrains}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Unique Strains</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-primary/35 bg-primary/10">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-2xl bg-primary/[0.12] p-3">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-primary">
                    {summary.maxYield}g
                  </div>
                  <div className="text-sm text-muted-foreground">Best Single Plant Yield</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-xl border border-emerald-300/[0.18] bg-emerald-300/10 p-3 text-emerald-200">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-foreground">
                    {summary.minYield}g - {summary.maxYield}g
                  </div>
                  <div className="text-sm text-muted-foreground">Yield Range</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" />
                Detailed Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="strains" className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-1 gap-1 sm:grid-cols-3">
                  <TabsTrigger value="strains">
                    <Leaf className="h-4 w-4 mr-2" />
                    By Strain
                  </TabsTrigger>
                  <TabsTrigger value="grows">
                    <Scale className="h-4 w-4 mr-2" />
                    By Grow
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    <Calendar className="h-4 w-4 mr-2" />
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="strains">
                  <StrainStatistics plants={harvestedPlants} />
                </TabsContent>

                <TabsContent value="grows">
                  <GrowStatistics plants={harvestedPlants} grows={grows} />
                </TabsContent>

                <TabsContent value="history">
                  <YieldHistory plants={harvestedPlants} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatPrepCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="os-stat-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}
