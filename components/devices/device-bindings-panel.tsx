"use client";

import { useEffect, useMemo, useState } from 'react';
import { Database, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import {
  deleteSensorBinding,
  getPlantsForGrow,
  saveDevice,
  saveSensorBinding,
  saveTelemetryReading,
  generateId,
  type Device,
  type Grow,
  type PlantDB,
  type SensorBinding,
  type TelemetryMetric,
  type TelemetryReading,
} from '@/lib/db';
import {
  formatMetricLabel,
  formatTelemetryValue,
  inferAcInfinityRawLabel,
} from '@/lib/device-layer-helpers';
import { inferUnitForMetric } from '@/lib/device-layer-utils';

type SensorMappingDraft = {
  growId: string;
  plantId: string;
  metric: TelemetryMetric;
};

const metricOptions: Array<{ id: TelemetryMetric; label: string }> = [
  { id: 'temperature', label: 'Temperature' },
  { id: 'humidity', label: 'Humidity' },
  { id: 'air_vpd', label: 'Air VPD' },
  { id: 'leaf_temperature', label: 'Leaf Temperature' },
  { id: 'leaf_vpd', label: 'Leaf VPD' },
  { id: 'pot_weight', label: 'Pot Weight' },
  { id: 'water_consumption', label: 'Water Consumption' },
  { id: 'ppfd', label: 'PPFD' },
  { id: 'dli', label: 'DLI' },
  { id: 'light_power', label: 'Light Power' },
  { id: 'fan_power', label: 'Fan Power' },
  { id: 'exhaust_power', label: 'Exhaust Power' },
  { id: 'circulation_power', label: 'Circulation Power' },
  { id: 'ec', label: 'EC' },
  { id: 'ph', label: 'pH' },
  { id: 'drain_ec', label: 'Drain EC' },
  { id: 'drain_ph', label: 'Drain pH' },
  { id: 'drain_volume', label: 'Drain Volume' },
];

interface DeviceBindingsPanelProps {
  bindings: SensorBinding[];
  grows: Grow[];
  devicesById: Map<string, Device>;
  latestReadingByBinding: Record<string, TelemetryReading>;
  defaultGrowId: string;
  onSaved: () => Promise<void>;
  onStatus: (message: string) => void;
}

export function DeviceBindingsPanel({
  bindings,
  grows,
  devicesById,
  latestReadingByBinding,
  defaultGrowId,
  onSaved,
  onStatus,
}: DeviceBindingsPanelProps) {
  const [mappingDrafts, setMappingDrafts] = useState<Record<string, SensorMappingDraft>>({});
  const [plantsByGrow, setPlantsByGrow] = useState<Record<string, PlantDB[]>>({});

  const growOptions = useMemo(() => grows.map(grow => ({
    id: grow.id,
    label: grow.name,
    description: `${grow.currentPhase} • ${new Date(grow.startDate).toLocaleDateString()}`,
  })), [grows]);

  useEffect(() => {
    setMappingDrafts(current => {
      const next = { ...current };
      for (const binding of bindings) {
        next[binding.id] = {
          growId: next[binding.id]?.growId ?? binding.growId ?? defaultGrowId,
          plantId: next[binding.id]?.plantId ?? binding.plantId ?? '',
          metric: next[binding.id]?.metric ?? binding.metric,
        };
      }
      return next;
    });
  }, [bindings, defaultGrowId]);

  useEffect(() => {
    const growIds = [...new Set(bindings.map(binding => mappingDrafts[binding.id]?.growId ?? binding.growId).filter(Boolean))] as string[];
    void Promise.all(growIds.map(async growId => {
      const plants = await getPlantsForGrow(growId);
      return [growId, plants] as const;
    })).then(entries => {
      setPlantsByGrow(Object.fromEntries(entries));
    }).catch(() => undefined);
  }, [bindings, mappingDrafts]);

  const updateMappingDraft = (bindingId: string, patch: Partial<SensorMappingDraft>) => {
    setMappingDrafts(current => ({
      ...current,
      [bindingId]: {
        growId: current[bindingId]?.growId ?? '',
        plantId: current[bindingId]?.plantId ?? '',
        metric: current[bindingId]?.metric ?? 'temperature',
        ...patch,
      },
    }));
  };

  const getPlantOptions = (growId: string) => (plantsByGrow[growId] ?? []).map(plant => ({
    id: plant.id,
    label: plant.name || plant.genetic || plant.label || plant.id,
    description: plant.currentPhase,
  }));

  const handleSaveSensorMapping = async (binding: SensorBinding) => {
    const draft = mappingDrafts[binding.id] ?? {
      growId: binding.growId ?? '',
      plantId: binding.plantId ?? '',
      metric: binding.metric,
    };
    const mappedGrowId = draft.growId.trim();
    if (!mappedGrowId) {
      onStatus('Select a grow for this device value before saving the mapping.');
      return;
    }

    const mappedPlantId = draft.plantId.trim();
    const mappedMetric = draft.metric;
    const mappedUnit = inferUnitForMetric(mappedMetric);
    const device = devicesById.get(binding.deviceId);

    await Promise.all([
      saveSensorBinding({
        ...binding,
        growId: mappedGrowId,
        plantId: mappedPlantId || undefined,
        metric: mappedMetric,
        unit: mappedUnit,
      }),
      device ? saveDevice({
        ...device,
        growId: mappedGrowId,
        plantId: mappedPlantId || device.plantId,
        updatedAt: new Date().toISOString(),
      }) : Promise.resolve(''),
    ]);

    const latestReading = latestReadingByBinding[binding.id];
    if (latestReading) {
      await saveTelemetryReading({
        ...latestReading,
        id: generateId(),
        growId: mappedGrowId,
        plantId: mappedPlantId || undefined,
        metric: mappedMetric,
        unit: mappedUnit,
        recordedAt: new Date().toISOString(),
      });
    }

    await onSaved();
    onStatus(`${binding.label} mapped to ${formatMetricLabel(mappedMetric)}.`);
  };

  const handleSaveAllSensorMappings = async () => {
    if (bindings.length === 0) {
      onStatus('Add a device to map its values first.');
      return;
    }
    const missingGrow = bindings.some(binding => !(mappingDrafts[binding.id]?.growId ?? binding.growId ?? '').trim());
    if (missingGrow) {
      onStatus('Every mapped value needs a grow before saving all mappings.');
      return;
    }

    const timestamp = new Date().toISOString();
    await Promise.all(bindings.flatMap(binding => {
      const draft = mappingDrafts[binding.id] ?? {
        growId: binding.growId ?? '',
        plantId: binding.plantId ?? '',
        metric: binding.metric,
      };
      const updatedBinding: SensorBinding = {
        ...binding,
        growId: draft.growId.trim(),
        plantId: draft.plantId.trim() || undefined,
        metric: draft.metric,
        unit: inferUnitForMetric(draft.metric),
      };
      const tasks: Array<Promise<unknown>> = [saveSensorBinding(updatedBinding)];
      const latestReading = latestReadingByBinding[binding.id];
      if (latestReading) {
        tasks.push(saveTelemetryReading({
          ...latestReading,
          id: generateId(),
          growId: updatedBinding.growId!,
          plantId: updatedBinding.plantId,
          metric: updatedBinding.metric,
          unit: updatedBinding.unit,
          recordedAt: timestamp,
        }));
      }
      return tasks;
    }));

    await onSaved();
    onStatus(`${bindings.length} device values mapped.`);
  };

  const handleDeleteSensorBinding = async (binding: SensorBinding) => {
    const confirmed = window.confirm(`Delete sensor mapping ${binding.label}?`);
    if (!confirmed) return;
    await deleteSensorBinding(binding.id);
    await onSaved();
    onStatus(`${binding.label} deleted.`);
  };

  if (bindings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/[0.22] p-4 text-sm text-muted-foreground">
        Add a device to see provided values here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Database className="h-4 w-4 text-primary" />
          Sensor bindings
        </div>
        <Button className="h-10 rounded-2xl" onClick={handleSaveAllSensorMappings} disabled={growOptions.length === 0}>
          Save all mappings
        </Button>
      </div>

      {bindings.map(binding => {
        const reading = latestReadingByBinding[binding.id];
        const draft = mappingDrafts[binding.id] ?? {
          growId: binding.growId ?? defaultGrowId,
          plantId: binding.plantId ?? '',
          metric: binding.metric,
        };
        const plantOptions = getPlantOptions(draft.growId);

        return (
          <div key={binding.id} className="os-card p-3">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_1fr_1fr_1fr_auto] xl:items-end">
              <div className="os-stat-card min-w-0 px-3 py-2">
                <div className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Device value</div>
                <div className="mt-1 truncate text-sm font-semibold text-foreground">{binding.label}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-emerald-300/[0.18] bg-emerald-300/10 px-2 py-0.5 text-emerald-100">{inferAcInfinityRawLabel(binding)}</span>
                  <span>{reading ? `${formatTelemetryValue(reading.value)} ${binding.unit}` : 'No reading yet'}</span>
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">GrowPanion sensor</Label>
                <CustomDropdown
                  options={metricOptions}
                  value={draft.metric}
                  onChange={(value) => updateMappingDraft(binding.id, { metric: value as TelemetryMetric })}
                  placeholder="Sensor…"
                  width="w-full"
                  buttonClassName="border-white/[0.12] bg-black/[0.24]"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Grow</Label>
                <CustomDropdown
                  options={growOptions}
                  value={draft.growId}
                  onChange={(value) => updateMappingDraft(binding.id, { growId: value, plantId: '' })}
                  placeholder={growOptions.length === 0 ? 'No grow…' : 'Select grow…'}
                  width="w-full"
                  buttonClassName="border-white/[0.12] bg-black/[0.24]"
                  disabled={growOptions.length === 0}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Plant optional</Label>
                <CustomDropdown
                  options={plantOptions}
                  value={draft.plantId}
                  onChange={(value) => updateMappingDraft(binding.id, { plantId: value })}
                  placeholder={plantOptions.length === 0 ? 'No plants…' : 'Select plant…'}
                  width="w-full"
                  buttonClassName="border-white/[0.12] bg-black/[0.24]"
                  disabled={plantOptions.length === 0}
                />
              </div>
              <Button className="h-10 rounded-2xl" onClick={() => handleSaveSensorMapping(binding)} disabled={growOptions.length === 0}>
                Save
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-1 font-semibold ${binding.growId ? 'border-emerald-300/[0.18] bg-emerald-300/10 text-emerald-100' : 'border-amber-300/28 bg-amber-300/12 text-amber-100'}`}>
                  {binding.growId ? 'Mapped' : 'Needs mapping'}
                </span>
                {reading && <span>Last reading {new Date(reading.recordedAt).toLocaleString()}</span>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-2xl px-2 text-destructive hover:text-destructive"
                onClick={() => handleDeleteSensorBinding(binding)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete sensor
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
