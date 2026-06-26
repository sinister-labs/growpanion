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
