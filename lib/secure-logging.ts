/**
 * Secure logging utilities to prevent credential exposure
 */

// List of sensitive field names that should not be logged
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'credential',
  'authorization',
  'auth',
  'clientSecret',
  'tuyaClientSecret',
  'access_token',
  'refresh_token',
  'clientId',
  'tuyaClientId'
];

/**
 * Sanitizes an object by removing or masking sensitive fields
 * @param obj The object to sanitize
 * @returns Sanitized object safe for logging
 */
export function sanitizeForLogging(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item));
  }

  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Secure console.error that automatically sanitizes objects
 * @param message Error message
 * @param data Optional data to log (will be sanitized)
 */
export function secureError(message: string, data?: unknown): void {
  if (data) {
    console.error(message, sanitizeForLogging(data));
  } else {
    console.error(message);
  }
}

/**
 * Secure console.warn that automatically sanitizes objects
 * @param message Warning message
 * @param data Optional data to log (will be sanitized)
 */
export function secureWarn(message: string, data?: unknown): void {
  if (data) {
    console.warn(message, sanitizeForLogging(data));
  } else {
    console.warn(message);
  }
}

/**
 * Secure console.log for development that automatically sanitizes objects
 * Note: Should be avoided in production
 * @param message Log message
 * @param data Optional data to log (will be sanitized)
 */
export function secureLog(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(message, sanitizeForLogging(data));
    } else {
      console.log(message);
    }
  }
}