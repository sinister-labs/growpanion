"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { EditorContent, EditorRoot } from 'novel';
import { Editor, JSONContent } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { TabComponentProps, Plant } from './types';

const createEmptyDocument = (): JSONContent => ({
    type: 'doc',
    content: [
        {
            type: 'paragraph',
            content: []
        }
    ]
});

const getInitialContent = (notes: Plant['notes']): JSONContent => {
    if (typeof notes === 'object' && notes !== null) {
        return notes as JSONContent;
    }

    return createEmptyDocument();
};

const NotesTab: React.FC<TabComponentProps> = ({ localPlant, setLocalPlant }) => {
    // Initialisiere den Content-State mit den vorhandenen Notizen oder einem leeren Dokument
    const [content, setContent] = useState<JSONContent>(() => getInitialContent(localPlant.notes));

    useEffect(() => {
        setContent(getInitialContent(localPlant.notes));
    }, [localPlant.id, localPlant.notes]);

    const handleUpdate = ({ editor }: { editor: Editor }) => {
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
                <h3 className="text-xl font-semibold text-primary mb-4">Notes</h3>
            </div>

            <div className="relative flex h-full flex-grow flex-col overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.045] shadow-sm">
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
