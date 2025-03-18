"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, Menu, Save, Check, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { getCurrentDate, getTabIcon, getTabLabel, FullscreenImage } from './shared-components';
import { Plant, TabType, PlantModalProps, WateringRecord, TrainingRecord, SubstrateRecord } from './types';
import InfoTab from './InfoTab';
import WateringFeedingTab from './WateringFeedingTab';
import HSTTab from './HSTTab';
import LSTTab from './LSTTab';
import SubstrateTab from './SubstrateTab';
import NotesTab from './NotesTab';
import ImagesTab from './ImagesTab';
import { Badge } from '../ui/badge';
import { useFertilizerMixes } from "@/hooks/useFertilizerMixes";

export function PlantModal({ plant, updatePlant, deletePlant, growId }: PlantModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("info");
    const [localPlant, setLocalPlant] = useState<Plant>(plant);
    const [isMobile, setIsMobile] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Load fertilizer mixes from the current grow
    const { mixes: availableMixes, isLoading: mixesLoading } = useFertilizerMixes(growId);

    // Initialize entries
    const [newWatering, setNewWatering] = useState<WateringRecord>({
        date: getCurrentDate(),
        amount: "",
        mixId: ""
    });

    const [newHST, setNewHST] = useState<TrainingRecord>({
        date: getCurrentDate(),
        method: "Topping"
    });

    const [newLST, setNewLST] = useState<TrainingRecord>({
        date: getCurrentDate(),
        method: "Bending and Tying"
    });

    const [newSubstrate, setNewSubstrate] = useState<SubstrateRecord>({
        date: getCurrentDate(),
        action: "potting",
        substrateType: "",
        potSize: ""
    });

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    useEffect(() => {
        setLocalPlant(plant);
    }, [plant]);

    const handleWateringAdd = () => {
        if (!newWatering.date || !newWatering.amount) return;

        setLocalPlant({
            ...localPlant,
            waterings: [
                ...(localPlant.waterings || []),
                { ...newWatering }
            ]
        });

        setNewWatering({
            date: getCurrentDate(),
            amount: "",
            mixId: ""
        });
    };

    const handleHSTAdd = () => {
        if (!newHST.date || !newHST.method) return;

        setLocalPlant({
            ...localPlant,
            hstRecords: [
                ...(localPlant.hstRecords || []),
                { ...newHST }
            ]
        });

        setNewHST({
            date: getCurrentDate(),
            method: "Topping"
        });
    };

    const handleLSTAdd = () => {
        if (!newLST.date || !newLST.method) return;

        setLocalPlant({
            ...localPlant,
            lstRecords: [
                ...(localPlant.lstRecords || []),
                { ...newLST }
            ]
        });

        setNewLST({
            date: getCurrentDate(),
            method: "Bending and Tying"
        });
    };

    const handleSubstrateAdd = () => {
        if (!newSubstrate.date || !newSubstrate.substrateType || !newSubstrate.potSize) return;

        setLocalPlant({
            ...localPlant,
            substrateRecords: [
                ...(localPlant.substrateRecords || []),
                { ...newSubstrate }
            ]
        });

        setNewSubstrate({
            date: getCurrentDate(),
            action: "potting",
            substrateType: "",
            potSize: ""
        });
    };

    const handleSave = () => {
        setIsSaving(true);
        // Save plant data and call updatePlant callback
        // The toast appears in the PlantList component through the passed callback
        updatePlant(localPlant);

        // Short animation for visual feedback directly in the component
        setTimeout(() => {
            setIsSaving(false);
        }, 1000);
    };

    // Delete functions for the different record types
    const handleWateringDelete = (index: number) => {
        setLocalPlant({
            ...localPlant,
            waterings: localPlant.waterings?.filter((_, i) => i !== index) || []
        });
    };

    const handleHSTDelete = (index: number) => {
        setLocalPlant({
            ...localPlant,
            hstRecords: localPlant.hstRecords?.filter((_, i) => i !== index) || []
        });
    };

    const handleLSTDelete = (index: number) => {
        setLocalPlant({
            ...localPlant,
            lstRecords: localPlant.lstRecords?.filter((_, i) => i !== index) || []
        });
    };

    const handleSubstrateDelete = (index: number) => {
        setLocalPlant({
            ...localPlant,
            substrateRecords: localPlant.substrateRecords?.filter((_, i) => i !== index) || []
        });
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = () => {
                setLocalPlant((prevPlant) => ({
                    ...prevPlant,
                    images: [...(prevPlant.images || []), reader.result as string],
                }));
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': []
        }
    });

    const tabs = [
        { value: "info" as TabType, label: "Info", icon: getTabIcon("info") },
        { value: "water" as TabType, label: "Watering / Feeding", icon: getTabIcon("water") },
        { value: "hst" as TabType, label: "HST", icon: getTabIcon("hst") },
        { value: "lst" as TabType, label: "LST", icon: getTabIcon("lst") },
        { value: "substrate" as TabType, label: "Substrate", icon: getTabIcon("substrate") },
        { value: "notes" as TabType, label: "Notes", icon: getTabIcon("notes") },
        { value: "images" as TabType, label: "Images", icon: getTabIcon("images") },
    ];

    // Function to open the delete dialog
    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    // Function to delete the plant
    const confirmDelete = () => {
        deletePlant(plant.id, plant.name);
    };

    // Füge den Bestätigungsdialog für das Löschen hinzu
    const DeleteConfirmDialog = () => (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent className="bg-gray-800 text-white">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Plant</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-300">
                        Are you sure you want to delete the plant "{plant.name}"?
                        <br />
                        <span className="text-red-400">This action cannot be undone.</span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-none rounded-full">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={confirmDelete}
                        className="bg-red-600 text-white hover:bg-red-700 border-none rounded-full"
                    >
                        Delete Plant
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return (
        <DialogContent className="p-0 gap-0 bg-[#1a1d24] text-white overflow-hidden max-w-full sm:max-w-4xl h-full sm:h-auto sm:rounded-xl sm:shadow-2xl flex flex-col border-gray-700">
            {isMobile ? (
                // Mobile header
                <div className="flex items-center gap-2 py-2 px-3 border-b border-gray-800">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-white"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <Menu className="h-4 w-4" />
                    </Button>
                    <h2 className="flex-1 text-sm font-medium">{localPlant.name}</h2>
                </div>
            ) : (
                // Desktop header
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center space-x-4">
                        <div className="w-24 aspect-square rounded-md overflow-hidden border-2 border-green-500">
                            <img
                                src={localPlant.images?.[0] || "/placeholder.svg"}
                                alt={localPlant.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-white">{localPlant.name}</h2>
                                <Badge className={`bg-green-400 ${localPlant.type === "regular" ? "bg-green-400" : localPlant.type === "autoflowering" ? "bg-yellow-400" : "bg-purple-400"}`}>{localPlant.type}</Badge>
                                <Badge className={`bg-green-400 ${localPlant.propagationMethod === "clone" ? "bg-green-400" : "bg-blue-400"}`}>{localPlant.propagationMethod}</Badge>
                            </div>
                            <p className="text-gray-400 text-sm">{localPlant.genetic}</p>
                            <p className="text-gray-400 text-sm">{localPlant.manufacturer}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative flex-1 overflow-hidden">
                <div className={`flex h-full ${isMobile ? "flex-col" : ""}`}>
                    {isMobile ? (
                        // Mobile menu
                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial={{ x: "-100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "-100%" }}
                                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                    className="absolute inset-0 z-20 bg-[#1a1d24] border-r border-gray-800"
                                >
                                    <ScrollArea className="h-full">
                                        <nav className="p-2">
                                            {tabs.map((item) => (
                                                <button
                                                    key={item.value}
                                                    onClick={() => {
                                                        setActiveTab(item.value);
                                                        setIsMenuOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg mb-1 transition-colors ${activeTab === item.value
                                                        ? "bg-green-600 text-white"
                                                        : "text-gray-300 hover:bg-gray-800"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.icon className="h-5 w-5" />
                                                        <span className="text-sm font-medium">{item.label}</span>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                                </button>
                                            ))}
                                            <div className="mt-4 p-2">
                                                <Button
                                                    onClick={() => {
                                                        handleDeleteClick();
                                                        setIsMenuOpen(false);
                                                    }}
                                                    variant="destructive"
                                                    className="w-full text-white bg-red-600 hover:bg-red-700 border border-red-800"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete Plant
                                                </Button>
                                            </div>
                                        </nav>
                                    </ScrollArea>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    ) : (
                        // Desktop menu
                        <div className="w-1/3 bg-gray-800 flex flex-col border-r border-gray-700">
                            <ScrollArea className="flex-1 h-[calc(100vh-16rem)] md:h-[500px]">
                                <nav className="p-2">
                                    {tabs.map((item) => (
                                        <button
                                            key={item.value}
                                            onClick={() => setActiveTab(item.value)}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg mb-1 transition-colors ${activeTab === item.value
                                                ? "bg-green-600 text-white"
                                                : "text-gray-300 hover:bg-gray-800"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className="h-5 w-5" />
                                                <span className="text-sm font-medium">{item.label}</span>
                                            </div>
                                        </button>
                                    ))}
                                </nav>
                            </ScrollArea>

                            {/* Löschen-Button unter den Tabs */}
                            <div className="p-2 mt-auto">
                                <Button
                                    onClick={handleDeleteClick}
                                    variant="destructive"
                                    className="w-full text-white bg-red-600 hover:bg-red-700 border border-red-800"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Plant
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-grow p-0 h-[calc(100vh-10rem)] md:h-[600px] flex flex-col w-full overflow-hidden">
                        <div className="flex flex-col md:flex-row h-full w-full">
                            {/* Content Area */}
                            <div className="flex-1 h-full w-full">
                                <div className="w-full h-full">
                                    {/* Tab Content */}
                                    <div className="p-6 h-full w-full overflow-hidden">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={activeTab}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.15 }}
                                                className="h-full w-full"
                                            >
                                                {activeTab === "info" && (
                                                    <InfoTab
                                                        localPlant={localPlant}
                                                        setLocalPlant={setLocalPlant}
                                                    />
                                                )}
                                                {activeTab === "water" && (
                                                    <WateringFeedingTab
                                                        localPlant={localPlant}
                                                        setLocalPlant={setLocalPlant}
                                                        newWatering={newWatering}
                                                        setNewWatering={setNewWatering}
                                                        handleWateringAdd={handleWateringAdd}
                                                        handleWateringDelete={handleWateringDelete}
                                                        availableMixes={availableMixes}
                                                    />
                                                )}
                                                {activeTab === "hst" && (
                                                    <HSTTab
                                                        localPlant={localPlant}
                                                        setLocalPlant={setLocalPlant}
                                                        newTraining={newHST}
                                                        setNewTraining={setNewHST}
                                                        handleTrainingAdd={handleHSTAdd}
                                                        handleTrainingDelete={handleHSTDelete}
                                                    />
                                                )}
                                                {activeTab === "lst" && (
                                                    <LSTTab
                                                        localPlant={localPlant}
                                                        setLocalPlant={setLocalPlant}
                                                        newTraining={newLST}
                                                        setNewTraining={setNewLST}
                                                        handleTrainingAdd={handleLSTAdd}
                                                        handleTrainingDelete={handleLSTDelete}
                                                    />
                                                )}
                                                {activeTab === "substrate" && (
                                                    <SubstrateTab
                                                        localPlant={localPlant}
                                                        setLocalPlant={setLocalPlant}
                                                        newSubstrate={newSubstrate}
                                                        setNewSubstrate={setNewSubstrate}
                                                        handleSubstrateAdd={handleSubstrateAdd}
                                                        handleSubstrateDelete={handleSubstrateDelete}
                                                    />
                                                )}
                                                {activeTab === "notes" && (
                                                    <NotesTab
                                                        localPlant={localPlant}
                                                        setLocalPlant={setLocalPlant}
                                                    />
                                                )}
                                                {activeTab === "images" && (
                                                    <ImagesTab
                                                        localPlant={localPlant}
                                                        setLocalPlant={setLocalPlant}
                                                        setFullscreenImage={setFullscreenImage}
                                                        getRootProps={getRootProps}
                                                        getInputProps={getInputProps}
                                                        isDragActive={isDragActive}
                                                    />
                                                )}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Füge den Delete-Dialog hinzu */}
            <DeleteConfirmDialog />

            {/* Footer mit nur Speichern: */}
            <div className="p-3 border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm">
                <Button
                    onClick={handleSave}
                    className={`w-full transition-all duration-200 ${isSaving ? "bg-green-800 hover:bg-green-800" : "bg-green-600 hover:bg-green-700"
                        } text-white relative overflow-hidden`}
                    disabled={isSaving}
                >
                    <span className={`flex items-center justify-center transition-all duration-200 ${isSaving ? "opacity-0" : "opacity-100"
                        }`}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                    </span>
                    <span className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${isSaving ? "opacity-100 transform scale-100" : "opacity-0 transform scale-50"
                        }`}>
                        <Check className="h-5 w-5 mr-2" />
                        Saved
                    </span>
                </Button>
            </div>

            <AnimatePresence>
                {fullscreenImage && (
                    <FullscreenImage
                        fullscreenImage={fullscreenImage}
                        setFullscreenImage={setFullscreenImage}
                    />
                )}
            </AnimatePresence>
        </DialogContent>
    );
} 