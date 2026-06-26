import {
  calculateVPD,
  getOptimalVpdRange,
  getVpdStatus,
  getVpdStatusClass,
  getVpdStatusText,
  VpdStatus
} from '@/lib/vpd-utils';

export interface EnvironmentSensorValue {
  name: string;
  value: string | number;
  unit?: string;
}

export interface EnvironmentSensorData {
  name: string;
  type?: string;
  values: EnvironmentSensorValue[];
}

export interface EnvironmentData {
  title: string;
  value: string;
  icon: string;
  unit: string;
  status?: VpdStatus;
  statusClass?: string;
  statusText?: string;
  optimalRange?: string;
  phaseDescription?: string;
}

export const DEFAULT_ENVIRONMENT_DATA: EnvironmentData[] = [
  { title: 'Temperature', value: '25°C', icon: 'temperature', unit: '°C' },
  { title: 'Humidity', value: '60%', icon: 'humidity', unit: '%' },
  { title: 'VPD', value: '1.2 kPa', icon: 'vpd', unit: 'kPa' },
  { title: 'Carbon Filter', value: 'Active', icon: 'filter', unit: '' },
  { title: 'Fan', value: 'On', icon: 'fan', unit: '' }
];

export function parseEnvironmentNumber(value: unknown): number | null {
  if (typeof value !== 'number' && String(value).trim() === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseEnvironmentSwitch(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === 'on' || normalized === '1' || normalized === 'active';
}

function isTemperatureValue(sensor: EnvironmentSensorData, value: EnvironmentSensorValue): boolean {
  const name = value.name.toLowerCase();
  return sensor.type === 'Temperature' || name.includes('temp');
}

function isHumidityValue(sensor: EnvironmentSensorData, value: EnvironmentSensorValue): boolean {
  const name = value.name.toLowerCase();
  return sensor.type === 'Humidity' || name.includes('humid');
}

function buildVpdData(temperature: number, humidity: number, phase?: string, currentDay?: number): EnvironmentData {
  const vpdValue = calculateVPD(temperature, humidity);
  const optimalVpdRange = getOptimalVpdRange(phase, currentDay);
  const vpdStatus = getVpdStatus(vpdValue, optimalVpdRange);

  return {
    title: 'VPD',
    value: `${vpdValue} kPa`,
    icon: 'vpd',
    unit: 'kPa',
    status: vpdStatus,
    statusClass: getVpdStatusClass(vpdStatus),
    statusText: getVpdStatusText(vpdStatus, optimalVpdRange),
    optimalRange: optimalVpdRange ? `${optimalVpdRange.min}-${optimalVpdRange.max} kPa` : undefined,
    phaseDescription: optimalVpdRange ? optimalVpdRange.description : undefined
  };
}

export function buildEnvironmentData(
  sensors: EnvironmentSensorData[],
  phase?: string,
  currentDay?: number
): EnvironmentData[] {
  const environmentData: EnvironmentData[] = [];
  let temperatureValue: number | null = null;
  let humidityValue: number | null = null;

  sensors.forEach(sensor => {
    if (!sensor.values.length) return;

    if (sensor.type === 'Carbon Filter' || sensor.type === 'Fan' || sensor.type === 'Lamp') {
      const firstValue = sensor.values[0];

      environmentData.push({
        title: sensor.name || sensor.type,
        value: parseEnvironmentSwitch(firstValue.value) ? 'On' : 'Off',
        icon: sensor.type === 'Carbon Filter' ? 'filter' : sensor.type === 'Fan' ? 'fan' : 'light',
        unit: ''
      });
      return;
    }

    sensor.values.forEach(value => {
      const numericValue = parseEnvironmentNumber(value.value);
      const unit = value.unit || '';

      if (isTemperatureValue(sensor, value)) {
        if (numericValue === null) return;

        temperatureValue = numericValue;
        environmentData.push({
          title: sensor.type === 'Temperature' ? sensor.name || 'Temperature' : 'Temperature',
          value: `${numericValue}${unit || '°C'}`,
          icon: 'temperature',
          unit: unit || '°C'
        });
        return;
      }

      if (isHumidityValue(sensor, value)) {
        if (numericValue === null) return;

        humidityValue = numericValue;
        environmentData.push({
          title: sensor.type === 'Humidity' ? sensor.name || 'Humidity' : 'Humidity',
          value: `${numericValue}${unit || '%'}`,
          icon: 'humidity',
          unit: unit || '%'
        });
        return;
      }

      environmentData.push({
        title: value.name || sensor.name || 'Sensor',
        value: `${value.value}${unit}`,
        icon: 'light',
        unit
      });
    });
  });

  if (temperatureValue !== null && humidityValue !== null) {
    environmentData.push(buildVpdData(temperatureValue, humidityValue, phase, currentDay));
  }

  return environmentData;
}
