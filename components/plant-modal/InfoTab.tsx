"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plant, TabComponentProps } from './types';
import { CustomDropdown, DropdownOption } from '@/components/ui/custom-dropdown';
import { StrainLibrary } from '@/components/strain-library';
import {
    getAllGenetics,
    getAllGeneticsOverrides,
    populateDBWithDemoDataIfEmpty,
    type Genetics,
    type Strain
} from '@/lib/db';
import { Cannabis } from 'lucide-react';
import { applyGeneticsOverrides, mergeDefaultGenetics } from '@/lib/genetics-registry';

const InfoTab: React.FC<TabComponentProps> = ({ localPlant, setLocalPlant }) => {
    const [isStrainSelectorOpen, setIsStrainSelectorOpen] = useState(false);
    const [genetics, setGenetics] = useState<Genetics[]>([]);
    const geneticsOptions: DropdownOption[] = useMemo(() => genetics.map(entry => ({
        id: entry.id,
        label: entry.name,
        description: entry.breeder || 'Unknown breeder',
    })), [genetics]);

    useEffect(() => {
        let cancelled = false;

        async function loadGenetics() {
            try {
                await populateDBWithDemoDataIfEmpty();
                const [storedGenetics, storedOverrides] = await Promise.all([
                    getAllGenetics(),
                    getAllGeneticsOverrides(),
                ]);
                const data = applyGeneticsOverrides(mergeDefaultGenetics(storedGenetics), storedOverrides);
                if (!cancelled) setGenetics(data);
            } catch {
                if (!cancelled) setGenetics([]);
            }
        }

        void loadGenetics();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalPlant({ ...localPlant, [e.target.name]: e.target.value });
    };

    const handleStrainSelect = (strain: Strain) => {
        setLocalPlant((currentPlant) => ({
            ...currentPlant,
            genetic: strain.name,
            manufacturer: strain.breeder,
        }));
        setIsStrainSelectorOpen(false);
    };

    const handleGeneticsSelect = (geneticsId: string) => {
        const selected = genetics.find(entry => entry.id === geneticsId);
        if (!selected) return;

        setLocalPlant((currentPlant) => ({
            ...currentPlant,
            geneticsId: selected.id,
            phenotypeId: currentPlant.geneticsId === selected.id ? currentPlant.phenotypeId : undefined,
            genetic: selected.name,
            manufacturer: selected.breeder || 'Unknown breeder',
            label: currentPlant.label || 'Phenotype A',
        }));
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
                <Label className="text-foreground">
                    Name
                </Label>
                <Input
                    id="name"
                    name="name"
                    value={localPlant.name || ''}
                    onChange={handleInputChange}
                />
            </div>
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsStrainSelectorOpen(true)}
                    className="border-primary/35 text-primary hover:bg-primary/10"
                >
                    <Cannabis className="h-4 w-4 mr-2" />
                    Select Strain
                </Button>
            </div>
            <div className="mb-4">
                <Label className="text-foreground">
                    Genetics Registry
                </Label>
                <CustomDropdown
                    options={geneticsOptions}
                    value={localPlant.geneticsId || ''}
                    onChange={handleGeneticsSelect}
                    placeholder="Select registry genetics…"
                    width="w-full"
                    buttonClassName="border-white/10 bg-white/[0.045] text-foreground"
                    disabled={geneticsOptions.length === 0}
                />
                {localPlant.phenotypeId && (
                    <p className="mt-2 text-xs text-muted-foreground">Phenotype ID: {localPlant.phenotypeId}</p>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <Label className="text-foreground">
                        Genetic
                    </Label>
                    <Input
                        id="genetic"
                        name="genetic"
                        value={localPlant.genetic || ''}
                        onChange={handleInputChange}
                    />
                </div>
                <div>
                    <Label className="text-foreground">
                        Manufacturer
                    </Label>
                    <Input
                        id="manufacturer"
                        name="manufacturer"
                        value={localPlant.manufacturer || ''}
                        onChange={handleInputChange}
                    />
                </div>
                <div>
                    <Label className="text-foreground">
                        Type
                    </Label>
                    <CustomDropdown
                        options={typeOptions}
                        value={localPlant.type || ''}
                        onChange={(value) => setLocalPlant({ ...localPlant, type: value as "regular" | "autoflowering" | "feminized" })}
                        placeholder="Select type…"
                        width="w-full"
                        buttonClassName="border-white/10 bg-white/[0.045] text-foreground"
                    />
                </div>
                <div>
                    <Label className="text-foreground">
                        Propagation Method
                    </Label>
                    <CustomDropdown
                        options={propagationOptions}
                        value={localPlant.propagationMethod || ''}
                        onChange={(value) => setLocalPlant({ ...localPlant, propagationMethod: value as "clone" | "seed" })}
                        placeholder="Select propagation…"
                        width="w-full"
                        buttonClassName="border-white/10 bg-white/[0.045] text-foreground"
                    />
                </div>
                <div>
                    <Label className="text-foreground">
                        Label
                    </Label>
                    <Input
                        id="label"
                        name="label"
                        value={localPlant.label || ''}
                        onChange={handleInputChange}
                    />
                </div>
                <div>
                    <Label className="text-foreground">
                        Current Phase
                    </Label>
                    <CustomDropdown
                        options={[
                            { id: 'Seedling', label: 'Seedling' },
                            { id: 'Vegetative', label: 'Vegetative' },
                            { id: 'Flowering', label: 'Flowering' },
                            { id: 'Flushing', label: 'Flushing' },
                            { id: 'Drying', label: 'Drying' },
                            { id: 'Curing', label: 'Curing' },
                            { id: 'Done', label: 'Done' },
                        ]}
                        value={localPlant.currentPhase || ''}
                        onChange={(value) => setLocalPlant({ ...localPlant, currentPhase: value as Plant['currentPhase'] })}
                        placeholder="Select phase…"
                        width="w-full"
                        buttonClassName="border-white/10 bg-white/[0.045] text-foreground"
                    />
                </div>
                <div>
                    <Label className="text-foreground">
                        Location
                    </Label>
                    <Input
                        id="location"
                        name="location"
                        value={localPlant.location || ''}
                        onChange={handleInputChange}
                    />
                </div>
                <div>
                    <Label className="text-foreground">
                        Tent
                    </Label>
                    <Input
                        id="tent"
                        name="tent"
                        value={localPlant.tent || ''}
                        onChange={handleInputChange}
                    />
                </div>

            </div>
            <div className="mb-4">
                <Label className="text-foreground">
                    Yield
                </Label>
                <div className="relative">
                    <Input
                        id="yield"
                        name="yield"
                        type="number"
                        value={localPlant.yield || ''}
                        onChange={handleInputChange}
                        className="border-white/10 bg-white/[0.045] text-foreground"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground pointer-events-none border-l border-white/10 bg-white/[0.045] pl-2 rounded-r-full">
                        g
                    </span>
                </div>
            </div>
            <Dialog open={isStrainSelectorOpen} onOpenChange={setIsStrainSelectorOpen}>
                <DialogContent className="infotainment-overlay max-h-[85vh] max-w-5xl overflow-y-auto border-white/10 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-primary">Select Strain</DialogTitle>
                    </DialogHeader>
                    <StrainLibrary selectionMode onSelectStrain={handleStrainSelect} />
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};

export default InfoTab;
