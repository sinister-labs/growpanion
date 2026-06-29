"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plant, HarvestRecord } from '@/components/plant-modal/types';
import { Scale, Droplets, Leaf, Calendar } from 'lucide-react';
import { calculateDryingLoss, parsePositiveHarvestWeight } from '@/lib/harvest-utils';

interface HarvestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant;
  onSave: (plant: Plant) => boolean | void | Promise<boolean | void>;
}

export function HarvestDialog({ open, onOpenChange, plant, onSave }: HarvestDialogProps) {
  const [harvestDate, setHarvestDate] = useState(
    plant.harvest?.date || new Date().toISOString().split('T')[0]
  );
  const [yieldWetGrams, setYieldWetGrams] = useState<string>(
    plant.harvest?.yieldWetGrams?.toString() || ''
  );
  const [yieldDryGrams, setYieldDryGrams] = useState<string>(
    plant.harvest?.yieldDryGrams?.toString() || ''
  );
  const [notes, setNotes] = useState(plant.harvest?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const wetWeightValue = parsePositiveHarvestWeight(yieldWetGrams);
  const dryWeightValue = parsePositiveHarvestWeight(yieldDryGrams);
  const dryingLoss = React.useMemo(
    () => calculateDryingLoss(wetWeightValue, dryWeightValue),
    [wetWeightValue, dryWeightValue]
  );
  const hasInvalidWetWeight = yieldWetGrams.trim() !== '' && wetWeightValue === null;
  const hasInvalidDryWeight = yieldDryGrams.trim() !== '' && dryWeightValue === null;
  const hasImpossibleDryingLoss = wetWeightValue !== null &&
    dryWeightValue !== null &&
    dryWeightValue > wetWeightValue;

  const handleSave = async () => {
    if (isSaving) return;

    const harvest: HarvestRecord = {
      date: harvestDate,
      yieldWetGrams: wetWeightValue ?? undefined,
      yieldDryGrams: dryWeightValue ?? undefined,
      notes: notes || undefined,
    };

    const updatedPlant: Plant = {
      ...plant,
      harvest,
      isHarvested: true,
    };

    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await onSave(updatedPlant);
      if (saved === false) {
        setSaveError('Failed to save harvest.');
        return;
      }
      onOpenChange(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save harvest.');
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = dryWeightValue !== null && !hasInvalidWetWeight && !hasImpossibleDryingLoss;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Scale className="h-5 w-5 text-primary" />
            Harvest: {plant.name}
          </DialogTitle>
          <DialogDescription>
            Record the yield for this plant. Dry weight is required for statistics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Harvest Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Harvest Date
            </Label>
            <Input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
            />
          </div>

          {/* Wet Weight */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-[#2FA98C]" />
              Wet Weight (g) - Optional
            </Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g., 250"
              value={yieldWetGrams}
              onChange={(e) => setYieldWetGrams(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Fresh weight immediately after harvest</p>
          </div>

          {/* Dry Weight */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-primary" />
              Dry Weight (g) *
            </Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g., 60"
              value={yieldDryGrams}
              onChange={(e) => setYieldDryGrams(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Final cured weight (required for statistics)</p>
          </div>

          {/* Drying Loss Indicator */}
          {dryingLoss !== null && (
            <div className="flex items-center justify-between rounded-[1rem] border border-white/10 bg-white/[0.045] p-3">
              <span className="text-sm text-muted-foreground">Drying Loss</span>
              <span className={`text-sm font-medium ${
                dryingLoss >= 70 && dryingLoss <= 80 ? 'text-primary' : 'text-[#00DF81]'
              }`}>
                {dryingLoss}%
                {dryingLoss >= 70 && dryingLoss <= 80 && ' (typical)'}
              </span>
            </div>
          )}

          {hasImpossibleDryingLoss && (
            <p className="text-xs text-destructive">
              Dry weight cannot be greater than wet weight.
            </p>
          )}

          {hasInvalidWetWeight && (
            <p className="text-xs text-destructive">
              Wet weight must be a positive number when provided.
            </p>
          )}

          {hasInvalidDryWeight && (
            <p className="text-xs text-destructive">
              Dry weight must be a positive number.
            </p>
          )}

          {saveError && (
            <p className="text-xs text-destructive">
              {saveError}
            </p>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Quality notes, trichome maturity, smell/taste..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
          >
            <Scale className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Harvest'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
