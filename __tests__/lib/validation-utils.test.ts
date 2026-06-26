import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { sanitizeNumber, validateFormData } from '@/lib/validation-utils';

describe('validation utilities', () => {
    describe('sanitizeNumber', () => {
        it('accepts finite numbers and numeric strings in range', () => {
            expect(sanitizeNumber(12, 0, 20)).toBe(12);
            expect(sanitizeNumber('12.5', 0, 20)).toBe(12.5);
        });

        it('rejects empty and non-numeric values instead of coercing them to zero', () => {
            expect(sanitizeNumber('', 0, 20)).toBeNull();
            expect(sanitizeNumber('   ', 0, 20)).toBeNull();
            expect(sanitizeNumber(null, 0, 20)).toBeNull();
            expect(sanitizeNumber(false, 0, 20)).toBeNull();
        });

        it('rejects non-finite or out-of-range values', () => {
            expect(sanitizeNumber(Number.NaN, 0, 20)).toBeNull();
            expect(sanitizeNumber(Number.POSITIVE_INFINITY, 0, 20)).toBeNull();
            expect(sanitizeNumber('-1', 0, 20)).toBeNull();
            expect(sanitizeNumber('21', 0, 20)).toBeNull();
        });
    });

    describe('validateFormData', () => {
        it('preserves root-level validation errors for invalid form payloads', () => {
            const result = validateFormData(z.object({ name: z.string() }), null);

            expect(result.isValid).toBe(false);
            expect(result.errors._form).toBeTruthy();
        });
    });
});
