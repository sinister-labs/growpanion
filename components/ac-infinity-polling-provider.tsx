"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getAllDeviceIntegrations } from '@/lib/db';
import {
  isBackgroundPollingEnabled,
  shouldPausePollingForVisibility,
} from '@/lib/background-polling';
import {
  getIntegrationPollIntervalMinutes,
  getLatestLastPollAt,
  getMsUntilNextPoll,
} from '@/lib/ac-infinity-polling';
import {
  getPollableAcInfinityIntegrations,
  notifyAcInfinityPolled,
  runAcInfinityTelemetryPoll,
  type AcInfinityPollResult,
} from '@/lib/ac-infinity-poll-runner';

const SCHEDULER_TICK_MS = 10_000;

interface AcInfinityPollingContextValue {
  isPolling: boolean;
  pollNow: () => Promise<AcInfinityPollResult>;
}

const AcInfinityPollingContext = createContext<AcInfinityPollingContextValue | undefined>(undefined);

async function getPollingSchedule() {
  const integrations = await getAllDeviceIntegrations();
  const pollable = getPollableAcInfinityIntegrations(integrations);
  if (pollable.length === 0) {
    return null;
  }

  const lastPollAt = getLatestLastPollAt(pollable.map(integration => integration.config));
  const intervalMinutes = Math.min(
    ...pollable.map(integration => getIntegrationPollIntervalMinutes(integration.config)),
  );

  return { lastPollAt, intervalMinutes };
}

export function AcInfinityPollingProvider({ children }: { children: ReactNode }) {
  const [isPolling, setIsPolling] = useState(false);
  const isPollingRef = useRef(false);

  const pollNow = useCallback(async () => {
    if (isPollingRef.current) {
      return { savedCount: 0, pollSucceeded: false, recordedAt: new Date().toISOString() };
    }

    isPollingRef.current = true;
    setIsPolling(true);
    try {
      const result = await runAcInfinityTelemetryPoll();
      if (result.pollSucceeded) {
        notifyAcInfinityPolled(result);
      }
      return result;
    } finally {
      isPollingRef.current = false;
      setIsPolling(false);
    }
  }, []);

  const pollIfDue = useCallback(async () => {
    if (isPollingRef.current) return;

    const backgroundPollingEnabled = await isBackgroundPollingEnabled();
    if (
      typeof document !== 'undefined'
      && shouldPausePollingForVisibility(document.visibilityState, backgroundPollingEnabled)
    ) {
      return;
    }

    const schedule = await getPollingSchedule();
    if (!schedule) return;

    if (!schedule.lastPollAt) {
      await pollNow();
      return;
    }

    const msUntilNext = getMsUntilNextPoll(schedule.lastPollAt, schedule.intervalMinutes);
    if (msUntilNext !== 0) return;

    await pollNow();
  }, [pollNow]);

  useEffect(() => {
    void pollIfDue();

    const interval = window.setInterval(() => {
      void pollIfDue();
    }, SCHEDULER_TICK_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void pollIfDue();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pollIfDue]);

  return (
    <AcInfinityPollingContext.Provider value={{ isPolling, pollNow }}>
      {children}
    </AcInfinityPollingContext.Provider>
  );
}

export function useAcInfinityPolling() {
  const context = useContext(AcInfinityPollingContext);
  if (!context) {
    throw new Error('useAcInfinityPolling must be used within AcInfinityPollingProvider');
  }
  return context;
}
