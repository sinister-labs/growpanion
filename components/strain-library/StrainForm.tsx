"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import { Strain, generateId } from '@/lib/db';
import { Save, X } from 'lucide-react';

interface StrainFormProps {
  strain?: Strain;
  onSave: (strain: Strain) => void;
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

const StrainForm: React.FC<StrainFormProps> = ({
  strain,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<Strain>>({
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

  useEffect(() => {
    if (strain) {
      setFormData(strain);
    }
  }, [strain]);

  const handleChange = (field: keyof Strain, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNumberChange = (field: keyof Strain, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    handleChange(field, numValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.breeder || !formData.genetics) {
      return;
    }

    onSave(formData as Strain);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-white">Strain Name *</Label>
          <Input
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Northern Lights"
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label className="text-white">Breeder *</Label>
          <Input
            value={formData.breeder || ''}
            onChange={(e) => handleChange('breeder', e.target.value)}
            placeholder="e.g., Sensi Seeds"
            className="mt-1"
            required
          />
        </div>

        <div>
          <Label className="text-white">Genetics *</Label>
          <CustomDropdown
            options={GENETICS_OPTIONS}
            value={formData.genetics || 'Hybrid'}
            onChange={(v) => handleChange('genetics', v as Strain['genetics'])}
            placeholder="Select genetics"
            width="w-full"
            buttonClassName="bg-gray-700 border-gray-600 mt-1"
          />
        </div>

        <div>
          <Label className="text-white">Difficulty</Label>
          <CustomDropdown
            options={DIFFICULTY_OPTIONS}
            value={formData.difficulty || ''}
            onChange={(v) => handleChange('difficulty', v as Strain['difficulty'])}
            placeholder="Select difficulty"
            width="w-full"
            buttonClassName="bg-gray-700 border-gray-600 mt-1"
          />
        </div>

        <div>
          <Label className="text-white">Indica %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={formData.indicaPercent ?? ''}
            onChange={(e) => handleNumberChange('indicaPercent', e.target.value)}
            placeholder="e.g., 70"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-white">Sativa %</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={formData.sativaPercent ?? ''}
            onChange={(e) => handleNumberChange('sativaPercent', e.target.value)}
            placeholder="e.g., 30"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-white">THC %</Label>
          <Input
            type="number"
            min={0}
            max={40}
            step={0.1}
            value={formData.thcPercent ?? ''}
            onChange={(e) => handleNumberChange('thcPercent', e.target.value)}
            placeholder="e.g., 20"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-white">CBD %</Label>
          <Input
            type="number"
            min={0}
            max={30}
            step={0.1}
            value={formData.cbdPercent ?? ''}
            onChange={(e) => handleNumberChange('cbdPercent', e.target.value)}
            placeholder="e.g., 0.5"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-white">Flowering Time (weeks)</Label>
          <Input
            type="number"
            min={4}
            max={16}
            value={formData.floweringWeeks ?? ''}
            onChange={(e) => handleNumberChange('floweringWeeks', e.target.value)}
            placeholder="e.g., 8"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-white">Description</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Effects, aroma, growing tips..."
          className="mt-1 bg-gray-800 border-gray-700"
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-gray-700">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-gray-400"
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {strain ? 'Update Strain' : 'Save Strain'}
        </Button>
      </div>
    </form>
  );
};

StrainForm.displayName = 'StrainForm';

export default StrainForm;
