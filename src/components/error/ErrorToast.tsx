'use client';

import { useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useError } from '@/contexts/ErrorContext';
import type { AppError } from '@/lib/types';

// =================================================================
// ERROR TOAST COMPONENT
// =================================================================

interface ErrorToastProps {
  error: AppError;
  onDismiss: () => void;
  onRetry?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function ErrorToast({ 
  error, 
  onDismiss, 
  onRetry, 
  autoClose = true, 
  duration = 5000 
}: ErrorToastProps) {
  // Auto dismiss after duration
  useEffect(() => {
    if (autoClose && !error.recoverable) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, error.recoverable, onDismiss]);

  const getErrorIcon = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'PERMISSION_DENIED':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'VALIDATION_ERROR':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Connection Problem';
      case 'TIMEOUT':
        return 'Request Timeout';
      case 'PERMISSION_DENIED':
        return 'Access Denied';
      case 'VALIDATION_ERROR':
        return 'Invalid Input';
      case 'FIREBASE_ERROR':
        return 'Database Error';
      case 'NOT_FOUND':
        return 'Not Found';
      default:
        return 'Error';
    }
  };

  const getBorderColor = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return 'border-l-orange-500';
      case 'PERMISSION_DENIED':
        return 'border-l-red-500';
      case 'VALIDATION_ERROR':
        return 'border-l-blue-500';
      default:
        return 'border-l-red-500';
    }
  };

  const getActionText = () => {
    if (error.code === 'NETWORK_ERROR') return 'Check Connection';
    if (error.code === 'TIMEOUT') return 'Try Again';
    if (error.recoverable) return 'Retry';
    return null;
  };

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-md w-full
      bg-white rounded-lg border-l-4 shadow-lg
      animate-in slide-in-from-right-2
      ${getBorderColor()}
    `}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {getErrorIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900">
              {getErrorTitle()}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {error.message}
            </p>
            {error.action && (
              <p className="text-xs text-gray-500 mt-1">
                Action: {error.action}
              </p>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {(error.recoverable || getActionText()) && (
          <div className="mt-3 flex gap-2">
            {onRetry && error.recoverable && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {getActionText()}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// =================================================================
// GLOBAL ERROR TOAST MANAGER
// =================================================================

export function GlobalErrorToast() {
  const { globalError, clearError, retryLastAction, canRetry } = useError();

  if (!globalError) return null;

  return (
    <ErrorToast
      error={globalError}
      onDismiss={clearError}
      onRetry={canRetry ? retryLastAction : undefined}
      autoClose={!globalError.recoverable}
      duration={globalError.recoverable ? 10000 : 5000}
    />
  );
}

// =================================================================
// ERROR BANNER FOR CRITICAL ERRORS
// =================================================================

interface ErrorBannerProps {
  error: AppError;
  onDismiss: () => void;
  onRetry?: () => void;
  showDetails?: boolean;
}

export function ErrorBanner({ 
  error, 
  onDismiss, 
  onRetry, 
  showDetails = false 
}: ErrorBannerProps) {
  const isNetworkError = error.code === 'NETWORK_ERROR';
  const isPermissionError = error.code === 'PERMISSION_DENIED';

  return (
    <div className={`
      border-l-4 p-4 mb-4
      ${isNetworkError ? 'bg-orange-50 border-orange-400' : ''}
      ${isPermissionError ? 'bg-red-50 border-red-400' : ''}
      ${!isNetworkError && !isPermissionError ? 'bg-red-50 border-red-400' : ''}
    `}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isNetworkError ? (
            <AlertCircle className="h-5 w-5 text-orange-400" />
          ) : isPermissionError ? (
            <AlertTriangle className="h-5 w-5 text-red-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-400" />
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${
            isNetworkError ? 'text-orange-800' : 'text-red-800'
          }`}>
            {isNetworkError ? 'Connection Issue' : 'Error Occurred'}
          </h3>
          <div className={`text-sm mt-1 ${
            isNetworkError ? 'text-orange-700' : 'text-red-700'
          }`}>
            <p>{error.message}</p>
            {showDetails && error.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium">
                  Technical Details
                </summary>
                <pre className="text-xs mt-1 bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
        <div className="ml-auto pl-3 flex gap-2">
          {onRetry && error.recoverable && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          <button
            onClick={onDismiss}
            className={`${
              isNetworkError ? 'text-orange-400 hover:text-orange-600' : 'text-red-400 hover:text-red-600'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}