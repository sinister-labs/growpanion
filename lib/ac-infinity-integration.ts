import type { DeviceIntegration } from '@/lib/db';
import {
  fetchAcInfinityControllers,
  fetchAcInfinityControllersByAppId,
  type AcInfinityController,
} from '@/lib/ac-infinity-api';
import { isRunningInTauri } from '@/lib/deployment';

export interface AcInfinityConnectResponse {
  success: boolean;
  appId?: string;
  controllers: AcInfinityController[];
  message?: string;
}

export function getAcInfinityIntegrationId(email: string): string {
  const slug = email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `ac-infinity-${slug || 'cloud'}`;
}

export function getAcInfinitySessionStatus(
  email: string | undefined,
  integrations: DeviceIntegration[],
): 'connected' | 'needs_attention' | 'not_configured' {
  if (!email?.trim()) return 'not_configured';
  const integrationId = getAcInfinityIntegrationId(email);
  const integration = integrations.find(item => item.id === integrationId || item.type === 'ac_infinity');
  const appId = integration?.config?.appId;
  if (typeof appId === 'string' && appId.trim()) return 'connected';
  return 'needs_attention';
}

export function getStoredAcInfinityAppId(integrations: DeviceIntegration[]): string {
  const integration = integrations.find(item => item.type === 'ac_infinity');
  const appId = integration?.config?.appId;
  return typeof appId === 'string' ? appId.trim() : '';
}

export async function connectAcInfinityAccount(email: string, password: string): Promise<AcInfinityConnectResponse> {
  if (await isRunningInTauri()) {
    try {
      const result = await fetchAcInfinityControllers({ email, password });
      return {
        success: result.success,
        appId: result.appId,
        controllers: result.controllers,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        controllers: [],
        message: error instanceof Error ? error.message : 'AC Infinity request failed.',
      };
    }
  }

  const response = await fetch('/api/ac-infinity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json() as Promise<AcInfinityConnectResponse>;
}

export async function refreshAcInfinityControllers(appId: string): Promise<AcInfinityConnectResponse> {
  if (await isRunningInTauri()) {
    try {
      const controllers = await fetchAcInfinityControllersByAppId(appId);
      return {
        success: true,
        controllers,
        message: controllers.length > 0
          ? `${controllers.length} controller refreshed.`
          : 'No AC Infinity controllers were returned.',
      };
    } catch (error) {
      return {
        success: false,
        controllers: [],
        message: error instanceof Error ? error.message : 'AC Infinity request failed.',
      };
    }
  }

  const response = await fetch('/api/ac-infinity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId }),
  });
  return response.json() as Promise<AcInfinityConnectResponse>;
}
