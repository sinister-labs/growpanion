"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TrainingTabProps } from './types';
import { NoRecordsIndicator } from './shared-components';
import { Anchor, Trash2 } from 'lucide-react';
import { CustomDropdown, DropdownOption } from '@/components/ui/custom-dropdown';

// Predefined LST Methods
const LST_METHODS = [
    { id: "bending", name: "Bending and Tying" },
    { id: "screen", name: "Screen of Green (SCROG)" },
    { id: "tie_down", name: "Tie Down" },
    { id: "90_degree", name: "90° Bending" },
    { id: "leafing", name: "Leafing" },
    { id: "defoliation", name: "Defoliation" }
];

const LSTTab: React.FC<TrainingTabProps> = ({
    localPlant,
    newTraining: newLST,
    setNewTraining: setNewLST,
    handleTrainingAdd: handleLSTAdd,
    handleTrainingDelete: handleLSTDelete
}) => {
    const formatRecordDate = (date: string) => {
        const recordDate = new Date(date);
        return Number.isFinite(recordDate.getTime()) ? recordDate.toLocaleDateString() : 'Unknown date';
    };

    const handleLSTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewLST({
            ...newLST,
            [e.target.name]: e.target.value
        });
    };

    const handleMethodChange = (value: string) => {
        setNewLST({
            ...newLST,
            method: value
        });
    };

    // Dropdown-Optionen für LST-Methoden
    const methodOptions: DropdownOption[] = LST_METHODS.map(method => ({
        id: method.name,
        label: method.name,
        description: getMethodDescription(method.id)
    }));

    // Helper function for descriptions
    function getMethodDescription(methodId: string): string {
        switch (methodId) {
            case "bending": return "Careful bending and securing";
            case "screen": return "Growth through a screen mesh";
            case "tie_down": return "Tying branches down";
            case "90_degree": return "Bending stem at 90° angle";
            case "leafing": return "Partial removal of leaves";
            case "defoliation": return "Extensive leaf removal";
            default: return "";
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Fixed input section */}
            <div className="flex-none mb-6">
                <h3 className="text-xl font-semibold text-primary mb-4">Add LST</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-foreground">Date</Label>
                        <Input
                            type="date"
                            name="date"
                            value={newLST.date}
                            onChange={handleLSTChange}
                        />
                    </div>
                    <div>
                        <Label className="text-foreground">Method</Label>
                        <CustomDropdown
                            options={methodOptions}
                            value={newLST.method}
                            onChange={handleMethodChange}
                            placeholder="Select method…"
                            width="w-full"
                            buttonClassName="border-white/10 bg-white/[0.045] text-foreground focus:ring-ring focus:border-ring"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <Label className="text-foreground">Notes (optional)</Label>
                    <Input
                        type="text"
                        name="notes"
                        value={newLST.notes || ''}
                        onChange={handleLSTChange}
                        placeholder="Additional details about training…"
                    />
                </div>

                <Button
                    onClick={handleLSTAdd}
                    className="bg-primary hover:bg-primary/90 w-full"
                >
                    Add LST Record
                </Button>
            </div>

            {/* Scrollable history section */}
            <div className="flex-grow overflow-y-auto">
                <h3 className="text-xl font-semibold text-primary mb-4">LST History</h3>

                {localPlant.lstRecords && localPlant.lstRecords.length > 0 ? (
                    <ul className="space-y-2 w-full">
                        {localPlant.lstRecords.map((record, index) => (
                            <li
                                key={index}
                                className="flex w-full flex-col rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 shadow-sm"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-foreground">{formatRecordDate(record.date)}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-full bg-primary px-2 py-1 text-sm text-primary-foreground">
                                            {record.method}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Delete LST record"
                                            className="h-9 w-9 rounded-[0.85rem] text-destructive hover:bg-red-500/10 hover:text-red-200"
                                            onClick={() => handleLSTDelete(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                {record.notes && (
                                    <div className="mt-2 border-l border-white/10 pl-2">
                                        <div className="mt-1 text-sm text-muted-foreground">
                                            <span className="block text-muted-foreground">Notes:</span>
                                            {record.notes}
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <NoRecordsIndicator
                        icon={Anchor}
                        text="No LST records"
                    />
                )}
            </div>
        </div>
    );
};

export default LSTTab;
