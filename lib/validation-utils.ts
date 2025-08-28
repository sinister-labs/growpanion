import { z } from 'zod';

/**
 * Validation utilities for form and API data validation
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  fieldErrors?: Record<string, string[]>;
}

/**
 * Validates data against a Zod schema and returns formatted result
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validation result with success flag and errors
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    } else {
      // Format Zod errors into user-friendly messages
      const errors = result.error.errors.map(err => err.message);
      const fieldErrors: Record<string, string[]> = {};
      
      result.error.errors.forEach(err => {
        const path = err.path.join('.');
        if (path) {
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path].push(err.message);
        }
      });
      
      return {
        success: false,
        errors,
        fieldErrors
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: ['Validation failed due to unexpected error']
    };
  }
}

/**
 * Validates data and throws an error if validation fails
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = validateData(schema, data);
  
  if (!result.success) {
    throw new ValidationError(result.errors || [], result.fieldErrors);
  }
  
  return result.data!;
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    public errors: string[],
    public fieldErrors?: Record<string, string[]>
  ) {
    super(`Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationError';
  }
}

/**
 * Validates form data and returns formatted errors for UI display
 * @param schema Zod schema to validate against
 * @param data Form data to validate
 * @returns Object with field-specific error messages
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { isValid: boolean; errors: Record<string, string>; data?: T } {
  const result = validateData(schema, data);
  
  if (result.success) {
    return {
      isValid: true,
      errors: {},
      data: result.data
    };
  }
  
  // Convert field errors to simple string messages for forms
  const errors: Record<string, string> = {};
  if (result.fieldErrors) {
    Object.entries(result.fieldErrors).forEach(([field, messages]) => {
      errors[field] = messages[0]; // Take first error for each field
    });
  }
  
  return {
    isValid: false,
    errors
  };
}

/**
 * Validates partial data (useful for updating existing records)
 * @param schema Zod schema to validate against
 * @param data Partial data to validate
 * @returns Validation result
 */
export function validatePartialData<T>(
  schema: z.ZodObject<any>,
  data: unknown
): ValidationResult<Partial<T>> {
  try {
    const partialSchema = schema.partial();
    return validateData(partialSchema, data) as ValidationResult<Partial<T>>;
  } catch (error) {
    return {
      success: false,
      errors: ['Partial validation failed due to unexpected error']
    };
  }
}

/**
 * Sanitizes and validates string input
 * @param input Raw string input
 * @param maxLength Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input.trim().slice(0, maxLength);
}

/**
 * Validates and sanitizes numeric input
 * @param input Raw input that should be a number
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @returns Validated number or null if invalid
 */
export function sanitizeNumber(
  input: unknown,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER
): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : Number(input);
  
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  
  return num;
}

/**
 * Validates email format (basic validation)
 * @param email Email string to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates URL format
 * @param url URL string to validate
 * @returns Boolean indicating if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates date string format
 * @param dateStr Date string to validate
 * @returns Boolean indicating if date is valid
 */
export function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Creates a validation middleware for API routes
 * @param schema Zod schema for validation
 * @returns Validation function for API middleware
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    return validateOrThrow(schema, data);
  };
}