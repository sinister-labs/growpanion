"use client";

import { useEffect, useRef, useState } from 'react';
import { Cpu, RefreshCw, RadioTower, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/hooks/useSettings';
import { useRouting } from '@/hooks/useRouting';
import {
  connectAcInfinityAccount,
  getAcInfinityIntegrationId,
  getAcInfinitySessionStatus,
  getStoredAcInfinityAppId,
  refreshAcInfinityControllers,
} from '@/lib/ac-infinity-integration';
import {
  getAllDeviceIntegrations,
  saveDeviceIntegration,
  type DeviceIntegration,
} from '@/lib/db';
import { IntegrationStatusBadge } from '@/components/integrations/integration-status-badge';

export function AcInfinityIntegrationCard() {
  const { settings, updateSettings } = useSettings();
  const { navigateTo } = useRouting();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [integrations, setIntegrations] = useState<DeviceIntegration[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setEmail(settings?.acInfinityEmail || '');
  }, [settings?.acInfinityEmail]);

  useEffect(() => {
    getAllDeviceIntegrations()
      .then(setIntegrations)
      .catch(() => setIntegrations([]));
  }, []);

  const status = getAcInfinitySessionStatus(settings?.acInfinityEmail, integrations);
  const storedAppId = getStoredAcInfinityAppId(integrations);

  const persistSession = async (nextEmail: string, appId: string) => {
    const timestamp = new Date().toISOString();
    const integrationId = getAcInfinityIntegrationId(nextEmail);
    const existing = integrations.find(item => item.id === integrationId || item.type === 'ac_infinity');

    await saveDeviceIntegration({
      id: integrationId,
      type: 'ac_infinity',
      name: 'AC Infinity Cloud',
      status: 'configured',
      config: {
        ...(existing?.config ?? {}),
        adapterId: 'adapter.ac-infinity.v1',
        telemetrySource: 'reverse_engineered_cloud',
        auth: 'server_route_ephemeral_credentials',
        accountEmail: nextEmail,
        appId,
        pollIntervalMinutes: typeof existing?.config?.pollIntervalMinutes === 'number'
          ? existing.config.pollIntervalMinutes
          : 5,
      },
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });

    await updateSettings({ acInfinityEmail: nextEmail });
    const refreshed = await getAllDeviceIntegrations();
    setIntegrations(refreshed);
  };

  const handleConnect = async () => {
    const trimmedEmail = email.trim();
    const password = passwordRef.current?.value.trim() || '';
    if (!trimmedEmail || !password) {
      setMessage('Email and password are required.');
      if (passwordRef.current) passwordRef.current.value = '';
      return;
    }

    setIsConnecting(true);
    setMessage(null);
    try {
      const data = await connectAcInfinityAccount(trimmedEmail, password);
      if (!data.success || !data.appId) {
        setMessage(data.message || 'AC Infinity connection needs attention.');
        return;
      }

      await persistSession(trimmedEmail, data.appId);
      setShowReconnect(false);
      setMessage(data.message || 'AC Infinity account connected.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'AC Infinity connection failed.');
    } finally {
      if (passwordRef.current) passwordRef.current.value = '';
      setIsConnecting(false);
    }
  };

  const handleRefreshSession = async () => {
    if (!storedAppId) {
      setMessage('Reconnect with your password to restore the session.');
      setShowReconnect(true);
      return;
    }

    setIsRefreshing(true);
    setMessage(null);
    try {
      const data = await refreshAcInfinityControllers(storedAppId);
      if (!data.success) {
        setMessage(data.message || 'Session expired. Reconnect with your password.');
        setShowReconnect(true);
        return;
      }
      setMessage(data.message || 'AC Infinity session is active.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Session check failed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-medium text-primary">
              <Cpu className="h-5 w-5" />
              AC Infinity
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect your AC Infinity cloud account once. Import controllers from Devices.
            </CardDescription>
          </div>
          <IntegrationStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 rounded-[1rem] border border-amber-300/30 bg-amber-300/10 p-3 text-xs leading-5 text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          AC Infinity has no documented public API. Passwords are only sent to the local server route for this request.
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="ac-email" className="text-xs text-muted-foreground">Email</Label>
            <Input
              id="ac-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="account@example.com"
              className="border-white/10 bg-white/[0.045]"
            />
          </div>
          {(status === 'not_configured' || showReconnect) && (
            <div className="grid gap-1">
              <Label htmlFor="ac-password" className="text-xs text-muted-foreground">Password</Label>
              <Input
                id="ac-password"
                ref={passwordRef}
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                className="border-white/10 bg-white/[0.045]"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {(status === 'not_configured' || showReconnect) && (
            <Button className="rounded-2xl" onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RadioTower className="mr-2 h-4 w-4" />}
              {showReconnect ? 'Reconnect account' : 'Connect account'}
            </Button>
          )}
          {status !== 'not_configured' && !showReconnect && (
            <>
              <Button variant="outline" className="rounded-2xl" onClick={handleRefreshSession} disabled={isRefreshing}>
                {isRefreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Check session
              </Button>
              <Button variant="outline" className="rounded-2xl" onClick={() => setShowReconnect(true)}>
                Reconnect
              </Button>
            </>
          )}
          <Button variant="outline" className="rounded-2xl" onClick={() => navigateTo('devices')}>
            Manage devices
          </Button>
        </div>

        {message && (
          <p className="text-sm text-primary" aria-live="polite">{message}</p>
        )}
      </CardContent>
    </Card>
  );
}
