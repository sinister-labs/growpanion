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
                <h3 className="text-xl font-semibold text-green-400 mb-4">Add Substrate</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-white">Date</Label>
                        <Input
                            id="substrate-date"
                            name="date"
                            type="date"
                            value={newSubstrate.date}
                            onChange={handleSubstrateChange}
                        />
                    </div>
                    <div>
                        <Label className="text-white">Substrate Type</Label>
                        <Input
                            id="substrate-type"
                            name="substrateType"
                            type="text"
                            value={newSubstrate.substrateType}
                            onChange={handleSubstrateChange}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label className="text-white">Pot Size</Label>
                        <div className="relative">
                            <Input
                                id="pot-size"
                                name="potSize"
                                type="  "
                                value={newSubstrate.potSize}
                                onChange={handleSubstrateChange}
                                className="pr-8"
                            />
                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 pointer-events-none border-l-2 pl-2 border-gray-700 bg-gray-700 rounded-r-full">
                                L
                            </span>
                        </div>
                    </div>
                    <div>
                        <Label className="text-white">Notes (optional)</Label>
                        <Input
                            id="substrate-notes"
                            name="notes"
                            type="text"
                            placeholder="Additional information"
                            value={newSubstrate.notes || ''}
                            onChange={handleSubstrateChange}
                        />
                    </div>
                </div>

                <Button
                    onClick={handleSubstrateAdd}
                    className="bg-green-600 hover:bg-green-700 w-full"
                >
                    Add Substrate Record
                </Button>
            </div>

            {/* Scrollable history section */}
            <div className="flex-grow overflow-y-auto">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Substrate History</h3>
                {localPlant.substrateRecords && localPlant.substrateRecords.length > 0 ? (
                    <div className="space-y-2">
                        {[...localPlant.substrateRecords]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((record, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.1 }}
                                    className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-white">
                                                {new Date(record.date).toLocaleDateString()}
                                            </p>
                                            <div className="mt-1 pl-2 border-l-2 border-gray-700">
                                                <p className="text-sm flex gap-2 py-1">
                                                    <span className="text-gray-400">Substrate:</span>
                                                    <span className="text-white">{record.substrateType}</span>
                                                </p>
                                                {record.notes && (
                                                    <div className="mt-1 text-sm">
                                                        <span className="block text-gray-500">Notes:</span>
                                                        <span className="text-gray-400">{record.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="bg-green-600 text-white px-2 py-1 rounded-md text-sm">
                                                {record.potSize}L
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-300 hover:bg-red-950/30"
                                                onClick={() => handleSubstrateDelete(index)}
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