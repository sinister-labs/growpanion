/**
 * Export/Import utilities for GrowPanion data
 * Handles data collection, serialization, and import with conflict resolution
 */

import { db, Grow, PlantDB, FertilizerMixDB, Settings } from '@/lib/db';
import { encrypt, decrypt, isEncryptedFormat } from '@/lib/crypto-utils';

// Current export schema version
export const EXPORT_SCHEMA_VERSION = '1.0';
export const APP_VERSION = '0.1.0';

// File extensions
export const PLAIN_EXTENSION = '.json';
export const ENCRYPTED_EXTENSION = '.growpanion';

/**
 * Export data structure
 */
export interface ExportData {
    metadata: ExportMetadata;
    data: {
        grows: Grow[];
        plants: PlantDB[];
        fertilizerMixes: FertilizerMixDB[];
        settings: Settings | null;
    };
}

export interface ExportMetadata {
    version: string;
    appVersion: string;
    exportedAt: string;
    encrypted: boolean;
    description?: string;
}

/**
 * Import conflict resolution strategy
 */
export type ConflictStrategy = 'replace' | 'merge' | 'skip';

/**
 * Import result details
 */
export interface ImportResult {
    success: boolean;
    imported: {
        grows: number;
        plants: number;
        fertilizerMixes: number;
        settings: boolean;
    };
    skipped: {
        grows: number;
        plants: number;
        fertilizerMixes: number;
    };
    errors: string[];
}

/**
 * Collects all data from the database for export
 */
export async function collectExportData(description?: string): Promise<ExportData> {
    const [grows, plants, fertilizerMixes, settings] = await Promise.all([
        db.grows.toArray(),
        db.plants.toArray(),
        db.fertilizerMixes.toArray(),
        db.settings.get('global')
    ]);

    return {
        metadata: {
            version: EXPORT_SCHEMA_VERSION,
            appVersion: APP_VERSION,
            exportedAt: new Date().toISOString(),
            encrypted: false,
            description
        },
        data: {
            grows,
            plants,
            fertilizerMixes,
            settings: settings || null
        }
    };
}

/**
 * Creates an export file (plain JSON or encrypted)
 */
export async function createExportFile(
    password?: string,
    description?: string
): Promise<{ content: string; filename: string; encrypted: boolean }> {
    const exportData = await collectExportData(description);
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (password) {
        // Encrypt the data
        exportData.metadata.encrypted = true;
        const jsonString = JSON.stringify(exportData);
        const encryptedContent = await encrypt(jsonString, password);
        
        return {
            content: encryptedContent,
            filename: `growpanion-backup-${timestamp}${ENCRYPTED_EXTENSION}`,
            encrypted: true
        };
    } else {
        // Plain JSON export
        return {
            content: JSON.stringify(exportData, null, 2),
            filename: `growpanion-backup-${timestamp}${PLAIN_EXTENSION}`,
            encrypted: false
        };
    }
}

/**
 * Triggers file download in browser
 */
export function downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Parses and validates import file content
 */
export async function parseImportFile(
    content: string,
    password?: string
): Promise<{ data: ExportData; wasEncrypted: boolean }> {
    let jsonContent = content;
    let wasEncrypted = false;

    // Check if content is encrypted
    if (isEncryptedFormat(content)) {
        if (!password) {
            throw new Error('ENCRYPTED_FILE_NEEDS_PASSWORD');
        }
        try {
            jsonContent = await decrypt(content, password);
            wasEncrypted = true;
        } catch {
            throw new Error('DECRYPTION_FAILED');
        }
    }

    // Parse JSON
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonContent);
    } catch {
        throw new Error('INVALID_JSON');
    }

    // Validate schema
    const validationResult = validateExportSchema(parsed);
    if (!validationResult.valid) {
        throw new Error(`INVALID_SCHEMA: ${validationResult.errors.join(', ')}`);
    }

    return {
        data: parsed as ExportData,
        wasEncrypted
    };
}

/**
 * Validates the export data schema
 */
