"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  estimateYield,
  compareYield,
  YieldEstimation,
  YieldComparison,
  StrainType,
  MediumType,
  LightType,
  ExperienceLevel,
  STRAIN_TYPE_LABELS,
  MEDIUM_LABELS,
  LIGHT_LABELS,
  EXPERIENCE_LABELS,
  getRatingColorClass,
} from '@/lib/harvest-utils';
import { Scale, Calculator, TrendingUp, Award, Leaf } from 'lucide-react';

interface HarvestCalculatorProps {
  growId?: string;
  initialPlantCount?: number;
  expectedYield?: number;
  actualYield?: number;
  onSaveYield?: (expected: number, actual: number) => void;
}

const HarvestCalculator: React.FC<HarvestCalculatorProps> = ({
  initialPlantCount = 4,
  actualYield: initialActualYield,
  onSaveYield,
}) => {
  // Form state
  const [plantCount, setPlantCount] = useState(initialPlantCount);
  const [strainType, setStrainType] = useState<StrainType>('photo');
  const [medium, setMedium] = useState<MediumType>('soil');
  const [lightType, setLightType] = useState<LightType>('led');
  const [lightWattage, setLightWattage] = useState(400);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [growSpaceSqM, setGrowSpaceSqM] = useState<number | undefined>(1);

  // Actual yield input
  const [actualYield, setActualYield] = useState<number | undefined>(initialActualYield);

  // Calculate estimation
  const estimation = useMemo<YieldEstimation>(() => {
    return estimateYield({
      plantCount,
      strainType,
      medium,
      lightType,
      lightWattage,
      experienceLevel,
      growSpaceSqM,
    });
  }, [plantCount, strainType, medium, lightType, lightWattage, experienceLevel, growSpaceSqM]);

  // Calculate comparison if actual yield is provided
  const comparison = useMemo<YieldComparison | null>(() => {
    if (actualYield && actualYield > 0) {
      return compareYield(estimation, actualYield);
    }
    return null;
  }, [estimation, actualYield]);

  // Dropdown options
  const strainOptions = Object.entries(STRAIN_TYPE_LABELS).map(([id, label]) => ({
    id,
    label,
  }));

  const mediumOptions = Object.entries(MEDIUM_LABELS).map(([id, label]) => ({
    id,
    label,
  }));

  const lightOptions = Object.entries(LIGHT_LABELS).map(([id, label]) => ({
    id,
    label,
  }));

  const experienceOptions = Object.entries(EXPERIENCE_LABELS).map(([id, label]) => ({
    id,
    label,
  }));

  const handleSave = () => {
    if (onSaveYield && actualYield) {
      onSaveYield(estimation.averageYield, actualYield);
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-600/20 rounded-lg">
            <Scale className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">Harvest Yield Calculator</CardTitle>
            <p className="text-sm text-gray-400">
              Estimate your expected yield based on grow parameters
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="estimate" className="w-full">
          <TabsList className="grid grid-cols-2 bg-gray-800 rounded-full">
            <TabsTrigger
              value="estimate"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-gray-800 rounded-full"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Estimate
            </TabsTrigger>
            <TabsTrigger
              value="compare"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-gray-800 rounded-full"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estimate" className="mt-6 space-y-6">
            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Number of Plants</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={plantCount}
                  onChange={(e) => setPlantCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-white">Strain Type</Label>
                <CustomDropdown
                  options={strainOptions}
                  value={strainType}
                  onChange={(v) => setStrainType(v as StrainType)}
                  placeholder="Select strain type"
                  width="w-full"
                  buttonClassName="bg-gray-700 border-gray-600 mt-1"
                />
              </div>

              <div>
                <Label className="text-white">Growing Medium</Label>
                <CustomDropdown
                  options={mediumOptions}
                  value={medium}
                  onChange={(v) => setMedium(v as MediumType)}
                  placeholder="Select medium"
                  width="w-full"
                  buttonClassName="bg-gray-700 border-gray-600 mt-1"
                />
              </div>

              <div>
                <Label className="text-white">Light Type</Label>
                <CustomDropdown
                  options={lightOptions}
                  value={lightType}
                  onChange={(v) => setLightType(v as LightType)}
                  placeholder="Select light"
                  width="w-full"
                  buttonClassName="bg-gray-700 border-gray-600 mt-1"
                />
              </div>

              <div>
                <Label className="text-white">Light Wattage</Label>
                <Input
                  type="number"
                  min={50}
                  max={2000}
                  value={lightWattage}
                  onChange={(e) => setLightWattage(Math.max(50, parseInt(e.target.value) || 400))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-white">Experience Level</Label>
                <CustomDropdown
                  options={experienceOptions}
                  value={experienceLevel}
                  onChange={(v) => setExperienceLevel(v as ExperienceLevel)}
                  placeholder="Select experience"
                  width="w-full"
                  buttonClassName="bg-gray-700 border-gray-600 mt-1"
                />
              </div>

              <div>
                <Label className="text-white">Grow Space (m²) - Optional</Label>
                <Input
                  type="number"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={growSpaceSqM || ''}
                  onChange={(e) => setGrowSpaceSqM(parseFloat(e.target.value) || undefined)}
                  className="mt-1"
                  placeholder="e.g., 1.0"
                />
              </div>
            </div>

            {/* Results */}
            <div className="bg-gray-900/50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                <Leaf className="h-5 w-5" />
                Estimated Yield
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-white">
                    {estimation.minYieldPerPlant}-{estimation.maxYieldPerPlant}g
                  </div>
                  <div className="text-xs text-gray-400">Per Plant</div>
                </div>

                <div className="text-center p-4 bg-green-600/20 rounded-lg border border-green-600/30">
                  <div className="text-2xl font-bold text-green-400">
                    {estimation.totalMinYield}-{estimation.totalMaxYield}g
                  </div>
                  <div className="text-xs text-gray-400">Total Yield</div>
                </div>

                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-white">
                    ~{estimation.averageYield}g
                  </div>
                  <div className="text-xs text-gray-400">Average</div>
                </div>

                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-white">
                    {estimation.efficiency.gramsPerWatt.min}-{estimation.efficiency.gramsPerWatt.max}
                  </div>
                  <div className="text-xs text-gray-400">g/Watt</div>
                </div>
              </div>

              {estimation.efficiency.gramsPerSqM && (
                <div className="text-center text-sm text-gray-400">
                  Estimated {estimation.efficiency.gramsPerSqM.min}-{estimation.efficiency.gramsPerSqM.max} g/m²
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="compare" className="mt-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-white">Actual Harvest Yield (g)</Label>
                <Input
                  type="number"
                  min={0}
                  value={actualYield || ''}
                  onChange={(e) => setActualYield(parseInt(e.target.value) || undefined)}
                  className="mt-1"
                  placeholder="Enter your actual harvest weight in grams"
                />
              </div>

              {comparison && (
                <div className="bg-gray-900/50 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Yield Comparison
                  </h3>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="text-xl font-bold text-gray-300">
                        {comparison.expectedAverage}g
                      </div>
                      <div className="text-xs text-gray-400">Expected</div>
                    </div>

                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <div className="text-xl font-bold text-white">
                        {comparison.actualYield}g
                      </div>
                      <div className="text-xs text-gray-400">Actual</div>
                    </div>

                    <div className="p-4 bg-gray-800/50 rounded-lg">
                      <div className={`text-xl font-bold ${
                        comparison.difference >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {comparison.difference >= 0 ? '+' : ''}{comparison.difference}g
                      </div>
                      <div className="text-xs text-gray-400">
                        ({comparison.percentageDifference >= 0 ? '+' : ''}{comparison.percentageDifference}%)
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg text-center ${getRatingColorClass(comparison.rating)}`}>
                    <div className="text-lg font-semibold">{comparison.ratingLabel}</div>
                  </div>

                  {onSaveYield && (
                    <Button
                      onClick={handleSave}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Save Yield Data
                    </Button>
                  )}
                </div>
              )}

              {!actualYield && (
                <div className="text-center py-8 text-gray-400">
                  <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Enter your actual harvest yield to compare with expectations</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

HarvestCalculator.displayName = 'HarvestCalculator';

export default HarvestCalculator;
