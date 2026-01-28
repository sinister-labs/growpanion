'use client';

import { useState, useEffect } from 'react';
import { Droplets, Leaf, Camera, Scissors, Bell } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Reminder, ReminderType, saveReminder, generateId } from '@/lib/db';
import { REMINDER_PRESETS, calculateNextDue } from '@/lib/notification-utils';

const typeOptions: { value: ReminderType; label: string; icon: React.ReactNode }[] = [
    { value: 'watering', label: 'Watering', icon: <Droplets className="h-4 w-4 text-blue-500" /> },
    { value: 'feeding', label: 'Feeding', icon: <Leaf className="h-4 w-4 text-green-500" /> },
    { value: 'photo', label: 'Photo', icon: <Camera className="h-4 w-4 text-purple-500" /> },
    { value: 'training', label: 'Training', icon: <Scissors className="h-4 w-4 text-orange-500" /> },
    { value: 'custom', label: 'Custom', icon: <Bell className="h-4 w-4 text-gray-500" /> },
];

interface ReminderDialogProps {
    open: boolean;
    onClose: () => void;
    growId: string;
    reminder?: Reminder;
}

export function ReminderDialog({ open, onClose, growId, reminder }: ReminderDialogProps) {
    const { toast } = useToast();
    const [type, setType] = useState<ReminderType>('watering');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [intervalDays, setIntervalDays] = useState('2');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditing = !!reminder;

    useEffect(() => {
        if (reminder) {
            setType(reminder.type);
            setTitle(reminder.title);
            setDescription(reminder.description || '');
            setIntervalDays(reminder.intervalDays.toString());
        } else {
            // Reset to defaults for new reminder
            setType('watering');
            setTitle('');
            setDescription('');
            setIntervalDays('2');
        }
    }, [reminder, open]);

    // Apply preset when type changes (only for new reminders)
    useEffect(() => {
        if (!isEditing && type !== 'custom') {
            const preset = REMINDER_PRESETS[type as keyof typeof REMINDER_PRESETS];
            if (preset) {
                setTitle(preset.title);
                setDescription(preset.description);
                setIntervalDays(preset.intervalDays.toString());
            }
        }
    }, [type, isEditing]);

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast({
                title: 'Title Required',
                description: 'Please enter a title for the reminder',
                variant: 'destructive'
            });
            return;
        }

        const interval = parseInt(intervalDays, 10);
        if (isNaN(interval) || interval < 0) {
            toast({
                title: 'Invalid Interval',
                description: 'Please enter a valid interval (0 or more days)',
                variant: 'destructive'
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const now = new Date().toISOString();
            const reminderData: Reminder = {
                id: reminder?.id || generateId(),
                growId,
                plantId: reminder?.plantId,
                type,
                title: title.trim(),
                description: description.trim() || undefined,
                intervalDays: interval,
                lastTriggered: reminder?.lastTriggered,
                nextDue: reminder?.nextDue || calculateNextDue(interval),
                enabled: reminder?.enabled ?? true,
                createdAt: reminder?.createdAt || now,
                updatedAt: now
            };

            await saveReminder(reminderData);
            
            toast({
                title: isEditing ? 'Reminder Updated' : 'Reminder Created',
                description: `"${title}" has been ${isEditing ? 'updated' : 'scheduled'}`
            });
            
            onClose();
        } catch (error) {
            console.error('Failed to save reminder:', error);
            toast({
                title: 'Error',
                description: 'Failed to save reminder',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Reminder' : 'Create Reminder'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing 
                            ? 'Update your reminder settings'
                            : 'Set up a recurring reminder for your grow'
                        }
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    {/* Type Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as ReminderType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {typeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            {option.icon}
                                            {option.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Water your plants"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Additional details..."
                            rows={2}
                        />
                    </div>

                    {/* Interval */}
                    <div className="space-y-2">
                        <Label htmlFor="interval">Repeat Every (days)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="interval"
                                type="number"
                                min="0"
                                value={intervalDays}
                                onChange={(e) => setIntervalDays(e.target.value)}
                                className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">
                                {intervalDays === '0' ? '(one-time)' : 'days'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Set to 0 for a one-time reminder
                        </p>
                    </div>

                    {/* Quick Presets */}
                    {!isEditing && (
                        <div className="space-y-2">
                            <Label>Quick Presets</Label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIntervalDays('1')}
                                    className={intervalDays === '1' ? 'border-primary' : ''}
                                >
                                    Daily
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIntervalDays('2')}
                                    className={intervalDays === '2' ? 'border-primary' : ''}
                                >
                                    Every 2 days
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIntervalDays('7')}
                                    className={intervalDays === '7' ? 'border-primary' : ''}
                                >
                                    Weekly
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
