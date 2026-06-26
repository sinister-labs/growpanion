'use client';

import { useEffect } from 'react';
import { getNotificationSettings } from '@/lib/db';
import {
    getNotificationPermission,
    initializeNotifications,
    shouldRunNotificationChecks,
    stopNotifications
} from '@/lib/notification-utils';

export function NotificationInitializer() {
    useEffect(() => {
        let cancelled = false;

        getNotificationSettings()
            .then(settings => {
                if (cancelled) return;

                if (shouldRunNotificationChecks(settings, getNotificationPermission())) {
                    initializeNotifications();
                }
            })
            .catch(error => {
                console.error('Failed to initialize notifications:', error);
            });

        return () => {
            cancelled = true;
            stopNotifications();
        };
    }, []);

    return null;
}
