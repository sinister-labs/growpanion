import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GENETICS,
  applyGeneticsOverrides,
  buildLineageGraph,
  createPhenotypeForPlant,
  createPlantNameForGenetics,
  createUserGenetics,
  getGeneticsDisplayName,
  mergeDefaultGenetics,
} from '@/lib/genetics-registry';
import type { Genetics, LineageEdge } from '@/lib/db';

describe('genetics registry utilities', () => {
  it('provides default genetics for initial registry seeding', () => {
    expect(DEFAULT_GENETICS.length).toBeGreaterThanOrEqual(3);
    expect(DEFAULT_GENETICS.every(entry => entry.source === 'default')).toBe(true);
    expect(DEFAULT_GENETICS.map(entry => entry.name)).toEqual(expect.arrayContaining([
      'Blueberry Pancake',
      'Northern Lights',
    ]));
  });

  it('merges default genetics without overwriting existing records', () => {
    const existing: Genetics[] = [
      {
        ...DEFAULT_GENETICS[0],
        name: 'Blueberry Pancake Override',
      },
      {
        id: 'user-line',
        name: 'User Line',
        type: 'Hybrid',
        source: 'user',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    const merged = mergeDefaultGenetics(existing);

    expect(merged.find(entry => entry.id === DEFAULT_GENETICS[0].id)?.name).toBe('Blueberry Pancake Override');
    expect(merged.some(entry => entry.id === 'user-line')).toBe(true);
    expect(new Set(merged.map(entry => entry.id)).size).toBe(merged.length);
  });

  it('applies user overrides while preserving default identity and source', () => {
    const overridden = applyGeneticsOverrides(DEFAULT_GENETICS, [{
      id: 'override-default-northern-lights',
      geneticsId: 'default-northern-lights',
      patch: {
        name: 'Northern Lights Local',
        breeder: 'Local Notes',
        source: 'user',
      },
      updatedAt: '2024-03-01T00:00:00.000Z',
    }]);

    expect(overridden.find(entry => entry.id === 'default-northern-lights')).toMatchObject({
      id: 'default-northern-lights',
      name: 'Northern Lights Local',
      breeder: 'Local Notes',
      source: 'default',
      updatedAt: '2024-03-01T00:00:00.000Z',
    });
  });

  it('builds display names and plant names from genetics records', () => {
    expect(getGeneticsDisplayName({ name: 'Sour Diesel', breeder: 'Classic Pool' })).toBe('Sour Diesel (Classic Pool)');
    expect(getGeneticsDisplayName({ name: 'Open Line' })).toBe('Open Line');
    expect(createPlantNameForGenetics({ name: 'Northern Lights' }, 2)).toBe('Northern Lights #2');
  });

  it('creates phenotype records linked to plant, grow and genetics', () => {
    const phenotype = createPhenotypeForPlant({
      growId: 'grow-1',
      plantId: 'plant-1',
      geneticsId: 'genetics-1',
      label: 'Keeper A',
      createdAt: '2024-02-01T00:00:00.000Z',
    });

    expect(phenotype).toMatchObject({
      growId: 'grow-1',
      plantId: 'plant-1',
      geneticsId: 'genetics-1',
      label: 'Keeper A',
      observations: [],
      traits: [],
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-01T00:00:00.000Z',
    });
    expect(phenotype.id).toEqual(expect.any(String));
  });

  it('normalizes user-created genetics input', () => {
    const genetics = createUserGenetics({
      name: '  Test Cross  ',
      breeder: '  Lab  ',
      type: 'Hybrid',
      floweringWeeks: 9,
      stretch: '  Medium  ',
      terpeneProfile: [' Gas ', '', 'Berry'],
      cannabinoids: '  THC dominant  ',
      origin: 'Parent A x Parent B',
      notes: '  Trial line  ',
      createdAt: '2024-02-01T00:00:00.000Z',
    });

    expect(genetics).toMatchObject({
      name: 'Test Cross',
      breeder: 'Lab',
      type: 'Hybrid',
      floweringWeeks: 9,
      stretch: 'Medium',
      terpeneProfile: ['Gas', 'Berry'],
      cannabinoids: 'THC dominant',
      origin: 'Parent A x Parent B',
      notes: 'Trial line',
      source: 'user',
      createdAt: '2024-02-01T00:00:00.000Z',
      updatedAt: '2024-02-01T00:00:00.000Z',
    });
  });

  it('builds a lineage graph around the selected genetics record', () => {
    const genetics: Genetics[] = [
      { id: 'parent-1', name: 'Parent One', breeder: 'A', type: 'Hybrid', source: 'user', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'selected', name: 'Selected Cross', breeder: 'B', type: 'Hybrid', source: 'user', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'child-1', name: 'Child One', breeder: 'C', type: 'Hybrid', source: 'user', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      { id: 'cross-1', name: 'Cross One', breeder: 'D', type: 'Hybrid', source: 'user', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
    ];
    const edges: LineageEdge[] = [
      { id: 'edge-parent', parentGeneticsId: 'parent-1', childGeneticsId: 'selected', relationType: 'parent', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'edge-child', parentGeneticsId: 'selected', childGeneticsId: 'child-1', relationType: 'child', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'edge-cross', parentGeneticsId: 'selected', childGeneticsId: 'cross-1', relationType: 'cross', createdAt: '2024-01-01T00:00:00.000Z' },
    ];

    const graph = buildLineageGraph(genetics, edges, 'selected');

    expect(graph.selected).toMatchObject({ id: 'selected', label: 'Selected Cross', relation: 'selected' });
    expect(graph.parents).toEqual([expect.objectContaining({ id: 'parent-1', relation: 'parent' })]);
    expect(graph.children).toEqual([
      expect.objectContaining({ id: 'child-1', relation: 'child' }),
      expect.objectContaining({ id: 'cross-1', relation: 'cross' }),
    ]);
  });
});
