'use client';

import { useState, useEffect, useCallback } from 'react';
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
    deleteReminder
} from '@/lib/db';
import { ReminderDialog } from './ReminderDialog';

const typeIcons: Record<ReminderType, React.ReactNode> = {
    watering: <Droplets className="h-4 w-4 text-blue-500" />,
    feeding: <Leaf className="h-4 w-4 text-green-500" />,
    photo: <Camera className="h-4 w-4 text-purple-500" />,
    training: <Scissors className="h-4 w-4 text-orange-500" />,
    custom: <Bell className="h-4 w-4 text-gray-500" />
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

    const loadReminders = useCallback(async () => {
        try {
            const data = await getRemindersForGrow(growId);
            // Sort by next due date
            data.sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime());
            setReminders(data);
        } catch (error) {
            console.error('Failed to load reminders:', error);
            toast({
                title: 'Error',
                description: 'Failed to load reminders',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    }, [growId, toast]);

    useEffect(() => {
        loadReminders();
    }, [loadReminders]);

    const handleToggleEnabled = async (reminder: Reminder) => {
        try {
            const updated = { ...reminder, enabled: !reminder.enabled };
            await saveReminder(updated);
            setReminders(prev => prev.map(r => r.id === reminder.id ? updated : r));
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

    const formatNextDue = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffMs < 0) {
            return 'Overdue';
        } else if (diffHours < 1) {
            return 'Due soon';
        } else if (diffHours < 24) {
            return `In ${diffHours}h`;
        } else if (diffDays === 1) {
            return 'Tomorrow';
        } else {
            return `In ${diffDays} days`;
        }
    };

    const getDueBadgeClass = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        const baseClass = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';
        if (diffMs < 0) return `${baseClass} bg-red-500/20 text-red-400`;
        if (diffHours < 24) return `${baseClass} bg-green-500/20 text-green-400`;
        return `${baseClass} bg-gray-500/20 text-gray-400`;
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
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Reminders
                            </CardTitle>
                            <CardDescription>
                                {growName ? `Reminders for ${growName}` : 'Manage your grow reminders'}
                            </CardDescription>
                        </div>
                        <Button size="sm" onClick={handleAddNew}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Reminder
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {reminders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No reminders yet</p>
                            <p className="text-sm">Create reminders to stay on top of your grow</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reminders.map((reminder) => (
                                <div
                                    key={reminder.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${
                                        reminder.enabled ? 'bg-card' : 'bg-muted/50 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {typeIcons[reminder.type]}
                                        <div>
                                            <div className="font-medium">{reminder.title}</div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <span className="inline-flex items-center rounded-full border border-gray-600 px-2 py-0.5 text-xs">
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
                                    <div className="flex items-center gap-2">
                                        {reminder.enabled && (
                                            <span className={getDueBadgeClass(reminder.nextDue)}>
                                                {formatNextDue(reminder.nextDue)}
                                            </span>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggleEnabled(reminder)}
                                            title={reminder.enabled ? 'Disable' : 'Enable'}
                                        >
                                            {reminder.enabled ? (
                                                <ToggleRight className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <ToggleLeft className="h-4 w-4" />
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
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