export function validateExportSchema(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Data must be an object'] };
    }

    const obj = data as Record<string, unknown>;

    // Check metadata
    if (!obj.metadata || typeof obj.metadata !== 'object') {
        errors.push('Missing or invalid metadata');
    } else {
        const meta = obj.metadata as Record<string, unknown>;
        if (typeof meta.version !== 'string') errors.push('Missing metadata.version');
        if (typeof meta.exportedAt !== 'string') errors.push('Missing metadata.exportedAt');
    }

    // Check data structure
    if (!obj.data || typeof obj.data !== 'object') {
        errors.push('Missing or invalid data section');
    } else {
        const dataSection = obj.data as Record<string, unknown>;
        if (!Array.isArray(dataSection.grows)) errors.push('Missing or invalid data.grows');
        if (!Array.isArray(dataSection.plants)) errors.push('Missing or invalid data.plants');
        if (!Array.isArray(dataSection.fertilizerMixes)) errors.push('Missing or invalid data.fertilizerMixes');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Imports data into the database with conflict resolution
 */
export async function importData(
    exportData: ExportData,
    strategy: ConflictStrategy,
    progressCallback?: (progress: number, message: string) => void
): Promise<ImportResult> {
    const result: ImportResult = {
        success: true,
        imported: { grows: 0, plants: 0, fertilizerMixes: 0, settings: false },
        skipped: { grows: 0, plants: 0, fertilizerMixes: 0 },
        errors: []
    };

    try {
        const { data } = exportData;
        const totalItems = data.grows.length + data.plants.length + data.fertilizerMixes.length + (data.settings ? 1 : 0);
        let processedItems = 0;

        const updateProgress = (message: string) => {
            processedItems++;
            progressCallback?.(Math.round((processedItems / totalItems) * 100), message);
        };

        // Use transaction for atomic operations
        await db.transaction('rw', [db.grows, db.plants, db.fertilizerMixes, db.settings], async () => {
            // Handle based on strategy
            if (strategy === 'replace') {
                // Clear all existing data first
                progressCallback?.(5, 'Clearing existing data...');
                await Promise.all([
                    db.grows.clear(),
                    db.plants.clear(),
                    db.fertilizerMixes.clear(),
                    db.settings.clear()
                ]);
            }

            // Import grows
            progressCallback?.(10, 'Importing grows...');
            for (const grow of data.grows) {
                const exists = await db.grows.get(grow.id);
                if (exists) {
                    if (strategy === 'skip') {
                        result.skipped.grows++;
                    } else {
                        // merge or replace - update existing
                        await db.grows.put(grow);
                        result.imported.grows++;
                    }
                } else {
                    await db.grows.put(grow);
                    result.imported.grows++;
                }
                updateProgress(`Imported grow: ${grow.name}`);
            }

            // Import plants
            progressCallback?.(40, 'Importing plants...');
            for (const plant of data.plants) {
                const exists = await db.plants.get(plant.id);
                if (exists) {
                    if (strategy === 'skip') {
                        result.skipped.plants++;
                    } else {
                        await db.plants.put(plant);
                        result.imported.plants++;
                    }
                } else {
                    await db.plants.put(plant);
                    result.imported.plants++;
                }
                updateProgress(`Imported plant: ${plant.name}`);
            }

            // Import fertilizer mixes
            progressCallback?.(70, 'Importing fertilizer mixes...');
            for (const mix of data.fertilizerMixes) {
                const exists = await db.fertilizerMixes.get(mix.id);
                if (exists) {
                    if (strategy === 'skip') {
                        result.skipped.fertilizerMixes++;
                    } else {
                        await db.fertilizerMixes.put(mix);
                        result.imported.fertilizerMixes++;
                    }
                } else {
                    await db.fertilizerMixes.put(mix);
                    result.imported.fertilizerMixes++;
                }
                updateProgress(`Imported mix: ${mix.name}`);
            }

            // Import settings
            if (data.settings) {
                progressCallback?.(90, 'Importing settings...');
                if (strategy === 'skip') {
                    const existingSettings = await db.settings.get('global');
                    if (!existingSettings) {
                        await db.settings.put(data.settings);
                        result.imported.settings = true;
                    }
                } else {
                    // For merge, we combine settings
                    if (strategy === 'merge') {
                        const existingSettings = await db.settings.get('global');
                        if (existingSettings) {
                            const mergedSettings = {
                                ...existingSettings,
                                ...data.settings,
                                id: 'global',
                                // Merge sensors arrays
                                sensors: [
                                    ...(existingSettings.sensors || []),
                                    ...(data.settings.sensors || []).filter(
                                        newSensor => !(existingSettings.sensors || []).some(s => s.id === newSensor.id)
                                    )
                                ]
                            };
                            await db.settings.put(mergedSettings);
                        } else {
                            await db.settings.put(data.settings);
                        }
                    } else {
                        await db.settings.put(data.settings);
                    }
                    result.imported.settings = true;
                }
                updateProgress('Imported settings');
            }
        });

        progressCallback?.(100, 'Import complete!');
    } catch (error) {
        result.success = false;
        result.errors.push(error instanceof Error ? error.message : 'Unknown error during import');
    }

    return result;
}

/**
 * Reads a file and returns its content as string
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Detects if a file is encrypted based on extension or content
 */
export function detectFileType(filename: string, content: string): 'encrypted' | 'plain' | 'unknown' {
    if (filename.endsWith(ENCRYPTED_EXTENSION)) {
        return 'encrypted';
    }
    if (filename.endsWith(PLAIN_EXTENSION)) {
        // Could still be encrypted content with wrong extension
        if (isEncryptedFormat(content)) {
            return 'encrypted';
        }
        return 'plain';
    }
    // Unknown extension, check content
    if (isEncryptedFormat(content)) {
        return 'encrypted';
    }
    try {
        JSON.parse(content);
        return 'plain';
    } catch {
        return 'unknown';
    }
}

/**
 * Gets summary statistics from export data
 */
export function getExportSummary(data: ExportData): {
    grows: number;
    plants: number;
    fertilizerMixes: number;
    hasSettings: boolean;
    exportDate: string;
    version: string;
} {
    return {
        grows: data.data.grows.length,
        plants: data.data.plants.length,
        fertilizerMixes: data.data.fertilizerMixes.length,
        hasSettings: data.data.settings !== null,
        exportDate: data.metadata.exportedAt,
        version: data.metadata.version
    };
}
