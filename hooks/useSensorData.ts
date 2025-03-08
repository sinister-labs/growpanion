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
   * Extrahiert Sensorwerte aus der API-Antwort basierend auf der Sensorkonfiguration
   * @param sensorConfig Sensor-Konfiguration
   * @param apiData API-Antwortdaten
   * @returns Formatierte Sensorwerte
   */
  const extractSensorValues = (sensorConfig: TuyaSensor, apiData: any): SensorValue[] => {
    if (!apiData?.result?.properties) {
      return [];
    }

    const properties = apiData.result.properties;
    
    // Map über die Werte-Konfiguration und extrahiere passende Eigenschaften
    return sensorConfig.values
      .map(valueSetting => {
        const foundProperty = properties.find((prop: any) => prop.code === valueSetting.code);
        
        if (!foundProperty) {
          return null;
        }
        
        // Formatierung des Wertes basierend auf Dezimalstellen
        let formattedValue = foundProperty.value;
        
        // Wenn Dezimalstellen konfiguriert und Wert numerisch
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
      .filter(Boolean) as SensorValue[]; // Entferne null-Werte
  };

  /**
   * Ruft Daten für alle konfigurierten Sensoren ab
   */
  const fetchAllSensorData = useCallback(async () => {
    // Prüfe, ob Einstellungen geladen und Sensoren konfiguriert sind
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

      // Verarbeite jeden Sensor einzeln, um Ratelimits zu vermeiden
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
            error: response.success ? null : (response.message || 'Fehler beim Abrufen der Sensordaten')
          });
        } catch (sensorError) {
          const errorMessage = sensorError instanceof Error 
            ? sensorError.message 
            : 'Unbekannter Fehler';
            
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
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Abrufen der Sensordaten');
    }
    
    setIsLoading(false);
  }, [settings, isLoadingSettings]);

  // Initialer Abruf und Einrichtung des Aktualisierungsintervalls
  useEffect(() => {
    fetchAllSensorData();

    // Polling-Intervall einrichten, wenn refreshInterval > 0
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchAllSensorData, refreshInterval);
      
      // Cleanup bei Unmount
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