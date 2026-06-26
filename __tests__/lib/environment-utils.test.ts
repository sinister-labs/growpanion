import { describe, expect, it } from 'vitest';
import { buildEnvironmentData, parseEnvironmentNumber, parseEnvironmentSwitch } from '@/lib/environment-utils';

describe('environment utilities', () => {
  it('builds temperature, humidity and VPD from a multi-value environment sensor', () => {
    const result = buildEnvironmentData([
      {
        name: 'Tent Climate',
        type: 'Number',
        values: [
          { name: 'temp_current', value: 25, unit: '°C' },
          { name: 'humidity_value', value: 60, unit: '%' }
        ]
      }
    ], 'Vegetative', 7);

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Temperature', value: '25°C', icon: 'temperature' }),
      expect.objectContaining({ title: 'Humidity', value: '60%', icon: 'humidity' }),
      expect.objectContaining({ title: 'VPD', value: '0.91 kPa', status: 'high' })
    ]));
  });

  it('uses all values instead of only the first configured property', () => {
    const result = buildEnvironmentData([
      {
        name: 'Tent Climate',
        type: 'Number',
        values: [
          { name: 'temp_current', value: 246, unit: '°C' },
          { name: 'humidity_value', value: 64, unit: '%' },
          { name: 'co2_value', value: 800, unit: 'ppm' }
        ]
      }
    ]);

    expect(result.map(item => item.title)).toEqual(['Temperature', 'Humidity', 'co2_value', 'VPD']);
  });

  it('normalizes common switch sensor values', () => {
    expect(parseEnvironmentSwitch('active')).toBe(true);
    expect(parseEnvironmentSwitch('Off')).toBe(false);
    expect(parseEnvironmentSwitch(1)).toBe(true);
    expect(parseEnvironmentSwitch(0)).toBe(false);
  });

  it('parses only complete numeric environment values', () => {
    expect(parseEnvironmentNumber('25.5')).toBe(25.5);
    expect(parseEnvironmentNumber(' 60 ')).toBe(60);
    expect(parseEnvironmentNumber('25abc')).toBeNull();
    expect(parseEnvironmentNumber('')).toBeNull();
  });

  it('does not build VPD from malformed temperature or humidity strings', () => {
    const result = buildEnvironmentData([
      {
        name: 'Tent Climate',
        type: 'Number',
        values: [
          { name: 'temp_current', value: '25abc', unit: '°C' },
          { name: 'humidity_value', value: '60', unit: '%' }
        ]
      }
    ]);

    expect(result.map(item => item.title)).toEqual(['Humidity']);
  });
});
