"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { WateringFeedingTabProps } from './types';
import { NoRecordsIndicator } from './shared-components';
import { Droplets, Trash2, ArrowRight } from 'lucide-react';
import { CustomDropdown, DropdownOption } from '@/components/ui/custom-dropdown';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { calculateFertilizerAmount, formatDosePerLiter } from '@/lib/feeding-utils';

const WateringFeedingTab: React.FC<WateringFeedingTabProps> = ({
    localPlant,
    newWatering,
    setNewWatering,
    handleWateringAdd,
    handleWateringDelete,
    availableMixes,
    onManageFertilizerMixes
}) => {
    const formatRecordDate = (date: string) => {
        const recordDate = new Date(date);
        return Number.isFinite(recordDate.getTime()) ? recordDate.toLocaleDateString() : 'Unknown date';
    };

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
                <h3 className="text-xl font-semibold text-primary mb-4">Add Watering</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-foreground">Date</Label>
                        <Input
                            type="date"
                            name="date"
                            value={newWatering.date}
                            onChange={handleWateringChange}
                        />
                    </div>
                    <div>
                        <Label className="text-foreground">Amount (ml)</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                name="amount"
                                min="1"
                                step="1"
                                value={newWatering.amount}
                                onChange={handleWateringChange}
                                className="pr-8"
                            />
                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground pointer-events-none border-l border-white/10 bg-white/[0.045] pl-2 rounded-r-full">
                                ml
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <Label className="text-foreground">Fertilizer Mix (optional)</Label>
                    <CustomDropdown
                        options={mixOptions}
                        value={newWatering.mixId || ''}
                        onChange={handleMixChange}
                        placeholder={mixOptions.length === 0 ? "No fertilizer mixes available" : "Select mix…"}
                        width="w-full"
                        buttonClassName={`border-white/10 bg-white/[0.045] focus:ring-ring focus:border-ring ${mixOptions.length === 0 ? 'opacity-70' : ''}`}
                        renderFooter={onManageFertilizerMixes ? () => (
                            <DropdownMenuItem
                                className="py-2 cursor-pointer text-foreground hover:text-foreground"
                                onClick={onManageFertilizerMixes}
                            >
                                {mixOptions.length === 0 ? "Create fertilizer mixes" : "Manage fertilizer mixes"}
                                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                            </DropdownMenuItem>
                        ) : undefined}
                    />
                </div>

                <Button
                    onClick={handleWateringAdd}
                    className="bg-primary hover:bg-primary/90 w-full"
                >
                    Add Watering
                </Button>
            </div>

            {/* Scrollable history section */}
            <div className="flex-grow overflow-y-auto">
                <h3 className="text-xl font-semibold text-primary mb-4">Watering History</h3>

                {localPlant.waterings && localPlant.waterings.length > 0 ? (
                    <ul className="space-y-2 w-full">
                        {localPlant.waterings.map((watering, index) => (
                            <li
                                key={index}
                                className="flex w-full flex-col rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 shadow-sm"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-foreground">{formatRecordDate(watering.date)}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-full bg-primary px-2 py-1 text-sm text-primary-foreground">
                                            {watering.amount} ml
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Delete watering record"
                                            className="h-9 w-9 rounded-[0.85rem] text-destructive hover:bg-red-500/10 hover:text-red-200"
                                            onClick={() => handleWateringDelete(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {watering.mixId && (
                                    <div className="mt-2 border-l border-white/10 pl-2">
                                        <div className="border-primary/40 text-primary px-2 py-1 rounded-2xl border text-sm inline-block">
                                            {availableMixes.find(mix => mix.id === watering.mixId)?.name || 'Unavailable fertilizer mix'}
                                        </div>

                                        <div className="mt-2 text-sm text-muted-foreground">
                                            {(() => {
                                                const mix = availableMixes.find(mix => mix.id === watering.mixId);
                                                return mix && mix.fertilizers && mix.fertilizers.length > 0 ? (
                                                    <>
                                                        {mix.fertilizers.map((fert, i) => (
                                                            (() => {
                                                                const calculatedAmount = calculateFertilizerAmount(fert.amount, mix.waterAmount, watering.amount);

                                                                return (
                                                                    <div key={i} className="flex justify-between items-center py-1">
                                                                        <span>{fert.name} <span className="text-xs">({formatDosePerLiter(fert.amount, mix.waterAmount)})</span></span>
                                                                        <span className="text-primary">{calculatedAmount ? `${calculatedAmount} ml` : 'n/a'}</span>
                                                                    </div>
                                                                );
                                                            })()
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
