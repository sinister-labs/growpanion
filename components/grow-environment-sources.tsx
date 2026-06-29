"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Router, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import {
  getAllDevices,
  getAllSensorBindings,
  getTelemetryForGrow,
  saveSensorBinding,
  type Device,
  type SensorBinding,
  type TelemetryReading,
} from '@/lib/db';
import { formatMetricLabel, formatTelemetryValue, getLatestReadingByBinding } from '@/lib/device-layer-helpers';
import { useRouting } from '@/hooks/useRouting';
import { useTelemetryRefreshToken } from '@/hooks/useTelemetryRefreshToken';

interface GrowEnvironmentSourcesProps {
  growId: string;
}

export default function GrowEnvironmentSources({ growId }: GrowEnvironmentSourcesProps) {
  const { navigateTo } = useRouting();
  const telemetryRefreshToken = useTelemetryRefreshToken();
  const [bindings, setBindings] = useState<SensorBinding[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryReading[]>([]);
  const [pickerOptions, setPickerOptions] = useState<SensorBinding[]>([]);
  const [unassignedBindingId, setUnassignedBindingId] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [allBindings, allDevices, growTelemetry] = await Promise.all([
      getAllSensorBindings(),
      getAllDevices(),
      getTelemetryForGrow(growId),
    ]);
    setBindings(allBindings.filter(binding => binding.growId === growId));
    setDevices(allDevices);
    setTelemetry(growTelemetry);
    setPickerOptions(allBindings.filter(binding => !binding.growId));
  }, [growId]);

  useEffect(() => {
    loadData().catch(() => setStatusMessage('Environment sources could not be loaded.'));
  }, [loadData, telemetryRefreshToken]);

  const latestReadingByBinding = useMemo(() => getLatestReadingByBinding(telemetry), [telemetry]);
  const deviceById = useMemo(() => new Map(devices.map(device => [device.id, device])), [devices]);

  const bindingOptions = pickerOptions.map(binding => ({
    id: binding.id,
    label: binding.label,
    description: deviceById.get(binding.deviceId)?.name ?? binding.deviceId,
  }));

  const handleAssignBinding = async () => {
    const binding = pickerOptions.find(item => item.id === unassignedBindingId);
    if (!binding) {
      setStatusMessage('Select an unassigned sensor binding.');
      return;
    }

    await saveSensorBinding({ ...binding, growId });
    setUnassignedBindingId('');
    await loadData();
    setStatusMessage(`${binding.label} assigned to this grow.`);
  };

  return (
    <section className="infotainment-panel p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <Router className="h-4 w-4" />
            Environment sources
          </div>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Sensors feeding this grow</h3>
          <p className="mt-1 text-sm text-muted-foreground">Quick view of mapped telemetry sources for this grow.</p>
        </div>
        <Button variant="outline" className="rounded-2xl" onClick={() => navigateTo('devices')}>
          Manage devices
        </Button>
      </div>

      {statusMessage && (
        <p className="text-sm text-primary" aria-live="polite">{statusMessage}</p>
      )}

      {bindings.length === 0 ? (
        <div className="rounded-[1rem] border border-dashed border-white/[0.12] bg-white/[0.035] p-4 text-sm text-muted-foreground">
          No sensor bindings mapped to this grow yet.
        </div>
      ) : (
        <div className="space-y-2">
          {bindings.map(binding => {
            const device = deviceById.get(binding.deviceId);
            const reading = latestReadingByBinding[binding.id];
            return (
              <div key={binding.id} className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{binding.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {device?.name ?? 'Unknown device'} • {formatMetricLabel(binding.metric)}
                    </div>
                  </div>
                  <div className="text-sm text-foreground">
                    {reading ? `${formatTelemetryValue(reading.value)} ${binding.unit}` : 'No reading yet'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {bindingOptions.length > 0 && (
        <div className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-3">
          <div className="text-sm font-semibold text-foreground">Assign unassigned sensor</div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Available binding</Label>
              <CustomDropdown
                options={bindingOptions}
                value={unassignedBindingId}
                onChange={setUnassignedBindingId}
                placeholder="Select binding…"
                width="w-full"
                buttonClassName="border-white/10 bg-white/[0.045]"
              />
            </div>
            <Button className="h-10 rounded-2xl" onClick={handleAssignBinding}>
              Assign to grow
            </Button>
          </div>
        </div>
      )}

      {bindingOptions.length === 0 && bindings.length === 0 && (
        <div className="flex items-start gap-2 rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 text-sm text-muted-foreground">
          <Settings2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Connect integrations in Settings, import devices, then map bindings here or on the Devices screen.</p>
        </div>
      )}
    </section>
  );
}
