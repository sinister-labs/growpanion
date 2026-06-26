'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
    NotificationSettings as NotificationSettingsType,
    getNotificationSettings,
    saveNotificationSettings
} from '@/lib/db';
import {
    isNotificationSupported,
    requestNotificationPermission,
    getNotificationPermission,
    initializeNotifications,
    stopNotifications,
    showNotification
} from '@/lib/notification-utils';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function NotificationSettings() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<NotificationSettingsType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSupported, setIsSupported] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                setIsSupported(isNotificationSupported());
                const current = await getNotificationSettings();
                if (current) {
                    setSettings(current);
                } else {
                    // Initialize with defaults
                    const defaults: NotificationSettingsType = {
                        id: 'notification-settings',
                        enabled: false,
                        permission: getNotificationPermission(),
                        defaultReminderTime: '09:00',
                        soundEnabled: true
                    };
                    setSettings(defaults);
                }
            } catch (error) {
                console.error('Failed to load notification settings:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load notification settings',
                    variant: 'destructive'
                });
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, [toast]);

    const handleEnableNotifications = async () => {
        if (!settings || isSaving) return;

        setIsSaving(true);
        let shouldStartNotifications = false;
        let shouldStopNotifications = false;

        try {
            let permission = settings.permission;
            if (permission !== 'granted') {
                permission = await requestNotificationPermission();
                if (permission !== 'granted') {
                    toast({
                        title: 'Permission Denied',
                        description: 'Please enable notifications in your browser settings.',
                        variant: 'destructive'
                    });
                    return;
                }
            }

            const newEnabled = !settings.enabled;
            await saveNotificationSettings({ enabled: newEnabled, permission });
            setSettings(prev => prev ? { ...prev, enabled: newEnabled, permission } : null);

            shouldStartNotifications = newEnabled;
            shouldStopNotifications = !newEnabled;
            toast({
                title: newEnabled ? 'Notifications Enabled' : 'Notifications Disabled',
                description: newEnabled
                    ? 'You will now receive reminders for your grows.'
                    : 'You will no longer receive reminders.'
            });
        } catch (error) {
            console.error('Failed to update notification settings:', error);
            toast({
                title: 'Error',
                description: 'Failed to update notification settings',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }

        if (shouldStartNotifications) {
            initializeNotifications();
        } else if (shouldStopNotifications) {
            stopNotifications();
        }
    };

    const handleSoundToggle = async () => {
        if (!settings || isSaving) return;
        const newSoundEnabled = !settings.soundEnabled;
        setIsSaving(true);
        try {
            await saveNotificationSettings({ soundEnabled: newSoundEnabled });
            setSettings(prev => prev ? { ...prev, soundEnabled: newSoundEnabled } : null);
        } catch (error) {
            console.error('Failed to update notification sound setting:', error);
            toast({
                title: 'Error',
                description: 'Failed to update notification sound setting',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTimeChange = async (time: string) => {
        if (!settings || isSaving) return;
        if (!TIME_PATTERN.test(time)) {
            toast({
                title: 'Invalid Time',
                description: 'Please choose a valid time between 00:00 and 23:59.',
                variant: 'destructive'
            });
            return;
        }

        setIsSaving(true);
        try {
            await saveNotificationSettings({ defaultReminderTime: time });
            setSettings(prev => prev ? { ...prev, defaultReminderTime: time } : null);
        } catch (error) {
            console.error('Failed to update default reminder time:', error);
            toast({
                title: 'Error',
                description: 'Failed to update default reminder time',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestNotification = () => {
        const notification = showNotification('🌱 Test Notification', {
            body: 'Notifications are working correctly!'
        });

        if (!notification) {
            toast({
                title: 'Error',
                description: 'Failed to send test notification',
                variant: 'destructive'
            });
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    if (!isSupported) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BellOff className="h-5 w-5" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Notifications are not supported in this browser.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications
                </CardTitle>
                <CardDescription>
                    Configure reminders for watering, feeding, and more
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="notifications-enabled">Enable Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                            Receive browser notifications for reminders
                        </p>
                    </div>
                    <Switch
                        id="notifications-enabled"
                        checked={settings?.enabled || false}
                        onCheckedChange={handleEnableNotifications}
                        disabled={isSaving}
                    />
                </div>

                {/* Permission Status */}
                {settings?.permission === 'denied' && (
                    <div className="rounded-md bg-destructive/10 p-3">
                        <p className="text-sm text-destructive">
                            Notifications are blocked. Please enable them in your browser settings.
                        </p>
                    </div>
                )}

                {/* Sound Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {settings?.soundEnabled ? (
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <VolumeX className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Label htmlFor="sound-enabled">Notification Sound</Label>
                    </div>
                    <Switch
                        id="sound-enabled"
                        checked={settings?.soundEnabled || false}
                        onCheckedChange={handleSoundToggle}
                        disabled={!settings?.enabled || isSaving}
                    />
                </div>

                {/* Default Time */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="default-time">Default Reminder Time</Label>
                    </div>
                    <Input
                        id="default-time"
                        type="time"
                        value={settings?.defaultReminderTime || '09:00'}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        disabled={!settings?.enabled || isSaving}
                        className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                        New reminders will be scheduled around this time
                    </p>
                </div>

                {/* Test Notification */}
                {settings?.enabled && settings?.permission === 'granted' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestNotification}
                        disabled={isSaving}
                    >
                        Send Test Notification
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
