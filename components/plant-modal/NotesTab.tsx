"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EditorContent, EditorRoot } from 'novel';
import { StarterKit } from '@tiptap/starter-kit';
import { TabComponentProps } from './types';

// Tiptap document structure
interface TiptapContent {
  type: string;
  content?: TiptapContent[];
  text?: string;
  [key: string]: string | number | boolean | TiptapContent[] | undefined;
}

// For Tiptap Editor we use a minimal interface
interface TiptapEditor {
  getJSON: () => TiptapContent;
}

const NotesTab: React.FC<TabComponentProps> = ({ localPlant, setLocalPlant }) => {
    // Initialisiere den Content-State mit den vorhandenen Notizen oder einem leeren Dokument
    const [content, setContent] = useState(() => {
        if (typeof localPlant.notes === 'object' && localPlant.notes !== null) {
            return localPlant.notes;
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

    const handleUpdate = ({ editor }: { editor: TiptapEditor }) => {
        const json = editor.getJSON();
        setContent(json);

        setLocalPlant(prev => ({
            ...prev,
            notes: json
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