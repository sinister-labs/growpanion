import { useState, useCallback } from 'react';
import { z } from 'zod';
import { validateFormData } from '@/lib/validation-utils';

/**
 * Custom hook for form validation using Zod schemas
 */
export function useFormValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback((data: unknown): { isValid: boolean; data?: T } => {
    setIsValidating(true);
    
    const result = validateFormData(schema, data);
    setErrors(result.errors);
    setIsValidating(false);
    
    return {
      isValid: result.isValid,
      data: result.data
    };
  }, [schema]);

  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((fieldName: string, errorMessage: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    isValidating,
    hasErrors,
    validate,
    clearError,
    clearAllErrors,
    setFieldError
  };
}