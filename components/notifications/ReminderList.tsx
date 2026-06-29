'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { 
    Bell, 
    Droplets, 
    Leaf, 
    Camera, 
    Scissors, 
    Plus,
    Trash2,
    Clock,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Reminder,
    ReminderType,
    getRemindersForGrow,
    saveReminder,
    deleteReminder,
    getNotificationSettings
} from '@/lib/db';
import { ReminderDialog } from './ReminderDialog';
import { calculateNextDue } from '@/lib/notification-utils';
import { formatReminderDueStatus, getReminderDueBadgeClass, sortRemindersByDueDate } from '@/lib/reminder-utils';

const typeIcons: Record<ReminderType, React.ReactNode> = {
    watering: <Droplets className="h-4 w-4 text-[#2FA98C]" />,
    feeding: <Leaf className="h-4 w-4 text-primary" />,
    photo: <Camera className="h-4 w-4 text-[#17876D]" />,
    training: <Scissors className="h-4 w-4 text-[#2CC295]" />,
    custom: <Bell className="h-4 w-4 text-muted-foreground" />
};

const typeLabels: Record<ReminderType, string> = {
    watering: 'Watering',
    feeding: 'Feeding',
    photo: 'Photo',
    training: 'Training',
    custom: 'Custom'
};

interface ReminderListProps {
    growId: string;
    growName?: string;
}

export function ReminderList({ growId, growName }: ReminderListProps) {
    const { toast } = useToast();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | undefined>();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);
    const loadRequestId = useRef(0);
    const isMounted = useRef(true);

    const loadReminders = useCallback(async () => {
        const requestId = ++loadRequestId.current;
        setIsLoading(true);

        try {
            const data = await getRemindersForGrow(growId);
            if (!isMounted.current || requestId !== loadRequestId.current) return;

            // Sort by next due date
            setReminders(sortRemindersByDueDate(data));
        } catch (error) {
            if (!isMounted.current || requestId !== loadRequestId.current) return;

            console.error('Failed to load reminders:', error);
            toast({
                title: 'Error',
                description: 'Failed to load reminders',
                variant: 'destructive'
            });
        } finally {
            if (isMounted.current && requestId === loadRequestId.current) {
                setIsLoading(false);
            }
        }
    }, [growId, toast]);

    useEffect(() => {
        isMounted.current = true;
        loadReminders();
        return () => {
            isMounted.current = false;
        };
    }, [loadReminders]);

    const handleToggleEnabled = async (reminder: Reminder) => {
        try {
            const enabling = !reminder.enabled;
            const currentDue = new Date(reminder.nextDue);
            const settings = enabling ? await getNotificationSettings() : null;
            const updated = {
                ...reminder,
                enabled: enabling,
                nextDue: enabling && (!Number.isFinite(currentDue.getTime()) || currentDue <= new Date())
                    ? calculateNextDue(reminder.intervalDays, settings?.defaultReminderTime)
                    : reminder.nextDue
            };
            await saveReminder(updated);
            setReminders(prev => sortRemindersByDueDate(prev.map(r => r.id === reminder.id ? updated : r)));
            toast({
                title: updated.enabled ? 'Reminder Enabled' : 'Reminder Disabled',
                description: `"${reminder.title}" is now ${updated.enabled ? 'active' : 'paused'}`
            });
        } catch (error) {
            console.error('Failed to toggle reminder:', error);
            toast({
                title: 'Error',
                description: 'Failed to update reminder',
                variant: 'destructive'
            });
        }
    };

    const handleDelete = async () => {
        if (!reminderToDelete) return;
        
        try {
            await deleteReminder(reminderToDelete);
            setReminders(prev => prev.filter(r => r.id !== reminderToDelete));
            toast({
                title: 'Reminder Deleted',
                description: 'The reminder has been removed'
            });
        } catch (error) {
            console.error('Failed to delete reminder:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete reminder',
                variant: 'destructive'
            });
        } finally {
            setDeleteDialogOpen(false);
            setReminderToDelete(null);
        }
    };

    const handleEdit = (reminder: Reminder) => {
        setEditingReminder(reminder);
        setDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditingReminder(undefined);
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingReminder(undefined);
        loadReminders();
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Reminders
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                Reminders
                            </CardTitle>
                            <CardDescription>
                                {growName ? `Reminders for ${growName}` : 'Manage your grow reminders'}
                            </CardDescription>
                        </div>
                        <Button size="sm" onClick={handleAddNew}>
                            <Plus className="mr-1 h-4 w-4" />
                            Add Reminder
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {reminders.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <Bell className="mx-auto mb-4 h-12 w-12 opacity-30" />
                            <p>No reminders yet</p>
                            <p className="text-sm">Create reminders to stay on top of your grow</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reminders.map((reminder) => (
                                <div
                                    key={reminder.id}
                                    className={`flex flex-col gap-3 rounded-[1rem] border border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between ${
                                        reminder.enabled ? 'bg-white/[0.045]' : 'bg-white/[0.035] opacity-70'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-[0.95rem] border border-white/10 bg-white/[0.045] p-2">
                                            {typeIcons[reminder.type]}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-foreground">{reminder.title}</div>
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-xs">
                                                    {typeLabels[reminder.type]}
                                                </span>
                                                {reminder.intervalDays > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Every {reminder.intervalDays}d
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                        {reminder.enabled && (
                                            <span className={getReminderDueBadgeClass(reminder.nextDue)}>
                                                {formatReminderDueStatus(reminder.nextDue)}
                                            </span>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggleEnabled(reminder)}
                                            title={reminder.enabled ? 'Disable' : 'Enable'}
                                        >
                                            {reminder.enabled ? (
                                                <ToggleRight className="h-4 w-4 text-primary" />
                                            ) : (
                                                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(reminder)}
                                        >
                                            <Clock className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setReminderToDelete(reminder.id);
                                                setDeleteDialogOpen(true);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ReminderDialog
                open={dialogOpen}
                onClose={handleDialogClose}
                growId={growId}
                reminder={editingReminder}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The reminder will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
