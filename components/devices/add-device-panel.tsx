"use client";

import { useState } from 'react';
import { Cpu, Download, Plus, RefreshCw, Settings2, SlidersHorizontal, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomDropdown } from '@/components/ui/custom-dropdown';
import type { AcInfinityController } from '@/lib/ac-infinity-api';
import {
  getAcInfinityIntegrationId,
  getAcInfinitySessionStatus,
} from '@/lib/ac-infinity-integration';
import type { DeviceIntegrationType } from '@/lib/device-layer-utils';
import type { Device, DeviceIntegration, TelemetryMetric, TuyaSensor } from '@/lib/db';
import type { TuyaCloudDevice } from '@/lib/tuya-api';
import { useRouting } from '@/hooks/useRouting';

const sourceOptions = [
  { id: 'ac_infinity' as DeviceIntegrationType, label: 'AC Infinity', icon: Cpu },
  { id: 'tuya_legacy' as DeviceIntegrationType, label: 'Tuya', icon: Wifi },
  { id: 'manual' as DeviceIntegrationType, label: 'Manual', icon: SlidersHorizontal },
];

interface AddDevicePanelProps {
  integrations: DeviceIntegration[];
  devices: Device[];
  legacySensors: TuyaSensor[];
  discoveredTuyaDevices: TuyaCloudDevice[];
  acControllers: AcInfinityController[];
  isDiscovering: boolean;
  isImporting: boolean;
  acInfinityEmail: string;
  manualForm: {
    integrationName: string;
    deviceName: string;
    deviceType: Device['type'];
    metric: TelemetryMetric;
    unit: string;
    room: string;
    tent: string;
    growId: string;
    plantId: string;
  };
  deviceTypeOptions: Array<{ id: Device['type']; label: string }>;
  metricOptions: Array<{ id: string; label: string }>;
  growOptions: Array<{ id: string; label: string; description?: string }>;
  isLoadingAcControllers?: boolean;
  onDiscoverTuya: () => void;
  onImportAc: (controller: AcInfinityController) => void;
  onImportTuyaCloud: (device: TuyaCloudDevice) => void;
  onImportLegacyTuya: (sensor: TuyaSensor) => void;
  onSaveManual: () => void;
  onManualChange: (patch: Partial<AddDevicePanelProps['manualForm']>) => void;
  onMetricChange: (metric: string) => void;
  isAcInfinityDevice: (device: Device, controllerId: string, integrationId?: string) => boolean;
}

