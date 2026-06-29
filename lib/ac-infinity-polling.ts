export function getIntegrationLastPollAt(config?: Record<string, unknown>): string | null {
  const value = config?.lastPollAt;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? value : null;
}

export function getIntegrationPollIntervalMinutes(config?: Record<string, unknown>): number {
  const value = config?.pollIntervalMinutes;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  return 5;
}

export function computeNextPollTimestamp(lastPollAt: string | null, intervalMinutes: number): string | null {
  if (!lastPollAt || intervalMinutes <= 0) return null;
  const nextMs = Date.parse(lastPollAt) + intervalMinutes * 60 * 1000;
  if (!Number.isFinite(nextMs)) return null;
  return new Date(nextMs).toISOString();
}

export function getMsUntilNextPoll(lastPollAt: string | null, intervalMinutes: number, now = Date.now()): number | null {
  const nextAt = computeNextPollTimestamp(lastPollAt, intervalMinutes);
  if (!nextAt) return null;
  return Math.max(0, Date.parse(nextAt) - now);
}

export function getLatestLastPollAt(configs: Array<Record<string, unknown> | undefined>): string | null {
  const timestamps = configs
    .map(config => getIntegrationLastPollAt(config))
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  return timestamps[0] ?? null;
}

export function formatPollCountdown(msUntilNext: number): string {
  if (msUntilNext <= 0) return 'Due now';
  const totalSeconds = Math.ceil(msUntilNext / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `in ${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) return `in ${minutes}m ${seconds}s`;
  return `in ${seconds}s`;
}
