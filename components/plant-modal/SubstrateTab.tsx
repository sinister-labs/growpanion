"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SubstrateTabProps } from './types';
import { NoRecordsIndicator } from './shared-components';
import { Flower, Trash2 } from 'lucide-react';

const SubstrateTab: React.FC<SubstrateTabProps> = ({
    localPlant,
    newSubstrate,
    setNewSubstrate,
    handleSubstrateAdd,
    handleSubstrateDelete
}) => {
    const getRecordTime = (date: string) => {
        const time = new Date(date).getTime();
        return Number.isFinite(time) ? time : 0;
    };

    const formatRecordDate = (date: string) => {
        const recordDate = new Date(date);
        return Number.isFinite(recordDate.getTime()) ? recordDate.toLocaleDateString() : 'Unknown date';
    };

    // Handler for input changes
    const handleSubstrateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewSubstrate({
            ...newSubstrate,
            [name]: value
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Fixed input section */}
            <div className="flex-none mb-6">
                <h3 className="text-xl font-semibold text-primary mb-4">Add Substrate</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-foreground">Date</Label>
                        <Input
                            id="substrate-date"
                            name="date"
                            type="date"
                            value={newSubstrate.date}
                            onChange={handleSubstrateChange}
                        />
                    </div>
                    <div>
                        <Label className="text-foreground">Substrate Type</Label>
                        <Input
                            id="substrate-type"
                            name="substrateType"
                            type="text"
                            value={newSubstrate.substrateType}
                            onChange={handleSubstrateChange}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-foreground">Pot Size</Label>
                        <div className="relative">
                            <Input
                                id="pot-size"
                                name="potSize"
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={newSubstrate.potSize}
                                onChange={handleSubstrateChange}
                                className="pr-8"
                            />
                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground pointer-events-none border-l border-white/10 bg-white/[0.045] pl-2 rounded-r-full">
                                L
                            </span>
                        </div>
                    </div>
                    <div>
                        <Label className="text-foreground">Notes (optional)</Label>
                        <Input
                            id="substrate-notes"
                            name="notes"
                            type="text"
                            placeholder="Additional information…"
                            value={newSubstrate.notes || ''}
                            onChange={handleSubstrateChange}
                        />
                    </div>
                </div>

                <Button
                    onClick={handleSubstrateAdd}
                    className="bg-primary hover:bg-primary/90 w-full"
                >
                    Add Substrate Record
                </Button>
            </div>

            {/* Scrollable history section */}
            <div className="flex-grow overflow-y-auto">
                <h3 className="text-xl font-semibold text-primary mb-4">Substrate History</h3>
                {localPlant.substrateRecords && localPlant.substrateRecords.length > 0 ? (
                    <div className="space-y-2">
                        {localPlant.substrateRecords
                            .map((record, originalIndex) => ({ record, originalIndex }))
                            .sort((a, b) => getRecordTime(b.record.date) - getRecordTime(a.record.date))
                            .map(({ record, originalIndex }, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                    className="rounded-[1rem] border border-white/10 bg-white/[0.045] p-3 shadow-sm"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {formatRecordDate(record.date)}
                                            </p>
                                            <div className="mt-1 border-l border-white/10 pl-2">
                                                <p className="text-sm flex gap-2 py-1">
                                                    <span className="text-muted-foreground">Substrate:</span>
                                                    <span className="text-foreground">{record.substrateType}</span>
                                                </p>
                                                {record.notes && (
                                                    <div className="mt-1 text-sm">
                                                        <span className="block text-muted-foreground">Notes:</span>
                                                        <span className="text-muted-foreground">{record.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="rounded-full bg-primary px-2 py-1 text-sm text-primary-foreground">
                                                {record.potSize}L
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Delete substrate record"
                                                className="h-9 w-9 rounded-[0.85rem] text-destructive hover:bg-red-500/10 hover:text-red-200"
                                                onClick={() => handleSubstrateDelete(originalIndex)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                    </div>
                ) : (
                    <NoRecordsIndicator
                        icon={Flower}
                        text="No substrate records"
                    />
                )}
            </div>
        </div>
    );
};

export default SubstrateTab;
