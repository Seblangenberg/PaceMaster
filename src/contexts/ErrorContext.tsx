'use client';

import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import type { AppError, ErrorCode } from '@/lib/types';
import ErrorBoundary from '@/components/ErrorBoundary';

// =================================================================
// ERROR CONTEXT TYPES
// =================================================================

interface ErrorContextType {
  // Current error state
  globalError: AppError | null;
  errorHistory: AppError[];
  
  // Error handling methods
  reportError: (error: unknown, context?: string, userId?: string) => AppError;
  clearError: () => void;
  dismissError: (errorId: string) => void;
  
  // Error statistics
  errorCount: number;
  lastError: AppError | null;
  
  // Retry functionality
  retryLastAction: () => Promise<void>;
  canRetry: boolean;
}

interface ErrorProviderProps {
  children: React.ReactNode;
  enableErrorReporting?: boolean;
  maxErrorHistory?: number;
}

// =================================================================
// ERROR LOGGING SERVICE
// =================================================================

class ErrorLogger {
  private static instance: ErrorLogger;
  private errorQueue: AppError[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 1000;

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  async logError(error: AppError): Promise<void> {
    // Add to queue for batch processing
    this.errorQueue.push(error);
    
    // Log immediately in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(error);
    }

    // Process queue
    this.processErrorQueue();
  }

  private logToConsole(error: AppError): void {
    const style = 'color: #ef4444; font-weight: bold;';
    console.group(`%c🚨 Hunter Pace App Error`, style);
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    console.log('Timestamp:', error.timestamp.toISOString());
    console.log('Recoverable:', error.recoverable);
    
    if (error.userId) {
      console.log('User ID:', error.userId);
    }
    
    if (error.action) {
      console.log('Action:', error.action);
    }
    
    if (error.details) {
      console.log('Details:', error.details);
    }
    
    console.groupEnd();
  }

  private async processErrorQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process errors in batches
      const batch = this.errorQueue.splice(0, 10); // Process up to 10 errors at once
      
      // In production, you would send to your error tracking service
      // For now, we'll simulate this with a timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // You could integrate with services like:
      // - Sentry: Sentry.captureException(error)
      // - LogRocket: LogRocket.captureException(error)
      // - Firebase Crashlytics: crashlytics().recordError(error)
      // - Custom API endpoint: await fetch('/api/errors', { method: 'POST', body: JSON.stringify(errors) })
      
    } catch (error) {
      // Re-add errors to queue if logging fails
      console.error('Failed to log errors:', error);
    } finally {
      this.isProcessing = false;
      
      // Continue processing if more errors were added
      if (this.errorQueue.length > 0) {
        setTimeout(() => this.processErrorQueue(), this.retryDelay);
      }
    }
  }

  // Get error statistics
  getStats(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.errorQueue.length,
      isProcessing: this.isProcessing,
    };
  }
}

// =================================================================
// ERROR UTILITIES
// =================================================================

function createAppError(
  error: unknown,
  context?: string,
  userId?: string
): AppError {
  const timestamp = new Date();
  let code: ErrorCode = 'UNKNOWN_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = null;
  let recoverable = false;

  if (error instanceof Error) {
    message = error.message;
    details = {
      name: error.name,
      stack: error.stack,
    };

    // Categorize common error types
    if (error.message.includes('fetch') || error.message.includes('network')) {
      code = 'NETWORK_ERROR';
      recoverable = true;
    } else if (error.message.includes('permission') || error.message.includes('auth')) {
      code = 'PERMISSION_DENIED';
      recoverable = false;
    } else if (error.message.includes('validation')) {
      code = 'VALIDATION_ERROR';
      recoverable = true;
    } else if (error.message.includes('timeout')) {
      code = 'TIMEOUT';
      recoverable = true;
    }
  } else if (typeof error === 'string') {
    message = error;
    recoverable = true;
  } else if (error && typeof error === 'object') {
    const errorObj = error as any;
    message = errorObj.message || message;
    code = errorObj.code || code;
    details = errorObj;
    recoverable = errorObj.recoverable ?? recoverable;
  }

  return {
    code,
    message,
    details,
    timestamp,
    userId,
    action: context,
    recoverable,
  };
}

