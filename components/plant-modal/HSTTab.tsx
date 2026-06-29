"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TrainingTabProps } from './types';
import { NoRecordsIndicator } from './shared-components';
import { Scissors, Trash2 } from 'lucide-react';
import { CustomDropdown, DropdownOption } from '@/components/ui/custom-dropdown';

// Predefined HST Methods
const HST_METHODS = [
    { id: "topping", name: "Topping" },
    { id: "fiming", name: "FIMing" },
    { id: "mainlining", name: "Mainlining" },
    { id: "manifolding", name: "Manifolding" },
    { id: "schwazzing", name: "Schwazzing" },
    { id: "super_cropping", name: "Super Cropping" }
];

const HSTTab: React.FC<TrainingTabProps> = ({
    localPlant,
    newTraining: newHST,
    setNewTraining: setNewHST,
    handleTrainingAdd: handleHSTAdd,
    handleTrainingDelete: handleHSTDelete
}) => {
    const formatRecordDate = (date: string) => {
        const recordDate = new Date(date);
        return Number.isFinite(recordDate.getTime()) ? recordDate.toLocaleDateString() : 'Unknown date';
    };

    const handleHSTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewHST({
            ...newHST,
            [e.target.name]: e.target.value
        });
    };

    const handleMethodChange = (value: string) => {
        setNewHST({
            ...newHST,
            method: value
        });
    };

    // Dropdown options for HST methods
    const methodOptions: DropdownOption[] = HST_METHODS.map(method => ({
        id: method.name,
        label: method.name,
        description: getMethodDescription(method.id)
    }));

    // Helper function for descriptions
    function getMethodDescription(methodId: string): string {
        switch (methodId) {
            case "topping": return "Removal of the main stem tip";
            case "fiming": return "Fuck I Missed - similar to Topping";
            case "mainlining": return "Symmetrical branching";
            case "manifolding": return "Multiple main stems";
            case "schwazzing": return "Strong defoliation";
            case "super_cropping": return "Controlled pruning";
            default: return "";
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Fixed input section */}
            <div className="flex-none mb-6">
                <h3 className="text-xl font-semibold text-primary mb-4">Add HST</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-foreground">Date</Label>
                        <Input
                            type="date"
                            name="date"
                            value={newHST.date}
                            onChange={handleHSTChange}
                        />
                    </div>
                    <div>
                        <Label className="text-foreground">Method</Label>
                        <CustomDropdown
                            options={methodOptions}
                            value={newHST.method}
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
                        value={newHST.notes || ''}
                        onChange={handleHSTChange}
                        placeholder="Additional details about training…"
                    />
                </div>

                <Button
                    onClick={handleHSTAdd}
                    className="bg-primary hover:bg-primary/90 w-full"
                >
                    Add HST Record
                </Button>
            </div>

            {/* Scrollable history section */}
            <div className="flex-grow overflow-y-auto">
                <h3 className="text-xl font-semibold text-primary mb-4">HST History</h3>

                {localPlant.hstRecords && localPlant.hstRecords.length > 0 ? (
                    <ul className="space-y-2 w-full">
                        {localPlant.hstRecords.map((record, index) => (
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
                                            aria-label="Delete HST record"
                                            className="h-9 w-9 rounded-[0.85rem] text-destructive hover:bg-red-500/10 hover:text-red-200"
                                            onClick={() => handleHSTDelete(index)}
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
                        icon={Scissors}
                        text="No HST records"
                    />
                )}
            </div>
        </div>
    );
};

export default HSTTab;
