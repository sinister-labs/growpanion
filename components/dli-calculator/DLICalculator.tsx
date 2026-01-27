"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import { Sun, Clock, Zap, Leaf, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DLICalculatorProps {
  initialPPFD?: number;
  initialPhotoperiod?: number;
  growPhase?: 'seedling' | 'veg' | 'flower';
}

// DLI recommendations by growth phase (mol/m²/day)
const DLI_RECOMMENDATIONS = {
  seedling: { min: 12, optimal: 18, max: 22, label: 'Seedling' },
  veg: { min: 25, optimal: 35, max: 45, label: 'Vegetative' },
  flower: { min: 40, optimal: 50, max: 65, label: 'Flowering' },
} as const;

// Common light schedules
const LIGHT_SCHEDULES = [
  { id: '24', label: '24/0 (24h light)', hours: 24 },
  { id: '20', label: '20/4', hours: 20 },
  { id: '18', label: '18/6 (Veg standard)', hours: 18 },
  { id: '16', label: '16/8', hours: 16 },
  { id: '14', label: '14/10', hours: 14 },
  { id: '12', label: '12/12 (Flower standard)', hours: 12 },
  { id: 'custom', label: 'Custom', hours: 0 },
];

type DLIRating = 'too_low' | 'low' | 'optimal' | 'high' | 'too_high';

interface DLIResult {
  dli: number;
  rating: DLIRating;
  ratingLabel: string;
  suggestion: string;
}

/**
 * Calculate DLI (Daily Light Integral)
 * Formula: DLI = PPFD × (hours × 3600) / 1,000,000
 */
function calculateDLI(ppfd: number, photoperiod: number): number {
  return (ppfd * photoperiod * 3600) / 1_000_000;
}

/**
 * Get DLI rating based on growth phase
 */
function getDLIRating(dli: number, phase: 'seedling' | 'veg' | 'flower'): DLIResult {
  const rec = DLI_RECOMMENDATIONS[phase];
  
  let rating: DLIRating;
  let ratingLabel: string;
  let suggestion: string;

  if (dli < rec.min * 0.7) {
    rating = 'too_low';
    ratingLabel = 'Too Low';
    suggestion = `Increase PPFD or light hours. Target: ${rec.min}-${rec.optimal} DLI for ${rec.label}.`;
  } else if (dli < rec.min) {
    rating = 'low';
    ratingLabel = 'Below Optimal';
    suggestion = `Slightly increase light. Target: ${rec.optimal} DLI for best ${rec.label.toLowerCase()} growth.`;
  } else if (dli <= rec.optimal + 5) {
    rating = 'optimal';
    ratingLabel = 'Optimal';
    suggestion = `Perfect light levels for ${rec.label.toLowerCase()} phase!`;
  } else if (dli <= rec.max) {
    rating = 'high';
    ratingLabel = 'High (OK)';
    suggestion = `Good levels, monitor for light stress. Max recommended: ${rec.max} DLI.`;
  } else {
    rating = 'too_high';
    ratingLabel = 'Too High';
    suggestion = `Risk of light stress! Reduce PPFD or hours. Max for ${rec.label}: ${rec.max} DLI.`;
  }

  return { dli, rating, ratingLabel, suggestion };
}

