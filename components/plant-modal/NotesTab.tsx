"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EditorContent, EditorRoot } from 'novel';
import { StarterKit } from '@tiptap/starter-kit';
import { TabComponentProps, Plant } from './types';

// Generic JSON content type for the editor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONContent = Record<string, any>;

const NotesTab: React.FC<TabComponentProps> = ({ localPlant, setLocalPlant }) => {
    // Initialisiere den Content-State mit den vorhandenen Notizen oder einem leeren Dokument
    const [content, setContent] = useState<JSONContent>(() => {
        if (typeof localPlant.notes === 'object' && localPlant.notes !== null) {
            return localPlant.notes as JSONContent;
        }

        // Create an empty document with the correct structure
        return {
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: []
                }
            ]
        };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUpdate = ({ editor }: { editor: any }) => {
        const json = editor.getJSON();
        setContent(json);

        setLocalPlant(prev => ({
            ...prev,
            notes: json as Plant['notes']
        }));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full w-full"
        >
            <div className="flex-shrink-0">
                <h3 className="text-xl font-semibold text-green-400 mb-4">Notes</h3>
            </div>

            <div className="flex-grow bg-gray-800 rounded-lg border border-gray-700 overflow-hidden relative flex flex-col h-full">
                <EditorRoot>
                    <div className="h-full flex flex-col">
                        <EditorContent
                            initialContent={content}
                            extensions={[StarterKit]}
                            onUpdate={handleUpdate}
                            className="max-w-none p-4 flex-grow min-h-[200px] focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-none editor-content"
                        />
                    </div>
                </EditorRoot>
            </div>
        </motion.div>
    );
};

export default NotesTab; 