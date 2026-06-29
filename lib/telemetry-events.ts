export const TELEMETRY_UPDATED_EVENT = 'growpanion:telemetry-updated';

/** @deprecated Use TELEMETRY_UPDATED_EVENT */
export const AC_INFINITY_POLLED_EVENT = TELEMETRY_UPDATED_EVENT;

export interface TelemetryUpdatedDetail {
  source?: 'ac_infinity_poll' | 'manual' | 'binding' | 'wizard' | 'import';
  growIds?: string[];
  savedCount?: number;
}

let notifyTimer: ReturnType<typeof setTimeout> | null = null;

export function notifyTelemetryUpdated(detail?: TelemetryUpdatedDetail): void {
  if (typeof window === 'undefined') return;

  if (notifyTimer) {
    clearTimeout(notifyTimer);
  }

  notifyTimer = setTimeout(() => {
    window.dispatchEvent(new CustomEvent<TelemetryUpdatedDetail>(TELEMETRY_UPDATED_EVENT, { detail }));
    notifyTimer = null;
  }, 100);
}