function getRatingColor(rating: DLIRating): string {
  switch (rating) {
    case 'too_low': return 'text-red-400 bg-red-600/20';
    case 'low': return 'text-yellow-400 bg-yellow-600/20';
    case 'optimal': return 'text-green-400 bg-green-600/20';
    case 'high': return 'text-blue-400 bg-blue-600/20';
    case 'too_high': return 'text-red-400 bg-red-600/20';
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
  const [ppfd, setPPFD] = useState(initialPPFD);
  const [selectedSchedule, setSelectedSchedule] = useState('18');
  const [customHours, setCustomHours] = useState(initialPhotoperiod);
  const [phase, setPhase] = useState<'seedling' | 'veg' | 'flower'>(growPhase);

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
    if (photoperiod <= 0) return 0;
    const rec = DLI_RECOMMENDATIONS[phase];
    // DLI = PPFD × hours × 3600 / 1,000,000
    // PPFD = DLI × 1,000,000 / (hours × 3600)
    return Math.round((rec.optimal * 1_000_000) / (photoperiod * 3600));
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
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-600/20 rounded-lg">
            <Sun className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">DLI Calculator</CardTitle>
            <p className="text-sm text-gray-400">
              Calculate Daily Light Integral for optimal growth
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Growth Phase */}
          <div className="sm:col-span-2">
            <Label className="text-white flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-400" />
              Growth Phase
            </Label>
            <CustomDropdown
              options={phaseOptions}
              value={phase}
              onChange={(v) => setPhase(v as 'seedling' | 'veg' | 'flower')}
              placeholder="Select phase"
              width="w-full"
              buttonClassName="bg-gray-700 border-gray-600 mt-1"
            />
          </div>

          {/* PPFD Input */}
          <div>
            <Label className="text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              PPFD (µmol/m²/s)
            </Label>
            <Input
              type="number"
              min={0}
              max={2000}
              value={ppfd}
              onChange={(e) => setPPFD(Math.max(0, parseInt(e.target.value) || 0))}
              className="mt-1"
              placeholder="e.g., 600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Typical range: 400-1000 µmol/m²/s
            </p>
          </div>

          {/* Light Schedule */}
          <div>
            <Label className="text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              Light Schedule
            </Label>
            <CustomDropdown
              options={scheduleOptions}
              value={selectedSchedule}
              onChange={setSelectedSchedule}
              placeholder="Select schedule"
              width="w-full"
              buttonClassName="bg-gray-700 border-gray-600 mt-1"
            />
          </div>

          {/* Custom Hours (if custom selected) */}
          {selectedSchedule === 'custom' && (
            <div className="sm:col-span-2">
              <Label className="text-white">Custom Light Hours</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={customHours}
                onChange={(e) => setCustomHours(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                className="mt-1"
                placeholder="Hours of light per day"
              />
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-gray-900/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
            <Sun className="h-5 w-5" />
            DLI Result
          </h3>

          {/* Main DLI Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-600/20 rounded-lg border border-yellow-600/30">
              <div className="text-3xl font-bold text-yellow-400">
                {result.dli.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">mol/m²/day</div>
            </div>

            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-white">
                {ppfd}
              </div>
              <div className="text-xs text-gray-400">PPFD µmol/m²/s</div>
            </div>

            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-2xl font-bold text-white">
                {photoperiod}h
              </div>
              <div className="text-xs text-gray-400">Light per day</div>
            </div>
          </div>

          {/* Rating */}
          <div className={`p-4 rounded-lg ${getRatingColor(result.rating)}`}>
            <div className="flex items-center gap-2 mb-2">
              <RatingIcon className="h-5 w-5" />
              <span className="font-semibold">{result.ratingLabel}</span>
            </div>
            <p className="text-sm opacity-90">{result.suggestion}</p>
          </div>

          {/* Optimal PPFD suggestion */}
          <div className="bg-gray-800/50 rounded-lg p-4 text-sm">
            <p className="text-gray-400">
              <span className="text-white font-medium">Tip:</span> For optimal {DLI_RECOMMENDATIONS[phase].label.toLowerCase()} DLI ({DLI_RECOMMENDATIONS[phase].optimal} mol/m²/day) with {photoperiod}h light, 
              aim for <span className="text-yellow-400 font-bold">{optimalPPFD} PPFD</span>.
            </p>
          </div>

          {/* Reference Table */}
          <div className="pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 mb-2">DLI Reference (mol/m²/day):</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.entries(DLI_RECOMMENDATIONS).map(([key, rec]) => (
                <div 
                  key={key} 
                  className={`p-2 rounded text-center ${
                    phase === key ? 'bg-green-600/20 text-green-400' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  <div className="font-medium">{rec.label}</div>
                  <div>{rec.min}-{rec.max}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

DLICalculator.displayName = 'DLICalculator';

export default DLICalculator;
