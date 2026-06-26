import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, getSettings, saveSettings } from '@/lib/db';
import { TuyaApiClient, TuyaSensorDataResult } from '@/lib/tuya-api';

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
    data?: TuyaSensorDataResult;
  }>({ isChecking: false });
  const loadRequestId = useRef(0);
  const connectionRequestId = useRef(0);
  const sensorRequestId = useRef(0);
  const isMounted = useRef(true);

  const loadSettings = useCallback(async () => {
    const requestId = ++loadRequestId.current;

    setIsLoading(true);
    try {
      const loadedSettings = await getSettings();
      if (!isMounted.current || requestId !== loadRequestId.current) return;

      setSettings(loadedSettings || { id: 'global' });
      setError(null);
    } catch (err) {
      if (!isMounted.current || requestId !== loadRequestId.current) return;

      console.error('Error loading settings:', err);
      setError(err instanceof Error ? err : new Error('Unknown error loading settings'));
    } finally {
      if (isMounted.current && requestId === loadRequestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      await saveSettings(newSettings);
      const savedSettings = await getSettings();
      if (!isMounted.current) return true;

      setSettings(savedSettings || { id: 'global' });
      setError(null);
      return true;
    } catch (err) {
      if (!isMounted.current) return false;

      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err : new Error('Unknown error saving settings'));
      return false;
    }
  }, []);

  const testTuyaConnection = useCallback(async (clientId?: string, clientSecret?: string) => {
    const requestId = ++connectionRequestId.current;
    setConnectionStatus({ isChecking: true });

    try {
      const useClientId = clientId?.trim() || settings?.tuyaClientId;
      const useClientSecret = clientSecret?.trim() || settings?.tuyaClientSecret;

      if (!useClientId || !useClientSecret) {
        if (!isMounted.current || requestId !== connectionRequestId.current) return false;

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
      if (!isMounted.current || requestId !== connectionRequestId.current) return result.success;

      setConnectionStatus({
        isChecking: false,
        success: result.success,
        message: result.message
      });

      return result.success;
    } catch (err) {
      if (!isMounted.current || requestId !== connectionRequestId.current) return false;

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

  const testSensor = useCallback(async (deviceId: string) => {
    const requestId = ++sensorRequestId.current;
    setSensorTestStatus({ isChecking: true });

    try {
      if (!settings?.tuyaClientId || !settings?.tuyaClientSecret) {
        if (!isMounted.current || requestId !== sensorRequestId.current) return null;

        setSensorTestStatus({
          isChecking: false,
          success: false,
          message: "Bitte zuerst Client ID und Client Secret speichern."
        });
        return null;
      }

      const tuyaDeviceId = deviceId.trim();
      if (!tuyaDeviceId) {
        if (!isMounted.current || requestId !== sensorRequestId.current) return null;

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

      const response = await tuyaClient.getSensorData(tuyaDeviceId);
      if (!isMounted.current || requestId !== sensorRequestId.current) return response.success && response.result ? response.result : null;

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
      if (!isMounted.current || requestId !== sensorRequestId.current) return null;

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

  useEffect(() => {
    isMounted.current = true;
    loadSettings();

    return () => {
      isMounted.current = false;
      loadRequestId.current++;
      connectionRequestId.current++;
      sensorRequestId.current++;
    };
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
