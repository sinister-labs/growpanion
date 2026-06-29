"use client";

import { useEffect, useState } from 'react';
import { Info, RefreshCw, Save, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/hooks/useSettings';
import { useRouting } from '@/hooks/useRouting';
import { IntegrationStatusBadge, type IntegrationStatus } from '@/components/integrations/integration-status-badge';

function resolveTuyaStatus(
  clientId: string,
  clientSecret: string,
  lastTestSuccess?: boolean,
): IntegrationStatus {
  if (!clientId.trim() || !clientSecret.trim()) return 'not_configured';
  if (lastTestSuccess === false) return 'needs_attention';
  if (lastTestSuccess === true) return 'connected';
  return 'needs_attention';
}

export function TuyaIntegrationCard() {
  const { settings, updateSettings, testTuyaConnection, connectionStatus } = useSettings();
  const { navigateTo } = useRouting();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastTestSuccess, setLastTestSuccess] = useState<boolean | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setClientId(settings?.tuyaClientId || '');
    setClientSecret(settings?.tuyaClientSecret || '');
  }, [settings?.tuyaClientId, settings?.tuyaClientSecret]);

  useEffect(() => {
    if (connectionStatus.isChecking) return;
    if (connectionStatus.success !== undefined) {
      setLastTestSuccess(connectionStatus.success);
      setMessage(connectionStatus.message || null);
    }
  }, [connectionStatus]);

  const status = resolveTuyaStatus(clientId, clientSecret, lastTestSuccess);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const success = await updateSettings({
        tuyaClientId: clientId.trim(),
        tuyaClientSecret: clientSecret.trim(),
      });
      setMessage(success ? 'Tuya credentials saved.' : 'Tuya credentials could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setMessage(null);
    await testTuyaConnection(clientId, clientSecret);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-medium text-primary">
              <Wifi className="h-5 w-5" />
              Tuya Cloud
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Save your Tuya IoT credentials here. Discover and import sensors from Devices.
            </CardDescription>
          </div>
          <IntegrationStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="tuya-client-id" className="text-xs text-muted-foreground">Client ID</Label>
            <Input
              id="tuya-client-id"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              placeholder="Tuya Client ID"
              className="border-white/10 bg-white/[0.045]"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="tuya-client-secret" className="text-xs text-muted-foreground">Client Secret</Label>
            <Input
              id="tuya-client-secret"
              type="password"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              placeholder="Tuya Client Secret"
              className="border-white/10 bg-white/[0.045]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button className="rounded-2xl" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save credentials
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={handleTest} disabled={connectionStatus.isChecking}>
            {connectionStatus.isChecking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Test connection
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => navigateTo('devices')}>
            Manage devices
          </Button>
        </div>

        {message && (
          <p className="text-sm text-primary" aria-live="polite">{message}</p>
        )}

        <div className="flex items-start gap-2 rounded-2xl border border-accent/35 bg-accent/10 p-3 text-sm text-accent">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Credentials are stored locally and sent through the app proxy to Tuya. Find Client ID and Secret in the{' '}
            <a href="https://iot.tuya.com/" target="_blank" rel="noopener noreferrer" className="underline">
              Tuya IoT Portal
            </a>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
