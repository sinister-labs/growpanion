"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { NoRecordsIndicatorProps, FullscreenImageProps, TabType } from './types';
import { X, Info as InfoIcon, Droplets, Scissors as ScissorsIcon, Anchor, FileText, Image as ImageIcon, Flower } from 'lucide-react';

export const isRenderableImage = (image?: string | null) => {
    return Boolean(
        image &&
        (
            image.startsWith('data:image/') ||
            image.startsWith('/') ||
            image.startsWith('blob:') ||
            image.startsWith('http://') ||
            image.startsWith('https://')
        )
    );
};

export const NoRecordsIndicator = ({ icon: Icon, text }: NoRecordsIndicatorProps) => (
    <div className="flex h-40 flex-col items-center justify-center rounded-[1rem] border border-dashed border-white/[0.12] bg-white/[0.035] text-muted-foreground">
        <Icon className="mb-2 h-10 w-10" />
        <p>{text}</p>
    </div>
);

export function FullscreenImage({ fullscreenImage, setFullscreenImage }: FullscreenImageProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setFullscreenImage(null)}
        >
            <button
                aria-label="Close fullscreen image"
                className="absolute right-4 top-4 rounded-[0.95rem] border border-white/10 bg-white/[0.08] p-2 text-foreground shadow-sm hover:bg-emerald-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenImage(null);
                }}
            >
                <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- Fullscreen previews use dynamic user image data/blob URLs. */}
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
