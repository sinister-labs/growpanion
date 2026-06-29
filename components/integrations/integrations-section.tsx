"use client";

import { AcInfinityIntegrationCard } from '@/components/integrations/ac-infinity-integration-card';
import { BackgroundPollingCard } from '@/components/integrations/background-polling-card';
import { TuyaIntegrationCard } from '@/components/integrations/tuya-integration-card';

export function IntegrationsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect external accounts once. Import and map devices from the Devices screen.
        </p>
      </div>
      <AcInfinityIntegrationCard />
      <BackgroundPollingCard />
      <TuyaIntegrationCard />
    </div>
  );
}
