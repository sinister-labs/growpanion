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

interface HarvestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant;
  onSave: (plant: Plant) => void;
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

  const dryingLoss = React.useMemo(() => {
    const wet = parseFloat(yieldWetGrams);
    const dry = parseFloat(yieldDryGrams);
    if (wet > 0 && dry > 0) {
      return Math.round(((wet - dry) / wet) * 100);
    }
    return null;
  }, [yieldWetGrams, yieldDryGrams]);

  const handleSave = () => {
    const harvest: HarvestRecord = {
      date: harvestDate,
      yieldWetGrams: yieldWetGrams ? parseFloat(yieldWetGrams) : undefined,
      yieldDryGrams: yieldDryGrams ? parseFloat(yieldDryGrams) : undefined,
      notes: notes || undefined,
    };

    const updatedPlant: Plant = {
      ...plant,
      harvest,
      isHarvested: true,
    };

    onSave(updatedPlant);
    onOpenChange(false);
  };

  const canSave = yieldDryGrams && parseFloat(yieldDryGrams) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Scale className="h-5 w-5 text-green-400" />
            Harvest: {plant.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Record the yield for this plant. Dry weight is required for statistics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Harvest Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              Harvest Date
            </Label>
            <Input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="bg-gray-700 border-gray-600"
            />
          </div>

          {/* Wet Weight */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-400" />
              Wet Weight (g) - Optional
            </Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g., 250"
              value={yieldWetGrams}
              onChange={(e) => setYieldWetGrams(e.target.value)}
              className="bg-gray-700 border-gray-600"
            />
            <p className="text-xs text-gray-500">Fresh weight immediately after harvest</p>
          </div>

          {/* Dry Weight */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-400" />
              Dry Weight (g) *
            </Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g., 60"
              value={yieldDryGrams}
              onChange={(e) => setYieldDryGrams(e.target.value)}
              className="bg-gray-700 border-gray-600"
            />
            <p className="text-xs text-gray-500">Final cured weight (required for statistics)</p>
          </div>

          {/* Drying Loss Indicator */}
          {dryingLoss !== null && (
            <div className="bg-gray-900/50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-gray-400">Drying Loss</span>
              <span className={`text-sm font-medium ${
                dryingLoss >= 70 && dryingLoss <= 80 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {dryingLoss}%
                {dryingLoss >= 70 && dryingLoss <= 80 && ' (typical)'}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Quality notes, trichome maturity, smell/taste..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-gray-700 border-gray-600 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className="bg-green-600 hover:bg-green-700"
          >
            <Scale className="h-4 w-4 mr-2" />
            Save Harvest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
