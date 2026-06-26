import type { Strain } from '@/lib/db';

type NumericStrainField =
  | 'indicaPercent'
  | 'sativaPercent'
  | 'thcPercent'
  | 'cbdPercent'
  | 'floweringWeeks';

const FIELD_RANGES: Record<NumericStrainField, { min: number; max: number; label: string }> = {
  indicaPercent: { min: 0, max: 100, label: 'Indica %' },
  sativaPercent: { min: 0, max: 100, label: 'Sativa %' },
  thcPercent: { min: 0, max: 40, label: 'THC %' },
  cbdPercent: { min: 0, max: 30, label: 'CBD %' },
  floweringWeeks: { min: 4, max: 16, label: 'Flowering time' },
};

export function parseOptionalStrainNumber(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function validateStrainNumericField(
  field: NumericStrainField,
  value: number | undefined,
): string | null {
  if (value === undefined) {
    return null;
  }

  const range = FIELD_RANGES[field];
  if (!Number.isFinite(value) || value < range.min || value > range.max) {
    return `${range.label} must be between ${range.min} and ${range.max}.`;
  }

  return null;
}

export function validateStrainNumbers(strain: Partial<Strain>): string | null {
  return (Object.keys(FIELD_RANGES) as NumericStrainField[])
    .map(field => validateStrainNumericField(field, strain[field]))
    .find((error): error is string => Boolean(error)) ?? null;
}

export function hasStrainNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function filterStrains(strains: Strain[], query: string): Strain[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return strains;
  }

  return strains.filter(strain =>
    String(strain.name ?? '').trim().toLowerCase().includes(normalizedQuery) ||
    String(strain.breeder ?? '').trim().toLowerCase().includes(normalizedQuery) ||
    String(strain.genetics ?? '').trim().toLowerCase().includes(normalizedQuery)
  );
}
