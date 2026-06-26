import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    validateExportSchema,
    getExportSummary,
    detectFileType,
    importData,
    ExportData,
    EXPORT_SCHEMA_VERSION,
    APP_VERSION,
    PLAIN_EXTENSION,
    ENCRYPTED_EXTENSION,
} from '@/lib/export-import';
import { db } from '@/lib/db';

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
        strains: {
            toArray: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue('id'),
            clear: vi.fn().mockResolvedValue(undefined),
        },
        reminders: {
            toArray: vi.fn().mockResolvedValue([]),
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue('id'),
            clear: vi.fn().mockResolvedValue(undefined),
        },
        notificationSettings: {
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
    beforeEach(() => {
        vi.clearAllMocks();
    });

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
            expect(result.errors).toContain('Missing or invalid metadata.encrypted');
        });

        it('should reject missing or invalid metadata encryption flags', () => {
            const missingEncrypted = {
                metadata: {
                    version: '1.0',
                    appVersion: '0.1.0',
                    exportedAt: new Date().toISOString(),
                },
                data: validExportData.data,
            };
            const invalidEncrypted = {
                metadata: {
                    version: '1.0',
                    appVersion: '0.1.0',
                    exportedAt: new Date().toISOString(),
                    encrypted: 'false',
                },
                data: validExportData.data,
            };

            expect(validateExportSchema(missingEncrypted).errors).toContain('Missing or invalid metadata.encrypted');
            expect(validateExportSchema(invalidEncrypted).errors).toContain('Missing or invalid metadata.encrypted');
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
                            manufacturer: 'Sensi Seeds',
                            type: 'feminized',
                            propagationMethod: 'seed',
                            growId: 'grow-1',
                        },
                    ],
                    fertilizerMixes: [],
                    settings: { id: 'global', sensors: [] },
                },
            };
            const result = validateExportSchema(dataWithContent);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid optional data sections', () => {
            const invalidData = {
                metadata: validExportData.metadata,
                data: {
                    ...validExportData.data,
                    strains: 'not an array',
                    reminders: {},
                    notificationSettings: 'not an object',
                },
            };

            const result = validateExportSchema(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid data.strains');
            expect(result.errors).toContain('Invalid data.reminders');
            expect(result.errors).toContain('Invalid data.notificationSettings');
        });

        it('should reject malformed records that would break database imports', () => {
            const invalidData = {
                metadata: validExportData.metadata,
                data: {
                    grows: [{ name: 'Missing ID', startDate: '2024-01-01', currentPhase: 'Seedling', phaseHistory: [] }],
                    plants: [{ id: 'plant-1', name: 'Orphan Plant' }],
                    fertilizerMixes: [{ id: 'mix-1', growId: 'grow-1', name: 'Missing Water Amount', fertilizers: [] }],
                    strains: [{ id: 'strain-1', name: 'Missing Breeder', genetics: 'Hybrid' }],
                    reminders: [{ id: 'reminder-1', growId: 'grow-1', title: 'Missing Fields' }],
                    settings: { id: 'wrong-id' },
                    notificationSettings: { id: 'wrong-id', enabled: true },
                },
            };

            const result = validateExportSchema(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Missing data.grows[0].id');
            expect(result.errors).toContain('Missing data.plants[0].growId');
            expect(result.errors).toContain('Missing data.fertilizerMixes[0].waterAmount');
            expect(result.errors).toContain('Missing data.strains[0].breeder');
            expect(result.errors).toContain('Missing data.reminders[0].type');
            expect(result.errors).toContain('Invalid data.settings.id');
            expect(result.errors).toContain('Invalid data.notificationSettings.id');
            expect(result.errors).toContain('Missing data.notificationSettings.defaultReminderTime');
        });

        it('should reject settings with unsupported sensor decimal places', () => {
            const invalidData = {
                metadata: validExportData.metadata,
                data: {
                    ...validExportData.data,
                    settings: {
                        id: 'global',
                        sensors: [{
                            id: 'sensor-1',
                            name: 'Tent Sensor',
                            tuyaId: 'device-1',
                            type: 'Temperature',
                            values: [{ code: 'temp_current', decimalPlaces: 4 }],
                        }],
                    },
                },
            };

            const result = validateExportSchema(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid data.settings schema');
        });

        it('should reject orphaned grow references and duplicate ids', () => {
            const invalidData = {
                metadata: validExportData.metadata,
                data: {
                    grows: [
                        { id: 'grow-1', name: 'Grow 1', startDate: '2024-01-01', currentPhase: 'Seedling', phaseHistory: [] },
                        { id: 'grow-1', name: 'Grow 1 Copy', startDate: '2024-01-02', currentPhase: 'Seedling', phaseHistory: [] },
                    ],
                    plants: [
                        { id: 'plant-1', growId: 'missing-grow', name: 'Plant 1' },
                        { id: 'plant-1', growId: 'grow-1', name: 'Plant 1 Copy' },
                    ],
                    fertilizerMixes: [
                        { id: 'mix-1', growId: 'missing-grow', name: 'Mix 1', waterAmount: '10', fertilizers: [] },
                    ],
                    reminders: [
                        {
                            id: 'reminder-1',
                            growId: 'missing-grow',
                            type: 'watering',
                            title: 'Water',
                            intervalDays: 1,
                            nextDue: '2024-01-02T09:00:00.000Z',
                            enabled: true,
                            createdAt: '2024-01-01T09:00:00.000Z',
                            updatedAt: '2024-01-01T09:00:00.000Z',
                        },
                    ],
                    settings: null,
                },
            };

            const result = validateExportSchema(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Duplicate data.grows id: grow-1');
            expect(result.errors).toContain('Duplicate data.plants id: plant-1');
            expect(result.errors).toContain('Invalid data.plants[0].growId reference');
            expect(result.errors).toContain('Invalid data.fertilizerMixes[0].growId reference');
            expect(result.errors).toContain('Invalid data.reminders[0].growId reference');
        });

        it('should reject watering records that reference missing or cross-grow fertilizer mixes', () => {
            const invalidData = {
                metadata: validExportData.metadata,
                data: {
                    grows: [
                        { id: 'grow-1', name: 'Grow 1', startDate: '2024-01-01', currentPhase: 'Seedling', phaseHistory: [] },
                        { id: 'grow-2', name: 'Grow 2', startDate: '2024-01-01', currentPhase: 'Seedling', phaseHistory: [] },
                    ],
                    plants: [
                        {
                            id: 'plant-1',
                            growId: 'grow-1',
                            name: 'Plant 1',
                            genetic: 'Test Kush',
                            manufacturer: 'GrowPanion',
                            type: 'feminized',
                            propagationMethod: 'seed',
                            waterings: [
                                { date: '2024-01-02', amount: '500', mixId: 'missing-mix' },
                                { date: '2024-01-03', amount: '500', mixId: 'mix-grow-2' },
                            ],
                        },
                    ],
                    fertilizerMixes: [
                        {
                            id: 'mix-grow-2',
                            growId: 'grow-2',
                            name: 'Other Grow Mix',
                            waterAmount: '1000',
                            fertilizers: [{ name: 'Base', amount: '3' }],
                        },
                    ],
                    settings: null,
                },
            };

            const result = validateExportSchema(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid data.plants[0].waterings[0].mixId reference');
            expect(result.errors).toContain('Invalid data.plants[0].waterings[1].mixId grow reference');
        });

        it('should reject reminders that reference missing or cross-grow plants', () => {
            const invalidData = {
                metadata: validExportData.metadata,
                data: {
                    grows: [
                        { id: 'grow-1', name: 'Grow 1', startDate: '2024-01-01', currentPhase: 'Seedling', phaseHistory: [] },
                        { id: 'grow-2', name: 'Grow 2', startDate: '2024-01-01', currentPhase: 'Seedling', phaseHistory: [] },
                    ],
                    plants: [
                        {
                            id: 'plant-grow-2',
                            growId: 'grow-2',
                            name: 'Plant 2',
                            genetic: 'Test Kush',
                            manufacturer: 'GrowPanion',
                            type: 'feminized',
                            propagationMethod: 'seed',
                        },
                    ],
                    fertilizerMixes: [],
                    reminders: [
                        {
                            id: 'reminder-missing-plant',
                            growId: 'grow-1',
                            plantId: 'missing-plant',
                            type: 'watering',
                            title: 'Water missing plant',
                            intervalDays: 1,
                            nextDue: '2024-01-02T09:00:00.000Z',
                            enabled: true,
                            createdAt: '2024-01-01T09:00:00.000Z',
                            updatedAt: '2024-01-01T09:00:00.000Z',
                        },
                        {
                            id: 'reminder-cross-grow-plant',
                            growId: 'grow-1',
                            plantId: 'plant-grow-2',
                            type: 'watering',
                            title: 'Water cross-grow plant',
                            intervalDays: 1,
                            nextDue: '2024-01-02T09:00:00.000Z',
                            enabled: true,
                            createdAt: '2024-01-01T09:00:00.000Z',
                            updatedAt: '2024-01-01T09:00:00.000Z',
                        },
                    ],
                    settings: null,
                },
            };

            const result = validateExportSchema(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Invalid data.reminders[0].plantId reference');
            expect(result.errors).toContain('Invalid data.reminders[1].plantId grow reference');
        });

        it('should validate references using trimmed ids', () => {
            const dataWithWhitespaceIds = {
                metadata: validExportData.metadata,
                data: {
                    grows: [
                        { id: ' grow-1 ', name: ' Grow 1 ', startDate: '2024-01-01', currentPhase: 'Seedling', phaseHistory: [] },
                    ],
                    plants: [
                        {
                            id: ' plant-1 ',
                            growId: 'grow-1',
                            name: ' Plant 1 ',
                            genetic: 'Test Kush',
                            manufacturer: 'GrowPanion',
                            type: 'feminized',
                            propagationMethod: 'seed',
                            waterings: [{ date: '2024-01-02', amount: '500', mixId: ' mix-1 ' }],
                        },
                    ],
                    fertilizerMixes: [
                        {
                            id: 'mix-1',
                            growId: ' grow-1 ',
                            name: ' Mix 1 ',
                            waterAmount: '1000',
                            fertilizers: [{ name: 'Base', amount: '3' }],
                        },
                    ],
                    reminders: [
                        {
                            id: ' reminder-1 ',
                            growId: ' grow-1 ',
                            plantId: 'plant-1',
                            type: 'watering',
                            title: ' Water ',
                            intervalDays: 1,
                            nextDue: '2024-01-02T09:00:00.000Z',
                            enabled: true,
                            createdAt: '2024-01-01T09:00:00.000Z',
                            updatedAt: '2024-01-01T09:00:00.000Z',
                        },
                    ],
                    settings: null,
                },
            };

            const result = validateExportSchema(dataWithWhitespaceIds);

            expect(result.valid).toBe(true);
        });
    });

    describe('importData', () => {
        it('should reject invalid data before starting a database transaction', async () => {
            const invalidExportData = {
                metadata: {
                    version: '1.0',
                    appVersion: '0.1.0',
                    exportedAt: '2024-01-15T10:30:00.000Z',
                    encrypted: false,
                },
                data: {
                    grows: [],
                    plants: [{ id: 'plant-1', growId: 'missing-grow', name: 'Plant 1' }],
                    fertilizerMixes: [],
                    settings: null,
                },
            } as unknown as ExportData;

            const result = await importData(invalidExportData, 'merge');

            expect(result.success).toBe(false);
            expect(result.errors).toContain('Invalid data.plants[0].growId reference');
            expect(db.transaction).not.toHaveBeenCalled();
        });

        it('should normalize imported records before writing them to the database', async () => {
            const exportData = {
                metadata: {
                    version: ' 1.0 ',
                    appVersion: ' 0.1.0 ',
                    exportedAt: '2024-01-15T10:30:00.000Z',
                    encrypted: false,
                },
                data: {
                    grows: [
                        { id: ' grow-1 ', name: ' Grow 1 ', startDate: '2024-01-01', currentPhase: 'Seedling', phaseHistory: [] },
                    ],
                    plants: [
                        {
                            id: ' plant-1 ',
                            growId: ' grow-1 ',
                            name: ' Plant 1 ',
                            genetic: ' Test Kush ',
                            manufacturer: ' GrowPanion ',
                            type: 'feminized',
                            propagationMethod: 'seed',
                        },
                    ],
                    fertilizerMixes: [],
                    settings: null,
                },
            } as ExportData;

            const result = await importData(exportData, 'merge');

            expect(result.success).toBe(true);
            expect(db.grows.put).toHaveBeenCalledWith(expect.objectContaining({
                id: 'grow-1',
                name: 'Grow 1',
            }));
            expect(db.plants.put).toHaveBeenCalledWith(expect.objectContaining({
                id: 'plant-1',
                growId: 'grow-1',
                name: 'Plant 1',
                genetic: 'Test Kush',
                manufacturer: 'GrowPanion',
            }));
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
            expect(summary.strains).toBe(0);
            expect(summary.reminders).toBe(0);
            expect(summary.hasSettings).toBe(false);
            expect(summary.hasNotificationSettings).toBe(false);
            expect(summary.exportDate).toBe('2024-01-15T10:30:00.000Z');
            expect(summary.version).toBe('1.0');
        });

        it('should not report settings for legacy summaries with missing settings', () => {
            const exportData = {
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
                },
            } as unknown as ExportData;

            const summary = getExportSummary(exportData);

            expect(summary.hasSettings).toBe(false);
            expect(summary.hasNotificationSettings).toBe(false);
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
                    strains: [{ id: '1' }, { id: '2' }] as any,
                    reminders: [{ id: '1' }] as any,
                    settings: { id: 'global', sensors: [] },
                    notificationSettings: {
                        id: 'notification-settings',
                        enabled: false,
                        permission: 'default',
                        defaultReminderTime: '09:00',
                        soundEnabled: true,
                    },
                },
            };

            const summary = getExportSummary(exportData);

            expect(summary.grows).toBe(2);
            expect(summary.plants).toBe(3);
            expect(summary.fertilizerMixes).toBe(1);
            expect(summary.strains).toBe(2);
            expect(summary.reminders).toBe(1);
            expect(summary.hasSettings).toBe(true);
            expect(summary.hasNotificationSettings).toBe(true);
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

        it('should detect backup extensions case-insensitively', () => {
            expect(detectFileType('backup.JSON', '{"test": "data"}')).toBe('plain');
            expect(detectFileType('backup.GROWPANION', 'anyContent')).toBe('encrypted');
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
