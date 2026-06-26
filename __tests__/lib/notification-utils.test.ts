import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateNextDue, checkDueReminders, shouldRunNotificationChecks } from '@/lib/notification-utils';
import { getAllReminders, getNotificationSettings, saveReminder } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    getNotificationSettings: vi.fn(),
    saveNotificationSettings: vi.fn(),
    getAllReminders: vi.fn(),
    saveReminder: vi.fn(),
    generateId: vi.fn(() => 'reminder-1'),
}));

describe('notification utilities', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('does not schedule a preferred time in the past', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-04-01T15:00:00.000Z'));

        const nextDue = new Date(calculateNextDue(0, '09:00'));

        expect(nextDue.getFullYear()).toBe(2024);
        expect(nextDue.getMonth()).toBe(3);
        expect(nextDue.getDate()).toBe(2);
        expect(nextDue.getHours()).toBe(9);
        expect(nextDue.getMinutes()).toBe(0);
    });

    it('keeps one-time reminders without a preferred time due immediately', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-04-01T15:00:00.000Z'));

        const nextDue = new Date(calculateNextDue(0));

        expect(Number.isFinite(nextDue.getTime())).toBe(true);
        expect(nextDue.toISOString()).toBe('2024-04-01T15:00:00.000Z');
    });

    it('normalizes invalid intervals to a valid due date', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-04-01T15:00:00.000Z'));

        const nextDue = new Date(calculateNextDue(Number.NaN));

        expect(Number.isFinite(nextDue.getTime())).toBe(true);
        expect(nextDue.toISOString()).toBe('2024-04-01T15:00:00.000Z');
    });

    it('starts reminder checks only when notifications are enabled, granted, and supported', () => {
        expect(shouldRunNotificationChecks({ enabled: true }, 'granted', true)).toBe(true);
        expect(shouldRunNotificationChecks({ enabled: false }, 'granted', true)).toBe(false);
        expect(shouldRunNotificationChecks({ enabled: true }, 'denied', true)).toBe(false);
        expect(shouldRunNotificationChecks({ enabled: true }, 'granted', false)).toBe(false);
        expect(shouldRunNotificationChecks(null, 'granted', true)).toBe(false);
    });

    it('keeps recurring reminders on the requested future day and preferred time', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-04-01T15:00:00.000Z'));

        const nextDue = new Date(calculateNextDue(2, '09:30'));

        expect(nextDue.getFullYear()).toBe(2024);
        expect(nextDue.getMonth()).toBe(3);
        expect(nextDue.getDate()).toBe(3);
        expect(nextDue.getHours()).toBe(9);
        expect(nextDue.getMinutes()).toBe(30);
    });

    it('does not throw or load reminders when browser notifications are unsupported', async () => {
        vi.stubGlobal('Notification', undefined);
        vi.mocked(getNotificationSettings).mockResolvedValue({
            id: 'notification-settings',
            enabled: true,
            permission: 'granted',
            defaultReminderTime: '09:00',
            soundEnabled: true,
        });

        await expect(checkDueReminders()).resolves.toEqual([]);
        expect(getAllReminders).not.toHaveBeenCalled();
    });

    it('deduplicates overlapping due reminder checks', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-04-01T15:00:00.000Z'));
        class MockNotification {
            static permission: NotificationPermission = 'granted';
            onclick: (() => void) | null = null;
            constructor(public title: string, public options?: NotificationOptions) {}
            close() {}
        }
        vi.stubGlobal('Notification', MockNotification);
        vi.stubGlobal('window', { Notification: MockNotification });
        vi.mocked(getNotificationSettings).mockResolvedValue({
            id: 'notification-settings',
            enabled: true,
            permission: 'granted',
            defaultReminderTime: '09:00',
            soundEnabled: true,
        });
        let resolveReminders: (value: Awaited<ReturnType<typeof getAllReminders>>) => void;
        vi.mocked(getAllReminders).mockReturnValue(new Promise(resolve => {
            resolveReminders = resolve;
        }));

        const firstCheck = checkDueReminders();
        const secondCheck = checkDueReminders();
        resolveReminders!([
            {
                id: 'reminder-1',
                growId: 'grow-1',
                type: 'watering',
                title: 'Water',
                intervalDays: 1,
                nextDue: '2024-04-01T14:00:00.000Z',
                enabled: true,
                createdAt: '2024-04-01T09:00:00.000Z',
                updatedAt: '2024-04-01T09:00:00.000Z',
            },
        ]);

        const [firstResult, secondResult] = await Promise.all([firstCheck, secondCheck]);

        expect(firstResult).toHaveLength(1);
        expect(secondResult).toHaveLength(1);
        expect(getAllReminders).toHaveBeenCalledTimes(1);
        expect(saveReminder).toHaveBeenCalledTimes(1);
    });

    it('ignores enabled reminders with invalid due dates', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-04-01T15:00:00.000Z'));
        class MockNotification {
            static permission: NotificationPermission = 'granted';
            onclick: (() => void) | null = null;
            constructor(public title: string, public options?: NotificationOptions) {}
            close() {}
        }
        vi.stubGlobal('Notification', MockNotification);
        vi.stubGlobal('window', { Notification: MockNotification });
        vi.mocked(getNotificationSettings).mockResolvedValue({
            id: 'notification-settings',
            enabled: true,
            permission: 'granted',
            defaultReminderTime: '09:00',
            soundEnabled: true,
        });
        vi.mocked(getAllReminders).mockResolvedValue([
            {
                id: 'reminder-1',
                growId: 'grow-1',
                type: 'watering',
                title: 'Water',
                intervalDays: 1,
                nextDue: 'not-a-date',
                enabled: true,
                createdAt: '2024-04-01T09:00:00.000Z',
                updatedAt: '2024-04-01T09:00:00.000Z',
            },
        ]);

        await expect(checkDueReminders()).resolves.toEqual([]);
        expect(saveReminder).not.toHaveBeenCalled();
    });
});
