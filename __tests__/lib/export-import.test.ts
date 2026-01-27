import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    validateExportSchema,
    getExportSummary,
    detectFileType,
    ExportData,
    EXPORT_SCHEMA_VERSION,
    APP_VERSION,
    PLAIN_EXTENSION,
    ENCRYPTED_EXTENSION,
} from '@/lib/export-import';

// Mock Dexie database
vi.mock('@/lib/db', () => ({
    db: {
        grows: {
            toArray: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue('id'),
            clear: vi.fn().mockResolvedValue(undefined),
        },
        plants: {
            toArray: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue('id'),
            clear: vi.fn().mockResolvedValue(undefined),
        },
        fertilizerMixes: {
            toArray: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue('id'),
            clear: vi.fn().mockResolvedValue(undefined),
        },
        settings: {
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue('id'),
            clear: vi.fn().mockResolvedValue(undefined),
        },
        transaction: vi.fn().mockImplementation(async (_, __, callback) => {
            return callback();
        }),
    },
}));

describe('export-import', () => {
    describe('constants', () => {
        it('should have correct schema version', () => {
            expect(EXPORT_SCHEMA_VERSION).toBe('1.0');
        });

        it('should have correct file extensions', () => {
            expect(PLAIN_EXTENSION).toBe('.json');
            expect(ENCRYPTED_EXTENSION).toBe('.growpanion');
        });
    });

    describe('validateExportSchema', () => {
        const validExportData: ExportData = {
            metadata: {
                version: '1.0',
                appVersion: '0.1.0',
                exportedAt: new Date().toISOString(),
                encrypted: false,
            },
            data: {
                grows: [],
                plants: [],
                fertilizerMixes: [],
                settings: null,
            },
        };

        it('should validate correct export data', () => {
            const result = validateExportSchema(validExportData);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject null data', () => {
            const result = validateExportSchema(null);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Data must be an object');
        });

        it('should reject missing metadata', () => {
            const result = validateExportSchema({ data: validExportData.data });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing or invalid metadata');
        });

        it('should reject missing metadata.version', () => {
            const invalidData = {
                metadata: { exportedAt: new Date().toISOString() },
                data: validExportData.data,
            };
            const result = validateExportSchema(invalidData);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing metadata.version');
        });

        it('should reject missing data section', () => {
            const result = validateExportSchema({ metadata: validExportData.metadata });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing or invalid data section');
        });

        it('should reject non-array grows', () => {
            const invalidData = {
                metadata: validExportData.metadata,
                data: { ...validExportData.data, grows: 'not an array' },
            };
            const result = validateExportSchema(invalidData);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing or invalid data.grows');
        });

        it('should validate export data with actual content', () => {
            const dataWithContent: ExportData = {
                metadata: {
                    version: '1.0',
                    appVersion: '0.1.0',
                    exportedAt: new Date().toISOString(),
                    encrypted: false,
                    description: 'Test backup',
                },
                data: {
                    grows: [
                        {
                            id: 'grow-1',
                            name: 'My First Grow',
                            startDate: '2024-01-01',
                            currentPhase: 'Vegetative',
                            phaseHistory: [{ phase: 'Seedling', startDate: '2024-01-01' }],
                        },
                    ],
                    plants: [
                        {
                            id: 'plant-1',
                            name: 'Plant #1',
                            genetic: 'Northern Lights',
                            growId: 'grow-1',
                        } as any,
                    ],
                    fertilizerMixes: [],
                    settings: { id: 'global', sensors: [] },
                },
            };
            const result = validateExportSchema(dataWithContent);
            expect(result.valid).toBe(true);
        });
    });

    describe('getExportSummary', () => {
        it('should return correct summary for empty data', () => {
            const exportData: ExportData = {
                metadata: {
                    version: '1.0',
                    appVersion: '0.1.0',
                    exportedAt: '2024-01-15T10:30:00.000Z',
                    encrypted: false,
                },
                data: {
                    grows: [],
                    plants: [],
                    fertilizerMixes: [],
                    settings: null,
                },
            };

            const summary = getExportSummary(exportData);

            expect(summary.grows).toBe(0);
            expect(summary.plants).toBe(0);
            expect(summary.fertilizerMixes).toBe(0);
            expect(summary.hasSettings).toBe(false);
            expect(summary.exportDate).toBe('2024-01-15T10:30:00.000Z');
            expect(summary.version).toBe('1.0');
        });

        it('should return correct counts for populated data', () => {
            const exportData: ExportData = {
                metadata: {
                    version: '1.0',
                    appVersion: '0.1.0',
                    exportedAt: '2024-01-15T10:30:00.000Z',
                    encrypted: true,
                },
                data: {
                    grows: [{ id: '1' }, { id: '2' }] as any,
                    plants: [{ id: '1' }, { id: '2' }, { id: '3' }] as any,
                    fertilizerMixes: [{ id: '1' }] as any,
                    settings: { id: 'global', sensors: [] },
                },
            };

            const summary = getExportSummary(exportData);

            expect(summary.grows).toBe(2);
            expect(summary.plants).toBe(3);
            expect(summary.fertilizerMixes).toBe(1);
            expect(summary.hasSettings).toBe(true);
        });
    });

    describe('detectFileType', () => {
        it('should detect plain JSON by extension', () => {
            const result = detectFileType('backup.json', '{"test": "data"}');
            expect(result).toBe('plain');
        });

        it('should detect encrypted file by extension', () => {
            const result = detectFileType('backup.growpanion', 'anyContent');
            expect(result).toBe('encrypted');
        });

        it('should detect plain JSON by content for unknown extension', () => {
            const result = detectFileType('backup.txt', '{"test": "data"}');
            expect(result).toBe('plain');
        });

        it('should return unknown for invalid content', () => {
            const result = detectFileType('backup.txt', 'not json or base64');
            expect(result).toBe('unknown');
        });

        it('should detect encrypted content even with .json extension', async () => {
            // Create a valid encrypted content (needs actual encryption)
            const { encrypt } = await import('@/lib/crypto-utils');
            const encrypted = await encrypt('test', 'password');
            
            const result = detectFileType('backup.json', encrypted);
            expect(result).toBe('encrypted');
        });
    });
});
