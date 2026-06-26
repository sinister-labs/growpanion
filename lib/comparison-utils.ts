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
    return 'text-white';
  }

  return (isFirst && direction === 'first') || (!isFirst && direction === 'second')
    ? 'text-green-400'
    : 'text-gray-400';
}
