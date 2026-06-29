import { describe, expect, it } from 'vitest';
import {
  computeNextPollTimestamp,
  formatPollCountdown,
  getIntegrationLastPollAt,
  getLatestLastPollAt,
  getMsUntilNextPoll,
} from '@/lib/ac-infinity-polling';

describe('ac-infinity-polling', () => {
  it('reads last poll timestamp from integration config', () => {
    expect(getIntegrationLastPollAt({ lastPollAt: '2024-01-01T10:00:00.000Z' })).toBe('2024-01-01T10:00:00.000Z');
    expect(getIntegrationLastPollAt({})).toBeNull();
  });

  it('computes next poll from last poll plus interval', () => {
    const lastPollAt = '2024-01-01T10:00:00.000Z';
    expect(computeNextPollTimestamp(lastPollAt, 5)).toBe('2024-01-01T10:05:00.000Z');
    expect(computeNextPollTimestamp(null, 5)).toBeNull();
  });

  it('returns remaining milliseconds until next poll', () => {
    const lastPollAt = '2024-01-01T10:00:00.000Z';
    const now = Date.parse('2024-01-01T10:02:30.000Z');
    expect(getMsUntilNextPoll(lastPollAt, 5, now)).toBe(150_000);
  });

  it('picks the newest last poll timestamp across integrations', () => {
    expect(getLatestLastPollAt([
      { lastPollAt: '2024-01-01T10:00:00.000Z' },
      { lastPollAt: '2024-01-01T11:00:00.000Z' },
    ])).toBe('2024-01-01T11:00:00.000Z');
  });

  it('formats countdown labels', () => {
    expect(formatPollCountdown(0)).toBe('Due now');
    expect(formatPollCountdown(45_000)).toBe('in 45s');
    expect(formatPollCountdown(125_000)).toBe('in 2m 5s');
  });
});
