"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Image, Upload } from 'lucide-react';
import { ImagesTabProps } from './types';
import { isRenderableImage, NoRecordsIndicator } from './shared-components';

const ImagesTab: React.FC<ImagesTabProps> = ({
    localPlant,
    setLocalPlant,
    setFullscreenImage,
    getRootProps,
    getInputProps,
    isDragActive
}) => {
    const handleDeleteImage = (index: number) => {
        setLocalPlant({
            ...localPlant,
            images: localPlant.images?.filter((_, i) => i !== index) || []
        });
    };

    const renderableImages = (localPlant.images || [])
        .map((image, originalIndex) => ({ image, originalIndex }))
        .filter(({ image }) => isRenderableImage(image));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full overflow-y-auto"
        >
            <div {...getRootProps()} className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-[1rem] border-2 border-dashed p-6 transition-colors focus-within:ring-2 focus-within:ring-ring ${isDragActive ? 'border-emerald-300 bg-emerald-300/10' : 'border-white/[0.12] bg-white/[0.035] hover:border-emerald-300/[0.25] hover:bg-emerald-300/10'}`}>
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-center text-muted-foreground">
                    {isDragActive ?
                        'Drop images here…' :
                        'Drop images here or click to select'}
                </p>
            </div>

            {renderableImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
                    {renderableImages.map(({ image, originalIndex }, index) => (
                        <div
                            key={`${originalIndex}-${image.slice(0, 32)}`}
                            className="relative cursor-pointer overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.045] shadow-sm"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element -- User images are stored as dynamic data/blob URLs from IndexedDB. */}
                            <img
                                src={image}
                                alt={`Plant ${index + 1}`}
                                className="w-full h-40 object-cover"
                                onClick={() => setFullscreenImage(image)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-opacity hover:bg-slate-950/35 hover:opacity-100">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="mx-1 rounded-2xl"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteImage(originalIndex);
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <NoRecordsIndicator
                    icon={Image}
                    text="No images"
                />
            )}
        </motion.div>
    );
};

export default ImagesTab;
