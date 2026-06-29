import { getSettings } from '@/lib/db';

export async function isBackgroundPollingEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings?.backgroundPollingEnabled !== false;
}

export function shouldPausePollingForVisibility(
  visibilityState: DocumentVisibilityState,
  backgroundPollingEnabled: boolean,
): boolean {
  return !backgroundPollingEnabled && visibilityState === 'hidden';
}
