import { describe, expect, it } from 'vitest';
import { shouldPausePollingForVisibility } from '@/lib/background-polling';

describe('background-polling', () => {
  it('pauses when hidden and background polling is disabled', () => {
    expect(shouldPausePollingForVisibility('hidden', false)).toBe(true);
  });

  it('continues when hidden and background polling is enabled', () => {
    expect(shouldPausePollingForVisibility('hidden', true)).toBe(false);
  });

  it('never pauses when the tab is visible', () => {
    expect(shouldPausePollingForVisibility('visible', false)).toBe(false);
    expect(shouldPausePollingForVisibility('visible', true)).toBe(false);
  });
});
