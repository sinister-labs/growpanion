"use client";

import React, { useEffect, useState, useMemo } from 'react';
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

const clampFiniteNumber = (value: number, min: number, max: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

const parseClampedNumber = (value: string, min: number, max: number, fallback: number): number => {
  if (value.trim() === '') return fallback;
  return clampFiniteNumber(Number(value), min, max, fallback);
};

const parseOptionalClampedNumber = (value: string, min: number, max: number): number | undefined => {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampFiniteNumber(parsed, min, max, min) : undefined;
};

const HarvestCalculator: React.FC<HarvestCalculatorProps> = ({
  initialPlantCount = 4,
  expectedYield,
  actualYield: initialActualYield,
  onSaveYield,
}) => {
  // Form state
  const [plantCount, setPlantCount] = useState(() => Math.round(clampFiniteNumber(initialPlantCount, 1, 100, 4)));
  const [strainType, setStrainType] = useState<StrainType>('photo');
  const [medium, setMedium] = useState<MediumType>('soil');
  const [lightType, setLightType] = useState<LightType>('led');
  const [lightWattage, setLightWattage] = useState(400);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [growSpaceSqM, setGrowSpaceSqM] = useState<number | undefined>(1);

  // Actual yield input
  const [actualYield, setActualYield] = useState<number | undefined>(() => (
    initialActualYield != null ? parseOptionalClampedNumber(String(initialActualYield), 0.1, 100000) : undefined
  ));

  useEffect(() => {
    setActualYield(initialActualYield != null
      ? parseOptionalClampedNumber(String(initialActualYield), 0.1, 100000)
      : undefined
    );
  }, [initialActualYield]);

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

  const comparisonExpectedYield = expectedYield != null && Number.isFinite(expectedYield) && expectedYield > 0
    ? expectedYield
    : estimation.averageYield;

  // Calculate comparison if actual yield is provided
  const comparison = useMemo<YieldComparison | null>(() => {
    if (actualYield && actualYield > 0) {
      return compareYield({
        ...estimation,
        averageYield: comparisonExpectedYield,
      }, actualYield);
    }
    return null;
  }, [estimation, comparisonExpectedYield, actualYield]);

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
      onSaveYield(comparisonExpectedYield, actualYield);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/[0.12] p-2">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg text-foreground">Harvest Yield Calculator</CardTitle>
            <p className="text-sm text-muted-foreground">
              Estimate your expected yield based on grow parameters
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="estimate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="estimate">
              <Calculator className="h-4 w-4 mr-2" />
              Estimate
            </TabsTrigger>
            <TabsTrigger value="compare">
              <TrendingUp className="h-4 w-4 mr-2" />
              Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estimate" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Number of Plants</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={plantCount}
                  onChange={(e) => setPlantCount(Math.round(parseClampedNumber(e.target.value, 1, 100, 1)))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Strain Type</Label>
                <CustomDropdown
                  options={strainOptions}
                  value={strainType}
                  onChange={(v) => setStrainType(v as StrainType)}
                  placeholder="Select strain type"
                  width="w-full"
                  buttonClassName="mt-1"
                />
              </div>

              <div>
                <Label>Growing Medium</Label>
                <CustomDropdown
                  options={mediumOptions}
                  value={medium}
                  onChange={(v) => setMedium(v as MediumType)}
                  placeholder="Select medium"
                  width="w-full"
                  buttonClassName="mt-1"
                />
              </div>

              <div>
                <Label>Light Type</Label>
                <CustomDropdown
                  options={lightOptions}
                  value={lightType}
                  onChange={(v) => setLightType(v as LightType)}
                  placeholder="Select light"
                  width="w-full"
                  buttonClassName="mt-1"
                />
              </div>

              <div>
                <Label>Light Wattage</Label>
                <Input
                  type="number"
                  min={50}
                  max={2000}
                  value={lightWattage}
                  onChange={(e) => setLightWattage(parseClampedNumber(e.target.value, 50, 2000, 400))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Experience Level</Label>
                <CustomDropdown
                  options={experienceOptions}
                  value={experienceLevel}
                  onChange={(v) => setExperienceLevel(v as ExperienceLevel)}
                  placeholder="Select experience"
                  width="w-full"
                  buttonClassName="mt-1"
                />
              </div>

              <div>
                <Label>Grow Space (m²) - Optional</Label>
                <Input
                  type="number"
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={growSpaceSqM || ''}
                  onChange={(e) => setGrowSpaceSqM(parseOptionalClampedNumber(e.target.value, 0.1, 100))}
                  className="mt-1"
                  placeholder="e.g., 1.0"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-[1rem] border border-white/10 bg-white/[0.045] p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Leaf className="h-5 w-5" />
                Estimated Yield
              </h3>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="infotainment-surface p-4 text-center">
                  <div className="text-2xl font-semibold text-foreground">
                    {estimation.minYieldPerPlant}-{estimation.maxYieldPerPlant}g
                  </div>
                  <div className="text-xs text-muted-foreground">Per Plant</div>
                </div>

                <div className="rounded-3xl border border-primary/35 bg-primary/10 p-4 text-center">
                  <div className="text-2xl font-semibold text-primary">
                    {estimation.totalMinYield}-{estimation.totalMaxYield}g
                  </div>
                  <div className="text-xs text-muted-foreground">Total Yield</div>
                </div>

                <div className="infotainment-surface p-4 text-center">
                  <div className="text-2xl font-semibold text-foreground">
                    ~{estimation.averageYield}g
                  </div>
                  <div className="text-xs text-muted-foreground">Average</div>
                </div>

                <div className="infotainment-surface p-4 text-center">
                  <div className="text-2xl font-semibold text-foreground">
                    {estimation.efficiency.gramsPerWatt.min}-{estimation.efficiency.gramsPerWatt.max}
                  </div>
                  <div className="text-xs text-muted-foreground">g/Watt</div>
                </div>
              </div>

              {estimation.efficiency.gramsPerSqM && (
                <div className="text-center text-sm text-muted-foreground">
                  Estimated {estimation.efficiency.gramsPerSqM.min}-{estimation.efficiency.gramsPerSqM.max} g/m²
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="compare" className="mt-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Actual Harvest Yield (g)</Label>
                <Input
                  type="number"
                  min={0}
                  value={actualYield || ''}
                  onChange={(e) => setActualYield(parseOptionalClampedNumber(e.target.value, 0.1, 100000))}
                  className="mt-1"
                  placeholder="Enter your actual harvest weight in grams"
                />
              </div>

              {comparison && (
                <div className="space-y-4 rounded-[1rem] border border-white/10 bg-white/[0.045] p-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <Award className="h-5 w-5" />
                    Yield Comparison
                  </h3>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="infotainment-surface p-4">
                      <div className="text-xl font-semibold text-muted-foreground">
                        {comparison.expectedAverage}g
                      </div>
                      <div className="text-xs text-muted-foreground">Expected</div>
                    </div>

                    <div className="infotainment-surface p-4">
                      <div className="text-xl font-semibold text-foreground">
                        {comparison.actualYield}g
                      </div>
                      <div className="text-xs text-muted-foreground">Actual</div>
                    </div>

                    <div className="infotainment-surface p-4">
                      <div className={`text-xl font-semibold ${
                        comparison.difference >= 0 ? 'text-primary' : 'text-destructive'
                      }`}>
                        {comparison.difference >= 0 ? '+' : ''}{comparison.difference}g
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ({comparison.percentageDifference >= 0 ? '+' : ''}{comparison.percentageDifference}%)
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-3xl p-4 text-center ${getRatingColorClass(comparison.rating)}`}>
                    <div className="text-lg font-semibold">{comparison.ratingLabel}</div>
                  </div>

                  {onSaveYield && (
                    <Button
                      onClick={handleSave}
                      className="w-full"
                    >
                      Save Yield Data
                    </Button>
                  )}
                </div>
              )}

              {!actualYield && (
                <div className="py-8 text-center text-muted-foreground">
                  <Scale className="mx-auto mb-4 h-12 w-12 opacity-50" />
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
