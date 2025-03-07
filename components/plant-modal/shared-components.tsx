"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { NoRecordsIndicatorProps, FullscreenImageProps, TabType } from './types';
import { X, Info as InfoIcon, Droplets, Scissors as ScissorsIcon, Anchor, FileText, Image as ImageIcon, Flower } from 'lucide-react';

export const NoRecordsIndicator = ({ icon: Icon, text }: NoRecordsIndicatorProps) => (
    <div className="flex flex-col items-center justify-center h-40 text-gray-500">
        <Icon className="w-12 h-12 mb-2" />
        <p>{text}</p>
    </div>
);

export function FullscreenImage({ fullscreenImage, setFullscreenImage }: FullscreenImageProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
            onClick={() => setFullscreenImage(null)}
        >
            <button
                className="absolute top-4 right-4 text-white bg-gray-800 rounded-full p-2 hover:bg-gray-700"
                onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenImage(null);
                }}
            >
                <X className="w-6 h-6" />
            </button>
            <img
                src={fullscreenImage || ''}
                alt="Fullscreen plant"
                className="max-h-[90vh] max-w-[90vw] object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </motion.div>
    );
}

export function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getTabIcon(tab: TabType) {
    switch (tab) {
        case "info": return InfoIcon;
        case "water": return Droplets;
        case "hst": return ScissorsIcon;
        case "lst": return Anchor;
        case "substrate": return Flower;
        case "notes": return FileText;
        case "images": return ImageIcon;
    }
}

export function getTabLabel(tab: TabType) {
    switch (tab) {
        case "info": return "Info";
        case "water": return "Water/Feeding";
        case "hst": return "HST";
        case "lst": return "LST";
        case "substrate": return "Substrate";
        case "notes": return "Notes";
        case "images": return "Images";
    }
} 