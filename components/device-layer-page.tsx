"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddDevicePanel } from '@/components/devices/add-device-panel';
import { AcInfinityPollingPanel } from '@/components/devices/ac-infinity-polling-panel';
import { DeviceBindingsPanel } from '@/components/devices/device-bindings-panel';
import { DeviceInventoryCard } from '@/components/devices/device-inventory-card';
import { useAcInfinityPolling } from '@/components/ac-infinity-polling-provider';
import { useTelemetryRefreshToken } from '@/hooks/useTelemetryRefreshToken';
import {
  getAllDeviceIntegrations,
  getAllDevices,
  getAllGrows,
  getAllSensorBindings,
  getSettings,
  getTelemetryForGrow,
  deleteDevice,
  saveDevice,
  saveDeviceIntegration,
  saveSensorBinding,
  saveTelemetryReading,
  type Device,
  type DeviceIntegration,
  type Grow,
  type SensorBinding,
  type TelemetryMetric,
  type TelemetryReading,
  type TuyaSensor,
} from '@/lib/db';
import {
  buildAcInfinityTelemetryReadings,
  buildDeviceLayerRecords,
  inferTelemetryMetricFromSensor,
  inferUnitForMetric,
} from '@/lib/device-layer-utils';
import {
  acInfinityDefaultMetrics,
  buildAcInfinityDeviceId,
  getLatestReadingByBinding,
  integrationTypeLabels,
  isAcInfinityControllerDevice,
} from '@/lib/device-layer-helpers';
import {
  getAcInfinityIntegrationId,
  getAcInfinitySessionStatus,
  getStoredAcInfinityAppId,
  refreshAcInfinityControllers,
} from '@/lib/ac-infinity-integration';
import {
  getLatestLastPollAt,
} from '@/lib/ac-infinity-polling';
import { normalizeSensorConfig } from '@/lib/sensor-utils';
import { useSettings } from '@/hooks/useSettings';
import { TuyaApiClient, type TuyaCloudDevice } from '@/lib/tuya-api';
import type { AcInfinityController } from '@/lib/ac-infinity-api';

const deviceTypeOptions: Array<{ id: Device['type']; label: string }> = [
  { id: 'sensor', label: 'Sensor' },
  { id: 'lamp', label: 'Lamp' },
  { id: 'fan', label: 'Fan' },
  { id: 'filter', label: 'Filter' },
  { id: 'humidifier', label: 'Humidifier' },
  { id: 'dehumidifier', label: 'Dehumidifier' },
  { id: 'pump', label: 'Pump' },
  { id: 'controller', label: 'Controller' },
  { id: 'other', label: 'Other' },
];

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

