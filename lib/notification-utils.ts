/**
 * Notification utilities for GrowPanion reminder system
 * Handles browser notifications, permission management, and reminder scheduling
 */

import { 
    Reminder, 
    ReminderType,
    NotificationSettings,
    getNotificationSettings, 
    saveNotificationSettings,
    getAllReminders,
    saveReminder,
    generateId
} from './db';

// ============== NOTIFICATION PERMISSION ==============

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
    if (!isNotificationSupported()) return 'denied';
    return Notification.permission;
}

/**
 * Request notification permission from user
 * @returns The resulting permission state
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isNotificationSupported()) {
        console.warn('Notifications are not supported in this browser');
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        await saveNotificationSettings({ permission });
        return permission;
    } catch (error) {
        console.error('Failed to request notification permission:', error);
        return 'denied';
    }
}

// ============== NOTIFICATION DISPLAY ==============

/**
 * Show a browser notification
 */
export function showNotification(
    title: string,
    options?: NotificationOptions & { onClick?: () => void }
): Notification | null {
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        console.warn('Cannot show notification: permission not granted');
        return null;
    }

    try {
        const notification = new Notification(title, {
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            ...options,
        });

        if (options?.onClick) {
            notification.onclick = () => {
                options.onClick?.();
                notification.close();
            };
        }

        return notification;
    } catch (error) {
        console.error('Failed to show notification:', error);
        return null;
    }
}

/**
 * Show a reminder notification
 */
export function showReminderNotification(reminder: Reminder): Notification | null {
    const typeIcons: Record<ReminderType, string> = {
        watering: '💧',
        feeding: '🌱',
        photo: '📸',
        training: '✂️',
        custom: '🔔'
    };

    const icon = typeIcons[reminder.type] || '🔔';
    
    return showNotification(`${icon} ${reminder.title}`, {
        body: reminder.description || `Time for ${reminder.type}!`,
        tag: reminder.id,
        requireInteraction: true,
    });
}

// ============== REMINDER SCHEDULING ==============

/**
 * Calculate next due date for a reminder
 * @param intervalDays Days between reminders (0 = one-time, don't reschedule)
 * @param preferredTime Optional preferred time in HH:MM format
 */
export function calculateNextDue(intervalDays: number, preferredTime?: string): string {
    const now = new Date();
    const next = new Date(now);
    
    if (intervalDays > 0) {
        next.setDate(next.getDate() + intervalDays);
    }
    
    // Set preferred time if provided
    if (preferredTime) {
        const [hours, minutes] = preferredTime.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
    }
    
    return next.toISOString();
}

/**
 * Mark reminder as triggered and calculate next due date
 */
export async function triggerReminder(reminder: Reminder): Promise<Reminder> {
    const now = new Date().toISOString();
    const settings = await getNotificationSettings();
    
    const updatedReminder: Reminder = {
        ...reminder,
        lastTriggered: now,
        // If interval is 0 (one-time), disable the reminder
        enabled: reminder.intervalDays > 0,
        nextDue: reminder.intervalDays > 0 
            ? calculateNextDue(reminder.intervalDays, settings?.defaultReminderTime)
            : reminder.nextDue,
        updatedAt: now
    };
    
    await saveReminder(updatedReminder);
    return updatedReminder;
}

/**
 * Create a new reminder
 */
export async function createReminder(
    growId: string,
    type: ReminderType,
    title: string,
    intervalDays: number,
    options?: {
        plantId?: string;
        description?: string;
        preferredTime?: string;
    }
): Promise<Reminder> {
    const now = new Date().toISOString();
    const settings = await getNotificationSettings();
    const preferredTime = options?.preferredTime || settings?.defaultReminderTime || '09:00';
    
    const reminder: Reminder = {
        id: generateId(),
        growId,
        plantId: options?.plantId,
        type,
        title,
        description: options?.description,
        intervalDays,
        nextDue: calculateNextDue(intervalDays, preferredTime),
        enabled: true,
        createdAt: now,
        updatedAt: now
    };
    
    await saveReminder(reminder);
    return reminder;
}

// ============== REMINDER CHECKING ==============

/**
 * Check for due reminders and show notifications
 * Should be called periodically (e.g., every minute or on app focus)
 */
export async function checkDueReminders(): Promise<Reminder[]> {
    const settings = await getNotificationSettings();
    
    // Don't check if notifications are disabled
    if (!settings?.enabled || Notification.permission !== 'granted') {
        return [];
    }
    
    const allReminders = await getAllReminders();
    const now = new Date();
    
    const dueReminders = allReminders.filter(reminder => {
        if (!reminder.enabled) return false;
        const dueDate = new Date(reminder.nextDue);
        return dueDate <= now;
    });
    
    // Show notifications for due reminders
    for (const reminder of dueReminders) {
        showReminderNotification(reminder);
        await triggerReminder(reminder);
    }
    
    return dueReminders;
}

// ============== REMINDER PRESETS ==============

/**
 * Common reminder presets for quick setup
 */
export const REMINDER_PRESETS = {
    watering: {
        type: 'watering' as ReminderType,
        title: 'Water your plants',
        description: 'Check soil moisture and water if needed',
        intervalDays: 2
    },
    feeding: {
        type: 'feeding' as ReminderType,
        title: 'Feed your plants',
        description: 'Time for nutrients',
        intervalDays: 7
    },
    photo: {
        type: 'photo' as ReminderType,
        title: 'Document your grow',
        description: 'Take photos for your grow diary',
        intervalDays: 3
    },
    training: {
        type: 'training' as ReminderType,
        title: 'Check training',
        description: 'Inspect LST/HST progress and adjust if needed',
        intervalDays: 2
    }
} as const;

/**
 * Create reminders from a preset
 */
export async function createReminderFromPreset(
    growId: string,
    presetKey: keyof typeof REMINDER_PRESETS,
    options?: { plantId?: string; preferredTime?: string }
): Promise<Reminder> {
    const preset = REMINDER_PRESETS[presetKey];
    return createReminder(growId, preset.type, preset.title, preset.intervalDays, {
        ...options,
        description: preset.description
    });
}

// ============== NOTIFICATION INITIALIZATION ==============

let checkInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize notification system with periodic checks
 * @param intervalMs How often to check for due reminders (default: 60000ms = 1 minute)
 */
export function initializeNotifications(intervalMs = 60000): void {
    // Clear existing interval if any
    if (checkInterval) {
        clearInterval(checkInterval);
    }
    
    // Check immediately on init
    checkDueReminders().catch(console.error);
    
    // Set up periodic checks
    checkInterval = setInterval(() => {
        checkDueReminders().catch(console.error);
    }, intervalMs);
    
    // Also check on visibility change (when user returns to tab)
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkDueReminders().catch(console.error);
            }
        });
    }
}

/**
 * Stop notification checks
 */
export function stopNotifications(): void {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}

// ============== DEFAULT SETTINGS ==============

/**
 * Get or create default notification settings
 */
export async function getOrCreateNotificationSettings(): Promise<NotificationSettings> {
    const existing = await getNotificationSettings();
    if (existing) return existing;
    
    const defaults: NotificationSettings = {
        id: 'notification-settings',
        enabled: false,
        permission: getNotificationPermission(),
        defaultReminderTime: '09:00',
        soundEnabled: true
    };
    
    await saveNotificationSettings(defaults);
    return defaults;
}
