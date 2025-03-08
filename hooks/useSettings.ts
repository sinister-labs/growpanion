import { useState, useEffect, useCallback } from 'react';
import { Settings, getSettings, saveSettings } from '@/lib/db';
import { TuyaApiClient } from '@/lib/tuya-api';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    isChecking: boolean;
    success?: boolean;
    message?: string;
  }>({ isChecking: false });
  const [sensorTestStatus, setSensorTestStatus] = useState<{
    isChecking: boolean;
    success?: boolean;
    message?: string;
    data?: any;
  }>({ isChecking: false });

  // Laden der Einstellungen aus der Datenbank
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedSettings = await getSettings();
      setSettings(loadedSettings || { id: 'global' });
      setError(null);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err instanceof Error ? err : new Error('Unknown error loading settings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Speichern der Einstellungen in der Datenbank
  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      await saveSettings(newSettings);
      setSettings(prev => prev ? { ...prev, ...newSettings } : { id: 'global', ...newSettings });
      return true;
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err : new Error('Unknown error saving settings'));
      return false;
    }
  }, []);

  // Testen der Tuya-Verbindung
  const testTuyaConnection = useCallback(async (clientId?: string, clientSecret?: string) => {
    setConnectionStatus({ isChecking: true });
    
    try {
      // Verwende entweder die übergebenen Credentials oder die aus den Settings
      const useClientId = clientId || settings?.tuyaClientId;
      const useClientSecret = clientSecret || settings?.tuyaClientSecret;
      
      if (!useClientId || !useClientSecret) {
        setConnectionStatus({ 
          isChecking: false, 
          success: false, 
          message: "Client ID und Client Secret müssen angegeben werden."
        });
        return false;
      }
      
      const tuyaClient = new TuyaApiClient({
        clientId: useClientId,
        clientSecret: useClientSecret
      });
      
      const result = await tuyaClient.testConnection();
      setConnectionStatus({ 
        isChecking: false, 
        success: result.success, 
        message: result.message
      });
      
      return result.success;
    } catch (err) {
      console.error('Error testing Tuya connection:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setConnectionStatus({ 
        isChecking: false, 
        success: false, 
        message: `Verbindungsfehler: ${errorMessage}`
      });
      return false;
    }
  }, [settings]);

  // Testen eines Sensors und Abrufen der verfügbaren Daten
  const testSensor = useCallback(async (deviceId: string) => {
    setSensorTestStatus({ isChecking: true });
    
    try {
      // Überprüfen, ob die erforderlichen Anmeldedaten vorhanden sind
      if (!settings?.tuyaClientId || !settings?.tuyaClientSecret) {
        setSensorTestStatus({ 
          isChecking: false, 
          success: false, 
          message: "Bitte zuerst Client ID und Client Secret speichern."
        });
        return null;
      }
      
      if (!deviceId) {
        setSensorTestStatus({ 
          isChecking: false, 
          success: false, 
          message: "Tuya ID des Sensors erforderlich."
        });
        return null;
      }
      
      const tuyaClient = new TuyaApiClient({
        clientId: settings.tuyaClientId,
        clientSecret: settings.tuyaClientSecret
      });
      
      const response = await tuyaClient.getSensorData(deviceId);
      
      if (response.success && response.result) {
        setSensorTestStatus({ 
          isChecking: false, 
          success: true, 
          message: "Sensor-Daten erfolgreich abgerufen!",
          data: response.result
        });
        return response.result;
      } else {
        setSensorTestStatus({ 
          isChecking: false, 
          success: false, 
          message: response.message || "Fehler beim Abrufen der Sensor-Daten."
        });
        return null;
      }
    } catch (err) {
      console.error('Error testing sensor:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setSensorTestStatus({ 
        isChecking: false, 
        success: false, 
        message: `Fehler: ${errorMessage}`
      });
      return null;
    }
  }, [settings]);

  // Laden der Einstellungen beim ersten Rendering
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error,
    connectionStatus,
    sensorTestStatus,
    loadSettings,
    updateSettings,
    testTuyaConnection,
    testSensor
  };
} 