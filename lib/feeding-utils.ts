function parsePositiveNumber(value: string): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function formatAmount(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

export function calculateFertilizerAmount(
  fertilizerAmount: string,
  mixWaterAmount: string,
  wateringAmount: string,
): string | null {
  const fertilizer = parsePositiveNumber(fertilizerAmount);
  const mixWater = parsePositiveNumber(mixWaterAmount);
  const watering = parsePositiveNumber(wateringAmount);

  if (fertilizer === null || mixWater === null || watering === null) {
    return null;
  }

  return ((fertilizer / mixWater) * watering).toFixed(1);
}

export function formatDosePerLiter(fertilizerAmount: string, mixWaterAmount: string): string {
  const fertilizer = parsePositiveNumber(fertilizerAmount);
  const mixWater = parsePositiveNumber(mixWaterAmount);

  if (fertilizer === null || mixWater === null) {
    return `${fertilizerAmount} ml / ${mixWaterAmount} ml`;
  }

  return `${formatAmount((fertilizer / mixWater) * 1000)} ml/L`;
}

export function hasExistingFertilizerMix<T extends { id: string }>(
  mixes: T[],
  editingMix: { id: string } | null | undefined,
): boolean {
  return Boolean(editingMix && mixes.some(mix => mix.id === editingMix.id));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

export function createFertilizerProductId(name: string): string {
  return `fertilizer-product-${slugify(name)}`;
}

export function calculateDosePerLiter(fertilizerAmount: string, mixWaterAmount: string): number | null {
  const fertilizer = parsePositiveNumber(fertilizerAmount);
  const mixWater = parsePositiveNumber(mixWaterAmount);

  if (fertilizer === null || mixWater === null) {
    return null;
  }

  return (fertilizer / mixWater) * 1000;
}

export function createMixRecipeIdFromLegacyMix(mixId: string): string {
  return `recipe-${mixId}`;
}

export function findMixRecipeForLegacyMix<T extends { id: string }>(
  recipes: T[],
  mixId: string,
): T | undefined {
  return recipes.find(recipe => recipe.id === createMixRecipeIdFromLegacyMix(mixId));
}
