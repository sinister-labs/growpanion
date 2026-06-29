"use client";

import { useEffect, useState } from 'react';
import { Beaker, Camera, ClipboardEdit, Droplets, Flower2, Layers, LineChart, Scale, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import {
  generateId,
  getPhenotypesForPlant,
  getMixRecipesForGrow,
  getPreparedBatchesForGrow,
  Grow,
  GrowEvent,
  MixRecipe,
  PlantDB,
  PreparedBatch,
  saveGrow,
  saveGrowEvent,
  saveIrrigationEvent,
  savePreparedBatch,
  savePhoto,
  savePhenotype,
  savePlant,
  saveTelemetryReading,
  type GrowEventType,
  type TelemetryMetric,
} from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { createPhaseHistoryEntry } from '@/lib/growth-utils';
import { createPhenotypeForPlant } from '@/lib/genetics-registry';

interface GrowWizardsProps {
  grow: Grow;
  plants: PlantDB[];
  onGrowUpdated?: (grow: Grow) => void;
}

const metricOptions: Array<{ id: TelemetryMetric; label: string; unit: string }> = [
  { id: 'temperature', label: 'Temperature', unit: '°C' },
  { id: 'humidity', label: 'Humidity', unit: '%' },
  { id: 'air_vpd', label: 'Air VPD', unit: 'kPa' },
  { id: 'leaf_temperature', label: 'Leaf Temperature', unit: '°C' },
  { id: 'leaf_vpd', label: 'Leaf VPD', unit: 'kPa' },
  { id: 'pot_weight', label: 'Pot Weight', unit: 'kg' },
  { id: 'water_consumption', label: 'Water Consumption', unit: 'L' },
  { id: 'ppfd', label: 'PPFD', unit: 'µmol/m²/s' },
  { id: 'dli', label: 'DLI', unit: 'mol/m²/day' },
  { id: 'light_power', label: 'Light Power', unit: '%' },
  { id: 'fan_power', label: 'Fan Power', unit: '%' },
  { id: 'exhaust_power', label: 'Exhaust Power', unit: '%' },
  { id: 'circulation_power', label: 'Circulation Power', unit: '%' },
  { id: 'ec', label: 'EC', unit: 'mS/cm' },
  { id: 'ph', label: 'pH', unit: 'pH' },
  { id: 'drain_ec', label: 'Drain EC', unit: 'mS/cm' },
  { id: 'drain_ph', label: 'Drain pH', unit: 'pH' },
  { id: 'drain_volume', label: 'Drain Volume', unit: 'L' },
];

const parseOptionalNumber = (value: string): number | undefined => {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseRequiredNumber = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const splitTags = (value: string): string[] => (
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
);

export function getSubstrateGrowEventType(action: 'potting' | 'repotting'): GrowEventType {
  return action === 'repotting' ? 'transplant' : 'substrate_change';
}

export function getIrrigationGrowEventType(batchId?: string): GrowEventType {
  return batchId?.trim() ? 'feeding' : 'watering';
}

export default function GrowWizards({ grow, plants, onGrowUpdated }: GrowWizardsProps) {
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<MixRecipe[]>([]);
  const [preparedBatches, setPreparedBatches] = useState<PreparedBatch[]>([]);
  const [batchRecipeId, setBatchRecipeId] = useState('');
  const [batchLiters, setBatchLiters] = useState('');
  const [batchEc, setBatchEc] = useState('');
  const [batchPh, setBatchPh] = useState('');
  const [batchWaterEc, setBatchWaterEc] = useState('');
  const [batchWaterPh, setBatchWaterPh] = useState('');
  const [batchTemp, setBatchTemp] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [measurementMetric, setMeasurementMetric] = useState<TelemetryMetric>('temperature');
  const [measurementValue, setMeasurementValue] = useState('');
  const [measurementPlantId, setMeasurementPlantId] = useState('');
  const [wateringPlantId, setWateringPlantId] = useState('');
  const [wateringBatchId, setWateringBatchId] = useState('');
  const [wateringLiters, setWateringLiters] = useState('');
  const [potWeightBefore, setPotWeightBefore] = useState('');
  const [potWeightAfter, setPotWeightAfter] = useState('');
  const [drainVolume, setDrainVolume] = useState('');
  const [drainEc, setDrainEc] = useState('');
  const [drainPh, setDrainPh] = useState('');
  const [wateringPhotoUri, setWateringPhotoUri] = useState('');
  const [wateringNotes, setWateringNotes] = useState('');
  const [trainingPlantId, setTrainingPlantId] = useState('');
  const [trainingType, setTrainingType] = useState<GrowEvent['type']>('training');
  const [trainingMethod, setTrainingMethod] = useState('Topping');
  const [trainingIntensity, setTrainingIntensity] = useState('medium');
  const [trainingPhotoUri, setTrainingPhotoUri] = useState('');
  const [trainingNotes, setTrainingNotes] = useState('');
  const [substratePlantId, setSubstratePlantId] = useState('');
  const [substrateAction, setSubstrateAction] = useState<'potting' | 'repotting'>('repotting');
  const [substrateType, setSubstrateType] = useState('');
  const [substratePotSize, setSubstratePotSize] = useState('');
  const [substrateNotes, setSubstrateNotes] = useState('');
  const [observationPlantId, setObservationPlantId] = useState('');
  const [observationType, setObservationType] = useState<GrowEvent['type']>('note');
  const [observationText, setObservationText] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [floweringDate, setFloweringDate] = useState(new Date().toISOString().split('T')[0]);
  const [floweringNotes, setFloweringNotes] = useState('');
  const [harvestPlantId, setHarvestPlantId] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [harvestWetGrams, setHarvestWetGrams] = useState('');
  const [harvestDryGrams, setHarvestDryGrams] = useState('');
  const [harvestPhotoUri, setHarvestPhotoUri] = useState('');
  const [harvestNotes, setHarvestNotes] = useState('');
  const [phenotypePlantId, setPhenotypePlantId] = useState('');
  const [phenotypeVigor, setPhenotypeVigor] = useState('');
  const [phenotypeStretch, setPhenotypeStretch] = useState('');
  const [phenotypeStructure, setPhenotypeStructure] = useState('');
  const [phenotypeInternodeSpacing, setPhenotypeInternodeSpacing] = useState('');
  const [phenotypeTrainingResponse, setPhenotypeTrainingResponse] = useState('');
  const [phenotypeFloweringTime, setPhenotypeFloweringTime] = useState('');
  const [phenotypeAroma, setPhenotypeAroma] = useState('');
  const [phenotypeTerpenes, setPhenotypeTerpenes] = useState('');
  const [phenotypeTraits, setPhenotypeTraits] = useState('');
  const [phenotypeIssues, setPhenotypeIssues] = useState('');
  const [phenotypeYield, setPhenotypeYield] = useState('');
  const [phenotypeQualityNotes, setPhenotypeQualityNotes] = useState('');
  const [phenotypeObservation, setPhenotypeObservation] = useState('');
  const [phenotypePhotoUri, setPhenotypePhotoUri] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadFeedingRecords() {
      const [storedRecipes, storedBatches] = await Promise.all([
        getMixRecipesForGrow(grow.id),
        getPreparedBatchesForGrow(grow.id),
      ]);

      if (!cancelled) {
        setRecipes(storedRecipes);
        setPreparedBatches(storedBatches);
      }
    }

    void loadFeedingRecords();
    return () => {
      cancelled = true;
    };
  }, [grow.id]);

  const plantOptions = plants.map(plant => ({
    id: plant.id,
    label: plant.name,
    description: plant.genetic,
  }));
  const harvestPlantOptions = plants
    .filter(plant => !plant.isHarvested)
    .map(plant => ({
      id: plant.id,
      label: plant.name,
      description: plant.genetic,
    }));
  const recipeOptions = recipes.map(recipe => ({
    id: recipe.id,
    label: recipe.name,
    description: `${recipe.substrateType} • ${recipe.fertilizerType}`,
  }));
  const batchOptions = preparedBatches.map(batch => ({
    id: batch.id,
    label: `${batch.totalLiters} L • ${new Date(batch.preparedAt).toLocaleDateString()}`,
    description: batch.recipeId ? recipes.find(recipe => recipe.id === batch.recipeId)?.name : 'No recipe',
  }));
  const trainingTypeOptions = [
    { id: 'training', label: 'Training', description: 'Toppen, HST, LST oder generelle Manipulation' },
    { id: 'topping', label: 'Toppen' },
    { id: 'lst', label: 'LST' },
    { id: 'hst', label: 'HST' },
    { id: 'defoliation', label: 'Defoliation' },
    { id: 'lollipopping', label: 'Lollipopping' },
    { id: 'scrog', label: 'ScrOG' },
    { id: 'transplant', label: 'Umtopfen' },
    { id: 'light_adjustment', label: 'Lichtanpassung' },
  ];
  const observationTypeOptions = [
    { id: 'note', label: 'Notiz' },
    { id: 'photo', label: 'Foto' },
    { id: 'diagnosis', label: 'Diagnose' },
    { id: 'problem', label: 'Problem' },
    { id: 'treatment', label: 'Behandlung' },
  ];
  const intensityOptions = [
    { id: 'low', label: 'Niedrig' },
    { id: 'medium', label: 'Mittel' },
    { id: 'high', label: 'Hoch' },
  ];
  const substrateActionOptions = [
    { id: 'repotting', label: 'Umtopfen' },
    { id: 'potting', label: 'Ersttopf' },
  ];

  const metric = metricOptions.find(option => option.id === measurementMetric) ?? metricOptions[0];

  const handlePreparedBatch = async () => {
    const totalLiters = parseRequiredNumber(batchLiters);
    if (!totalLiters) return;

    const preparedAt = new Date().toISOString();
    const batchId = generateId();

    await savePreparedBatch({
      id: batchId,
      recipeId: batchRecipeId || undefined,
      growId: grow.id,
      totalLiters,
      measuredEc: parseOptionalNumber(batchEc),
      measuredPh: parseOptionalNumber(batchPh),
      waterEc: parseOptionalNumber(batchWaterEc),
      waterPh: parseOptionalNumber(batchWaterPh),
      temperature: parseOptionalNumber(batchTemp),
      preparedAt,
      notes: batchNotes.trim() || undefined,
    });

    await saveGrowEvent({
      id: generateId(),
      growId: grow.id,
      type: 'prepared_batch',
      title: 'Nährlösung angesetzt',
      description: `${totalLiters} L prepared${batchEc ? `, EC ${batchEc}` : ''}${batchPh ? `, pH ${batchPh}` : ''}`,
      occurredAt: preparedAt,
      payload: {
        batchId,
        recipeId: batchRecipeId || undefined,
        totalLiters,
        measuredEc: parseOptionalNumber(batchEc),
        measuredPh: parseOptionalNumber(batchPh),
        waterEc: parseOptionalNumber(batchWaterEc),
        waterPh: parseOptionalNumber(batchWaterPh),
      },
      createdAt: new Date().toISOString(),
    });

    setPreparedBatches(current => [
      ...current,
      {
        id: batchId,
        recipeId: batchRecipeId || undefined,
        growId: grow.id,
        totalLiters,
        measuredEc: parseOptionalNumber(batchEc),
        measuredPh: parseOptionalNumber(batchPh),
        waterEc: parseOptionalNumber(batchWaterEc),
        waterPh: parseOptionalNumber(batchWaterPh),
        temperature: parseOptionalNumber(batchTemp),
        preparedAt,
        notes: batchNotes.trim() || undefined,
      },
    ]);
    setBatchRecipeId('');
    setBatchLiters('');
    setBatchEc('');
    setBatchPh('');
    setBatchWaterEc('');
    setBatchWaterPh('');
    setBatchTemp('');
    setBatchNotes('');
    toast({ variant: 'success', title: 'Batch saved', description: 'Prepared batch was added to the timeline.' });
  };

  const handleMeasurement = async () => {
    const value = parseRequiredNumber(measurementValue);
    if (value === null) return;

    const recordedAt = new Date().toISOString();
    const selectedPlant = plants.find(plant => plant.id === measurementPlantId);

    await saveTelemetryReading({
      id: generateId(),
      growId: grow.id,
      plantId: selectedPlant?.id,
      phenotypeId: selectedPlant?.phenotypeId,
      metric: measurementMetric,
      value,
      unit: metric.unit,
      recordedAt,
      source: 'manual',
    });

    await saveGrowEvent({
      id: generateId(),
      growId: grow.id,
      plantId: selectedPlant?.id,
      phenotypeId: selectedPlant?.phenotypeId,
      type: 'measurement',
      title: `Measurement: ${metric.label}`,
      description: `${value} ${metric.unit}`,
      occurredAt: recordedAt,
      payload: {
        metric: measurementMetric,
        value,
        unit: metric.unit,
      },
      createdAt: new Date().toISOString(),
    });

    setMeasurementValue('');
    toast({ variant: 'success', title: 'Measurement saved', description: 'Telemetry reading was added to Lab Mode.' });
  };

  const handleWatering = async () => {
    const plant = plants.find(item => item.id === wateringPlantId);
    const liters = parseRequiredNumber(wateringLiters);
    if (!plant || !liters) return;

    const occurredAt = new Date().toISOString();
    const irrigationId = generateId();
    let photoId: string | undefined;

    if (wateringPhotoUri.trim()) {
      photoId = generateId();
      await savePhoto({
        id: photoId,
        growId: grow.id,
        plantId: plant.id,
        phenotypeId: plant.phenotypeId,
        uri: wateringPhotoUri.trim(),
        caption: wateringNotes.trim() || 'Watering photo',
        takenAt: occurredAt,
        createdAt: new Date().toISOString(),
      });
    }

    await saveIrrigationEvent({
      id: irrigationId,
      batchId: wateringBatchId || undefined,
      growId: grow.id,
      plantId: plant.id,
      phenotypeId: plant.phenotypeId,
      liters,
      potWeightBefore: parseOptionalNumber(potWeightBefore),
      potWeightAfter: parseOptionalNumber(potWeightAfter),
      drainVolume: parseOptionalNumber(drainVolume),
      drainEc: parseOptionalNumber(drainEc),
      drainPh: parseOptionalNumber(drainPh),
      photoId,
      notes: wateringNotes.trim() || undefined,
      occurredAt,
    });

    await saveTelemetryReading({
      id: generateId(),
      growId: grow.id,
      plantId: plant.id,
      phenotypeId: plant.phenotypeId,
      metric: 'water_consumption',
      value: liters,
      unit: 'L',
      recordedAt: occurredAt,
      source: 'manual',
    });

    const potWeightAfterValue = parseOptionalNumber(potWeightAfter);
    if (potWeightAfterValue !== undefined) {
      await saveTelemetryReading({
        id: generateId(),
        growId: grow.id,
        plantId: plant.id,
        phenotypeId: plant.phenotypeId,
        metric: 'pot_weight',
        value: potWeightAfterValue,
        unit: 'kg',
        recordedAt: occurredAt,
        source: 'manual',
      });
    }

    await saveGrowEvent({
      id: generateId(),
      growId: grow.id,
      plantId: plant.id,
      phenotypeId: plant.phenotypeId,
      type: getIrrigationGrowEventType(wateringBatchId),
      title: wateringBatchId ? 'Düngen' : 'Gießen',
      description: wateringNotes.trim() || `${plant.name} received ${liters} L`,
      occurredAt,
      photoIds: photoId ? [photoId] : undefined,
      payload: {
        irrigationEventId: irrigationId,
        batchId: wateringBatchId || undefined,
        liters,
        potWeightBefore: parseOptionalNumber(potWeightBefore),
        potWeightAfter: parseOptionalNumber(potWeightAfter),
        drainVolume: parseOptionalNumber(drainVolume),
        drainEc: parseOptionalNumber(drainEc),
        drainPh: parseOptionalNumber(drainPh),
        photoId,
      },
      createdAt: new Date().toISOString(),
    });

    setWateringBatchId('');
    setWateringLiters('');
    setPotWeightBefore('');
    setPotWeightAfter('');
    setDrainVolume('');
    setDrainEc('');
    setDrainPh('');
    setWateringPhotoUri('');
    setWateringNotes('');
    toast({ variant: 'success', title: 'Watering saved', description: 'Irrigation event and telemetry were recorded.' });
  };

  const handleTraining = async () => {
    const plant = plants.find(item => item.id === trainingPlantId);
    if (!plant || !trainingMethod.trim()) return;

    const occurredAt = new Date().toISOString();
    let photoId: string | undefined;

    if (trainingPhotoUri.trim()) {
      photoId = generateId();
      await savePhoto({
        id: photoId,
        growId: grow.id,
        plantId: plant.id,
        phenotypeId: plant.phenotypeId,
        uri: trainingPhotoUri.trim(),
        caption: trainingNotes.trim() || `${trainingMethod.trim()} training`,
        takenAt: occurredAt,
        createdAt: new Date().toISOString(),
      });
    }

    await saveGrowEvent({
      id: generateId(),
      growId: grow.id,
      plantId: plant.id,
      phenotypeId: plant.phenotypeId,
      type: trainingType,
      title: `${trainingTypeOptions.find(option => option.id === trainingType)?.label ?? 'Training'}: ${trainingMethod.trim()}`,
      description: trainingNotes.trim() || `${trainingIntensity} intensity`,
      occurredAt,
      photoIds: photoId ? [photoId] : undefined,
      payload: {
        method: trainingMethod.trim(),
        intensity: trainingIntensity,
        photoId,
      },
      createdAt: new Date().toISOString(),
    });

    setTrainingMethod('Topping');
    setTrainingIntensity('medium');
    setTrainingPhotoUri('');
    setTrainingNotes('');
    toast({ variant: 'success', title: 'Training saved', description: 'Structured training event was added to the timeline.' });
  };

  const handleSubstrateChange = async () => {
    const plant = plants.find(item => item.id === substratePlantId);
    if (!plant || !substrateType.trim() || !substratePotSize.trim()) return;

    const occurredAt = new Date().toISOString();
    const substrateRecord = {
      date: occurredAt,
      action: substrateAction,
      substrateType: substrateType.trim(),
      potSize: substratePotSize.trim(),
      notes: substrateNotes.trim() || undefined,
    };

    await savePlant({
      ...plant,
      substrateRecords: [...(plant.substrateRecords ?? []), substrateRecord],
    });

    await saveGrowEvent({
      id: generateId(),
      growId: grow.id,
      plantId: plant.id,
      phenotypeId: plant.phenotypeId,
      type: getSubstrateGrowEventType(substrateAction),
      title: substrateAction === 'repotting' ? `Umtopfen: ${plant.name}` : `Substrat gesetzt: ${plant.name}`,
      description: `${substrateRecord.substrateType}, ${substrateRecord.potSize}${substrateRecord.notes ? ` - ${substrateRecord.notes}` : ''}`,
      occurredAt,
      payload: substrateRecord,
      createdAt: new Date().toISOString(),
    });

    setSubstratePlantId('');
    setSubstrateAction('repotting');
    setSubstrateType('');
    setSubstratePotSize('');
    setSubstrateNotes('');
    toast({ variant: 'success', title: 'Substrat gespeichert', description: 'Pflanze und Timeline wurden aktualisiert.' });
  };

  const handleObservation = async () => {
    if (!observationText.trim() && !photoUri.trim()) return;

    const plant = plants.find(item => item.id === observationPlantId);
    const occurredAt = new Date().toISOString();
    const photoIds: string[] = [];

    if (photoUri.trim()) {
      const photoId = generateId();
      await savePhoto({
        id: photoId,
        growId: grow.id,
        plantId: plant?.id,
        phenotypeId: plant?.phenotypeId,
        uri: photoUri.trim(),
        caption: observationText.trim() || undefined,
        takenAt: occurredAt,
        createdAt: new Date().toISOString(),
      });
      photoIds.push(photoId);
    }

    await saveGrowEvent({
      id: generateId(),
      growId: grow.id,
      plantId: plant?.id,
      phenotypeId: plant?.phenotypeId,
      type: observationType,
      title: observationType === 'photo' ? 'Foto / Beobachtung' : observationTypeOptions.find(option => option.id === observationType)?.label ?? 'Beobachtung',
      description: observationText.trim() || (photoUri.trim() ? 'Photo recorded' : undefined),
      occurredAt,
      photoIds: photoIds.length > 0 ? photoIds : undefined,
      payload: {
        photoUri: photoUri.trim() || undefined,
      },
      createdAt: new Date().toISOString(),
    });

    setObservationText('');
    setPhotoUri('');
    toast({ variant: 'success', title: 'Observation saved', description: 'Observation event was added to the timeline.' });
  };

  const handleFloweringStart = async () => {
    const occurredAt = new Date(floweringDate).toISOString();
    const updatedGrow: Grow = {
      ...grow,
      currentPhase: 'Flowering',
      phaseHistory: grow.currentPhase === 'Flowering'
        ? grow.phaseHistory
        : [...grow.phaseHistory, createPhaseHistoryEntry('Flowering', occurredAt)],
    };

    await saveGrow(updatedGrow);
    await saveGrowEvent({
      id: generateId(),
      growId: grow.id,
      type: 'flowering_start',
      title: 'Blüte eingeleitet',
      description: floweringNotes.trim() || 'Grow phase changed to Flowering.',
      occurredAt,
      payload: {
        previousPhase: grow.currentPhase,
        nextPhase: 'Flowering',
      },
      createdAt: new Date().toISOString(),
    });

    onGrowUpdated?.(updatedGrow);
    setFloweringNotes('');
    toast({ variant: 'success', title: 'Flowering started', description: 'Grow phase and flowering event were saved.' });
  };

  const handleHarvest = async () => {
    const plant = plants.find(item => item.id === harvestPlantId);
    const wetGrams = parseOptionalNumber(harvestWetGrams);
    const dryGrams = parseOptionalNumber(harvestDryGrams);
    if (!plant || (!wetGrams && !dryGrams)) return;
    if (wetGrams && dryGrams && dryGrams > wetGrams) {
      toast({ variant: 'destructive', title: 'Harvest not saved', description: 'Dry yield cannot be greater than wet yield.' });
      return;
    }

    const occurredAt = new Date(harvestDate).toISOString();
    const photoIds: string[] = [];

    if (harvestPhotoUri.trim()) {
      const photoId = generateId();
      await savePhoto({
        id: photoId,
        growId: grow.id,
        plantId: plant.id,
        phenotypeId: plant.phenotypeId,
        uri: harvestPhotoUri.trim(),
        caption: harvestNotes.trim() || 'Harvest photo',
        takenAt: occurredAt,
        createdAt: new Date().toISOString(),
      });
      photoIds.push(photoId);
    }

    await savePlant({
      ...plant,
      currentPhase: 'Drying',
      lifecycleStatus: 'harvested',
      isHarvested: true,
      harvest: {
        date: occurredAt,
        yieldWetGrams: wetGrams,
        yieldDryGrams: dryGrams,
        notes: harvestNotes.trim() || undefined,
      },
    });

    if (plant.phenotypeId && dryGrams) {
      const phenotype = (await getPhenotypesForPlant(plant.id)).find(item => item.id === plant.phenotypeId);
      if (phenotype) {
        await savePhenotype({
          ...phenotype,
          yieldGrams: dryGrams,
          qualityNotes: harvestNotes.trim() || phenotype.qualityNotes,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await saveGrowEvent({
      id: generateId(),
      growId: grow.id,
      plantId: plant.id,
      phenotypeId: plant.phenotypeId,
      type: 'harvest',
      title: `Ernte: ${plant.name}`,
      description: `${dryGrams ? `${dryGrams} g trocken` : wetGrams ? `${wetGrams} g nass` : 'Ernte erfasst'}${harvestNotes.trim() ? ` - ${harvestNotes.trim()}` : ''}`,
      occurredAt,
      photoIds: photoIds.length > 0 ? photoIds : undefined,
      payload: {
        wetGrams,
        dryGrams,
        dryingPhase: true,
        photoUri: harvestPhotoUri.trim() || undefined,
      },
      createdAt: new Date().toISOString(),
    });

    setHarvestPlantId('');
    setHarvestDate(new Date().toISOString().split('T')[0]);
    setHarvestWetGrams('');
    setHarvestDryGrams('');
    setHarvestPhotoUri('');
    setHarvestNotes('');
    toast({ variant: 'success', title: 'Harvest saved', description: 'Plant, phenotype and timeline were updated.' });
  };

  const handlePhenotypeAssessment = async () => {
    const plant = plants.find(item => item.id === phenotypePlantId);
    if (!plant?.geneticsId) return;

    const existingPhenotype = plant.phenotypeId
      ? (await getPhenotypesForPlant(plant.id)).find(phenotype => phenotype.id === plant.phenotypeId)
      : (await getPhenotypesForPlant(plant.id))[0];
    const createdAt = new Date().toISOString();
    const phenotype = existingPhenotype ?? createPhenotypeForPlant({
      growId: grow.id,
      plantId: plant.id,
      geneticsId: plant.geneticsId,
      label: plant.label || `${plant.name} phenotype`,
      createdAt,
    });
    const yieldGrams = parseOptionalNumber(phenotypeYield);
    const photoIds: string[] = [];

    if (phenotypePhotoUri.trim()) {
      const photoId = generateId();
      await savePhoto({
        id: photoId,
        growId: grow.id,
        plantId: plant.id,
        phenotypeId: phenotype.id,
        uri: phenotypePhotoUri.trim(),
        caption: phenotypeObservation.trim() || phenotypeQualityNotes.trim() || 'Phenotype photo',
        takenAt: createdAt,
        createdAt: new Date().toISOString(),
      });
      photoIds.push(photoId);
    }

    await savePhenotype({
      ...phenotype,
      growthStructure: phenotypeStructure.trim() || phenotype.growthStructure,
      stretch: phenotypeStretch.trim() || phenotype.stretch,
      vigor: phenotypeVigor.trim() || phenotype.vigor,
      internodeSpacing: phenotypeInternodeSpacing.trim() || phenotype.internodeSpacing,
      trainingResponse: phenotypeTrainingResponse.trim() || phenotype.trainingResponse,
      floweringTime: phenotypeFloweringTime.trim() || phenotype.floweringTime,
      aroma: phenotypeAroma.trim() || phenotype.aroma,
      terpenes: splitTags(phenotypeTerpenes).length > 0 ? splitTags(phenotypeTerpenes) : phenotype.terpenes,
      traits: splitTags(phenotypeTraits).length > 0 ? splitTags(phenotypeTraits) : phenotype.traits,
      issues: splitTags(phenotypeIssues).length > 0 ? splitTags(phenotypeIssues) : phenotype.issues,
      yieldGrams,
      qualityNotes: phenotypeQualityNotes.trim() || phenotype.qualityNotes,
      photos: photoIds.length > 0 ? [...(phenotype.photos ?? []), ...photoIds] : phenotype.photos,
      observations: phenotypeObservation.trim() ? [...(phenotype.observations ?? []), phenotypeObservation.trim()] : phenotype.observations,
      updatedAt: new Date().toISOString(),
    });

    if (!plant.phenotypeId) {
      await savePlant({ ...plant, phenotypeId: phenotype.id });
    }

    await saveGrowEvent({
      id: generateId(),
      growId: grow.id,
      plantId: plant.id,
      phenotypeId: phenotype.id,
      type: 'note',
      title: 'Phänotyp bewertet',
      description: phenotypeQualityNotes.trim() || phenotypeObservation.trim() || `${plant.name} phenotype assessment saved.`,
      occurredAt: new Date().toISOString(),
      photoIds: photoIds.length > 0 ? photoIds : undefined,
      payload: {
        vigor: phenotypeVigor.trim() || undefined,
        stretch: phenotypeStretch.trim() || undefined,
        internodeSpacing: phenotypeInternodeSpacing.trim() || undefined,
        trainingResponse: phenotypeTrainingResponse.trim() || undefined,
        floweringTime: phenotypeFloweringTime.trim() || undefined,
        traits: splitTags(phenotypeTraits),
        issues: splitTags(phenotypeIssues),
      },
      createdAt: new Date().toISOString(),
    });

    setPhenotypeVigor('');
    setPhenotypeStretch('');
    setPhenotypeStructure('');
    setPhenotypeInternodeSpacing('');
    setPhenotypeTrainingResponse('');
    setPhenotypeFloweringTime('');
    setPhenotypeAroma('');
    setPhenotypeTerpenes('');
    setPhenotypeTraits('');
    setPhenotypeIssues('');
    setPhenotypeYield('');
    setPhenotypeQualityNotes('');
    setPhenotypeObservation('');
    setPhenotypePhotoUri('');
    toast({ variant: 'success', title: 'Phenotype saved', description: 'Phenotype assessment was linked to this plant.' });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Beaker className="h-5 w-5 text-primary" />
            Nährlösung ansetzen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomDropdown
            options={[{ id: '', label: 'No recipe' }, ...recipeOptions]}
            value={batchRecipeId}
            onChange={setBatchRecipeId}
            placeholder="Rezept auswählen"
            width="w-full"
            buttonClassName="mt-1"
          />
          <NumberInput label="Gesamtmenge (L)" value={batchLiters} onChange={setBatchLiters} />
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="EC" value={batchEc} onChange={setBatchEc} />
            <NumberInput label="pH" value={batchPh} onChange={setBatchPh} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Wasser-EC" value={batchWaterEc} onChange={setBatchWaterEc} />
            <NumberInput label="Wasser-pH" value={batchWaterPh} onChange={setBatchWaterPh} />
          </div>
          <NumberInput label="Temperatur (°C)" value={batchTemp} onChange={setBatchTemp} />
          <TextInput label="Notizen" value={batchNotes} onChange={setBatchNotes} />
          <Button className="w-full" onClick={handlePreparedBatch}>Batch speichern</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <LineChart className="h-5 w-5 text-accent" />
            Manuelle Messung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomDropdown
            options={metricOptions.map(option => ({ id: option.id, label: option.label, description: option.unit }))}
            value={measurementMetric}
            onChange={(value) => setMeasurementMetric(value as TelemetryMetric)}
            placeholder="Metric"
            width="w-full"
            buttonClassName="mt-1"
          />
          <CustomDropdown
            options={[{ id: '', label: 'Whole grow' }, ...plantOptions]}
            value={measurementPlantId}
            onChange={setMeasurementPlantId}
            placeholder="Scope"
            width="w-full"
            buttonClassName="mt-1"
          />
          <NumberInput label={`Wert (${metric.unit})`} value={measurementValue} onChange={setMeasurementValue} />
          <Button className="w-full" onClick={handleMeasurement}>Messung speichern</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Droplets className="h-5 w-5 text-accent" />
            Gießen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomDropdown
            options={plantOptions}
            value={wateringPlantId}
            onChange={setWateringPlantId}
            placeholder="Pflanze auswählen"
            width="w-full"
            buttonClassName="mt-1"
          />
          <CustomDropdown
            options={[{ id: '', label: 'Klares Wasser / kein Batch' }, ...batchOptions]}
            value={wateringBatchId}
            onChange={setWateringBatchId}
            placeholder="Batch auswählen"
            width="w-full"
            buttonClassName="mt-1"
          />
          <NumberInput label="Liter gegossen" value={wateringLiters} onChange={setWateringLiters} />
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Topf vorher kg" value={potWeightBefore} onChange={setPotWeightBefore} />
            <NumberInput label="Topf nachher kg" value={potWeightAfter} onChange={setPotWeightAfter} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumberInput label="Drain L" value={drainVolume} onChange={setDrainVolume} />
            <NumberInput label="Drain EC" value={drainEc} onChange={setDrainEc} />
            <NumberInput label="Drain pH" value={drainPh} onChange={setDrainPh} />
          </div>
          <TextInput label="Foto-URI optional" value={wateringPhotoUri} onChange={setWateringPhotoUri} />
          <TextAreaInput label="Notiz" value={wateringNotes} onChange={setWateringNotes} />
          <Button className="w-full" onClick={handleWatering}>Gießen speichern</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Scissors className="h-5 w-5 text-accent" />
            Training
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomDropdown
            options={plantOptions}
            value={trainingPlantId}
            onChange={setTrainingPlantId}
            placeholder="Pflanze auswählen"
            width="w-full"
            buttonClassName="mt-1"
          />
          <CustomDropdown
            options={trainingTypeOptions}
            value={trainingType}
            onChange={(value) => setTrainingType(value as GrowEvent['type'])}
            placeholder="Trainingstyp"
            width="w-full"
            buttonClassName="mt-1"
          />
          <TextInput label="Methode" value={trainingMethod} onChange={setTrainingMethod} />
          <CustomDropdown
            options={intensityOptions}
            value={trainingIntensity}
            onChange={setTrainingIntensity}
            placeholder="Intensität"
            width="w-full"
            buttonClassName="mt-1"
          />
          <TextInput label="Foto-URI optional" value={trainingPhotoUri} onChange={setTrainingPhotoUri} />
          <TextAreaInput label="Notiz" value={trainingNotes} onChange={setTrainingNotes} />
          <Button className="w-full" onClick={handleTraining}>Training speichern</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Camera className="h-5 w-5 text-accent" />
            Foto / Beobachtung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomDropdown
            options={[{ id: '', label: 'Whole grow' }, ...plantOptions]}
            value={observationPlantId}
            onChange={setObservationPlantId}
            placeholder="Scope"
            width="w-full"
            buttonClassName="mt-1"
          />
          <CustomDropdown
            options={observationTypeOptions}
            value={observationType}
            onChange={(value) => setObservationType(value as GrowEvent['type'])}
            placeholder="Eventtyp"
            width="w-full"
            buttonClassName="mt-1"
          />
          <TextInput label="Foto-URI optional" value={photoUri} onChange={setPhotoUri} />
          <TextAreaInput label="Beobachtung / Diagnose" value={observationText} onChange={setObservationText} />
          <Button className="w-full" onClick={handleObservation}>Beobachtung speichern</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Layers className="h-5 w-5 text-primary" />
            Umtopfen / Substrat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomDropdown
            options={plantOptions}
            value={substratePlantId}
            onChange={setSubstratePlantId}
            placeholder="Pflanze auswählen"
            width="w-full"
            buttonClassName="mt-1"
          />
          <CustomDropdown
            options={substrateActionOptions}
            value={substrateAction}
            onChange={(value) => setSubstrateAction(value as 'potting' | 'repotting')}
            placeholder="Aktion"
            width="w-full"
            buttonClassName="mt-1"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Substrat" value={substrateType} onChange={setSubstrateType} />
            <TextInput label="Topfgröße" value={substratePotSize} onChange={setSubstratePotSize} />
          </div>
          <TextAreaInput label="Notiz" value={substrateNotes} onChange={setSubstrateNotes} />
          <Button className="w-full" onClick={handleSubstrateChange}>Substrat speichern</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Flower2 className="h-5 w-5 text-accent" />
            Blüte einleiten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Flip-Datum</Label>
            <Input
              type="date"
              value={floweringDate}
              onChange={(event) => setFloweringDate(event.target.value)}
              className="mt-1"
            />
          </div>
          <TextAreaInput label="Notiz" value={floweringNotes} onChange={setFloweringNotes} />
          <Button className="w-full" onClick={handleFloweringStart}>Blüte speichern</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Scale className="h-5 w-5 text-primary" />
            Ernten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomDropdown
            options={harvestPlantOptions}
            value={harvestPlantId}
            onChange={setHarvestPlantId}
            placeholder="Pflanze auswählen"
            width="w-full"
            buttonClassName="mt-1"
          />
          <div>
            <Label className="text-xs text-muted-foreground">Erntedatum</Label>
            <Input
              type="date"
              value={harvestDate}
              onChange={(event) => setHarvestDate(event.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Nassgewicht (g)" value={harvestWetGrams} onChange={setHarvestWetGrams} />
            <NumberInput label="Trockengewicht (g)" value={harvestDryGrams} onChange={setHarvestDryGrams} />
          </div>
          <TextInput label="Foto-URI optional" value={harvestPhotoUri} onChange={setHarvestPhotoUri} />
          <TextAreaInput label="Notiz / Trocknung vorbereiten" value={harvestNotes} onChange={setHarvestNotes} />
          <Button className="w-full" onClick={handleHarvest}>Ernte speichern</Button>
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ClipboardEdit className="h-5 w-5 text-primary" />
            Phänotyp bewerten
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CustomDropdown
            options={plantOptions}
            value={phenotypePlantId}
            onChange={setPhenotypePlantId}
            placeholder="Pflanze auswählen"
            width="w-full"
            buttonClassName="mt-1"
          />
          <TextInput label="Vitalität" value={phenotypeVigor} onChange={setPhenotypeVigor} />
          <TextInput label="Stretch" value={phenotypeStretch} onChange={setPhenotypeStretch} />
          <TextInput label="Wuchsform" value={phenotypeStructure} onChange={setPhenotypeStructure} />
          <TextInput label="Internodienabstand" value={phenotypeInternodeSpacing} onChange={setPhenotypeInternodeSpacing} />
          <TextInput label="Trainingsreaktion" value={phenotypeTrainingResponse} onChange={setPhenotypeTrainingResponse} />
          <TextInput label="Blütezeit" value={phenotypeFloweringTime} onChange={setPhenotypeFloweringTime} />
          <TextInput label="Aroma" value={phenotypeAroma} onChange={setPhenotypeAroma} />
          <TextInput label="Terpene, kommagetrennt" value={phenotypeTerpenes} onChange={setPhenotypeTerpenes} />
          <TextInput label="Besonderheiten" value={phenotypeTraits} onChange={setPhenotypeTraits} />
          <TextInput label="Probleme" value={phenotypeIssues} onChange={setPhenotypeIssues} />
          <NumberInput label="Ertrag trocken (g)" value={phenotypeYield} onChange={setPhenotypeYield} />
          <TextInput label="Foto-URI optional" value={phenotypePhotoUri} onChange={setPhenotypePhotoUri} />
          <div className="md:col-span-2">
            <TextAreaInput label="Beobachtung" value={phenotypeObservation} onChange={setPhenotypeObservation} />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <TextAreaInput label="Qualitätsnotizen" value={phenotypeQualityNotes} onChange={setPhenotypeQualityNotes} />
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <Button className="w-full" onClick={handlePhenotypeAssessment}>Phänotyp speichern</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1"
      />
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1"
      />
    </div>
  );
}

function TextAreaInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-20"
      />
    </div>
  );
}
