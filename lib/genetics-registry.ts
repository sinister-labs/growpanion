import type { Genetics, GeneticsOverride, LineageEdge, Phenotype } from '@/lib/db';

function createRegistryId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const DEFAULT_GENETICS: Genetics[] = [
  {
    id: 'default-blueberry-pancake',
    name: 'Blueberry Pancake',
    breeder: 'Humboldt Seed Company',
    type: 'Hybrid',
    floweringWeeks: 9,
    stretch: 'Medium',
    terpeneProfile: ['Berry', 'Cream', 'Gas'],
    cannabinoids: 'THC dominant',
    origin: 'Blueberry x Pancakes',
    notes: 'Default genetics can be overridden without losing the base dataset.',
    source: 'default',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'default-northern-lights',
    name: 'Northern Lights',
    breeder: 'Classic Pool',
    type: 'Indica',
    floweringWeeks: 8,
    stretch: 'Low',
    terpeneProfile: ['Earth', 'Pine', 'Spice'],
    cannabinoids: 'THC dominant',
    origin: 'Afghani x Thai',
    notes: 'Stable reference cultivar for phenotype comparison.',
    source: 'default',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'default-sour-diesel',
    name: 'Sour Diesel',
    breeder: 'Classic Pool',
    type: 'Sativa',
    floweringWeeks: 10,
    stretch: 'High',
    terpeneProfile: ['Fuel', 'Citrus', 'Herbal'],
    cannabinoids: 'THC dominant',
    origin: 'Chemdawg lineage',
    notes: 'Reference for high-stretch, fuel-forward phenotype tracking.',
    source: 'default',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

export function mergeDefaultGenetics(existing: Genetics[], defaults = DEFAULT_GENETICS): Genetics[] {
  const existingIds = new Set(existing.map(entry => entry.id));
  return [
    ...existing,
    ...defaults.filter(entry => !existingIds.has(entry.id)),
  ];
}

export function applyGeneticsOverrides(genetics: Genetics[], overrides: GeneticsOverride[]): Genetics[] {
  const overrideByGeneticsId = new Map(overrides.map(override => [override.geneticsId, override]));

  return genetics.map(entry => {
    const override = overrideByGeneticsId.get(entry.id);
    if (!override) return entry;

    return {
      ...entry,
      ...override.patch,
      id: entry.id,
      source: entry.source,
      updatedAt: override.updatedAt,
    } as Genetics;
  });
}

export function getGeneticsDisplayName(genetics?: Pick<Genetics, 'name' | 'breeder'>): string {
  if (!genetics) return 'Unknown';
  return genetics.breeder ? `${genetics.name} (${genetics.breeder})` : genetics.name;
}

export function createPlantNameForGenetics(genetics: Pick<Genetics, 'name'>, index: number): string {
  return `${genetics.name} #${Math.max(1, index)}`;
}

export function createPhenotypeForPlant(params: {
  growId: string;
  plantId: string;
  geneticsId: string;
  label?: string;
  createdAt?: string;
}): Phenotype {
  const timestamp = params.createdAt ?? new Date().toISOString();

  return {
    id: createRegistryId(),
    growId: params.growId,
    plantId: params.plantId,
    geneticsId: params.geneticsId,
    label: params.label?.trim() || 'Phenotype A',
    observations: [],
    traits: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createUserGenetics(params: {
  name: string;
  breeder?: string;
  type?: Genetics['type'];
  floweringWeeks?: number;
  stretch?: string;
  terpeneProfile?: string[];
  cannabinoids?: string;
  origin?: string;
  notes?: string;
  createdAt?: string;
}): Genetics {
  const timestamp = params.createdAt ?? new Date().toISOString();

  return {
    id: createRegistryId(),
    name: params.name.trim(),
    breeder: params.breeder?.trim() || undefined,
    type: params.type ?? 'Unknown',
    floweringWeeks: params.floweringWeeks && Number.isFinite(params.floweringWeeks) && params.floweringWeeks > 0
      ? params.floweringWeeks
      : undefined,
    stretch: params.stretch?.trim() || undefined,
    terpeneProfile: params.terpeneProfile?.map(terpene => terpene.trim()).filter(Boolean),
    cannabinoids: params.cannabinoids?.trim() || undefined,
    origin: params.origin?.trim() || undefined,
    notes: params.notes?.trim() || undefined,
    source: 'user',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export interface LineageGraphNode {
  id: string;
  label: string;
  breeder?: string;
  relation: 'parent' | 'selected' | 'child' | 'cross';
  edgeId?: string;
}

export interface LineageGraph {
  parents: LineageGraphNode[];
  selected?: LineageGraphNode;
  children: LineageGraphNode[];
}

export function buildLineageGraph(
  genetics: Genetics[],
  edges: LineageEdge[],
  selectedId: string,
): LineageGraph {
  const geneticsById = new Map(genetics.map(entry => [entry.id, entry]));
  const selected = geneticsById.get(selectedId);

  const parents = edges
    .filter(edge => edge.childGeneticsId === selectedId)
    .map((edge): LineageGraphNode | null => {
      const entry = geneticsById.get(edge.parentGeneticsId);
      return entry ? {
        id: entry.id,
        label: entry.name,
        breeder: entry.breeder,
        relation: edge.relationType === 'cross' ? 'cross' as const : 'parent' as const,
        edgeId: edge.id,
      } : null;
    })
    .filter((node): node is LineageGraphNode => Boolean(node));

  const children = edges
    .filter(edge => edge.parentGeneticsId === selectedId)
    .map((edge): LineageGraphNode | null => {
      const entry = geneticsById.get(edge.childGeneticsId);
      return entry ? {
        id: entry.id,
        label: entry.name,
        breeder: entry.breeder,
        relation: edge.relationType === 'cross' ? 'cross' as const : 'child' as const,
        edgeId: edge.id,
      } : null;
    })
    .filter((node): node is LineageGraphNode => Boolean(node));

  return {
    parents,
    selected: selected ? {
      id: selected.id,
      label: selected.name,
      breeder: selected.breeder,
      relation: 'selected',
    } : undefined,
    children,
  };
}
