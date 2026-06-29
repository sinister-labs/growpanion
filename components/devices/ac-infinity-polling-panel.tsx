"use client";

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveDeviceIntegration, type Device, type DeviceIntegration } from '@/lib/db';
import { normalizePollingInterval } from '@/lib/device-layer-helpers';
import {
  computeNextPollTimestamp,
  formatPollCountdown,
  getIntegrationPollIntervalMinutes,
  getMsUntilNextPoll,
} from '@/lib/ac-infinity-polling';

interface AcInfinityPollingPanelProps {
  device: Device;
  integration: DeviceIntegration | undefined;
  isPolling: boolean;
  lastPollAt: string | null;
  onPoll: () => void;
  onSaved: () => void;
  onStatus: (message: string) => void;
}

export function AcInfinityPollingPanel({
  device,
  integration,
  isPolling,
  lastPollAt,
  onPoll,
  onSaved,
  onStatus,
}: AcInfinityPollingPanelProps) {
  const [now, setNow] = useState(() => Date.now());
  const pollIntervalMinutes = getIntegrationPollIntervalMinutes(integration?.config);
  const pollInterval = String(pollIntervalMinutes);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextPollAt = useMemo(
    () => computeNextPollTimestamp(lastPollAt, pollIntervalMinutes),
    [lastPollAt, pollIntervalMinutes],
  );
  const msUntilNextPoll = useMemo(
    () => getMsUntilNextPoll(lastPollAt, pollIntervalMinutes, now),
    [lastPollAt, pollIntervalMinutes, now],
  );

  const handleSavePolling = async (formData: FormData) => {
    if (!integration) {
      onStatus('AC Infinity integration not found.');
      return;
    }

    const intervalValue = formData.get('pollInterval')?.toString() ?? pollInterval;
    const nextPollIntervalMinutes = normalizePollingInterval(intervalValue);
    await saveDeviceIntegration({
      ...integration,
      config: {
        ...(integration.config ?? {}),
        pollIntervalMinutes: nextPollIntervalMinutes,
      },
      updatedAt: new Date().toISOString(),
    });
    onSaved();
    onStatus(`Polling interval saved for ${device.name}: every ${nextPollIntervalMinutes} min.`);
  };

  return (
    <div className="os-card p-3">
      <div className="text-sm font-semibold text-foreground">Sync & polling</div>
      <div className="mt-0.5 text-xs text-muted-foreground">Controls for {device.name}</div>

      <form
        className="mt-3 grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(10rem,1fr)_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSavePolling(new FormData(event.currentTarget));
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor={`poll-${device.id}`} className="text-xs text-muted-foreground">Polling interval min</Label>
          <Input
            id={`poll-${device.id}`}
            name="pollInterval"
            defaultValue={pollInterval}
            type="number"
            className="h-10"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10 rounded-2xl">
          <Save className="mr-2 h-4 w-4" />
          Save polling
        </Button>
        <Button type="button" variant="outline" className="h-10 rounded-2xl" onClick={onPoll} disabled={isPolling}>
          {isPolling ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Poll now
        </Button>
      </form>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="os-stat-card px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Last poll</div>
          <div className="mt-1 truncate text-sm text-foreground">
            {lastPollAt ? new Date(lastPollAt).toLocaleString() : 'Not yet'}
          </div>
        </div>
        <div className="os-stat-card px-3 py-2">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Next poll</div>
          <div className="mt-1 truncate text-sm text-foreground">
            {isPolling ? (
              'Polling…'
            ) : !lastPollAt ? (
              'After first poll'
            ) : nextPollAt && msUntilNextPoll !== null ? (
              <>
                {new Date(nextPollAt).toLocaleTimeString()}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({formatPollCountdown(msUntilNextPoll)})
                </span>
              </>
            ) : (
              'Inactive'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
