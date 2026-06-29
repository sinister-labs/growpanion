"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import { Sun, Clock, Zap, Leaf, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  calculateDLI,
  calculateOptimalPPFD,
  clampFiniteNumber,
  DLI_RECOMMENDATIONS,
  DLIRating,
  DLIResult,
  getDLIRating,
  getInitialSchedule,
  GrowLightPhase,
  LIGHT_SCHEDULES,
  normalizeGrowLightPhase,
  parseClampedNumber,
} from '@/lib/dli-utils';

interface DLICalculatorProps {
  initialPPFD?: number;
  initialPhotoperiod?: number;
  growPhase?: GrowLightPhase;
}

function getRatingColor(rating: DLIRating): string {
  switch (rating) {
    case 'too_low': return 'border border-destructive/35 bg-destructive/10 text-destructive';
    case 'low': return 'border border-[#00DF81]/45 bg-[#00DF81]/16 text-[#AACBC4]';
    case 'optimal': return 'border border-primary/35 bg-primary/10 text-primary';
    case 'high': return 'border border-[#2FA98C]/45 bg-[#2FA98C]/18 text-[#00DF81]';
    case 'too_high': return 'border border-destructive/35 bg-destructive/10 text-destructive';
  }
}

function getRatingIcon(rating: DLIRating) {
  switch (rating) {
    case 'too_low':
    case 'too_high':
      return AlertTriangle;
    case 'low':
    case 'high':
      return Zap;
    case 'optimal':
      return CheckCircle2;
  }
}

const DLICalculator: React.FC<DLICalculatorProps> = ({
  initialPPFD = 600,
  initialPhotoperiod = 18,
  growPhase = 'veg',
}) => {
  const [ppfd, setPPFD] = useState(clampFiniteNumber(initialPPFD, 0, 2000));
  const [selectedSchedule, setSelectedSchedule] = useState(getInitialSchedule(initialPhotoperiod));
  const [customHours, setCustomHours] = useState(clampFiniteNumber(initialPhotoperiod, 1, 24));
  const [phase, setPhase] = useState<GrowLightPhase>(normalizeGrowLightPhase(growPhase));

  // Get actual photoperiod hours
  const photoperiod = useMemo(() => {
    if (selectedSchedule === 'custom') {
      return customHours;
    }
    return LIGHT_SCHEDULES.find(s => s.id === selectedSchedule)?.hours || 18;
  }, [selectedSchedule, customHours]);

  // Calculate DLI and rating
  const result = useMemo<DLIResult>(() => {
    const dli = calculateDLI(ppfd, photoperiod);
    return getDLIRating(dli, phase);
  }, [ppfd, photoperiod, phase]);

  // Calculate optimal PPFD for current schedule
  const optimalPPFD = useMemo(() => {
    return calculateOptimalPPFD(phase, photoperiod);
  }, [phase, photoperiod]);

  const RatingIcon = getRatingIcon(result.rating);

  const phaseOptions = [
    { id: 'seedling', label: 'Seedling (12-22 DLI)' },
    { id: 'veg', label: 'Vegetative (25-45 DLI)' },
    { id: 'flower', label: 'Flowering (40-65 DLI)' },
  ];

  const scheduleOptions = LIGHT_SCHEDULES.map(s => ({
    id: s.id,
    label: s.label,
  }));

  return (
    <Card>
      <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-[#00DF81]/16 p-1.5">
            <Sun className="h-4 w-4 text-[#00DF81]" />
          </div>
          <div>
            <CardTitle className="text-base text-foreground">DLI Calculator</CardTitle>
            <p className="text-xs text-muted-foreground">
              Calculate Daily Light Integral for optimal growth
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-3 pt-0 sm:p-4 sm:pt-0">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-primary" />
              Growth Phase
            </Label>
            <CustomDropdown
              options={phaseOptions}
              value={phase}
              onChange={(v) => setPhase(normalizeGrowLightPhase(v))}
              placeholder="Select phase"
              width="w-full"
              buttonClassName="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#00DF81]" />
              PPFD (µmol/m²/s)
            </Label>
            <Input
              type="number"
              min={0}
              max={2000}
              value={ppfd}
              onChange={(e) => setPPFD(parseClampedNumber(e.target.value, 0, 2000))}
              className="mt-1"
              placeholder="e.g., 600"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Typical range: 400-1000 µmol/m²/s
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#2FA98C]" />
              Light Schedule
            </Label>
            <CustomDropdown
              options={scheduleOptions}
              value={selectedSchedule}
              onChange={setSelectedSchedule}
              placeholder="Select schedule"
              width="w-full"
              buttonClassName="mt-1"
            />
          </div>

          {selectedSchedule === 'custom' && (
            <div className="sm:col-span-2">
              <Label>Custom Light Hours</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={customHours}
                onChange={(e) => setCustomHours(parseClampedNumber(e.target.value, 1, 24))}
                className="mt-1"
                placeholder="Hours of light per day"
              />
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-[1rem] border border-white/10 bg-white/[0.045] p-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[#00DF81]">
            <Sun className="h-4 w-4" />
            DLI Result
          </h3>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-primary/35 bg-primary/10 p-2.5 text-center">
              <div className="text-2xl font-semibold text-primary">
                {result.dli.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">mol/m²/day</div>
            </div>

            <div className="infotainment-surface p-2.5 text-center">
              <div className="text-xl font-semibold text-foreground">
                {ppfd}
              </div>
              <div className="text-xs text-muted-foreground">PPFD µmol/m²/s</div>
            </div>

            <div className="infotainment-surface p-2.5 text-center">
              <div className="text-xl font-semibold text-foreground">
                {photoperiod}h
              </div>
              <div className="text-xs text-muted-foreground">Light per day</div>
            </div>
          </div>

          <div className={`rounded-2xl p-2.5 ${getRatingColor(result.rating)}`}>
            <div className="mb-1 flex items-center gap-2">
              <RatingIcon className="h-4 w-4" />
              <span className="font-semibold">{result.ratingLabel}</span>
            </div>
            <p className="text-sm opacity-90">{result.suggestion}</p>
          </div>

          <div className="infotainment-surface p-2.5 text-sm">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">Tip:</span> For optimal {DLI_RECOMMENDATIONS[phase].label.toLowerCase()} DLI ({DLI_RECOMMENDATIONS[phase].optimal} mol/m²/day) with {photoperiod}h light, 
              aim for <span className="font-semibold text-primary">{optimalPPFD} PPFD</span>.
            </p>
          </div>

          <details className="group border-t border-white/10 pt-2">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
              DLI reference ranges
              <span className="text-primary group-open:hidden">Show</span>
              <span className="hidden text-primary group-open:inline">Hide</span>
            </summary>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {Object.entries(DLI_RECOMMENDATIONS).map(([key, rec]) => (
                <div 
                  key={key} 
                  className={`rounded-2xl p-2 text-center ${
                    phase === key ? 'bg-primary/10 text-primary' : 'border border-white/10 bg-white/[0.045] text-muted-foreground'
                  }`}
                >
                  <div className="font-medium">{rec.label}</div>
                  <div>{rec.min}-{rec.max}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
};

DLICalculator.displayName = 'DLICalculator';

export default DLICalculator;
