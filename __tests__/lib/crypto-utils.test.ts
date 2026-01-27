import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, isEncryptedFormat, testDecryption } from '@/lib/crypto-utils';

describe('crypto-utils', () => {
    describe('encrypt/decrypt', () => {
        it('should encrypt and decrypt a simple string', async () => {
            const plaintext = 'Hello, World!';
            const password = 'test-password-123';
            
            const encrypted = await encrypt(plaintext, password);
            const decrypted = await decrypt(encrypted, password);
            
            expect(decrypted).toBe(plaintext);
        });

        it('should encrypt and decrypt JSON data', async () => {
            const data = {
                name: 'Test Grow',
                plants: [{ id: '1', name: 'Plant 1' }],
                settings: { theme: 'dark' }
            };
            const plaintext = JSON.stringify(data);
            const password = 'secure-password-456';
            
            const encrypted = await encrypt(plaintext, password);
            const decrypted = await decrypt(encrypted, password);
            
            expect(JSON.parse(decrypted)).toEqual(data);
        });

        it('should produce different ciphertext for same plaintext (random IV/salt)', async () => {
            const plaintext = 'Same message';
            const password = 'same-password';
            
            const encrypted1 = await encrypt(plaintext, password);
            const encrypted2 = await encrypt(plaintext, password);
            
            // Encrypted outputs should be different due to random IV and salt
            expect(encrypted1).not.toBe(encrypted2);
            
            // But both should decrypt to the same value
            expect(await decrypt(encrypted1, password)).toBe(plaintext);
            expect(await decrypt(encrypted2, password)).toBe(plaintext);
        });

        it('should fail decryption with wrong password', async () => {
            const plaintext = 'Secret data';
            const correctPassword = 'correct-password';
            const wrongPassword = 'wrong-password';
            
            const encrypted = await encrypt(plaintext, correctPassword);
            
            await expect(decrypt(encrypted, wrongPassword)).rejects.toThrow();
        });

        it('should handle empty string', async () => {
            const plaintext = '';
            const password = 'password123';
            
            const encrypted = await encrypt(plaintext, password);
            const decrypted = await decrypt(encrypted, password);
            
            expect(decrypted).toBe('');
        });

        it('should handle unicode characters', async () => {
            const plaintext = '🌱 Cannabis Grow 🌿 日本語テスト émojis';
            const password = 'unicode-test';
            
            const encrypted = await encrypt(plaintext, password);
            const decrypted = await decrypt(encrypted, password);
            
            expect(decrypted).toBe(plaintext);
        });

        it('should handle large data', async () => {
            const plaintext = 'x'.repeat(100000); // 100KB of data
            const password = 'large-data-test';
            
            const encrypted = await encrypt(plaintext, password);
            const decrypted = await decrypt(encrypted, password);
            
            expect(decrypted).toBe(plaintext);
        });
    });

    describe('isEncryptedFormat', () => {
        it('should return true for encrypted data', async () => {
            const encrypted = await encrypt('test', 'password');
            expect(isEncryptedFormat(encrypted)).toBe(true);
        });

        it('should return false for plain JSON', () => {
            const json = JSON.stringify({ test: 'data' });
            expect(isEncryptedFormat(json)).toBe(false);
        });

        it('should return false for random string', () => {
            expect(isEncryptedFormat('hello world')).toBe(false);
        });

        it('should return false for short base64', () => {
            // Too short to be encrypted data
            expect(isEncryptedFormat(btoa('short'))).toBe(false);
        });
    });

    describe('testDecryption', () => {
        it('should return true for correct password', async () => {
            const encrypted = await encrypt('test data', 'correct');
            expect(await testDecryption(encrypted, 'correct')).toBe(true);
        });

        it('should return false for wrong password', async () => {
            const encrypted = await encrypt('test data', 'correct');
            expect(await testDecryption(encrypted, 'wrong')).toBe(false);
        });
    });
});
