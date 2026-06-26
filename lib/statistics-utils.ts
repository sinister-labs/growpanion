import type { Grow, PlantDB } from '@/lib/db';

export interface HarvestedPlant extends PlantDB {
  grow?: Grow;
  harvest: NonNullable<PlantDB['harvest']> & {
    yieldDryGrams: number;
  };
}

export interface YieldSummary {
  totalPlants: number;
  totalDryYield: number;
  avgYieldPerPlant: number;
  maxYield: number;
  minYield: number;
  uniqueStrains: number;
  uniqueGrows: number;
}

export interface StrainStats {
  name: string;
  plantCount: number;
  totalYield: number;
  avgYield: number;
  minYield: number;
  maxYield: number;
}

export interface GrowStats {
  id: string;
  name: string;
  startDate: string;
  plantCount: number;
  totalYield: number;
  avgYieldPerPlant: number;
  strains: string[];
}

export interface YieldHistoryEntry {
  date: string;
  plantName: string;
  strainName: string;
  growName: string;
  yieldDry: number;
  yieldWet?: number;
}

export interface YieldHistoryRunningEntry extends YieldHistoryEntry {
  runningAvg: number;
}

export function getPositiveFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function normalizeStatisticsLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

export function getHarvestedPlants(plants: PlantDB[], grows: Grow[]): HarvestedPlant[] {
  return plants.reduce<HarvestedPlant[]>((harvestedPlants, plant) => {
    const dryYield = getPositiveFiniteNumber(plant.harvest?.yieldDryGrams);
    if (!plant.isHarvested || !plant.harvest || dryYield === null) {
      return harvestedPlants;
    }

    harvestedPlants.push({
      ...plant,
      harvest: {
        ...plant.harvest,
        yieldDryGrams: dryYield,
      },
      grow: grows.find(grow => grow.id === plant.growId),
    });

    return harvestedPlants;
  }, []);
}

export function getYieldSummary(plants: HarvestedPlant[]): YieldSummary | null {
  if (plants.length === 0) {
    return null;
  }

  const yields = plants.map(plant => plant.harvest.yieldDryGrams);
  const totalDryYield = yields.reduce((sum, yieldDry) => sum + yieldDry, 0);

  return {
    totalPlants: plants.length,
    totalDryYield: Math.round(totalDryYield),
    avgYieldPerPlant: Math.round(totalDryYield / plants.length),
    maxYield: Math.round(Math.max(...yields)),
    minYield: Math.round(Math.min(...yields)),
    uniqueStrains: new Set(plants.map(plant => normalizeStatisticsLabel(plant.genetic, 'Unknown'))).size,
    uniqueGrows: new Set(plants.map(plant => plant.growId)).size,
  };
}

export function getStrainStats(plants: HarvestedPlant[]): StrainStats[] {
  const groupedByStrain = plants.reduce<Record<string, HarvestedPlant[]>>((acc, plant) => {
    const strain = normalizeStatisticsLabel(plant.genetic, 'Unknown');
    acc[strain] = [...(acc[strain] || []), plant];
    return acc;
  }, {});

  return Object.entries(groupedByStrain)
    .map(([name, strainPlants]) => {
      const yields = strainPlants.map(plant => plant.harvest.yieldDryGrams);
      const totalYield = yields.reduce((sum, yieldDry) => sum + yieldDry, 0);

      return {
        name,
        plantCount: strainPlants.length,
        totalYield: Math.round(totalYield),
        avgYield: Math.round(totalYield / strainPlants.length),
        minYield: Math.round(Math.min(...yields)),
        maxYield: Math.round(Math.max(...yields)),
      };
    })
    .sort((a, b) => b.avgYield - a.avgYield);
}

export function getGrowStats(plants: HarvestedPlant[], grows: Grow[]): GrowStats[] {
  const groupedByGrow = plants.reduce<Record<string, HarvestedPlant[]>>((acc, plant) => {
    acc[plant.growId] = [...(acc[plant.growId] || []), plant];
    return acc;
  }, {});

  return Object.entries(groupedByGrow)
    .map(([growId, growPlants]) => {
      const grow = grows.find(growItem => growItem.id === growId);
      const yields = growPlants.map(plant => plant.harvest.yieldDryGrams);
      const totalYield = yields.reduce((sum, yieldDry) => sum + yieldDry, 0);

      return {
        id: growId,
        name: grow?.name || `Unknown Grow (${growId})`,
        startDate: grow?.startDate || '',
        plantCount: growPlants.length,
        totalYield: Math.round(totalYield),
        avgYieldPerPlant: Math.round(totalYield / growPlants.length),
        strains: [...new Set(growPlants.map(plant => normalizeStatisticsLabel(plant.genetic, 'Unknown')))],
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      const safeDateA = Number.isFinite(dateA) ? dateA : 0;
      const safeDateB = Number.isFinite(dateB) ? dateB : 0;
      return safeDateB - safeDateA;
    });
}

export function getYieldHistory(plants: HarvestedPlant[]): YieldHistoryEntry[] {
  return plants
    .reduce<YieldHistoryEntry[]>((entries, plant) => {
      const timestamp = new Date(plant.harvest.date).getTime();
      if (!Number.isFinite(timestamp)) {
        return entries;
      }

      const wetYield = getPositiveFiniteNumber(plant.harvest.yieldWetGrams);
      entries.push({
        date: plant.harvest.date,
        plantName: normalizeStatisticsLabel(plant.name, 'Unknown Plant'),
        strainName: normalizeStatisticsLabel(plant.genetic, 'Unknown Strain'),
        growName: plant.grow?.name || `Unknown Grow (${plant.growId})`,
        yieldDry: plant.harvest.yieldDryGrams,
        yieldWet: wetYield ?? undefined,
      });

      return entries;
    }, [])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getRunningYieldHistory(history: YieldHistoryEntry[]): YieldHistoryRunningEntry[] {
  let total = 0;
  let count = 0;

  return [...history].reverse().map(entry => {
    total += entry.yieldDry;
    count++;
    return {
      ...entry,
      runningAvg: Math.round(total / count),
    };
  }).reverse();
}