export function AddDevicePanel({
  integrations,
  devices,
  legacySensors,
  discoveredTuyaDevices,
  acControllers,
  isDiscovering,
  isImporting,
  acInfinityEmail,
  manualForm,
  deviceTypeOptions,
  metricOptions,
  growOptions,
  isLoadingAcControllers = false,
  onDiscoverTuya,
  onImportAc,
  onImportTuyaCloud,
  onImportLegacyTuya,
  onSaveManual,
  onManualChange,
  onMetricChange,
  isAcInfinityDevice,
}: AddDevicePanelProps) {
  const { navigateTo } = useRouting();
  const [source, setSource] = useState<DeviceIntegrationType>('ac_infinity');
  const acStatus = getAcInfinitySessionStatus(acInfinityEmail, integrations);

  return (
    <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {sourceOptions.map(option => {
            const Icon = option.icon;
            const active = source === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSource(option.id)}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-emerald-300/[0.28] bg-emerald-400/[0.24] text-emerald-100 shadow-[0_0_24px_rgba(52,255,154,0.18)]'
                    : 'border-white/[0.12] bg-white/[0.045] text-slate-200 hover:border-emerald-300/[0.22] hover:bg-emerald-300/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>

        <ol className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-5">
          {['Choose integration', 'Check credentials', 'Detect device', 'Assign grow', 'Enable values'].map((step, index) => (
            <li key={step} className="os-stat-card rounded-full px-2 py-1 text-center">
              {index + 1}. {step}
            </li>
          ))}
        </ol>

        {source === 'ac_infinity' && (
          <div className="space-y-3">
            {acStatus !== 'connected' ? (
              <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/[0.22] p-4 text-sm text-muted-foreground">
                <p>Connect your AC Infinity account in Settings before importing controllers.</p>
                <Button className="mt-3 h-9 rounded-2xl" variant="outline" onClick={() => navigateTo('settings', { tab: 'integrations' })}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Open Integrations
                </Button>
              </div>
            ) : (
              <>
                {isLoadingAcControllers && acControllers.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-white/[0.12] bg-black/[0.22] p-4 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading controllers from your AC Infinity account…
                  </div>
                ) : acControllers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/[0.22] p-4 text-sm text-muted-foreground">
                    No controllers found on your connected AC Infinity account.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {acControllers.map(controller => {
                      const integrationId = getAcInfinityIntegrationId(acInfinityEmail || 'cloud');
                      const existingDevice = devices.find(device => isAcInfinityDevice(device, controller.id, integrationId));
                      return (
                        <div key={controller.id} className="os-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">{controller.name}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {controller.model || 'Controller'} • {existingDevice ? 'connected' : controller.online === false ? 'offline' : 'available'}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="h-9 rounded-2xl"
                            onClick={() => onImportAc(controller)}
                            disabled={isImporting || Boolean(existingDevice)}
                          >
                            {isImporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            {existingDevice ? 'Connected' : 'Import'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {source === 'tuya_legacy' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/[0.22] p-4 text-sm text-muted-foreground">
              <p>Save Tuya credentials in Settings, then discover cloud devices here.</p>
              <Button className="mt-3 h-9 rounded-2xl" variant="outline" onClick={() => navigateTo('settings', { tab: 'integrations' })}>
                <Settings2 className="mr-2 h-4 w-4" />
                Open Integrations
              </Button>
            </div>
            <Button className="h-9 rounded-2xl" variant="outline" onClick={onDiscoverTuya} disabled={isDiscovering}>
              {isDiscovering ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
              Discover from cloud
            </Button>
            {discoveredTuyaDevices.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                {discoveredTuyaDevices.map(device => {
                  const existingDevice = devices.find(item => item.id === device.id || item.name === device.name);
                  return (
                    <div key={device.id} className="os-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{device.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{device.category || 'Device'} • {device.online ? 'online' : 'offline'}</div>
                      </div>
                      <Button size="sm" className="h-9 rounded-2xl" onClick={() => onImportTuyaCloud(device)} disabled={isImporting || Boolean(existingDevice)}>
                        {existingDevice ? 'Connected' : 'Import'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {legacySensors.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legacy saved sensors</div>
                {legacySensors.map(sensor => {
                  const existingDevice = devices.find(device => device.id === sensor.id);
                  return (
                    <div key={sensor.id} className="os-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{sensor.name}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{sensor.type} • {existingDevice ? 'connected' : sensor.values.map(value => value.code).join(', ')}</div>
                      </div>
                      <Button size="sm" className="h-9 rounded-2xl" onClick={() => onImportLegacyTuya(sensor)} disabled={Boolean(existingDevice)}>
                        {existingDevice ? 'Connected' : 'Import'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {source === 'manual' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Plus className="h-4 w-4 text-primary" />
              Add manual device
            </div>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
              <TextField label="Source name" value={manualForm.integrationName} onChange={(value) => onManualChange({ integrationName: value })} placeholder="Manual Sensors…" />
              <TextField label="Device name" value={manualForm.deviceName} onChange={(value) => onManualChange({ deviceName: value })} placeholder="Canopy sensor…" />
            </div>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
              <CustomDropdown
                options={deviceTypeOptions}
                value={manualForm.deviceType}
                onChange={(value) => onManualChange({ deviceType: value as Device['type'] })}
                placeholder="Device type…"
                width="w-full"
                buttonClassName="border-white/[0.12] bg-black/[0.24]"
              />
              <CustomDropdown
                options={metricOptions}
                value={manualForm.metric}
                onChange={onMetricChange}
                placeholder="Telemetry metric…"
                width="w-full"
                buttonClassName="border-white/[0.12] bg-black/[0.24]"
              />
            </div>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
              <TextField label="Unit" value={manualForm.unit} onChange={(value) => onManualChange({ unit: value })} placeholder="°C…" />
              <TextField label="Room" value={manualForm.room} onChange={(value) => onManualChange({ room: value })} placeholder="Room A…" />
              <TextField label="Tent" value={manualForm.tent} onChange={(value) => onManualChange({ tent: value })} placeholder="Tent 1…" />
            </div>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">Grow optional</Label>
                <CustomDropdown
                  options={growOptions}
                  value={manualForm.growId}
                  onChange={(value) => onManualChange({ growId: value })}
                  placeholder={growOptions.length === 0 ? 'No grow…' : 'Select grow…'}
                  width="w-full"
                  buttonClassName="border-white/[0.12] bg-black/[0.24]"
                  disabled={growOptions.length === 0}
                />
              </div>
              <TextField label="Plant ID optional" value={manualForm.plantId} onChange={(value) => onManualChange({ plantId: value })} placeholder="plant-id…" />
            </div>
            <Button className="h-11 w-full rounded-2xl" onClick={onSaveManual}>
              Save manual device
            </Button>
          </div>
        )}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}
