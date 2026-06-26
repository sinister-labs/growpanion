import { describe, expect, it } from 'vitest';
import {
  filterStrains,
  hasStrainNumber,
  parseOptionalStrainNumber,
  validateStrainNumbers,
} from '@/lib/strain-utils';

describe('strain utilities', () => {
  it('parses optional numeric form values without producing NaN', () => {
    expect(parseOptionalStrainNumber('')).toBeUndefined();
    expect(parseOptionalStrainNumber('   ')).toBeUndefined();
    expect(parseOptionalStrainNumber('12.5')).toBe(12.5);
    expect(parseOptionalStrainNumber('abc')).toBeUndefined();
  });

  it('validates strain numeric ranges', () => {
    expect(validateStrainNumbers({
      indicaPercent: 0,
      sativaPercent: 100,
      thcPercent: 40,
      cbdPercent: 30,
      floweringWeeks: 16,
    })).toBeNull();
    expect(validateStrainNumbers({ thcPercent: 41 })).toBe('THC % must be between 0 and 40.');
  });

  it('treats zero as a displayable strain number', () => {
    expect(hasStrainNumber(0)).toBe(true);
    expect(hasStrainNumber(undefined)).toBe(false);
    expect(hasStrainNumber(Number.NaN)).toBe(false);
  });

  it('filters strains consistently with normalized search terms', () => {
    const strains = [
      { id: '1', name: ' Northern Lights ', breeder: ' Sensi Seeds ', genetics: ' Indica ' },
      { id: '2', name: 'Sour Diesel', breeder: 'Unknown', genetics: 'Sativa' },
      { id: '3', name: 'Blue Dream', breeder: 'Humboldt', genetics: 'Hybrid' },
    ] as unknown as Parameters<typeof filterStrains>[0];

    expect(filterStrains([...strains], '  northern  ')).toEqual([strains[0]]);
    expect(filterStrains([...strains], 'SATIVA')).toEqual([strains[1]]);
    expect(filterStrains([...strains], '   ')).toEqual(strains);
  });

  it('does not throw while filtering malformed legacy strain records', () => {
    const strains = [
      { id: '1', name: undefined, breeder: 'Unknown', genetics: 'Hybrid' },
      { id: '2', name: 'Blue Dream', breeder: undefined, genetics: undefined },
    ] as unknown as Parameters<typeof filterStrains>[0];

    expect(filterStrains(strains, 'blue')).toEqual([strains[1]]);
    expect(filterStrains(strains, 'unknown')).toEqual([strains[0]]);
  });
});
