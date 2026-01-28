"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Image, Upload } from 'lucide-react';
import { ImagesTabProps } from './types';
import { NoRecordsIndicator } from './shared-components';

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

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full overflow-y-auto"
        >
            <div {...getRootProps()} className={`border-2 border-dashed p-6 mb-6 rounded-lg cursor-pointer flex flex-col items-center justify-center ${isDragActive ? 'border-green-500 bg-green-500 bg-opacity-10' : 'border-gray-700 hover:border-gray-600'}`}>
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-500 mb-2" />
                <p className="text-center text-gray-500">
                    {isDragActive ?
                        'Drop images here ...' :
                        'Drop images here or click to select'}
                </p>
            </div>

            {localPlant.images && localPlant.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
                    {localPlant.images.map((image, index) => (
                        <div
                            key={index}
                            className="relative overflow-hidden rounded-lg cursor-pointer"
                        >
                            <img
                                src={image}
                                alt={`Plant ${index + 1}`}
                                className="w-full h-40 object-cover"
                                onClick={() => setFullscreenImage(image)}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="mx-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteImage(index);
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