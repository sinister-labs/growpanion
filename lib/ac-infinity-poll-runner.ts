import {
  getAllDeviceIntegrations,
  getAllDevices,
  getAllSensorBindings,
  generateId,
  saveDeviceIntegration,
  saveTelemetryReading,
  type DeviceIntegration,
  type TelemetryReading,
} from '@/lib/db';
import { refreshAcInfinityControllers } from '@/lib/ac-infinity-integration';
import {
  buildAcInfinityDeviceId,
  inferAcInfinitySourceMetric,
  isAcInfinityControllerDevice,
} from '@/lib/device-layer-helpers';
import { readAcInfinityMetricValue } from '@/lib/device-layer-utils';
import { notifyTelemetryUpdated } from '@/lib/telemetry-events';

export interface AcInfinityPollResult {
  savedCount: number;
  pollSucceeded: boolean;
  recordedAt: string;
}

export function getPollableAcInfinityIntegrations(integrations: DeviceIntegration[]): DeviceIntegration[] {
  return integrations.filter(
    integration => integration.type === 'ac_infinity'
      && typeof integration.config?.appId === 'string'
      && integration.config.appId.trim().length > 0,
  );
}

export async function runAcInfinityTelemetryPoll(): Promise<AcInfinityPollResult> {
  const recordedAt = new Date().toISOString();
  const [integrations, devices, bindings] = await Promise.all([
    getAllDeviceIntegrations(),
    getAllDevices(),
    getAllSensorBindings(),
  ]);

  const pollableIntegrations = getPollableAcInfinityIntegrations(integrations);
  if (pollableIntegrations.length === 0) {
    return { savedCount: 0, pollSucceeded: false, recordedAt };
  }

  let savedCount = 0;
  let pollSucceeded = false;

  for (const integration of pollableIntegrations) {
    const data = await refreshAcInfinityControllers(integration.config?.appId as string);
    if (!data.success) continue;
    pollSucceeded = true;

    for (const controller of data.controllers) {
      const deviceId = devices.find(device => isAcInfinityControllerDevice(device, controller.id, integration.id))?.id
        ?? buildAcInfinityDeviceId(controller.id);
      const controllerBindings = bindings.filter(binding => binding.deviceId === deviceId && binding.growId);
      const readings = controllerBindings
        .map(binding => {
          const sourceMetric = inferAcInfinitySourceMetric(binding);
          const value = readAcInfinityMetricValue(controller.raw, sourceMetric);
          if (value === null || !binding.growId) return null;

          const reading: TelemetryReading = {
            id: generateId(),
            growId: binding.growId,
            deviceId,
            sensorBindingId: binding.id,
            metric: binding.metric,
            value,
            unit: binding.unit,
            recordedAt,
            source: 'sensor',
          };
          if (binding.plantId) reading.plantId = binding.plantId;
          return reading;
        })
        .filter((reading): reading is TelemetryReading => Boolean(reading));

      await Promise.all(readings.map(reading => saveTelemetryReading(reading)));
      savedCount += readings.length;
    }
  }

  if (pollSucceeded) {
    await Promise.all(pollableIntegrations.map(integration => saveDeviceIntegration({
      ...integration,
      config: {
        ...(integration.config ?? {}),
        lastPollAt: recordedAt,
      },
      updatedAt: recordedAt,
    })));
  }

  return { savedCount, pollSucceeded, recordedAt };
}

export function notifyAcInfinityPolled(result: AcInfinityPollResult) {
  notifyTelemetryUpdated({
    source: 'ac_infinity_poll',
    savedCount: result.savedCount,
  });
}