export default function DeviceLayerPage() {
  const { settings } = useSettings();
  const { isPolling: isAcInfinityPolling, pollNow } = useAcInfinityPolling();
  const telemetryRefreshToken = useTelemetryRefreshToken();
  const [integrationsData, setIntegrationsData] = useState<DeviceIntegration[]>([]);
  const [devicesData, setDevicesData] = useState<Device[]>([]);
  const [bindingsData, setBindingsData] = useState<SensorBinding[]>([]);
  const [growsData, setGrowsData] = useState<Grow[]>([]);
  const [telemetryData, setTelemetryData] = useState<TelemetryReading[]>([]);
  const [legacySensors, setLegacySensors] = useState<TuyaSensor[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [acInfinityControllers, setAcInfinityControllers] = useState<AcInfinityController[]>([]);
  const [discoveredTuyaDevices, setDiscoveredTuyaDevices] = useState<TuyaCloudDevice[]>([]);
  const [isLoadingAcControllers, setIsLoadingAcControllers] = useState(false);
  const [isDiscoveringTuya, setIsDiscoveringTuya] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [manualForm, setManualForm] = useState({
    integrationName: 'Manual Sensors',
    deviceName: '',
    deviceType: 'sensor' as Device['type'],
    metric: 'temperature' as TelemetryMetric,
    unit: inferUnitForMetric('temperature'),
    room: '',
    tent: '',
    growId: '',
    plantId: '',
  });

  const acInfinityEmail = settings?.acInfinityEmail || '';

  const loadDeviceLayer = async () => {
    const [loadedIntegrations, loadedDevices, loadedBindings, loadedGrows, loadedSettings] = await Promise.all([
      getAllDeviceIntegrations(),
      getAllDevices(),
      getAllSensorBindings(),
      getAllGrows(),
      getSettings(),
    ]);
    const telemetry = (await Promise.all(loadedGrows.map(grow => getTelemetryForGrow(grow.id)))).flat();

    setIntegrationsData(loadedIntegrations);
    setDevicesData(loadedDevices);
    setBindingsData(loadedBindings);
    setGrowsData(loadedGrows);
    setTelemetryData(telemetry);
    setLegacySensors(loadedSettings?.sensors?.map(normalizeSensorConfig) ?? []);
  };

  useEffect(() => {
    loadDeviceLayer().catch(() => setStatusMessage('Device layer could not be loaded.'));
  }, [telemetryRefreshToken]);

  const activeBindingCount = useMemo(() => bindingsData.filter(binding => binding.growId || binding.plantId).length, [bindingsData]);
  const growOptions = useMemo(() => growsData.map(grow => ({
    id: grow.id,
    label: grow.name,
    description: `${grow.currentPhase} • ${new Date(grow.startDate).toLocaleDateString()}`,
  })), [growsData]);
  const deviceById = useMemo(() => new Map(devicesData.map(device => [device.id, device])), [devicesData]);
  const integrationById = useMemo(() => new Map(integrationsData.map(integration => [integration.id, integration])), [integrationsData]);
  const latestReadingByBinding = useMemo(() => getLatestReadingByBinding(telemetryData), [telemetryData]);
  const acInfinityIntegrations = useMemo(() => integrationsData.filter(integration => integration.type === 'ac_infinity'), [integrationsData]);
  const lastAcPollAt = useMemo(() => {
    const fromConfig = getLatestLastPollAt(acInfinityIntegrations.map(integration => integration.config));
    if (fromConfig) return fromConfig;

    const acDeviceIds = new Set(
      devicesData
        .filter(device => integrationById.get(device.integrationId)?.type === 'ac_infinity')
        .map(device => device.id),
    );
    const acBindingIds = new Set(
      bindingsData.filter(binding => acDeviceIds.has(binding.deviceId)).map(binding => binding.id),
    );
    const latestReading = telemetryData
      .filter(reading => reading.sensorBindingId && acBindingIds.has(reading.sensorBindingId))
      .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];

    return latestReading?.recordedAt ?? null;
  }, [acInfinityIntegrations, bindingsData, devicesData, integrationById, telemetryData]);
  const selectedDevice = useMemo(() => devicesData.find(device => device.id === selectedDeviceId), [devicesData, selectedDeviceId]);
  const selectedDeviceIntegration = selectedDevice ? integrationById.get(selectedDevice.integrationId) : undefined;
  const selectedDeviceBindings = useMemo(() => (
    selectedDevice ? bindingsData.filter(binding => binding.deviceId === selectedDevice.id) : bindingsData
  ), [bindingsData, selectedDevice]);

  const openDeviceModal = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setIsDeviceModalOpen(true);
  };

  const closeDeviceModal = () => {
    setIsDeviceModalOpen(false);
    setSelectedDeviceId('');
  };

  const openDeviceAfterImport = (deviceId: string) => {
    setIsAddDeviceModalOpen(false);
    openDeviceModal(deviceId);
  };

  const devicesBySource = useMemo(() => {
    const groups = new Map<string, Device[]>();
    for (const device of devicesData) {
      const integration = integrationById.get(device.integrationId);
      const key = integration?.type ?? 'other';
      const current = groups.get(key) ?? [];
      current.push(device);
      groups.set(key, current);
    }
    return groups;
  }, [devicesData, integrationById]);

  const handleDiscoverAc = useCallback(async (options?: { silent?: boolean }) => {
    const appId = getStoredAcInfinityAppId(integrationsData);
    if (!appId) {
      setAcInfinityControllers([]);
      if (!options?.silent) {
        setStatusMessage('Connect AC Infinity in Settings → Integrations first.');
      }
      return;
    }

    setIsLoadingAcControllers(true);
    try {
      const data = await refreshAcInfinityControllers(appId);
      if (!data.success) {
        setAcInfinityControllers([]);
        setStatusMessage(data.message || 'Session expired. Reconnect in Settings → Integrations.');
        return;
      }
      setAcInfinityControllers(data.controllers);
      if (!options?.silent) {
        setStatusMessage(data.message || `${data.controllers.length} controllers loaded.`);
      }
    } catch (error) {
      setAcInfinityControllers([]);
      if (!options?.silent) {
        setStatusMessage(error instanceof Error ? error.message : 'Failed to load AC Infinity controllers.');
      }
    } finally {
      setIsLoadingAcControllers(false);
    }
  }, [integrationsData]);

  useEffect(() => {
    const appId = getStoredAcInfinityAppId(integrationsData);
    if (!appId) {
      setAcInfinityControllers([]);
      return;
    }
    void handleDiscoverAc({ silent: true });
  }, [integrationsData, handleDiscoverAc]);

  const handleDiscoverTuya = async () => {
    if (!settings?.tuyaClientId || !settings?.tuyaClientSecret) {
      setStatusMessage('Save Tuya credentials in Settings → Integrations first.');
      return;
    }

    setIsDiscoveringTuya(true);
    try {
      const client = new TuyaApiClient({
        clientId: settings.tuyaClientId,
        clientSecret: settings.tuyaClientSecret,
      });
      const result = await client.listCloudDevices();
      if (!result.success) {
        setDiscoveredTuyaDevices([]);
        setStatusMessage(result.message || 'Tuya discovery failed.');
        return;
      }
      setDiscoveredTuyaDevices(result.devices);
      setStatusMessage(result.devices.length > 0 ? `${result.devices.length} Tuya devices discovered.` : 'No Tuya devices returned.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Tuya discovery failed.');
    } finally {
      setIsDiscoveringTuya(false);
    }
  };

  const handleImportAcInfinityController = async (controller: AcInfinityController) => {
    const appId = getStoredAcInfinityAppId(integrationsData);
    if (!appId) {
      setStatusMessage('Connect AC Infinity in Settings → Integrations first.');
      return;
    }

    setIsImporting(true);
    try {
      const timestamp = new Date().toISOString();
      const integrationId = getAcInfinityIntegrationId(acInfinityEmail || 'cloud');
      const existingDevice = devicesData.find(device => isAcInfinityControllerDevice(device, controller.id, integrationId));
      const deviceId = existingDevice?.id ?? buildAcInfinityDeviceId(controller.id);
      if (existingDevice) {
        setStatusMessage(`${controller.name} is already connected.`);
        return;
      }

      const existingIntegration = integrationsData.find(item => item.id === integrationId);
      await saveDeviceIntegration({
        id: integrationId,
        type: 'ac_infinity',
        name: 'AC Infinity Cloud',
        status: 'configured',
        config: {
          ...(existingIntegration?.config ?? {}),
          adapterId: 'adapter.ac-infinity.v1',
          telemetrySource: 'reverse_engineered_cloud',
          auth: 'server_route_ephemeral_credentials',
          accountEmail: acInfinityEmail.trim(),
          appId,
          pollIntervalMinutes: typeof existingIntegration?.config?.pollIntervalMinutes === 'number'
            ? existingIntegration.config.pollIntervalMinutes
            : 5,
          lastPollAt: timestamp,
        },
        createdAt: existingIntegration?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });

      await saveDevice({
        id: deviceId,
        integrationId,
        name: controller.name,
        type: 'controller',
        growId: manualForm.growId.trim() || undefined,
        plantId: manualForm.plantId.trim() || undefined,
        status: controller.online === false ? 'inactive' : 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      const bindings = acInfinityDefaultMetrics.map(sourceMetric => ({
        id: `${deviceId}-${sourceMetric.rawLabel}`,
        deviceId,
        growId: manualForm.growId.trim() || undefined,
        plantId: manualForm.plantId.trim() || undefined,
        metric: sourceMetric.metric,
        label: `${controller.name} ${sourceMetric.rawLabel}`,
        unit: inferUnitForMetric(sourceMetric.metric),
        createdAt: timestamp,
      }));

      await Promise.all(bindings.map(binding => saveSensorBinding(binding)));

      const readings = buildAcInfinityTelemetryReadings({ controller, bindings, recordedAt: timestamp });
      await Promise.all(readings.map(reading => saveTelemetryReading(reading)));

      await loadDeviceLayer();
      openDeviceAfterImport(deviceId);
      setStatusMessage(readings.length > 0
        ? `${controller.name} imported with ${readings.length} telemetry readings.`
        : `${controller.name} imported with climate telemetry bindings.`);
    } finally {
      setIsImporting(false);
    }
  };

  const importTuyaDevice = async (input: { id: string; name: string; properties?: Array<{ code: string }> }) => {
    setIsImporting(true);
    try {
      if (devicesData.some(device => device.id === input.id)) {
        setStatusMessage(`${input.name} is already connected.`);
        return;
      }

      let properties = input.properties;
      if (!properties && settings?.tuyaClientId && settings?.tuyaClientSecret) {
        const client = new TuyaApiClient({
          clientId: settings.tuyaClientId,
          clientSecret: settings.tuyaClientSecret,
        });
        const sensorData = await client.getSensorData(input.id);
        properties = sensorData.result?.properties?.map(property => ({ code: property.code }));
      }

      const firstMetric = inferTelemetryMetricFromSensor({
        type: 'Temperature',
        values: (properties ?? [{ code: 'temperature' }]).map(property => ({ code: property.code })),
      });

      const records = buildDeviceLayerRecords({
        integrationType: 'tuya_legacy',
        integrationName: 'Tuya Legacy Adapter',
        deviceName: input.name,
        deviceType: 'sensor',
        metric: firstMetric,
        unit: inferUnitForMetric(firstMetric),
      });

      await saveDeviceIntegration(records.integration);
      await saveDevice({
        ...records.device,
        id: input.id,
        integrationId: records.integration.id,
      });

      const values = properties && properties.length > 0 ? properties : [{ code: firstMetric }];
      await Promise.all(values.map(value => {
        const inferredMetric = inferTelemetryMetricFromSensor({
          type: 'Temperature',
          values: [{ code: value.code }],
        });
        return saveSensorBinding({
          ...records.binding,
          id: `${input.id}-${value.code}`,
          deviceId: input.id,
          metric: inferredMetric,
          label: `${input.name} ${value.code}`,
          unit: inferUnitForMetric(inferredMetric),
        });
      }));

      await loadDeviceLayer();
      openDeviceAfterImport(input.id);
      setStatusMessage(`${input.name} imported.`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportLegacySensor = async (sensor: TuyaSensor) => {
    const normalizedSensor = normalizeSensorConfig(sensor);
    await importTuyaDevice({
      id: normalizedSensor.id,
      name: normalizedSensor.name,
      properties: normalizedSensor.values,
    });
  };

  const handleSaveManualDevice = async () => {
    if (!manualForm.integrationName.trim() || !manualForm.deviceName.trim()) {
      setStatusMessage('Integration and device name are required.');
      return;
    }

    const records = buildDeviceLayerRecords({
      integrationType: 'manual',
      integrationName: manualForm.integrationName,
      deviceName: manualForm.deviceName,
      deviceType: manualForm.deviceType,
      room: manualForm.room,
      tent: manualForm.tent,
      growId: manualForm.growId,
      plantId: manualForm.plantId,
      metric: manualForm.metric,
      unit: manualForm.unit,
    });

    await saveDeviceIntegration(records.integration);
    await saveDevice(records.device);
    await saveSensorBinding(records.binding);
    await loadDeviceLayer();
    openDeviceAfterImport(records.device.id);
    setManualForm(current => ({ ...current, deviceName: '', growId: '', plantId: '' }));
    setStatusMessage('Device and sensor binding saved.');
  };

  const handleDeleteDevice = async (device: Device) => {
    const bindingCount = bindingsData.filter(binding => binding.deviceId === device.id).length;
    const confirmed = window.confirm(`Delete ${device.name} and ${bindingCount} mapped sensor value${bindingCount === 1 ? '' : 's'}?`);
    if (!confirmed) return;

    await deleteDevice(device.id);
    if (selectedDeviceId === device.id) closeDeviceModal();
    await loadDeviceLayer();
    setStatusMessage(`${device.name} deleted.`);
  };

  const handleManualPoll = async () => {
    const result = await pollNow();
    await loadDeviceLayer();
    if (result.pollSucceeded) {
      setStatusMessage(result.savedCount > 0
        ? `${result.savedCount} AC Infinity telemetry values polled.`
        : 'AC Infinity polling returned no mapped values.');
    } else {
      setStatusMessage('Reconnect AC Infinity in Settings if polling fails.');
    }
  };

  const latestTelemetryAt = telemetryData.reduce<string>((latest, reading) => {
    if (!latest || new Date(reading.recordedAt).getTime() > new Date(latest).getTime()) return reading.recordedAt;
    return latest;
  }, '');

  return (
    <div className="mt-3 space-y-3 overflow-x-hidden">
      <section className="infotainment-panel min-w-0 overflow-hidden p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="os-section-title">
              <Activity className="h-4 w-4" />
              Devices
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-normal text-foreground sm:text-2xl">My Devices</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tap a device card to configure sync, polling and grow bindings.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid grid-cols-3 gap-2 sm:min-w-[260px]">
              <StatusMetric label="Devices" value={devicesData.length} />
              <StatusMetric label="Mapped" value={activeBindingCount} />
              <StatusMetric label="Readings" value={telemetryData.length} />
            </div>
            <Button className="h-11 rounded-2xl" onClick={() => setIsAddDeviceModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add device
            </Button>
          </div>
        </div>
      </section>

      {statusMessage && (
        <div className="rounded-[1rem] border border-emerald-300/[0.18] bg-emerald-300/10 px-4 py-3 text-sm font-medium text-emerald-100" aria-live="polite">
          {statusMessage}
        </div>
      )}

      <section className="infotainment-panel p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">Device inventory</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {latestTelemetryAt ? `Latest telemetry ${new Date(latestTelemetryAt).toLocaleString()}` : 'No telemetry yet'}
            </div>
          </div>
        </div>

        {devicesData.length === 0 ? (
          <div className="os-empty mt-4 border-dashed text-center">
            <Plus className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No devices connected yet.</p>
            <Button className="mt-4 rounded-2xl" onClick={() => setIsAddDeviceModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first device
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {[...devicesBySource.entries()].map(([sourceType, sourceDevices]) => (
              <div key={sourceType}>
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {integrationTypeLabels[sourceType] ?? sourceType}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {sourceDevices.map(device => (
                    <DeviceInventoryCard
                      key={device.id}
                      device={device}
                      integration={integrationById.get(device.integrationId)}
                      grow={device.growId ? growsData.find(grow => grow.id === device.growId) : undefined}
                      bindings={bindingsData.filter(binding => binding.deviceId === device.id)}
                      latestReadingByBinding={latestReadingByBinding}
                      onSelect={() => openDeviceModal(device.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={isAddDeviceModalOpen} onOpenChange={setIsAddDeviceModalOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
            <DialogTitle>Add device</DialogTitle>
            <DialogDescription>
              Choose a source, import hardware, and optionally pre-assign a grow.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(88vh-5.5rem)] px-6 py-5">
            <AddDevicePanel
              integrations={integrationsData}
              devices={devicesData}
              legacySensors={legacySensors}
              discoveredTuyaDevices={discoveredTuyaDevices}
              acControllers={acInfinityControllers}
              isDiscovering={isDiscoveringTuya}
              isImporting={isImporting}
              acInfinityEmail={acInfinityEmail}
              manualForm={manualForm}
              deviceTypeOptions={deviceTypeOptions}
              metricOptions={metricOptions}
              growOptions={growOptions}
              isLoadingAcControllers={isLoadingAcControllers}
              onDiscoverTuya={handleDiscoverTuya}
              onImportAc={handleImportAcInfinityController}
              onImportTuyaCloud={(device) => importTuyaDevice({ id: device.id, name: device.name })}
              onImportLegacyTuya={handleImportLegacySensor}
              onSaveManual={handleSaveManualDevice}
              onManualChange={(patch) => setManualForm(current => ({ ...current, ...patch }))}
              onMetricChange={(metric) => {
                const nextMetric = metric as TelemetryMetric;
                setManualForm(current => ({ ...current, metric: nextMetric, unit: inferUnitForMetric(nextMetric) }));
              }}
              isAcInfinityDevice={isAcInfinityControllerDevice}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeviceModalOpen} onOpenChange={(open) => {
        if (!open) closeDeviceModal();
        else setIsDeviceModalOpen(true);
      }}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden p-0">
          {selectedDevice && (
            <>
              <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
                <div className="flex items-start justify-between gap-3 pr-8">
                  <div className="min-w-0">
                    <DialogTitle className="truncate">{selectedDevice.name}</DialogTitle>
                    <DialogDescription className="capitalize">
                      {integrationTypeLabels[selectedDeviceIntegration?.type ?? 'other'] ?? 'Device'} • {selectedDevice.type} • {selectedDevice.status}
                    </DialogDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-2xl text-destructive hover:text-destructive"
                    onClick={() => void handleDeleteDevice(selectedDevice)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(88vh-5.5rem)] px-6 py-5">
                <div className="space-y-5">
                  {selectedDeviceIntegration?.type === 'ac_infinity' && (
                    <>
                      <AcInfinityPollingPanel
                        device={selectedDevice}
                        integration={selectedDeviceIntegration}
                        isPolling={isAcInfinityPolling}
                        lastPollAt={lastAcPollAt}
                        onPoll={() => void handleManualPoll()}
                        onSaved={loadDeviceLayer}
                        onStatus={setStatusMessage}
                      />
                      {getAcInfinitySessionStatus(acInfinityEmail, integrationsData) !== 'connected' && (
                        <p className="text-sm text-amber-200">Session expired. Reconnect AC Infinity in Settings → Integrations.</p>
                      )}
                    </>
                  )}

                  <DeviceBindingsPanel
                    bindings={selectedDeviceBindings}
                    grows={growsData}
                    devicesById={deviceById}
                    latestReadingByBinding={latestReadingByBinding}
                    defaultGrowId={growsData[0]?.id ?? ''}
                    onSaved={loadDeviceLayer}
                    onStatus={setStatusMessage}
                  />
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="os-stat-card p-2.5">
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
