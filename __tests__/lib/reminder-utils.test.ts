import { describe, expect, it } from 'vitest';
import {
  formatReminderDueStatus,
  getReminderDueBadgeClass,
  getReminderDueTime,
  sortRemindersByDueDate,
} from '@/lib/reminder-utils';

describe('reminder utilities', () => {
  it('sorts reminders by parsed due date without mutating the input array', () => {
    const reminders = [
      { id: 'later', nextDue: '2024-04-03T09:00:00.000Z' },
      { id: 'invalid', nextDue: 'not-a-date' },
      { id: 'earlier', nextDue: '2024-04-01T09:00:00.000Z' },
    ];

    const sorted = sortRemindersByDueDate(reminders);

    expect(sorted.map(reminder => reminder.id)).toEqual(['earlier', 'later', 'invalid']);
    expect(reminders.map(reminder => reminder.id)).toEqual(['later', 'invalid', 'earlier']);
  });

  it('places invalid due dates after valid reminder dates', () => {
    expect(getReminderDueTime({ nextDue: 'not-a-date' })).toBe(Number.POSITIVE_INFINITY);
    expect(getReminderDueTime({ nextDue: '2024-04-01T09:00:00.000Z' })).toBe(
      new Date('2024-04-01T09:00:00.000Z').getTime(),
    );
  });

  it('formats due status relative to now', () => {
    const now = new Date('2024-04-01T12:00:00.000Z');

    expect(formatReminderDueStatus('not-a-date', now)).toBe('Unknown');
    expect(formatReminderDueStatus('2024-04-01T11:59:00.000Z', now)).toBe('Overdue');
    expect(formatReminderDueStatus('2024-04-01T12:30:00.000Z', now)).toBe('Due soon');
    expect(formatReminderDueStatus('2024-04-01T15:00:00.000Z', now)).toBe('In 3h');
    expect(formatReminderDueStatus('2024-04-02T12:00:00.000Z', now)).toBe('Tomorrow');
    expect(formatReminderDueStatus('2024-04-04T12:00:00.000Z', now)).toBe('In 3 days');
  });

  it('returns due badge classes for invalid, overdue, due soon, and later reminders', () => {
    const now = new Date('2024-04-01T12:00:00.000Z');

    expect(getReminderDueBadgeClass('not-a-date', now)).toContain('bg-gray-500/20');
    expect(getReminderDueBadgeClass('2024-04-01T11:59:00.000Z', now)).toContain('bg-red-500/20');
    expect(getReminderDueBadgeClass('2024-04-01T15:00:00.000Z', now)).toContain('bg-green-500/20');
    expect(getReminderDueBadgeClass('2024-04-03T12:00:00.000Z', now)).toContain('bg-gray-500/20');
  });
});
