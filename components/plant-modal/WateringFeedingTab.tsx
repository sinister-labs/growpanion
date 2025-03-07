"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { WateringFeedingTabProps } from './types';
import { NoRecordsIndicator } from './shared-components';
import { Droplets, Trash2 } from 'lucide-react';
import { CustomDropdown, DropdownOption } from '@/components/ui/custom-dropdown';

const WateringFeedingTab: React.FC<WateringFeedingTabProps> = ({
    localPlant,
    newWatering,
    setNewWatering,
    handleWateringAdd,
    handleWateringDelete,
    availableMixes
}) => {
    const handleWateringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewWatering({
            ...newWatering,
            [e.target.name]: e.target.value
        });
    };

    const handleMixChange = (value: string) => {
        setNewWatering({
            ...newWatering,
            mixId: value
        });
    };

    // Create dropdown options from available mixes
    const mixOptions: DropdownOption[] = availableMixes.map(mix => ({
        id: mix.id,
        label: mix.name,
        description: mix.fertilizers?.length
            ? `${mix.fertilizers.length} fertilizers`
            : 'No fertilizers'
    }));

    return (
        <div className="flex flex-col h-full">
            {/* Fixed input section */}
            <div className="flex-none mb-6">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Add Watering</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-white">Date</Label>
                        <Input
                            type="date"
                            name="date"
                            value={newWatering.date}
                            onChange={handleWateringChange}
                            className="bg-gray-800 border-gray-700 text-white"
                        />
                    </div>
                    <div>
                        <Label className="text-white">Amount (ml)</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                name="amount"
                                value={newWatering.amount}
                                onChange={handleWateringChange}
                                className="bg-gray-800 border-gray-700 text-white pr-8"
                            />
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 pointer-events-none border-l-2 pl-2 border-gray-700 bg-gray-700">
                                ml
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <Label className="text-white">Fertilizer Mix (optional)</Label>
                    <CustomDropdown
                        options={mixOptions}
                        value={newWatering.mixId || ''}
                        onChange={handleMixChange}
                        placeholder="Mix auswählen"
                        width="w-full"
                        buttonClassName="bg-gray-800 border-gray-700 focus:ring-green-500 focus:border-green-500"
                    />
                </div>

                <Button
                    onClick={handleWateringAdd}
                    className="bg-green-600 hover:bg-green-700 w-full"
                >
                    Add Watering
                </Button>
            </div>

            {/* Scrollable history section */}
            <div className="flex-grow overflow-y-auto">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Watering History</h3>

                {localPlant.waterings && localPlant.waterings.length > 0 ? (
                    <ul className="space-y-2 w-full">
                        {localPlant.waterings.map((watering, index) => (
                            <li
                                key={index}
                                className="flex flex-col bg-gray-800 p-3 rounded-lg border border-gray-700 w-full"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-white">{new Date(watering.date).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-green-600 text-white px-2 py-1 rounded-md text-sm">
                                            {watering.amount} ml
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-300 hover:bg-red-950/30"
                                            onClick={() => handleWateringDelete(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {watering.mixId && (
                                    <div className="mt-2 pl-2 border-l-2 border-gray-700">
                                        <div className="border-green-600 text-green-400 px-2 py-1 rounded-md border text-sm inline-block">
                                            {availableMixes.find(mix => mix.id === watering.mixId)?.name}
                                        </div>

                                        <div className="mt-2 text-sm text-gray-400">
                                            {(() => {
                                                const mix = availableMixes.find(mix => mix.id === watering.mixId);
                                                return mix && mix.fertilizers && mix.fertilizers.length > 0 ? (
                                                    <>
                                                        {mix.fertilizers.map((fert, i) => (
                                                            <div key={i} className="flex justify-between items-center py-1">
                                                                <span>{fert.name} <span className="text-xs">({fert.amount} ml / {mix.waterAmount} ml)</span></span>
                                                                <span className="text-green-400">{parseFloat(fert.amount) / parseFloat(mix.waterAmount) * parseFloat(watering.amount)} ml</span>
                                                            </div>
                                                        ))}
                                                    </>
                                                ) : null;
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <NoRecordsIndicator
                        icon={Droplets}
                        text="No watering records"
                    />
                )}
            </div>
        </div>
    );
};

export default WateringFeedingTab; 