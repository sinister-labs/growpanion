import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyTelemetryUpdated, TELEMETRY_UPDATED_EVENT } from '@/lib/telemetry-events';

describe('telemetry-events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces telemetry update notifications', () => {
    const handler = vi.fn();
    window.addEventListener(TELEMETRY_UPDATED_EVENT, handler);

    notifyTelemetryUpdated({ source: 'manual', growIds: ['grow-1'] });
    notifyTelemetryUpdated({ source: 'manual', growIds: ['grow-1'] });
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