// =================================================================
// ERROR CONTEXT
// =================================================================

const ErrorContext = createContext<ErrorContextType | null>(null);

export function ErrorProvider({ 
  children, 
  enableErrorReporting = true,
  maxErrorHistory = 50 
}: ErrorProviderProps) {
  const { user } = useAuth();
  const [globalError, setGlobalError] = useState<AppError | null>(null);
  const [errorHistory, setErrorHistory] = useState<AppError[]>([]);
  const lastActionRef = useRef<(() => Promise<void>) | null>(null);
  const errorLogger = ErrorLogger.getInstance();

  const reportError = useCallback((
    error: unknown, 
    context?: string, 
    userId?: string
  ): AppError => {
    const appError = createAppError(error, context, userId || user?.id);
    
    // Update state
    setGlobalError(appError);
    setErrorHistory(prev => {
      const newHistory = [appError, ...prev];
      return newHistory.slice(0, maxErrorHistory);
    });

    // Log error if enabled
    if (enableErrorReporting) {
      errorLogger.logError(appError);
    }

    return appError;
  }, [user?.id, enableErrorReporting, maxErrorHistory, errorLogger]);

  const clearError = useCallback(() => {
    setGlobalError(null);
  }, []);

  const dismissError = useCallback((errorId: string) => {
    setErrorHistory(prev => prev.filter(err => 
      err.timestamp.getTime().toString() !== errorId
    ));
    
    if (globalError && globalError.timestamp.getTime().toString() === errorId) {
      setGlobalError(null);
    }
  }, [globalError]);

  const retryLastAction = useCallback(async () => {
    if (lastActionRef.current) {
      try {
        clearError();
        await lastActionRef.current();
      } catch (error) {
        reportError(error, 'retry_action');
      }
    }
  }, [clearError, reportError]);

  const setLastAction = useCallback((action: () => Promise<void>) => {
    lastActionRef.current = action;
  }, []);

  const canRetry = globalError?.recoverable && lastActionRef.current !== null;

  const contextValue: ErrorContextType = {
    globalError,
    errorHistory,
    reportError,
    clearError,
    dismissError,
    errorCount: errorHistory.length,
    lastError: errorHistory[0] || null,
    retryLastAction,
    canRetry: canRetry || false,
  };

  // Global error handler for unhandled promises
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError(event.reason, 'unhandled_promise_rejection');
    };

    const handleError = (event: ErrorEvent) => {
      reportError(event.error, 'global_error');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [reportError]);

  return (
    <ErrorContext.Provider value={contextValue}>
      <ErrorBoundary 
        onError={(error, errorInfo) => {
          reportError(error, 'component_error', user?.id);
        }}
      >
        {children}
      </ErrorBoundary>
    </ErrorContext.Provider>
  );
}

// =================================================================
// HOOKS
// =================================================================

export function useError(): ErrorContextType {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

// Enhanced error handler with context
export function useErrorHandler(actionContext?: string) {
  const { reportError, clearError, retryLastAction, canRetry } = useError();
  
  const handleError = useCallback((error: unknown, specificContext?: string) => {
    const context = specificContext || actionContext || 'unknown_action';
    return reportError(error, context);
  }, [reportError, actionContext]);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, context);
        return null;
      }
    };
  }, [handleError]);

  return {
    handleError,
    clearError,
    retryLastAction,
    canRetry,
    withErrorHandling,
  };
}

// Hunter Pace specific error handlers
export function useHunterPaceErrorHandler() {
  const errorHandler = useErrorHandler('hunter_pace');

  const handleEventError = useCallback((error: unknown, eventId?: string) => {
    return errorHandler.handleError(error, `event_${eventId || 'unknown'}`);
  }, [errorHandler]);

  const handleTeamError = useCallback((error: unknown, teamId?: string) => {
    return errorHandler.handleError(error, `team_${teamId || 'unknown'}`);
  }, [errorHandler]);

  const handleTimingError = useCallback((error: unknown, action?: string) => {
    return errorHandler.handleError(error, `timing_${action || 'unknown'}`);
  }, [errorHandler]);

  return {
    ...errorHandler,
    handleEventError,
    handleTeamError,
    handleTimingError,
  };
}

export default ErrorProvider;