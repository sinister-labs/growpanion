"use client";

import { useState, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { Save, RefreshCw, Check, AlertCircle, Info, Plus, X, Edit, Trash, Zap, Clipboard, CopyCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { TuyaSensor } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Sensor types definition
const sensorTypes = [
  'Lamp', 
  'Carbon Filter', 
  'Fan', 
  'Temperature', 
  'Humidity', 
  'Boolean', 
  'Number'
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { 
    settings, 
    isLoading, 
    error, 
    connectionStatus, 
    sensorTestStatus,
    updateSettings, 
    testTuyaConnection,
    testSensor
  } = useSettings();

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // State for sensors
  const [sensors, setSensors] = useState<TuyaSensor[]>([]);
  const [isAddingSensor, setIsAddingSensor] = useState(false);
  const [isEditingSensor, setIsEditingSensor] = useState<string | null>(null);
  const [newSensorName, setNewSensorName] = useState('');
  const [newSensorTuyaId, setNewSensorTuyaId] = useState('');
  const [newSensorValues, setNewSensorValues] = useState('');
  const [newSensorType, setNewSensorType] = useState<TuyaSensor['type']>('Temperature');
  const [valuesToAdd, setValuesToAdd] = useState<TuyaSensor['values']>([]);

  // State for Sensor Data Dialog
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [sensorProperties, setSensorProperties] = useState<any[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [copiedProperty, setCopiedProperty] = useState<string | null>(null);

  // State for Sensor Property Decimal Places in Dialog
  const [sensorPropertyDecimals, setSensorPropertyDecimals] = useState<Record<string, number>>({});

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedProperty(text);
      setTimeout(() => setCopiedProperty(null), 2000);
    });
  };

  // Fill form fields with saved settings
  useEffect(() => {
    if (settings) {
      setClientId(settings.tuyaClientId || '');
      setClientSecret(settings.tuyaClientSecret || '');
      setSensors(settings.sensors || []);
    }
  }, [settings]);

  // Update sensor selection UI when test results come in
  useEffect(() => {
    if (sensorTestStatus.data) {
      console.log("Received sensor data:", sensorTestStatus.data);
      
      // Extract properties from data
      // Depending on the structure of the response, we can access it differently
      let properties = [];
      
      if (sensorTestStatus.data.result && sensorTestStatus.data.result.properties) {
        // Case 1: Data is in data.result.properties
        properties = sensorTestStatus.data.result.properties;
      } else if (sensorTestStatus.data.properties) {
        // Case 2: Data is directly in data.properties
        properties = sensorTestStatus.data.properties;
      }
      
      if (properties.length > 0) {
        setSensorProperties(properties);
        
        // Initialize selectedProperties with existing values if editing
        if (isEditingSensor) {
          const currentSensor = sensors.find(s => s.id === isEditingSensor);
          if (currentSensor) {
            setSelectedProperties(currentSensor.values.map(v => v.code));
            // Keep track of the decimal places in an object for initialization
            const decimalPlaceMap = currentSensor.values.reduce((acc, val) => {
              if (val.decimalPlaces !== undefined) {
                acc[val.code] = val.decimalPlaces;
              }
              return acc;
            }, {} as Record<string, number>);
            setSensorPropertyDecimals(decimalPlaceMap);
          }
        } else {
          setSelectedProperties([]);
          setSensorPropertyDecimals({});
        }
        
        setIsTestDialogOpen(true);
      } else {
        console.error("No properties found in sensor data:", sensorTestStatus.data);
        setSaveMessage({ 
          type: 'error', 
          text: 'No sensor data available. The API response does not contain properties.' 
        });
      }
    }
  }, [sensorTestStatus.data, isEditingSensor, sensors]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const success = await updateSettings({
        tuyaClientId: clientId,
        tuyaClientSecret: clientSecret,
        sensors
      });

      if (success) {
        setSaveMessage({ type: 'success', text: 'Settings successfully saved!' });
      } else {
        setSaveMessage({ type: 'error', text: 'Error saving settings.' });
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Error saving settings.' });
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    await testTuyaConnection(clientId, clientSecret);
  };

  const handleTestSensor = async () => {
    if (!newSensorTuyaId) {
      setSaveMessage({ type: 'error', text: 'Please enter Tuya ID to test the sensor.' });
      return;
    }

    setSensorProperties([]);
    setSelectedProperties([]);
    await testSensor(newSensorTuyaId);
  };

  const handleApplySelectedProperties = () => {
    if (selectedProperties.length > 0) {
      // Create values with decimal place information
      const updatedValues = selectedProperties.map(code => ({
        code,
        decimalPlaces: sensorPropertyDecimals[code] // undefined if no decimal places were set
      }));
      
      setValuesToAdd(updatedValues);
      setNewSensorValues(selectedProperties.join(', '));
    }
    setIsTestDialogOpen(false);
  };

  // Update decimal places for a property in the dialog
  const handleDialogDecimalChange = (propertyCode: string, decimalPlaces: number | undefined) => {
    setSensorPropertyDecimals(prev => {
      const updated = { ...prev };
      if (decimalPlaces === undefined) {
        delete updated[propertyCode];
      } else {
        updated[propertyCode] = decimalPlaces;
      }
      return updated;
    });
  };

  // Add new sensor
  const addSensor = async () => {
    if (!newSensorName || !newSensorTuyaId || valuesToAdd.length === 0 || !newSensorType) {
      return;
    }
    
    const newSensor: TuyaSensor = {
      id: uuidv4(),
      name: newSensorName,
      tuyaId: newSensorTuyaId,
      type: newSensorType,
      values: valuesToAdd,
    };

    const updatedSensors = [...sensors, newSensor];
    setSensors(updatedSensors);
    resetSensorForm();
    
    // Save automatically
    try {
      setSaveMessage(null);
      const success = await updateSettings({
        sensors: updatedSensors
      });
      
      if (success) {
        setSaveMessage({ type: 'success', text: 'Sensor successfully added and saved!' });
      } else {
        setSaveMessage({ type: 'error', text: 'Sensor added, but error saving.' });
      }
    } catch (err) {
      console.error('Error saving sensor:', err);
      setSaveMessage({ type: 'error', text: 'Sensor added, but error saving to database.' });
    }
  };

  // Edit sensor
  const startEditingSensor = (sensor: TuyaSensor) => {
    setIsEditingSensor(sensor.id);
    setNewSensorName(sensor.name);
    setNewSensorTuyaId(sensor.tuyaId);
    setNewSensorType(sensor.type || 'Temperature');
    setValuesToAdd([...sensor.values]);
    
    // Backwards compatibility for old format
    if (sensor.values.length > 0 && typeof sensor.values[0] === 'string') {
      // @ts-ignore - Handling migration from old string[] format
      setNewSensorValues(sensor.values.join(', '));
      // @ts-ignore - Handling migration from old string[] format
      setValuesToAdd(sensor.values.map(v => ({ code: v })));
    } else {
      setNewSensorValues(sensor.values.map(v => v.code).join(', '));
    }
    
    setIsAddingSensor(false);
  };

  // Save sensor changes
  const saveSensorEdit = async () => {
    if (!isEditingSensor || !newSensorName || !newSensorTuyaId || valuesToAdd.length === 0 || !newSensorType) {
      return;
    }
    
    const updatedSensors = sensors.map(sensor => 
      sensor.id === isEditingSensor 
        ? { 
            ...sensor, 
            name: newSensorName, 
            tuyaId: newSensorTuyaId, 
            values: valuesToAdd,
            type: newSensorType 
          } 
        : sensor
    );

    setSensors(updatedSensors);
    resetSensorForm();
    
    // Save automatically
    try {
      setSaveMessage(null);
      const success = await updateSettings({
        sensors: updatedSensors
      });
      
      if (success) {
        setSaveMessage({ type: 'success', text: 'Sensor successfully updated and saved!' });
      } else {
        setSaveMessage({ type: 'error', text: 'Sensor updated, but error saving.' });
      }
    } catch (err) {
      console.error('Error saving updated sensor:', err);
      setSaveMessage({ type: 'error', text: 'Sensor updated, but error saving to database.' });
    }
  };

  // Delete sensor
  const deleteSensor = async (id: string) => {
    const updatedSensors = sensors.filter(sensor => sensor.id !== id);
    setSensors(updatedSensors);
    
    // Save automatically
    try {
      setSaveMessage(null);
      const success = await updateSettings({
        sensors: updatedSensors
      });
      
      if (success) {
        setSaveMessage({ type: 'success', text: 'Sensor successfully deleted and changes saved!' });
      } else {
        setSaveMessage({ type: 'error', text: 'Sensor deleted, but error saving changes.' });
      }
    } catch (err) {
      console.error('Error saving after sensor deletion:', err);
      setSaveMessage({ type: 'error', text: 'Sensor deleted, but error saving to database.' });
    }
  };

  // Reset form
  const resetSensorForm = () => {
    setNewSensorName('');
    setNewSensorTuyaId('');
    setNewSensorValues('');
    setValuesToAdd([]);
    setNewSensorType('Temperature');
    setIsAddingSensor(false);
    setIsEditingSensor(null);
  };

  // Toggle property selection
  const togglePropertySelection = (propertyCode: string) => {
    if (selectedProperties.includes(propertyCode)) {
      setSelectedProperties(selectedProperties.filter(code => code !== propertyCode));
    } else {
      setSelectedProperties([...selectedProperties, propertyCode]);
    }
  };

  // helper to get type icon or text for display
  const getSensorTypeDisplay = (type: TuyaSensor['type']) => {
    switch (type) {
      case 'Temperature':
        return '🌡️ Temperature';
      case 'Humidity':
        return '💧 Air Humidity';
      case 'Lamp':
        return '💡 Lamp';
      case 'Carbon Filter':
        return '🔄 Carbon Filter';
      case 'Fan':
        return '💨 Fan';
      case 'Boolean':
        return '✓ Yes/No';
      case 'Number':
        return '🔢 Number';
      default:
        return type;
    }
  };

  // Update values based on text input
  const handleValuesTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setNewSensorValues(text);
    
    // Update the valuesToAdd array based on text input
    if (text.trim() === '') {
      setValuesToAdd([]);
    } else {
      const codes = text.split(',').map(val => val.trim());
      // Keep any existing decimal places for codes that already exist
      const newValues = codes.map(code => {
        const existing = valuesToAdd.find(v => v.code === code);
        return existing || { code };
      });
      setValuesToAdd(newValues);
    }
  };

  // Handle decimal place change for a specific value
  const handleDecimalPlaceChange = (code: string, decimalPlaces: number | undefined) => {
    setValuesToAdd(current => 
      current.map(value => 
        value.code === code 
          ? { ...value, decimalPlaces } 
          : value
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center relative z-10">
        <RefreshCw className="h-6 w-6 animate-spin text-green-500" />
        <span className="ml-2 text-white">Loading settings...</span>
      </div>
    );
  }

  return (
    <main className={`flex min-h-screen flex-col items-center p-4 sm:p-8 bg-black bg-opacity-90`}>
      <div className="flex flex-col p-4 sm:p-8 min-h-screen max-w-7xl relative z-10">
        <Header />
        
        <div className="w-full mx-auto flex flex-col gap-6 mt-4">
          <Card className="p-6 bg-gray-800 border-gray-700 text-white shadow-xl">
            <h2 className="text-xl font-semibold mb-4">Tuya Sensors</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Your Tuya Client ID"
                  className="bg-gray-700 border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  type="password"
                  placeholder="Your Tuya Client Secret"
                  className="bg-gray-700 border-gray-600"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="bg-green-700 hover:bg-green-600 text-white"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>

                <Button 
                  onClick={handleTestConnection} 
                  disabled={connectionStatus.isChecking}
                  className="bg-blue-700 hover:bg-blue-600 text-white"
                >
                  {connectionStatus.isChecking ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Check Connection...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Check Connection
                    </>
                  )}
                </Button>
              </div>
            </div>

            {saveMessage && (
              <Alert 
                className={`mt-4 ${saveMessage.type === 'success' ? 'bg-green-800/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}
              >
                {saveMessage.type === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {saveMessage.type === 'success' ? 'Success!' : 'Error'}
                </AlertTitle>
                <AlertDescription>
                  {saveMessage.text}
                </AlertDescription>
              </Alert>
            )}

            {connectionStatus.message && (
              <Alert 
                className={`mt-4 ${connectionStatus.success ? 'bg-green-800/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}
              >
                {connectionStatus.success ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {connectionStatus.success ? 'Connection successful!' : 'Connection problem'}
                </AlertTitle>
                <AlertDescription>
                  {connectionStatus.message}
                </AlertDescription>
              </Alert>
            )}
          </Card>

          {/* Sensors Management */}
          <Card className="p-6 bg-gray-800 border-gray-700 text-white shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sensors Configuration</h2>
              <Button 
                onClick={() => { setIsAddingSensor(true); setIsEditingSensor(null); }} 
                className="bg-green-700 hover:bg-green-600 text-white"
                disabled={isAddingSensor}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Sensor
              </Button>
            </div>

            {/* Sensors List */}
            {sensors.length > 0 ? (
              <div className="space-y-4 mb-6">
                {sensors.map(sensor => (
                  <div key={sensor.id} className="p-4 bg-gray-700 rounded-lg">
                    {isEditingSensor === sensor.id ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="edit-name">Name</Label>
                          <Input
                            id="edit-name"
                            value={newSensorName}
                            onChange={(e) => setNewSensorName(e.target.value)}
                            className="bg-gray-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-type">Sensor Type</Label>
                          <Select
                            value={newSensorType}
                            onValueChange={(value) => setNewSensorType(value as TuyaSensor['type'])}
                          >
                            <SelectTrigger className="bg-gray-600 border-gray-500">
                              <SelectValue placeholder="Choose a Sensor Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-700 border-gray-600">
                              {sensorTypes.map(type => (
                                <SelectItem key={type} value={type} className="text-white hover:bg-gray-600 focus:bg-gray-600">
                                  {getSensorTypeDisplay(type)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="edit-tuyaId">Tuya ID</Label>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs text-blue-400 hover:text-blue-300"
                              onClick={() => handleTestSensor()}
                              disabled={sensorTestStatus.isChecking || !newSensorTuyaId}
                            >
                              {sensorTestStatus.isChecking ? (
                                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Zap className="mr-1 h-3 w-3" />
                              )}
                              Test Sensor
                            </Button>
                          </div>
                          <Input
                            id="edit-tuyaId"
                            value={newSensorTuyaId}
                            onChange={(e) => setNewSensorTuyaId(e.target.value)}
                            className="bg-gray-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-values">Values (Comma Separated)</Label>
                          <Input
                            id="edit-values"
                            value={newSensorValues}
                            onChange={handleValuesTextChange}
                            className="bg-gray-600"
                            placeholder="e.g. temp_current, humidity_value"
                          />
                        </div>
                        
                        {/* Decimal Places Configuration for Each Value */}
                        {valuesToAdd.length > 0 && (
                          <div className="mt-3">
                            <Label className="mb-2 block">Decimal Places Configuration</Label>
                            <div className="space-y-2 bg-gray-800 p-3 rounded-md">
                              {valuesToAdd.map((value, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-sm">{value.code}</span>
                                  <div className="flex items-center space-x-2">
                                    <Label htmlFor={`decimal-${value.code}`} className="text-xs whitespace-nowrap">
                                      Decimal Places:
                                    </Label>
                                    <Select
                                      value={value.decimalPlaces?.toString() || '0'}
                                      onValueChange={(val) => handleDecimalPlaceChange(
                                        value.code, 
                                        val === '0' ? undefined : parseInt(val)
                                      )}
                                    >
                                      <SelectTrigger 
                                        id={`decimal-${value.code}`}
                                        className="h-7 w-16 bg-gray-700 border-gray-600"
                                      >
                                        <SelectValue placeholder="0" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-gray-700 border-gray-600">
                                        <SelectItem value="0" className="text-white">0</SelectItem>
                                        <SelectItem value="1" className="text-white">1</SelectItem>
                                        <SelectItem value="2" className="text-white">2</SelectItem>
                                        <SelectItem value="3" className="text-white">3</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              Set decimal places if the sensor returns values without a comma (e.g. 246 instead of 24.6)
                            </p>
                          </div>
                        )}
                        <div className="flex space-x-2 mt-3">
                          <Button onClick={() => saveSensorEdit()} className="bg-green-700 hover:bg-green-600">
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </Button>
                          <Button onClick={resetSensorForm} variant="outline" className="border-gray-600">
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between mb-2">
                          <h3 className="text-lg font-medium">{sensor.name}</h3>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => startEditingSensor(sensor)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-gray-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => deleteSensor(sensor.id)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-red-700 hover:bg-red-900/30"
                            >
                              <Trash className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col md:flex-row md:gap-4 mt-1">
                          <p className="text-gray-400 text-sm">
                            <span className="inline-block mr-1">Type:</span>
                            <span className="text-gray-300">{getSensorTypeDisplay(sensor.type || 'Temperature')}</span>
                          </p>
                          <p className="text-gray-400 text-sm">
                            <span className="inline-block mr-1">Tuya ID:</span>
                            <span className="text-gray-300">{sensor.tuyaId}</span>
                          </p>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm text-gray-400">Values:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sensor.values.map((value, i) => (
                              <span key={i} className="bg-gray-600 text-gray-200 px-2 py-1 rounded-md text-xs">
                                {value.code}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                No sensors configured.
              </div>
            )}

            {/* Form for New Sensor */}
            {isAddingSensor && (
              <div className="p-4 bg-gray-700 rounded-lg space-y-3 mt-4">
                <h3 className="font-medium mb-2">New Sensor</h3>
                <div className="space-y-1">
                  <Label htmlFor="new-name">Name</Label>
                  <Input
                    id="new-name"
                    value={newSensorName}
                    onChange={(e) => setNewSensorName(e.target.value)}
                    className="bg-gray-600"
                    placeholder="e.g. Temperature & Humidity Sensor"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-type">Sensor Type</Label>
                  <Select
                    value={newSensorType}
                    onValueChange={(value) => setNewSensorType(value as TuyaSensor['type'])}
                  >
                    <SelectTrigger className="bg-gray-600 border-gray-500" id="new-type">
                      <SelectValue placeholder="Choose a Sensor Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {sensorTypes.map(type => (
                        <SelectItem key={type} value={type} className="text-white hover:bg-gray-600 focus:bg-gray-600">
                          {getSensorTypeDisplay(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Label htmlFor="new-tuyaId">Tuya ID</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs text-blue-400 hover:text-blue-300"
                      onClick={() => handleTestSensor()}
                      disabled={sensorTestStatus.isChecking || !newSensorTuyaId}
                    >
                      {sensorTestStatus.isChecking ? (
                        <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Zap className="mr-1 h-3 w-3" />
                      )}
                      Test Sensor
                    </Button>
                  </div>
                  <Input
                    id="new-tuyaId"
                    value={newSensorTuyaId}
                    onChange={(e) => setNewSensorTuyaId(e.target.value)}
                    className="bg-gray-600"
                    placeholder="e.g. bfb26b9588bad7b56bz5uw"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-values">Values (Comma Separated)</Label>
                  <Input
                    id="new-values"
                    value={newSensorValues}
                    onChange={handleValuesTextChange}
                    className="bg-gray-600"
                    placeholder="e.g. temp_current, humidity_value"
                  />
                </div>
                
                {/* Decimal Places Configuration for Each Value */}
                {valuesToAdd.length > 0 && (
                  <div className="mt-3">
                    <Label className="mb-2 block">Decimal Places Configuration</Label>
                    <div className="space-y-2 bg-gray-800 p-3 rounded-md">
                      {valuesToAdd.map((value, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{value.code}</span>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`new-decimal-${value.code}`} className="text-xs whitespace-nowrap">
                              Decimal Places:
                            </Label>
                            <Select
                              value={value.decimalPlaces?.toString() || '0'}
                              onValueChange={(val) => handleDecimalPlaceChange(
                                value.code, 
                                val === '0' ? undefined : parseInt(val)
                              )}
                            >
                              <SelectTrigger 
                                id={`new-decimal-${value.code}`}
                                className="h-7 w-16 bg-gray-700 border-gray-600"
                              >
                                <SelectValue placeholder="0" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-700 border-gray-600">
                                <SelectItem value="0" className="text-white">0</SelectItem>
                                <SelectItem value="1" className="text-white">1</SelectItem>
                                <SelectItem value="2" className="text-white">2</SelectItem>
                                <SelectItem value="3" className="text-white">3</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Set decimal places if the sensor returns values without a comma (e.g. 246 instead of 24.6)
                    </p>
                  </div>
                )}
                <div className="flex space-x-2 mt-3">
                  <Button onClick={() => addSensor()} className="bg-green-700 hover:bg-green-600">
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                  <Button onClick={resetSensorForm} variant="outline" className="border-gray-600">
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
                
                {sensorTestStatus.message && (
                  <Alert 
                    className={`mt-4 ${sensorTestStatus.success ? 'bg-green-800/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}
                  >
                    {sensorTestStatus.success ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {sensorTestStatus.success ? 'Success!' : 'Error'}
                    </AlertTitle>
                    <AlertDescription>
                      {sensorTestStatus.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Sensor-Test Dialog */}
            <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
              <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Available Sensor Data</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Choose the values you want to use in your sensor.
                  </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="h-[50vh] pr-4">
                  {sensorProperties.length > 0 ? (
                    <div className="space-y-3">
                      {sensorProperties.map((prop, index) => (
                        <div key={index} className="p-3 bg-gray-700 rounded-lg flex flex-col">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium flex items-center">
                                {prop.code} 
                                <span
                                  className="ml-2 text-xs border border-blue-600 px-2 py-0.5 rounded-full text-blue-400"
                                >
                                  {prop.type || 'unknown'}
                                </span>
                              </h4>
                              {prop.name && <p className="text-sm text-gray-400 mt-1">{prop.name}</p>}
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs"
                                onClick={() => copyToClipboard(prop.code)}
                              >
                                {copiedProperty === prop.code ? (
                                  <CopyCheck className="h-4 w-4 text-green-400" />
                                ) : (
                                  <Clipboard className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant={selectedProperties.includes(prop.code) ? "default" : "outline"}
                                className={selectedProperties.includes(prop.code) 
                                  ? "h-8 bg-green-700 hover:bg-green-600" 
                                  : "h-8 border-gray-600"
                                }
                                onClick={() => togglePropertySelection(prop.code)}
                              >
                                {selectedProperties.includes(prop.code) ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Plus className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm">
                              <span className="text-gray-400">Value: </span>
                              <code className="px-1 py-0.5 bg-gray-800 rounded">{JSON.stringify(prop.value)}</code>
                              {prop.unit && <span className="ml-1 text-gray-400">{prop.unit}</span>}
                            </p>
                          </div>
                          
                          {/* Decimal Places Configuration in Dialog */}
                          {selectedProperties.includes(prop.code) && (
                            <div className="mt-3 bg-gray-800 p-2 rounded border border-gray-600 flex items-center justify-between">
                              <span className="text-xs text-gray-400">Decimal Places:</span>
                              <Select
                                value={sensorPropertyDecimals[prop.code]?.toString() || '0'}
                                onValueChange={(val) => handleDialogDecimalChange(
                                  prop.code, 
                                  val === '0' ? undefined : parseInt(val)
                                )}
                              >
                                <SelectTrigger className="h-7 w-16 bg-gray-700 border-gray-600">
                                  <SelectValue placeholder="0" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-700 border-gray-600">
                                  <SelectItem value="0" className="text-white">0</SelectItem>
                                  <SelectItem value="1" className="text-white">1</SelectItem>
                                  <SelectItem value="2" className="text-white">2</SelectItem>
                                  <SelectItem value="3" className="text-white">3</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mb-3" />
                      <p className="text-gray-400">Loading sensor data...</p>
                    </div>
                  )}
                </ScrollArea>
                
                <DialogFooter className="flex justify-between">
                  <div className="text-gray-400 text-sm">
                    {selectedProperties.length} properties selected
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => setIsTestDialogOpen(false)} className="border-gray-600">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleApplySelectedProperties}
                      disabled={selectedProperties.length === 0}
                      className="bg-green-700 hover:bg-green-600"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Apply
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-800 rounded-md flex items-start">
              <Info className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-300">
                <p className="mb-1">The Tuya ID is found in the Tuya Smart App or the IoT Portal.</p>
                <p>The value fields are the names of the data returned by the sensor (e.g. "temp_current" for the current temperature).</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gray-800 border-gray-700 text-white shadow-xl">
            <h2 className="text-xl font-semibold mb-2">Help</h2>
            <p className="text-gray-300">
              To connect Tuya sensors, you need a Tuya IoT account. 
              The Client ID and Client Secret are found under your projects in the Tuya IoT Developer portal.
            </p>
            <div className="mt-3 p-3 bg-blue-900/30 border border-blue-800 rounded-md flex items-start">
              <Info className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-300">
                The app communicates with the Tuya API through a local proxy to avoid CORS issues. 
                Your credentials are securely transmitted and not shared with third parties.
              </p>
            </div>
            <a 
              href="https://iot.tuya.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-green-400 hover:text-green-300 underline mt-3 inline-block"
            >
              Go to Tuya IoT Portal
            </a>
          </Card>
        </div>
      </div>
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black"></div>
    </main>
  );
} 