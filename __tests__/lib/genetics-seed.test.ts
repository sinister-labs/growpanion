import { describe, expect, it } from 'vitest';
import {
  CURATED_GENETICS,
  CURATED_LINEAGE_EDGES,
  CURATED_SEED_VERSION,
} from '@/lib/genetics-curated';
import { EXPECTED_SEED_VERSION } from '@/lib/genetics-seed';

describe('curated default genetics', () => {
  const geneticsById = new Map(CURATED_GENETICS.map(entry => [entry.id, entry]));
  const validTypes = new Set(['Indica', 'Sativa', 'Hybrid', 'Unknown']);

  it('exposes a well-known set of famous strains', () => {
    expect(CURATED_GENETICS.length).toBeGreaterThanOrEqual(40);
    const names = CURATED_GENETICS.map(entry => entry.name);
    expect(names).toEqual(
      expect.arrayContaining(['OG Kush', 'Gelato', 'Wedding Cake', 'Sour Diesel', 'Northern Lights']),
    );
  });

  it('uses unique ids and the default source for every record', () => {
    const ids = CURATED_GENETICS.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CURATED_GENETICS.every(entry => entry.source === 'default')).toBe(true);
    expect(CURATED_GENETICS.every(entry => validTypes.has(entry.type))).toBe(true);
  });

  it('keeps flowering weeks within the schema bounds when provided', () => {
    for (const entry of CURATED_GENETICS) {
      if (entry.floweringWeeks !== undefined) {
        expect(entry.floweringWeeks).toBeGreaterThan(0);
        expect(entry.floweringWeeks).toBeLessThanOrEqual(30);
      }
    }
  });

  it('only links lineage edges between existing genetics', () => {
    for (const edge of CURATED_LINEAGE_EDGES) {
      expect(geneticsById.has(edge.parentGeneticsId)).toBe(true);
      expect(geneticsById.has(edge.childGeneticsId)).toBe(true);
      expect(edge.parentGeneticsId).not.toBe(edge.childGeneticsId);
    }
  });

  it('uses unique, refreshable edge ids', () => {
    const ids = CURATED_LINEAGE_EDGES.map(edge => edge.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CURATED_LINEAGE_EDGES.every(edge => edge.id.startsWith('edge:'))).toBe(true);
  });

  it('models verified lineages for flagship strains', () => {
    const parentsOf = (childId: string) =>
      CURATED_LINEAGE_EDGES.filter(edge => edge.childGeneticsId === childId).map(
        edge => edge.parentGeneticsId,
      );

    expect(parentsOf('gp-og-kush')).toEqual(
      expect.arrayContaining(['gp-chemdawg', 'gp-hindu-kush']),
    );
    expect(parentsOf('gp-gelato')).toEqual(
      expect.arrayContaining(['gp-sunset-sherbet', 'gp-thin-mint-gsc']),
    );
    expect(parentsOf('gp-runtz')).toEqual(
      expect.arrayContaining(['gp-zkittlez', 'gp-gelato']),
    );
  });

  it('exposes the curated seed version through the importer', () => {
    expect(EXPECTED_SEED_VERSION).toBe(CURATED_SEED_VERSION);
  });
});
