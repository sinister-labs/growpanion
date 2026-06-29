"use client";

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/hooks/useSettings';
import { isRunningInTauri, isTauriBuild } from '@/lib/deployment';

export function BackgroundPollingCard() {
  const { settings, updateSettings } = useSettings();
  const [isDesktopApp, setIsDesktopApp] = useState(isTauriBuild());

  useEffect(() => {
    void isRunningInTauri().then(setIsDesktopApp);
  }, []);

  const enabled = settings?.backgroundPollingEnabled !== false;

  const handleToggle = async (checked: boolean) => {
    await updateSettings({ backgroundPollingEnabled: checked });
  };

  return (
    <Card className="border-white/10 bg-[linear-gradient(145deg,rgba(18,27,34,0.94),rgba(7,12,17,0.96))]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Background polling</CardTitle>
        </div>
        <CardDescription>
          Collect sensor history even when GrowPanion is not in the foreground.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="background-polling" className="text-sm font-medium">
              Keep polling in background
            </Label>
            <p className="text-xs text-muted-foreground">
              {isDesktopApp
                ? 'Closing the window keeps the desktop app running in the system tray. Use Quit there to fully exit.'
                : 'Polling continues while the browser tab is open, even in another tab. Closing the tab stops collection.'}
            </p>
          </div>
          <Switch
            id="background-polling"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>
        {!enabled && (
          <p className="text-xs text-amber-200">
            Polling pauses when the tab or window is hidden. Historical gaps may appear while you use other apps.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
