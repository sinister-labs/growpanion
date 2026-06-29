import type { Reminder } from '@/lib/db';

export function getReminderDueTime(reminder: Pick<Reminder, 'nextDue'>): number {
  const time = new Date(reminder.nextDue).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function sortRemindersByDueDate<T extends Pick<Reminder, 'nextDue'>>(reminders: T[]): T[] {
  return [...reminders].sort((a, b) => {
    const dueDiff = getReminderDueTime(a) - getReminderDueTime(b);
    return dueDiff === 0 ? 0 : dueDiff;
  });
}

export function formatReminderDueStatus(dateString: string, now = new Date()): string {
  const date = new Date(dateString);
  const diffMs = date.getTime() - now.getTime();
  if (!Number.isFinite(diffMs)) {
    return 'Unknown';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    return 'Overdue';
  }
  if (diffHours < 1) {
    return 'Due soon';
  }
  if (diffHours < 24) {
    return `In ${diffHours}h`;
  }
  if (diffDays === 1) {
    return 'Tomorrow';
  }

  return `In ${diffDays} days`;
}

export function getReminderDueBadgeClass(dateString: string, now = new Date()): string {
  const date = new Date(dateString);
  const diffMs = date.getTime() - now.getTime();
  const baseClass = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';

  if (!Number.isFinite(diffMs)) {
    return `${baseClass} bg-muted/65 text-muted-foreground`;
  }

  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffMs < 0) return `${baseClass} bg-destructive/12 text-destructive`;
  if (diffHours < 24) return `${baseClass} bg-[#00DF81]/18 text-[#AACBC4]`;
  return `${baseClass} bg-primary/12 text-primary`;
}
