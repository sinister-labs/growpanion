import { replaceDefaultGeneticsAndLineage } from '@/lib/db';
import { CURATED_GENETICS, CURATED_LINEAGE_EDGES, CURATED_SEED_VERSION } from '@/lib/genetics-curated';

/**
 * Versioned, one-time import of the curated default genetics into IndexedDB.
 *
 * The curated dataset ({@link CURATED_GENETICS}) is small and bundled with the app, so
 * the import is fast and works fully offline. A localStorage marker prevents repeat work
 * and triggers a refresh whenever {@link EXPECTED_SEED_VERSION} changes.
 */

export const SEED_VERSION_STORAGE_KEY = 'growpanion-genetics-seed-version';
export const EXPECTED_SEED_VERSION = CURATED_SEED_VERSION;

export interface SeedProgress {
  phase: 'transforming' | 'saving' | 'done';
  /** Overall progress in percent (0-100). */
  percent: number;
}

export type SeedImportStatus = 'imported' | 'up-to-date' | 'skipped' | 'failed';

export interface SeedImportResult {
  status: SeedImportStatus;
  version?: string;
  geneticsCount?: number;
  lineageEdgeCount?: number;
  error?: string;
}

function readSeedVersionMarker(): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(SEED_VERSION_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function writeSeedVersionMarker(version: string): void {
  try {
    window.localStorage.setItem(SEED_VERSION_STORAGE_KEY, version);
  } catch {
    // Storage can be unavailable in restricted browser contexts; the import itself still succeeded.
  }
}

/**
 * Ensures the curated default genetics are imported into IndexedDB exactly once per seed version.
 *
 * The function is idempotent and cheap on subsequent calls: it compares a localStorage
 * marker against {@link EXPECTED_SEED_VERSION} and skips the import when already current.
 */
export async function ensureDefaultGeneticsSeed(
  onProgress?: (progress: SeedProgress) => void,
): Promise<SeedImportResult> {
  if (typeof window === 'undefined') {
    return { status: 'skipped' };
  }

  if (readSeedVersionMarker() === EXPECTED_SEED_VERSION) {
    return { status: 'up-to-date', version: EXPECTED_SEED_VERSION };
  }

  try {
    onProgress?.({ phase: 'transforming', percent: 40 });
    const genetics = CURATED_GENETICS;
    const edges = CURATED_LINEAGE_EDGES;

    onProgress?.({ phase: 'saving', percent: 75 });
    await replaceDefaultGeneticsAndLineage(genetics, edges);

    writeSeedVersionMarker(EXPECTED_SEED_VERSION);

    onProgress?.({ phase: 'done', percent: 100 });
    return {
      status: 'imported',
      version: EXPECTED_SEED_VERSION,
      geneticsCount: genetics.length,
      lineageEdgeCount: edges.length,
    };
  } catch (error) {
    console.error('Failed to import default genetics seed:', error);
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error importing genetics seed',
    };
  }
}
