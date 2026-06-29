export function isTauriBuild(): boolean {
  return process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'tauri';
}

export async function isRunningInTauri(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    return await isTauri();
  } catch {
    return false;
  }
}
