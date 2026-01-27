/**
 * Crypto utilities for client-side AES-256-GCM encryption
 * Uses Web Crypto API for secure encryption/decryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Derives an AES-256 key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Import password as raw key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );
    
    // Derive AES-256 key using PBKDF2
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as unknown as BufferSource,
            iterations: ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts data with AES-256-GCM using a password
 * Returns base64-encoded string with format: salt:iv:ciphertext
 */
export async function encrypt(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Encrypt data
    const ciphertext = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        dataBuffer
    );
    
    // Combine salt + iv + ciphertext and encode as base64
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts AES-256-GCM encrypted data with a password
 * Expects base64-encoded string with format: salt:iv:ciphertext
 */
export async function decrypt(encryptedData: string, password: string): Promise<string> {
    // Decode from base64
    const combined = new Uint8Array(
        atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );
    
    // Extract salt, IV, and ciphertext
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}

/**
 * Validates if a string is potentially encrypted data
 * (base64 encoded with minimum expected length)
 */
export function isEncryptedFormat(data: string): boolean {
    try {
        // Check if it's valid base64
        const decoded = atob(data);
        // Minimum length: salt(16) + iv(12) + at least some ciphertext
        return decoded.length >= SALT_LENGTH + IV_LENGTH + 16;
    } catch {
        return false;
    }
}

/**
 * Tests if decryption is possible with given password
 */
export async function testDecryption(encryptedData: string, password: string): Promise<boolean> {
    try {
        await decrypt(encryptedData, password);
        return true;
    } catch {
        return false;
    }
}
