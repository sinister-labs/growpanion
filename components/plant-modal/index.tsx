"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, Loader2, Menu, Save, Trash2, X } from 'lucide-react';
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

import { getCurrentDate, getTabIcon, FullscreenImage, isRenderableImage } from './shared-components';
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
import { normalizeSubstrateRecord, normalizeTrainingRecord, normalizeWateringRecord } from '@/lib/plant-modal-utils';
import { generateId, saveGrowEvent, saveIrrigationEvent, savePhenotype, saveTelemetryReading } from '@/lib/db';
import { createPhenotypeForPlant } from '@/lib/genetics-registry';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function PlantModal({ plant, updatePlant, deletePlant, growId, onManageFertilizerMixes, initialTab = "info" }: PlantModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [localPlant, setLocalPlant] = useState<Plant>(plant);
    const [isMobile, setIsMobile] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Load fertilizer mixes from the current grow
    const { mixes: availableMixes } = useFertilizerMixes(growId);
    const previewImage = isRenderableImage(localPlant.images?.[0])
        ? localPlant.images?.[0]
        : "/placeholder.svg";

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

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab, plant.id]);

    const persistWateringEvent = async (watering: WateringRecord) => {
        const amountMl = Number(watering.amount);
        const liters = amountMl / 1000;
        const occurredAt = new Date(watering.date).toISOString();
        const irrigationId = generateId();

        await saveIrrigationEvent({
            id: irrigationId,
            growId,
            plantId: plant.id,
            phenotypeId: plant.phenotypeId,
            liters,
            occurredAt,
            notes: watering.mixId ? `Fertilizer mix: ${watering.mixId}` : undefined,
        });

        await saveTelemetryReading({
            id: generateId(),
            growId,
            plantId: plant.id,
            phenotypeId: plant.phenotypeId,
            metric: 'water_consumption',
            value: liters,
            unit: 'L',
            recordedAt: occurredAt,
            source: 'manual',
        });

        await saveGrowEvent({
            id: generateId(),
            growId,
            plantId: plant.id,
            phenotypeId: plant.phenotypeId,
            type: watering.mixId ? 'feeding' : 'watering',
            title: watering.mixId ? 'Watering with fertilizer mix' : 'Watering',
            description: `${amountMl} ml${watering.mixId ? ` with mix ${watering.mixId}` : ''}`,
            occurredAt,
            payload: {
                irrigationEventId: irrigationId,
                amountMl,
                liters,
                mixId: watering.mixId || undefined,
            },
            createdAt: new Date().toISOString(),
        });
    };

    const persistTrainingEvent = async (record: TrainingRecord, type: 'hst' | 'lst') => {
        const occurredAt = new Date(record.date).toISOString();
        await saveGrowEvent({
            id: generateId(),
            growId,
            plantId: plant.id,
            phenotypeId: plant.phenotypeId,
            type,
            title: `${type.toUpperCase()}: ${record.method}`,
            description: record.notes || `${type.toUpperCase()} training recorded`,
            occurredAt,
            payload: {
                method: record.method,
                trainingType: type,
            },
            createdAt: new Date().toISOString(),
        });
    };

    const persistSubstrateEvent = async (record: SubstrateRecord) => {
        const occurredAt = new Date(record.date).toISOString();
        await saveGrowEvent({
            id: generateId(),
            growId,
            plantId: plant.id,
            phenotypeId: plant.phenotypeId,
            type: record.action === 'repotting' ? 'transplant' : 'substrate_change',
            title: record.action === 'repotting' ? 'Repotting' : 'Substrate change',
            description: `${record.substrateType} in ${record.potSize} pot`,
            occurredAt,
            payload: {
                action: record.action,
                substrateType: record.substrateType,
                potSize: record.potSize,
            },
            createdAt: new Date().toISOString(),
        });
    };

    const handleWateringAdd = async () => {
        const amount = Number(newWatering.amount);
        const date = new Date(newWatering.date);
        if (!Number.isFinite(date.getTime()) || !Number.isFinite(amount) || amount <= 0) return;
        const normalizedWatering = normalizeWateringRecord(newWatering);

        setLocalPlant({
            ...localPlant,
            waterings: [
                ...(localPlant.waterings || []),
                normalizedWatering
            ]
        });

        try {
            await persistWateringEvent(normalizedWatering);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to save watering event.');
        }

        setNewWatering({
            date: getCurrentDate(),
            amount: "",
            mixId: ""
        });
    };

    const handleHSTAdd = async () => {
        const date = new Date(newHST.date);
        if (!Number.isFinite(date.getTime()) || !newHST.method.trim()) return;
        const normalizedRecord = normalizeTrainingRecord(newHST);

        setLocalPlant({
            ...localPlant,
            hstRecords: [
                ...(localPlant.hstRecords || []),
                normalizedRecord
            ]
        });

        try {
            await persistTrainingEvent(normalizedRecord, 'hst');
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to save HST event.');
        }

        setNewHST({
            date: getCurrentDate(),
            method: "Topping"
        });
    };

    const handleLSTAdd = async () => {
        const date = new Date(newLST.date);
        if (!Number.isFinite(date.getTime()) || !newLST.method.trim()) return;
        const normalizedRecord = normalizeTrainingRecord(newLST);

        setLocalPlant({
            ...localPlant,
            lstRecords: [
                ...(localPlant.lstRecords || []),
                normalizedRecord
            ]
        });

        try {
            await persistTrainingEvent(normalizedRecord, 'lst');
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to save LST event.');
        }

        setNewLST({
            date: getCurrentDate(),
            method: "Bending and Tying"
        });
    };

    const handleSubstrateAdd = async () => {
        const date = new Date(newSubstrate.date);
        const potSize = Number(newSubstrate.potSize);
        if (!Number.isFinite(date.getTime()) || !newSubstrate.substrateType.trim() || !Number.isFinite(potSize) || potSize <= 0) return;
        const normalizedRecord = normalizeSubstrateRecord(newSubstrate);

        setLocalPlant({
            ...localPlant,
            substrateRecords: [
                ...(localPlant.substrateRecords || []),
                normalizedRecord
            ]
        });

        try {
            await persistSubstrateEvent(normalizedRecord);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to save substrate event.');
        }

        setNewSubstrate({
            date: getCurrentDate(),
            action: "potting",
            substrateType: "",
            potSize: ""
        });
    };

    const handleSave = async () => {
        let plantToSave: Plant = {
            ...localPlant,
            name: localPlant.name.trim(),
            genetic: localPlant.genetic.trim(),
            manufacturer: localPlant.manufacturer.trim(),
        };

        if (!plantToSave.name || !plantToSave.genetic || !plantToSave.manufacturer) {
            setSaveError("Name, genetic, and manufacturer are required.");
            setActiveTab("info");
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        try {
            if (plantToSave.geneticsId && !plantToSave.phenotypeId) {
                const phenotype = createPhenotypeForPlant({
                    growId,
                    plantId: plantToSave.id,
                    geneticsId: plantToSave.geneticsId,
                    label: plantToSave.label || `${plantToSave.name} phenotype`,
                });
                await savePhenotype(phenotype);
                plantToSave = { ...plantToSave, phenotypeId: phenotype.id };
                setLocalPlant(plantToSave);
            }

            const result = await updatePlant(plantToSave);
            if (result === false) {
                setSaveError("Failed to save plant.");
            }
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : "Failed to save plant.");
        } finally {
            setIsSaving(false);
        }
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
            if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_SIZE_BYTES) {
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/')) {
                    return;
                }

                setLocalPlant((prevPlant) => ({
                    ...prevPlant,
                    images: [...(prevPlant.images || []), reader.result as string],
                }));
            };
            reader.onerror = () => undefined;
            reader.readAsDataURL(file);
        });
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxSize: MAX_IMAGE_SIZE_BYTES,
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
        setSaveError(null);
        setShowDeleteDialog(true);
    };

    // Function to delete the plant
    const confirmDelete = async () => {
        if (isDeleting) return;

        setIsDeleting(true);
        setSaveError(null);
        try {
            await deletePlant(plant.id, plant.name);
            setShowDeleteDialog(false);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : "Failed to delete plant.");
        } finally {
            setIsDeleting(false);
        }
    };

    const DeleteConfirmDialog = () => (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent className="infotainment-overlay border-white/10 text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.36)]">
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Plant</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                        Are you sure you want to delete the plant &quot;{plant.name}&quot;?
                        <br />
                        <span className="text-destructive">This action cannot be undone.</span>
                    </AlertDialogDescription>
                    {saveError && (
                        <p className="text-sm text-destructive">{saveError}</p>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        disabled={isDeleting}
                        className="rounded-[0.95rem] border-white/10 bg-white/[0.045] text-slate-100 hover:border-emerald-300/[0.22] hover:bg-emerald-300/10"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(event) => {
                            event.preventDefault();
                            void confirmDelete();
                        }}
                        disabled={isDeleting}
                        className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Plant
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return (
        <DialogContent className="flex h-[100dvh] max-w-full flex-col gap-0 overflow-hidden border-white/10 bg-[#070d12] p-0 text-foreground shadow-[0_28px_90px_rgba(0,0,0,0.46)] sm:h-[min(84vh,820px)] sm:max-w-6xl sm:rounded-[1.35rem]">
            <DialogTitle className="sr-only">{localPlant.name} plant details</DialogTitle>
            {isMobile ? (
                <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.035] px-3 py-3 backdrop-blur-xl">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={isMenuOpen ? "Close plant sections" : "Open plant sections"}
                        className="h-11 w-11 rounded-[0.95rem] border border-white/10 bg-white/[0.045] text-slate-100 shadow-sm hover:border-emerald-300/[0.22] hover:bg-emerald-300/10"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold">{localPlant.name}</h2>
                        <p className="truncate text-xs text-muted-foreground">{localPlant.genetic || "No genetics assigned"}</p>
                    </div>
                    <Button
                        onClick={handleSave}
                        size="icon"
                        aria-label="Save plant"
                        disabled={isSaving}
                        className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    </Button>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="aspect-square w-24 overflow-hidden rounded-[1.05rem] border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                            {/* eslint-disable-next-line @next/next/no-img-element -- User images are stored as dynamic data/blob URLs from IndexedDB. */}
                            <img
                                src={previewImage}
                                alt={localPlant.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h2 className="max-w-[42vw] truncate text-2xl font-semibold text-foreground">{localPlant.name}</h2>
                                <Badge className="rounded-full border border-emerald-300/[0.20] bg-emerald-300/10 px-2.5 py-1 text-emerald-200 shadow-none">{localPlant.type}</Badge>
                                <Badge className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-sky-200 shadow-none">{localPlant.propagationMethod}</Badge>
                            </div>
                            <p className="truncate text-sm text-muted-foreground">{localPlant.genetic || "No genetics assigned"}</p>
                            <p className="truncate text-sm text-muted-foreground">{localPlant.manufacturer || "No breeder assigned"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleDeleteClick}
                            variant="ghost"
                            size="sm"
                            className="rounded-[0.95rem] border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/15 hover:text-red-100"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            size="sm"
                            className="min-w-28 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save
                        </Button>
                    </div>
                </div>
            )}

            {saveError && (
                <div className="border-b border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-200" aria-live="polite">
                    {saveError}
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
                                    className="absolute inset-y-0 left-0 z-20 w-[min(86vw,360px)] border-r border-white/10 bg-[#0b1116]/96 shadow-[18px_0_60px_rgba(0,0,0,0.32)] backdrop-blur-xl"
                                >
                                    <ScrollArea className="h-full">
                                        <nav className="p-3">
                                            {tabs.map((item) => (
                                                <button
                                                    key={item.value}
                                                    onClick={() => {
                                                        setActiveTab(item.value);
                                                        setIsMenuOpen(false);
                                                    }}
                                                    className={`mb-1 flex min-h-12 w-full items-center justify-between rounded-2xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === item.value
                                                        ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                                                        : "border-transparent text-slate-300 hover:border-emerald-300/[0.22] hover:bg-emerald-300/10 hover:text-white"
                                                        }`}
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <item.icon className="h-5 w-5" />
                                                        <span className="truncate font-medium">{item.label}</span>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 opacity-60" />
                                                </button>
                                            ))}
                                            <div className="mt-4">
                                                <Button
                                                    onClick={() => {
                                                        handleDeleteClick();
                                                        setIsMenuOpen(false);
                                                    }}
                                                    variant="destructive"
                                                    className="h-11 w-full rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                        <div className="flex w-72 flex-col border-r border-white/10 bg-white/[0.025]">
                            <ScrollArea className="flex-1">
                                <nav className="space-y-1 p-3">
                                    {tabs.map((item) => (
                                        <button
                                            key={item.value}
                                            onClick={() => setActiveTab(item.value)}
                                            className={`flex min-h-12 w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === item.value
                                                ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                                                : "border-transparent text-slate-300 hover:border-emerald-300/[0.22] hover:bg-emerald-300/10 hover:text-white"
                                                }`}
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <item.icon className="h-5 w-5" />
                                                <span className="truncate text-sm font-medium">{item.label}</span>
                                            </div>
                                        </button>
                                    ))}
                                </nav>
                            </ScrollArea>
                        </div>
                    )}

                    <div className="flex h-full w-full flex-grow flex-col overflow-hidden p-0">
                        <div className="flex flex-col md:flex-row h-full w-full">
                            <div className="flex-1 h-full w-full min-w-0">
                                <div className="w-full h-full">
                                    <div className="h-full w-full overflow-hidden p-4 sm:p-5">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={activeTab}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.15 }}
                                                className="h-full w-full overflow-hidden rounded-[1.15rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,27,34,0.94),rgba(7,12,17,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_50px_rgba(0,0,0,0.28)]"
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
                                                        onManageFertilizerMixes={onManageFertilizerMixes}
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
                                                        key={localPlant.id}
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

            <DeleteConfirmDialog />

            <div className="border-t border-white/10 bg-white/[0.035] px-4 py-3 backdrop-blur-xl sm:hidden">
                <Button
                    onClick={handleSave}
                    className="relative h-11 w-full overflow-hidden rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isSaving}
                >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
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
