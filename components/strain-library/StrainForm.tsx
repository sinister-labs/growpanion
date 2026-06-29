"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import { Strain, generateId } from '@/lib/db';
import { Save, X } from 'lucide-react';
import { parseOptionalStrainNumber, validateStrainNumbers } from '@/lib/strain-utils';

interface StrainFormProps {
  strain?: Strain;
  onSave: (strain: Strain) => void | Promise<void>;
  onCancel: () => void;
}

const GENETICS_OPTIONS = [
  { id: 'Indica', label: 'Indica' },
  { id: 'Sativa', label: 'Sativa' },
  { id: 'Hybrid', label: 'Hybrid' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'easy', label: 'Easy - Good for beginners' },
  { id: 'medium', label: 'Medium - Some experience needed' },
  { id: 'hard', label: 'Hard - For experienced growers' },
];

const createDefaultFormData = (): Partial<Strain> => ({
  id: generateId(),
  name: '',
  breeder: '',
  genetics: 'Hybrid',
  indicaPercent: undefined,
  sativaPercent: undefined,
  thcPercent: undefined,
  cbdPercent: undefined,
  floweringWeeks: undefined,
  difficulty: undefined,
  description: '',
});

const StrainForm: React.FC<StrainFormProps> = ({
  strain,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<Strain>>(createDefaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(strain || createDefaultFormData());
    setFormError(null);
  }, [strain]);

  const handleChange = (field: keyof Strain, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNumberChange = (field: keyof Strain, value: string) => {
    handleChange(field, parseOptionalStrainNumber(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const name = formData.name?.trim();
    const breeder = formData.breeder?.trim();
    if (!name || !breeder || !formData.genetics) {
      setFormError('Name, breeder, and genetics are required.');
      return;
    }

    const numericError = validateStrainNumbers(formData);
    if (numericError) {
      setFormError(numericError);
      return;
    }

    const strainToSave: Strain = {
      ...(formData as Strain),
      name,
      breeder,
      description: formData.description?.trim() || undefined
    };

    setIsSaving(true);
    setFormError(null);
    try {
      await onSave(strainToSave);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save strain.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Strain Name *</Label>
          <Input
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Northern Lights"
            className="mt-1"
            required
            disabled={isSaving}
          />
        </div>

        <div>
          <Label>Breeder *</Label>
          <Input
            value={formData.breeder || ''}
            onChange={(e) => handleChange('breeder', e.target.value)}
            placeholder="e.g., Sensi Seeds"
            className="mt-1"
            required
            disabled={isSaving}
          />
        </div>

        <div>
          <Label>Genetics *</Label>
          <CustomDropdown
            options={GENETICS_OPTIONS}
            value={formData.genetics || 'Hybrid'}
            onChange={(v) => handleChange('genetics', v as Strain['genetics'])}
            placeholder="Select genetics"
            width="w-full"
            buttonClassName="mt-1"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label>Difficulty</Label>
          <CustomDropdown
            options={DIFFICULTY_OPTIONS}
            value={formData.difficulty || ''}
            onChange={(v) => handleChange('difficulty', v as Strain['difficulty'])}
            placeholder="Select difficulty"
            width="w-full"
            buttonClassName="mt-1"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label>Indica %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={formData.indicaPercent ?? ''}
            onChange={(e) => handleNumberChange('indicaPercent', e.target.value)}
            placeholder="e.g., 70"
            className="mt-1"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label>Sativa %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={formData.sativaPercent ?? ''}
            onChange={(e) => handleNumberChange('sativaPercent', e.target.value)}
            placeholder="e.g., 30"
            className="mt-1"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label>THC %</Label>
          <Input
            type="number"
            min={0}
            max={40}
            step={0.1}
            value={formData.thcPercent ?? ''}
            onChange={(e) => handleNumberChange('thcPercent', e.target.value)}
            placeholder="e.g., 20"
            className="mt-1"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label>CBD %</Label>
          <Input
            type="number"
            min={0}
            max={30}
            step={0.1}
            value={formData.cbdPercent ?? ''}
            onChange={(e) => handleNumberChange('cbdPercent', e.target.value)}
            placeholder="e.g., 0.5"
            className="mt-1"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label>Flowering Time (weeks)</Label>
          <Input
            type="number"
            min={4}
            max={16}
            value={formData.floweringWeeks ?? ''}
            onChange={(e) => handleNumberChange('floweringWeeks', e.target.value)}
            placeholder="e.g., 8"
            className="mt-1"
            disabled={isSaving}
          />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Effects, aroma, growing tips..."
          className="mt-1"
          rows={3}
          disabled={isSaving}
        />
      </div>

      {formError && (
        <p className="text-sm text-destructive">{formError}</p>
      )}

      <div className="flex gap-2 justify-end pt-4 border-t border-border/[0.70]">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-muted-foreground"
          disabled={isSaving}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          className=""
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : strain ? 'Update Strain' : 'Save Strain'}
        </Button>
      </div>
    </form>
  );
};

StrainForm.displayName = 'StrainForm';

export default StrainForm;
