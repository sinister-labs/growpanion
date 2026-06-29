export type ComparisonDirection = 'first' | 'second' | 'equal';

export function parseComparisonNumber(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue === '-') {
    return null;
  }

  const parsed = Number(trimmedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getComparisonDirection(
  value1: string | number,
  value2: string | number,
  higherIsBetter = true
): ComparisonDirection {
  const num1 = parseComparisonNumber(value1);
  const num2 = parseComparisonNumber(value2);

  if (num1 === null || num2 === null || num1 === num2) {
    return 'equal';
  }

  const firstIsBetter = higherIsBetter ? num1 > num2 : num1 < num2;
  return firstIsBetter ? 'first' : 'second';
}

export function getComparisonValueClass(
  value1: string | number,
  value2: string | number,
  isFirst: boolean,
  higherIsBetter = true
): string {
  const direction = getComparisonDirection(value1, value2, higherIsBetter);

  if (direction === 'equal') {
    return 'text-foreground';
  }

  return (isFirst && direction === 'first') || (!isFirst && direction === 'second')
    ? 'text-primary'
    : 'text-muted-foreground';
}

export interface PhenotypeLike {
  label: string;
  growthStructure?: string;
  stretch?: string;
  vigor?: string;
  internodeSpacing?: string;
  trainingResponse?: string;
  floweringTime?: string;
  aroma?: string;
  terpenes?: string[];
  yieldGrams?: number;
  qualityNotes?: string;
  observations?: string[];
  issues?: string[];
  traits?: string[];
}

export interface PhenotypeComparisonMetric {
  label: string;
  value1: string | number;
  value2: string | number;
  unit?: string;
  higherIsBetter?: boolean;
}

function joinList(values?: string[]): string {
  return values && values.length > 0 ? values.join(', ') : '-';
}

function textValue(value?: string): string {
  return value?.trim() || '-';
}

export function buildPhenotypeComparisonMetrics(
  first: PhenotypeLike,
  second: PhenotypeLike,
): PhenotypeComparisonMetric[] {
  return [
    { label: 'Yield', value1: first.yieldGrams ?? '-', value2: second.yieldGrams ?? '-', unit: 'g', higherIsBetter: true },
    { label: 'Vigor', value1: textValue(first.vigor), value2: textValue(second.vigor) },
    { label: 'Stretch', value1: textValue(first.stretch), value2: textValue(second.stretch), higherIsBetter: false },
    { label: 'Growth Structure', value1: textValue(first.growthStructure), value2: textValue(second.growthStructure) },
    { label: 'Internode Spacing', value1: textValue(first.internodeSpacing), value2: textValue(second.internodeSpacing) },
    { label: 'Training Response', value1: textValue(first.trainingResponse), value2: textValue(second.trainingResponse) },
    { label: 'Flowering Time', value1: textValue(first.floweringTime), value2: textValue(second.floweringTime), higherIsBetter: false },
    { label: 'Aroma', value1: textValue(first.aroma), value2: textValue(second.aroma) },
    { label: 'Terpenes', value1: joinList(first.terpenes), value2: joinList(second.terpenes) },
    { label: 'Traits', value1: joinList(first.traits), value2: joinList(second.traits) },
    { label: 'Issues', value1: joinList(first.issues), value2: joinList(second.issues), higherIsBetter: false },
    { label: 'Observations', value1: first.observations?.length ?? 0, value2: second.observations?.length ?? 0 },
    { label: 'Quality Notes', value1: textValue(first.qualityNotes), value2: textValue(second.qualityNotes) },
  ];
}
