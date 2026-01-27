import '@testing-library/jest-dom';

// Mock crypto for Node.js environment (Web Crypto API)
// In jsdom, crypto is available but crypto.subtle might not be fully implemented
import { webcrypto } from 'crypto';

// Check if crypto.subtle is available, if not, use webcrypto
if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', {
        value: webcrypto,
        writable: true,
        configurable: true,
    });
}

// Mock TextEncoder/TextDecoder if not available
if (typeof globalThis.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;
}
