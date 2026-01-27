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
                <h3 className="text-xl font-semibold text-green-400 mb-4">Add LST</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-white">Date</Label>
                        <Input
                            type="date"
                            name="date"
                            value={newLST.date}
                            onChange={handleLSTChange}
                        />
                    </div>
                    <div>
                        <Label className="text-white">Method</Label>
                        <CustomDropdown
                            options={methodOptions}
                            value={newLST.method}
                            onChange={handleMethodChange}
                            placeholder="Methode auswählen"
                            width="w-full"
                            buttonClassName="bg-gray-800 border-gray-700 text-white focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <Label className="text-white">Notes (optional)</Label>
                    <Input
                        type="text"
                        name="notes"
                        value={newLST.notes || ''}
                        onChange={handleLSTChange}
                        placeholder="Additional details about training"
                    />
                </div>

                <Button
                    onClick={handleLSTAdd}
                    className="bg-green-600 hover:bg-green-700 w-full"
                >
                    Add LST Record
                </Button>
            </div>

            {/* Scrollable history section */}
            <div className="flex-grow overflow-y-auto">
                <h3 className="text-xl font-semibold text-green-400 mb-4">LST History</h3>

                {localPlant.lstRecords && localPlant.lstRecords.length > 0 ? (
                    <ul className="space-y-2 w-full">
                        {localPlant.lstRecords.map((record, index) => (
                            <li
                                key={index}
                                className="flex flex-col bg-gray-800 p-3 rounded-lg border border-gray-700 w-full"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-white">{new Date(record.date).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-green-600 text-white px-2 py-1 rounded-md text-sm">
                                            {record.method}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-300 hover:bg-red-950/30"
                                            onClick={() => handleLSTDelete(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                {record.notes && (
                                    <div className="mt-2 pl-2 border-l-2 border-gray-700">
                                        <div className="mt-1 text-sm text-gray-400">
                                            <span className="block text-gray-500">Notes:</span>
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