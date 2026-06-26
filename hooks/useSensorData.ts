import { useState, useEffect, useCallback, useRef } from 'react';
import { TuyaSensor } from '@/lib/db';
import { useSettings } from './useSettings';
import { TuyaApiClient, TuyaSensorDataResult, TuyaDeviceProperty } from '@/lib/tuya-api';
import { applySensorDecimalPlaces, normalizeSensorConfig } from '@/lib/sensor-utils';

interface SensorApiResponse {
  success: boolean;
  result?: TuyaSensorDataResult;
  error?: string;
  message?: string;
}

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
  const fetchRequestId = useRef(0);
  const isMounted = useRef(true);

  /**
   * Extracts sensor values from the API response based on sensor configuration
   * @param sensorConfig Sensor configuration
   * @param apiData API response data
   * @returns Formatted sensor values
   */
  const extractSensorValues = (sensorConfig: TuyaSensor, apiData: SensorApiResponse): SensorValue[] => {
    if (!apiData?.result?.properties) {
      return [];
    }

    const properties = apiData.result.properties;

    return sensorConfig.values
      .map((valueSetting): SensorValue | null => {
        const foundProperty = properties.find((prop: TuyaDeviceProperty) => prop.code === valueSetting.code);

        if (!foundProperty) {
          return null;
        }

        const formattedValue = applySensorDecimalPlaces(foundProperty.value, valueSetting.decimalPlaces);

        return {
          name: valueSetting.code,
          value: formattedValue,
          unit: foundProperty.unit || '',
          decimalPlaces: valueSetting.decimalPlaces
        };
      })
      .filter((value): value is SensorValue => value !== null);
  };

  /**
   * Fetches data for all configured sensors
   */
  const fetchAllSensorData = useCallback(async () => {
    const requestId = ++fetchRequestId.current;

    if (isLoadingSettings) {
      setSensorData([]);
      setIsLoading(true);
      setError(null);
      return;
    }

    if (!settings?.tuyaClientId || !settings?.tuyaClientSecret || !settings?.sensors?.length) {
      setSensorData([]);
      setIsLoading(false);
      setError(null);
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

      for (const rawSensor of settings.sensors) {
        const sensor = normalizeSensorConfig(rawSensor);

        try {
          const response = await tuyaClient.getSensorData(sensor.tuyaId);

          updatedSensorData.push({
            id: sensor.id,
            name: sensor.name,
            type: sensor.type,
            values: response.success && response.result
              ? extractSensorValues(sensor, response)
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

      if (!isMounted.current || requestId !== fetchRequestId.current) return;

      setSensorData(updatedSensorData);
    } catch (err) {
      if (!isMounted.current || requestId !== fetchRequestId.current) return;

      setError(err instanceof Error ? err.message : 'Unknown error fetching sensor data');
    }

    if (isMounted.current && requestId === fetchRequestId.current) {
      setIsLoading(false);
    }
  }, [settings, isLoadingSettings]);

  useEffect(() => {
    isMounted.current = true;
    fetchAllSensorData();

    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchAllSensorData, refreshInterval);

      return () => {
        clearInterval(intervalId);
        isMounted.current = false;
        fetchRequestId.current++;
      };
    }

    return () => {
      isMounted.current = false;
      fetchRequestId.current++;
    };
  }, [fetchAllSensorData, refreshInterval]);

  return {
    sensorData,
    isLoading,
    error,
    refreshSensorData: fetchAllSensorData
  };
}
