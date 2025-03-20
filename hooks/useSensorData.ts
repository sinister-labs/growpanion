import { useState, useEffect, useCallback } from 'react';
import { TuyaSensor } from '@/lib/db';
import { useSettings } from './useSettings';
import { TuyaApiClient } from '@/lib/tuya-api';

export interface SensorValue {
  name: string;
  value: string | number;
  unit?: string;
  decimalPlaces?: number;
}

export interface ProcessedSensorData {
  id: string;
  name: string;
  type?: TuyaSensor['type'];
  values: SensorValue[];
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

export function useSensorData(refreshInterval = 60000) {
  const { settings, isLoading: isLoadingSettings } = useSettings();
  const [sensorData, setSensorData] = useState<ProcessedSensorData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Extracts sensor values from the API response based on sensor configuration
   * @param sensorConfig Sensor configuration
   * @param apiData API response data
   * @returns Formatted sensor values
   */
  const extractSensorValues = (sensorConfig: TuyaSensor, apiData: any): SensorValue[] => {
    if (!apiData?.result?.properties) {
      return [];
    }

    const properties = apiData.result.properties;

    return sensorConfig.values
      .map(valueSetting => {
        const foundProperty = properties.find((prop: any) => prop.code === valueSetting.code);

        if (!foundProperty) {
          return null;
        }

        let formattedValue = foundProperty.value;

        if (typeof valueSetting.decimalPlaces === 'number' && !isNaN(Number(formattedValue))) {
          const divisor = Math.pow(10, valueSetting.decimalPlaces);
          formattedValue = Number(formattedValue) / divisor;
        }

        return {
          name: valueSetting.code,
          value: formattedValue,
          unit: foundProperty.unit || '',
          decimalPlaces: valueSetting.decimalPlaces
        };
      })
      .filter(Boolean) as SensorValue[];
  };

  /**
   * Fetches data for all configured sensors
   */
  const fetchAllSensorData = useCallback(async () => {
    if (isLoadingSettings || !settings?.tuyaClientId || !settings?.tuyaClientSecret || !settings?.sensors?.length) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const tuyaClient = new TuyaApiClient({
      clientId: settings.tuyaClientId,
      clientSecret: settings.tuyaClientSecret
    });

    try {
      const updatedSensorData: ProcessedSensorData[] = [];

      for (const sensor of settings.sensors) {
        try {
          const response = await tuyaClient.getSensorData(sensor.tuyaId);

          updatedSensorData.push({
            id: sensor.id,
            name: sensor.name,
            type: sensor.type,
            values: response.success && response.result
              ? extractSensorValues(sensor, response.result)
              : [],
            lastUpdated: new Date(),
            isLoading: false,
            error: response.success ? null : (response.message || 'Error fetching sensor data')
          });
        } catch (sensorError) {
          const errorMessage = sensorError instanceof Error
            ? sensorError.message
            : 'Unknown error';

          updatedSensorData.push({
            id: sensor.id,
            name: sensor.name,
            type: sensor.type,
            values: [],
            lastUpdated: new Date(),
            isLoading: false,
            error: errorMessage
          });
        }
      }

      setSensorData(updatedSensorData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error fetching sensor data');
    }

    setIsLoading(false);
  }, [settings, isLoadingSettings]);

  useEffect(() => {
    fetchAllSensorData();

    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchAllSensorData, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [fetchAllSensorData, refreshInterval]);

  return {
    sensorData,
    isLoading,
    error,
    refreshSensorData: fetchAllSensorData
  };
}