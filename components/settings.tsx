"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { Save, RefreshCw, Check, Info, Plus, X, Edit, Trash, Zap, Clipboard, CopyCheck, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TuyaSensor } from '@/lib/db';
import { TuyaDeviceProperty } from '@/lib/tuya-api';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { CustomDropdown, DropdownOption } from '@/components/ui/custom-dropdown';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouting } from '@/hooks/useRouting';
import { ExportImportSection } from '@/components/export-import-dialog';

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
    const {
        settings,
        isLoading,
        connectionStatus,
        sensorTestStatus,
        updateSettings,
        testTuyaConnection,
        testSensor
    } = useSettings();

    const { toast } = useToast();
    const { navigateTo } = useRouting();

    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [sensors, setSensors] = useState<TuyaSensor[]>([]);
    const [isAddingSensor, setIsAddingSensor] = useState(false);
    const [isEditingSensor, setIsEditingSensor] = useState<string | null>(null);
    const [newSensorName, setNewSensorName] = useState('');
    const [newSensorTuyaId, setNewSensorTuyaId] = useState('');
    const [newSensorValues, setNewSensorValues] = useState('');
    const [newSensorType, setNewSensorType] = useState<TuyaSensor['type']>('Temperature');
    const [valuesToAdd, setValuesToAdd] = useState<TuyaSensor['values']>([]);

    const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
    const [sensorProperties, setSensorProperties] = useState<TuyaDeviceProperty[]>([]);
    const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
    const [copiedProperty, setCopiedProperty] = useState<string | null>(null);

    const [sensorPropertyDecimals, setSensorPropertyDecimals] = useState<Record<string, number>>({});

    const [activeSensorTest, setActiveSensorTest] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedProperty(text);
            setTimeout(() => setCopiedProperty(null), 2000);
        });
    };

    useEffect(() => {
        if (settings) {
            setClientId(settings.tuyaClientId || '');
            setClientSecret(settings.tuyaClientSecret || '');
            setSensors(settings.sensors || []);
        }
    }, [settings]);

    useEffect(() => {
        if (sensorTestStatus.data) {
            let properties: TuyaDeviceProperty[] = [];

            if (sensorTestStatus.data.properties) {
                properties = sensorTestStatus.data.properties;
            }

            if (properties.length > 0) {
                setSensorProperties(properties);
                if (isEditingSensor) {
                    const currentSensor = sensors.find(s => s.id === isEditingSensor);
                    if (currentSensor) {
                        setSelectedProperties(currentSensor.values.map(v => v.code));
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

                if (activeSensorTest) {
                    setIsTestDialogOpen(true);
                }
            } else {
                console.error("No properties found in sensor data - API response structure may be invalid");
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "No sensor data available. The API response does not contain properties."
                });
                setActiveSensorTest(false);
            }
        }
    }, [sensorTestStatus.data, isEditingSensor, sensors, toast, activeSensorTest]);

    useEffect(() => {
        if (connectionStatus.message) {
            if (connectionStatus.success) {
                toast({
                    title: "Success!",
                    description: connectionStatus.message,
                    variant: "success",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Connection problem",
                    description: connectionStatus.message
                });
            }
        }
    }, [connectionStatus, toast]);

    useEffect(() => {
        if (sensorTestStatus.message) {
            if (sensorTestStatus.success) {
                toast({
                    title: "Success!",
                    description: sensorTestStatus.message,
                    variant: "success",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: sensorTestStatus.message
                });
            }
        }
    }, [sensorTestStatus.message, sensorTestStatus.success, toast]);

    const handleSave = async () => {
        setIsSaving(true);

        try {
            const success = await updateSettings({
                tuyaClientId: clientId,
                tuyaClientSecret: clientSecret,
                sensors
            });

            if (success) {
                toast({
                    title: "Success!",
                    description: "Settings successfully saved!",
                    variant: "success",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Error saving settings."
                });
            }
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Error saving settings."
            });
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
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please enter Tuya ID to test the sensor."
            });
            return;
        }

        setSensorProperties([]);
        setSelectedProperties([]);
        setActiveSensorTest(true);
        await testSensor(newSensorTuyaId);
    };

    const handleApplySelectedProperties = () => {
        if (selectedProperties.length > 0) {
            const updatedValues = selectedProperties.map(code => ({
                code,
                decimalPlaces: sensorPropertyDecimals[code]
            }));

            setValuesToAdd(updatedValues);
            setNewSensorValues(selectedProperties.join(', '));
        }
        setIsTestDialogOpen(false);
    };

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

    const resetSensorTestData = useCallback(() => {
        setSensorProperties([]);
        setSelectedProperties([]);
        setIsTestDialogOpen(false);
        setActiveSensorTest(false);
    }, []);

    const resetSensorForm = () => {
        setNewSensorName('');
        setNewSensorTuyaId('');
        setNewSensorValues('');
        setValuesToAdd([]);
        setNewSensorType('Temperature');
        setIsAddingSensor(false);
        setIsEditingSensor(null);
        resetSensorTestData();
    };

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

        try {
            const success = await updateSettings({
                sensors: updatedSensors
            });

            if (success) {
                toast({
                    title: "Success!",
                    description: "Sensor successfully added and saved!",
                    variant: "success",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Sensor added, but error saving."
                });
            }
        } catch (err) {
            console.error('Error saving sensor:', err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Sensor added, but error saving to database."
            });
        }
    };

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

        try {
            const success = await updateSettings({
                sensors: updatedSensors
            });

            if (success) {
                toast({
                    title: "Success!",
                    description: "Sensor successfully updated and saved!",
                    variant: "success",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Sensor updated, but error saving."
                });
            }
        } catch (err) {
            console.error('Error saving updated sensor:', err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Sensor updated, but error saving to database."
            });
        }
    };

    const deleteSensor = async (id: string) => {
        const updatedSensors = sensors.filter(sensor => sensor.id !== id);
        setSensors(updatedSensors);

        try {
            const success = await updateSettings({
                sensors: updatedSensors
            });

            if (success) {
                toast({
                    title: "Success!",
                    description: "Sensor successfully deleted and changes saved!",
                    variant: "success",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Sensor deleted, but error saving changes."
                });
            }
        } catch (err) {
            console.error('Error saving after sensor deletion:', err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Sensor deleted, but error saving to database."
            });
        }
    };

    const togglePropertySelection = (propertyCode: string) => {
        if (selectedProperties.includes(propertyCode)) {
            setSelectedProperties(selectedProperties.filter(code => code !== propertyCode));
        } else {
            setSelectedProperties([...selectedProperties, propertyCode]);
        }
    };

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

    const handleValuesTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setNewSensorValues(text);

        if (text.trim() === '') {
            setValuesToAdd([]);
        } else {
            const codes = text.split(',').map(val => val.trim());
            const newValues = codes.map(code => {
                const existing = valuesToAdd.find(v => v.code === code);
                return existing || { code };
            });
            setValuesToAdd(newValues);
        }
    };

    const handleDecimalPlaceChange = (code: string, decimalPlaces: number | undefined) => {
        setValuesToAdd(current =>
            current.map(value =>
                value.code === code
                    ? { ...value, decimalPlaces }
                    : value
            )
        );
    };

    const startEditingSensor = (sensor: TuyaSensor) => {
        setIsEditingSensor(sensor.id);
        setNewSensorName(sensor.name);
        setNewSensorTuyaId(sensor.tuyaId);
        setNewSensorType(sensor.type || 'Temperature');
        setValuesToAdd([...sensor.values]);

        // Backwards compatibility for old format
        if (sensor.values.length > 0 && typeof sensor.values[0] === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setNewSensorValues((sensor.values as any[]).join(', '));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setValuesToAdd((sensor.values as any[]).map(v => ({ code: v })));
        } else {
            setNewSensorValues(sensor.values.map(v => v.code).join(', '));
        }

        setIsAddingSensor(false);
    };

    const sensorTypeOptions: DropdownOption[] = sensorTypes.map(type => ({
        id: type,
        label: getSensorTypeDisplay(type)
    }));

    const decimalOptions: DropdownOption[] = [
        { id: "0", label: "0" },
        { id: "1", label: "1" },
        { id: "2", label: "2" },
        { id: "3", label: "3" }
    ];

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center relative z-10">
                <RefreshCw className="h-6 w-6 animate-spin text-green-500" />
                <span className="ml-2 text-white">Loading settings...</span>
            </div>
        );
    }

    return (
        <div className={`flex min-h-screen flex-col items-center space-y-8`}>
            <Toaster />
            <div className="w-full">
                <div className="space-y-8 mt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Button
                                    variant="link"
                                    className="text-gray-400 hover:text-white p-0 h-auto flex items-center gap-1"
                                    onClick={() => navigateTo('dashboard')}
                                >
                                    <Home className="h-4 w-4" />
                                    <span>Dashboard</span>
                                </Button>
                                <span className="text-gray-600">/</span>
                                <h1 className="font-semibold text-white">Settings</h1>
                            </div>
                            <p className="text-gray-400">Manage your settings</p>
                        </div>
                    </div>
                    <Card className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 text-left">
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg font-medium text-green-400">
                                <div>
                                    <p className="font-semibold">Tuya Authentication</p>
                                    <CardDescription className="text-gray-400">
                                        Add your tuya authentication details to connect to your sensors
                                    </CardDescription>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="clientId" className="text-gray-300">Client ID</Label>
                                    <Input
                                        id="clientId"
                                        value={clientId}
                                        onChange={(e) => setClientId(e.target.value)}
                                        placeholder="Your Tuya Client ID"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clientSecret" className="text-gray-300">Client Secret</Label>
                                    <Input
                                        id="clientSecret"
                                        value={clientSecret}
                                        onChange={(e) => setClientSecret(e.target.value)}
                                        type="password"
                                        placeholder="Your Tuya Client Secret"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-green-700 hover:bg-green-600 text-white rounded-full transition-colors"
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
                                        className="bg-blue-700 hover:bg-blue-600 text-white rounded-full transition-colors"
                                    >
                                        {connectionStatus.isChecking ? (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Checking...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                Test Connection
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 text-left">
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg font-medium text-green-400">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <p className="font-semibold">Sensors Configuration</p>
                                        <CardDescription className="text-gray-400">
                                            Add and edit your tuya sensors
                                        </CardDescription>
                                    </div>
                                    <Button
                                        onClick={() => { setIsAddingSensor(true); setIsEditingSensor(null); }}
                                        className="bg-green-700 hover:bg-green-600 text-white rounded-full transition-colors"
                                        disabled={isAddingSensor}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Sensor
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isAddingSensor && (
                                <div className="p-5 bg-gray-700/70 rounded-xl space-y-4 mt-4 mb-8">
                                    <h3 className="font-medium text-white mb-2">New Sensor</h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-name" className="text-gray-300">Name</Label>
                                        <Input
                                            id="new-name"
                                            value={newSensorName}
                                            onChange={(e) => setNewSensorName(e.target.value)}
                                            className="bg-gray-800 border-gray-700 text-white"
                                            placeholder="e.g. Temperature & Humidity Sensor"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-type" className="text-gray-300">Sensor Type</Label>
                                        <CustomDropdown
                                            options={sensorTypeOptions}
                                            value={newSensorType}
                                            onChange={(value) => setNewSensorType(value as TuyaSensor['type'])}
                                            placeholder="Choose a Sensor Type"
                                            width="w-full"
                                            buttonClassName="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <Label htmlFor="new-tuyaId" className="text-gray-300">Tuya ID</Label>
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
                                            className="bg-gray-800 border-gray-700 text-white"
                                            placeholder="e.g. bfb26b9588bad7b56bz5uw"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="new-values" className="text-gray-300">Values (Comma Separated)</Label>
                                        <Input
                                            id="new-values"
                                            value={newSensorValues}
                                            onChange={handleValuesTextChange}
                                            className="bg-gray-800 border-gray-700 text-white"
                                            placeholder="e.g. temp_current, humidity_value"
                                        />
                                    </div>

                                    {valuesToAdd.length > 0 && (
                                        <div className="mt-4">
                                            <Label className="mb-2 block text-gray-300">Decimal Places Configuration</Label>
                                            <div className="space-y-2 bg-gray-800/70 p-4 rounded-full">
                                                {valuesToAdd.map((value, index) => (
                                                    <div key={index} className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-300">{value.code}</span>
                                                        <div className="flex items-center space-x-2">
                                                            <Label htmlFor={`new-decimal-${value.code}`} className="text-xs whitespace-nowrap text-gray-400">
                                                                Decimal Places:
                                                            </Label>
                                                            <CustomDropdown
                                                                options={decimalOptions}
                                                                value={value.decimalPlaces?.toString() || '0'}
                                                                onChange={(val) => handleDecimalPlaceChange(
                                                                    value.code,
                                                                    val === '0' ? undefined : parseInt(val)
                                                                )}
                                                                placeholder="0"
                                                                width="w-16"
                                                                buttonClassName="bg-gray-800 border-gray-700 text-white h-7"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Set decimal places if the sensor returns values without a comma (e.g. 246 instead of 24.6)
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex space-x-3 mt-4">
                                        <Button
                                            onClick={() => addSensor()}
                                            className="bg-green-700 hover:bg-green-600 text-white rounded-full transition-colors"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add
                                        </Button>
                                        <Button
                                            onClick={resetSensorForm}
                                            variant="outline"
                                            className="border-gray-600 hover:bg-gray-600/30 text-gray-300 rounded-full transition-colors"
                                        >
                                            <X className="mr-2 h-4 w-4" />
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {sensors.length > 0 ? (
                                <div className="space-y-4 mb-6">
                                    {sensors.map(sensor => (
                                        <div key={sensor.id} className="p-5 bg-gray-700/30 hover:bg-gray-700/40 transition-colors rounded-xl">
                                            {isEditingSensor === sensor.id ? (
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="edit-name" className="text-gray-300">Name</Label>
                                                        <Input
                                                            id="edit-name"
                                                            value={newSensorName}
                                                            onChange={(e) => setNewSensorName(e.target.value)}
                                                            className="bg-gray-800 border-gray-700 text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="edit-type" className="text-gray-300">Sensor Type</Label>
                                                        <CustomDropdown
                                                            options={sensorTypeOptions}
                                                            value={newSensorType}
                                                            onChange={(value) => setNewSensorType(value as TuyaSensor['type'])}
                                                            placeholder="Choose a Sensor Type"
                                                            width="w-full"
                                                            buttonClassName="bg-gray-800 border-gray-700 text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label htmlFor="edit-tuyaId" className="text-gray-300">Tuya ID</Label>
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
                                                            className="bg-gray-800 border-gray-700 text-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="edit-values" className="text-gray-300">Values (Comma Separated)</Label>
                                                        <Input
                                                            id="edit-values"
                                                            value={newSensorValues}
                                                            onChange={handleValuesTextChange}
                                                            className="bg-gray-800 border-gray-700 text-white"
                                                            placeholder="e.g. temp_current, humidity_value"
                                                        />
                                                    </div>

                                                    {valuesToAdd.length > 0 && (
                                                        <div className="mt-4">
                                                            <Label className="mb-2 block text-gray-300">Decimal Places Configuration</Label>
                                                            <div className="space-y-2 bg-gray-800/70 p-4 rounded-full">
                                                                {valuesToAdd.map((value, index) => (
                                                                    <div key={index} className="flex items-center justify-between">
                                                                        <span className="text-sm text-gray-300">{value.code}</span>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Label htmlFor={`decimal-${value.code}`} className="text-xs whitespace-nowrap text-gray-400">
                                                                                Decimal Places:
                                                                            </Label>
                                                                            <CustomDropdown
                                                                                options={decimalOptions}
                                                                                value={value.decimalPlaces?.toString() || '0'}
                                                                                onChange={(val) => handleDecimalPlaceChange(
                                                                                    value.code,
                                                                                    val === '0' ? undefined : parseInt(val)
                                                                                )}
                                                                                placeholder="0"
                                                                                width="w-16"
                                                                                buttonClassName="bg-gray-800 border-gray-700 text-white h-7"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                Set decimal places if the sensor returns values without a comma (e.g. 246 instead of 24.6)
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="flex space-x-3 mt-4">
                                                        <Button
                                                            onClick={() => saveSensorEdit()}
                                                            className="bg-green-700 hover:bg-green-600 text-white rounded-full transition-colors"
                                                        >
                                                            <Save className="mr-2 h-4 w-4" />
                                                            Save
                                                        </Button>
                                                        <Button
                                                            onClick={resetSensorForm}
                                                            variant="outline"
                                                            className="border-gray-600 hover:bg-gray-600/30 text-gray-300 rounded-full transition-colors"
                                                        >
                                                            <X className="mr-2 h-4 w-4" />
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex justify-between mb-2">
                                                        <h3 className="text-lg font-medium text-white">{sensor.name}</h3>
                                                        <div className="flex space-x-2">
                                                            <Button
                                                                onClick={() => startEditingSensor(sensor)}
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 w-8 p-0 border-gray-600 hover:bg-gray-600/30 rounded-full transition-colors"
                                                            >
                                                                <Edit className="h-4 w-4 text-gray-300" />
                                                            </Button>
                                                            <Button
                                                                onClick={() => deleteSensor(sensor.id)}
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 w-8 p-0 border-red-700 hover:bg-red-900/30 rounded-full transition-colors"
                                                            >
                                                                <Trash className="h-4 w-4 text-red-400" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col md:flex-row md:gap-4 mt-1">
                                                        <p className="text-gray-400 text-sm">
                                                            <span className="text-gray-300">{getSensorTypeDisplay(sensor.type || 'Temperature')}</span>
                                                        </p>
                                                        <p className="text-gray-400 text-sm">
                                                            <span className="inline-block mr-1">Tuya ID:</span>
                                                            <span className="text-gray-300">{sensor.tuyaId}</span>
                                                        </p>
                                                    </div>
                                                    <div className="mt-2">
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {sensor.values.map((value, i) => (
                                                                <span key={i} className="bg-green-800/70 hover:bg-green-800 text-gray-200 px-2 py-1 rounded-full text-xs transition-colors">
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
                                <div className="text-center py-8 text-gray-400 bg-gray-700/20 rounded-xl">
                                    No sensors configured. Click &quot;Add Sensor&quot; to create your first sensor.
                                </div>
                            )}

                            <Dialog open={isTestDialogOpen} onOpenChange={(open) => {
                                setIsTestDialogOpen(open);
                                if (!open) {
                                    setActiveSensorTest(false);
                                }
                            }}>
                                <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-[600px] rounded-xl">
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
                                                    <div key={index} className="p-4 bg-gray-700/70 hover:bg-gray-700 rounded-xl flex flex-col transition-colors">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-medium flex items-center text-white">
                                                                    {prop.code}
                                                                    <span className="ml-2 text-xs border border-blue-600 px-2 py-0.5 rounded-full text-blue-400">
                                                                        {prop.type || 'unknown'}
                                                                    </span>
                                                                </h4>
                                                                {prop.unit && <p className="text-sm text-gray-400 mt-1">Unit: {prop.unit}</p>}
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
                                                                        ? "h-8 bg-green-700 hover:bg-green-600 rounded-full transition-colors"
                                                                        : "h-8 border-gray-600 hover:bg-gray-600/30 rounded-full transition-colors"
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
                                                                <code className="px-1 py-0.5 bg-gray-800 rounded-full">{JSON.stringify(prop.value)}</code>
                                                                {prop.unit && <span className="ml-1 text-gray-400">{prop.unit}</span>}
                                                            </p>
                                                        </div>

                                                        {selectedProperties.includes(prop.code) && (
                                                            <div className="mt-3 bg-gray-800 p-3 rounded-xl border border-gray-600 flex items-center justify-between">
                                                                <span className="text-xs text-gray-400">Decimal Places:</span>
                                                                <CustomDropdown
                                                                    options={decimalOptions}
                                                                    value={sensorPropertyDecimals[prop.code]?.toString() || '0'}
                                                                    onChange={(val) => handleDialogDecimalChange(
                                                                        prop.code,
                                                                        val === '0' ? undefined : parseInt(val)
                                                                    )}
                                                                    placeholder="0"
                                                                    width="w-16"
                                                                    buttonClassName="bg-gray-800 border-gray-700 text-white h-7"
                                                                />
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

                                    <div className="flex justify-between items-center">
                                        <div className="text-gray-400 text-sm">
                                            {selectedProperties.length} properties selected
                                        </div>
                                        <div className="flex space-x-3">
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsTestDialogOpen(false)}
                                                className="border-gray-600 hover:bg-gray-600/30 text-gray-300 rounded-full transition-colors"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleApplySelectedProperties}
                                                disabled={selectedProperties.length === 0}
                                                className="bg-green-700 hover:bg-green-600 text-white rounded-full transition-colors"
                                            >
                                                <Check className="mr-2 h-4 w-4" />
                                                Apply
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <div className="mt-6 p-4 bg-blue-900/30 border border-blue-800 rounded-2xl flex items-start">
                                <Info className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-300">
                                    <p className="mb-1">The Tuya ID is found in the Tuya Smart App or the IoT Portal.</p>
                                    <p>The value fields are the names of the data returned by the sensor (e.g. &quot;temp_current&quot; for the current temperature).</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Export/Import Section */}
                    <ExportImportSection />

                    <Card className="bg-gray-800/50 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-2xl text-left">
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg font-medium text-green-400">Help
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-300">
                                To connect Tuya sensors, you need a Tuya IoT account.
                            </p>
                            <p className="text-gray-300">
                                The Client ID and Client Secret are found under your projects in the Tuya IoT Developer portal.
                            </p>
                            <div className="mt-4 p-4 bg-blue-900/30 border border-blue-800 rounded-2xl flex items-start">
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
                                className="text-green-400 hover:text-green-300 underline mt-4 inline-block transition-colors"
                            >
                                Go to Tuya IoT Portal
                            </a>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 