'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  parseError,
  categorizeError,
  shouldRetry,
  getRetryDelay,
  shouldShowToUser,
  logError,
  ErrorCategory,
  type ErrorDetails
} from '@/utils/errorHandling';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  maxRetries?: number;
  onError?: (error: ErrorDetails) => void;
  context?: string;
}

interface ErrorState {
  error: ErrorDetails | null;
  isRetrying: boolean;
  retryCount: number;
  lastRetryAt: Date | null;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    showToast = true,
    logToConsole = true,
    maxRetries = 3,
    onError,
    context
  } = options;

  const { toast } = useToast();
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    lastRetryAt: null,
  });

  const handleError = useCallback((error: any, customMessage?: string) => {
    const parsedError = parseError(error);
    const category = categorizeError(parsedError);

    // Log error if enabled
    if (logToConsole) {
      logError(parsedError, context);
    }

    // Update error state
    setErrorState(prev => ({
      ...prev,
      error: parsedError,
    }));

    // Show toast notification if enabled and error should be shown to user
    if (showToast && shouldShowToUser(parsedError)) {
      const title = getErrorTitle(category);
      const description = customMessage || parsedError.message;

      toast({
        title,
        description,
        variant: 'destructive',
      });
    }

    // Call custom error handler if provided
    if (onError) {
      onError(parsedError);
    }

    return parsedError;
  }, [toast, showToast, logToConsole, onError, context]);

  const retryOperation = useCallback(async (
    operation: () => Promise<any>,
    customRetries?: number
  ): Promise<any> => {
    const maxRetriesForOperation = customRetries ?? maxRetries;
    let lastError: ErrorDetails | null = null;

    for (let attempt = 0; attempt <= maxRetriesForOperation; attempt++) {
      try {
        setErrorState(prev => ({
          ...prev,
          isRetrying: attempt > 0,
          retryCount: attempt,
          lastRetryAt: attempt > 0 ? new Date() : prev.lastRetryAt,
        }));

        const result = await operation();
        
        // Success - reset error state
        setErrorState({
          error: null,
          isRetrying: false,
          retryCount: 0,
          lastRetryAt: null,
        });

        return result;
      } catch (error) {
        lastError = parseError(error);

        // Don't retry if it's the last attempt or error shouldn't be retried
        if (attempt === maxRetriesForOperation || !shouldRetry(lastError, attempt)) {
          break;
        }

        // Wait before retrying
        const delay = getRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed
    setErrorState(prev => ({
      ...prev,
      isRetrying: false,
      error: lastError,
    }));

    if (lastError) {
      throw lastError;
    }
  }, [maxRetries]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      lastRetryAt: null,
    });
  }, []);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    customMessage?: string
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, customMessage);
        return undefined;
      }
    };
  }, [handleError]);

  return {
    // State
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    lastRetryAt: errorState.lastRetryAt,
    
    // Methods
    handleError,
    retryOperation,
    clearError,
    withErrorHandling,
  };
}

/**
 * Hook for handling form errors specifically
 */
export function useFormErrorHandler() {
  const { handleError, error, clearError } = useErrorHandler({
    showToast: false, // Forms typically show errors inline
    context: 'form'
  });

  const getFieldError = useCallback((fieldName: string): string | undefined => {
    if (!error?.context?.errors) return undefined;

    const fieldError = error.context.errors[fieldName];
    return fieldError?.message || fieldError;
  }, [error]);

  const hasFieldError = useCallback((fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  }, [getFieldError]);

  const setFieldError = useCallback((fieldName: string, message: string) => {
    // This would typically integrate with your form library
    // For now, we'll just log it
    console.warn(`Field error for ${fieldName}: ${message}`);
  }, []);

  return {
    error,
    handleError,
    clearError,
    getFieldError,
    hasFieldError,
    setFieldError,
  };
}

/**
 * Hook for handling network errors with retry functionality
 */
export function useNetworkErrorHandler() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Listen for online/offline events
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  const errorHandler = useErrorHandler({
    context: 'network',
    showToast: true,
  });

  const handleNetworkError = useCallback((error: any) => {
    const parsedError = parseError(error);
    const category = categorizeError(parsedError);

    // Add offline context if applicable
    if (!isOnline && category === ErrorCategory.NETWORK) {
      parsedError.context = {
        ...parsedError.context,
        offline: true,
      };
    }

    return errorHandler.handleError(parsedError);
  }, [errorHandler, isOnline]);

  return {
    ...errorHandler,
    isOnline,
    handleError: handleNetworkError,
  };
}

/**
 * Get appropriate error title based on category
 */
function getErrorTitle(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Connection Error';
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication Error';
    case ErrorCategory.AUTHORIZATION:
      return 'Permission Error';
    case ErrorCategory.VALIDATION:
      return 'Validation Error';
    case ErrorCategory.SERVER:
      return 'Server Error';
    case ErrorCategory.CLIENT:
      return 'Request Error';
    default:
      return 'Error';
  }
}