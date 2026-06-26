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
  Home,
  ArrowLeft,
  Loader2,
  Award,
  Calendar,
  AlertCircle
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
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 mt-6">
        <div className="flex items-center gap-2 mb-1">
          <Button
            variant="link"
            className="text-gray-400 hover:text-white p-0 h-auto flex items-center gap-1"
            onClick={() => navigateTo('dashboard')}
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          <span className="text-gray-600">/</span>
          <h1 className="font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-400" />
            Yield Statistics
          </h1>
        </div>

        <Card className="bg-red-900/20 border-red-800">
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-semibold text-white mb-2">Statistics could not be loaded</h2>
            <p className="text-red-200 mb-6">{error}</p>
            <Button
              variant="outline"
              className="border-red-700 text-red-200 hover:bg-red-900/30"
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
    <div className="space-y-8 mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="link"
              className="text-gray-400 hover:text-white p-0 h-auto flex items-center gap-1"
              onClick={() => navigateTo('dashboard')}
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Button>
            <span className="text-gray-600">/</span>
            <h1 className="font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-400" />
              Yield Statistics
            </h1>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Track and analyze your harvest yields across strains and grows
          </p>
        </div>

        <Button
          variant="outline"
          className="border-gray-700 text-gray-400 hover:text-white rounded-full"
          onClick={() => navigateTo('dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* No Data State */}
      {!summary && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="py-16 text-center">
            <Scale className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">No Harvest Data Yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Start recording your harvests to see yield statistics. Go to a plant and click the 
              harvest button to record your first yield.
            </p>
            <Button
              onClick={() => navigateTo('grows')}
              className="bg-green-600 hover:bg-green-700"
            >
              <Leaf className="mr-2 h-4 w-4" />
              Go to Grows
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-green-400">
                  {summary.totalDryYield}g
                </div>
                <div className="text-sm text-gray-400 mt-1">Total Yield</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-white">
                  {summary.avgYieldPerPlant}g
                </div>
                <div className="text-sm text-gray-400 mt-1">Avg per Plant</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-white">
                  {summary.totalPlants}
                </div>
                <div className="text-sm text-gray-400 mt-1">Plants Harvested</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-white">
                  {summary.uniqueStrains}
                </div>
                <div className="text-sm text-gray-400 mt-1">Unique Strains</div>
              </CardContent>
            </Card>
          </div>

          {/* Best/Worst Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-green-600/10 border-green-600/30">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-green-600/20 rounded-lg">
                  <Award className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {summary.maxYield}g
                  </div>
                  <div className="text-sm text-gray-400">Best Single Plant Yield</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 bg-gray-700 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {summary.minYield}g - {summary.maxYield}g
                  </div>
                  <div className="text-sm text-gray-400">Yield Range</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Statistics Tabs */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-400" />
                Detailed Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="strains" className="w-full">
                <TabsList className="grid grid-cols-3 bg-gray-800 rounded-full mb-6">
                  <TabsTrigger
                    value="strains"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-gray-800 rounded-full"
                  >
                    <Leaf className="h-4 w-4 mr-2" />
                    By Strain
                  </TabsTrigger>
                  <TabsTrigger
                    value="grows"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-gray-800 rounded-full"
                  >
                    <Scale className="h-4 w-4 mr-2" />
                    By Grow
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-green-500 data-[state=active]:text-gray-800 rounded-full"
                  >
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
