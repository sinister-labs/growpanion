"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TabComponentProps } from './types';
import { CustomDropdown, DropdownOption } from '@/components/ui/custom-dropdown';

const InfoTab: React.FC<TabComponentProps> = ({ localPlant, setLocalPlant }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalPlant({ ...localPlant, [e.target.name]: e.target.value });
    };

    // Dropdown options for plant type
    const typeOptions: DropdownOption[] = [
        { id: "regular", label: "Regular" },
        { id: "autoflowering", label: "Autoflowering" },
        { id: "feminized", label: "Feminized" }
    ];

    // Dropdown options for propagation method
    const propagationOptions: DropdownOption[] = [
        { id: "clone", label: "Clone" },
        { id: "seed", label: "Seed" }
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >

            <div className="mb-4">
                <Label className="text-white">
                    Name
                </Label>
                <Input
                    id="name"
                    name="name"
                    value={localPlant.name || ''}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-700 text-white"
                />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <Label className="text-white">
                        Genetic
                    </Label>
                    <Input
                        id="genetic"
                        name="genetic"
                        value={localPlant.genetic || ''}
                        onChange={handleInputChange}
                        className="bg-gray-800 border-gray-700 text-white"
                    />
                </div>
                <div>
                    <Label className="text-white">
                        Manufacturer
                    </Label>
                    <Input
                        id="manufacturer"
                        name="manufacturer"
                        value={localPlant.manufacturer || ''}
                        onChange={handleInputChange}
                        className="bg-gray-800 border-gray-700 text-white"
                    />
                </div>
                <div>
                    <Label className="text-white">
                        Type
                    </Label>
                    <CustomDropdown
                        options={typeOptions}
                        value={localPlant.type || ''}
                        onChange={(value) => setLocalPlant({ ...localPlant, type: value as "regular" | "autoflowering" | "feminized" })}
                        placeholder="Typ auswählen"
                        width="w-full"
                        buttonClassName="bg-gray-800 border-gray-700 text-white"
                    />
                </div>
                <div>
                    <Label className="text-white">
                        Propagation Method
                    </Label>
                    <CustomDropdown
                        options={propagationOptions}
                        value={localPlant.propagationMethod || ''}
                        onChange={(value) => setLocalPlant({ ...localPlant, propagationMethod: value as "clone" | "seed" })}
                        placeholder="Vermehrungsmethode auswählen"
                        width="w-full"
                        buttonClassName="bg-gray-800 border-gray-700 text-white"
                    />
                </div>

            </div>
            <div className="mb-4">
                <Label className="text-white">
                    Yield (grams)
                </Label>
                <Input
                    id="yield"
                    name="yield"
                    type="number"
                    value={localPlant.yield || ''}
                    onChange={handleInputChange}
                    className="bg-gray-800 border-gray-700 text-white"
                />
            </div>
        </motion.div>
    );
};

export default InfoTab; 