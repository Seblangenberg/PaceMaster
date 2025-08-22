'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug,
  ArrowLeft
} from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  resetError: () => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component with professional styling
 */
function DefaultErrorFallback({ error, errorInfo, resetError }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600">
            We encountered an unexpected error. Please try refreshing the page or contact support if the issue persists.
          </p>
        </div>

        {/* Error Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Details</AlertTitle>
          <AlertDescription className="mt-2">
            {error.message || 'An unknown error occurred'}
          </AlertDescription>
        </Alert>

        {/* Development Error Details */}
        {isDevelopment && (
          <div className="bg-gray-900 text-white p-4 rounded-lg text-sm overflow-auto max-h-40">
            <p className="font-medium mb-2">Stack Trace:</p>
            <pre className="whitespace-pre-wrap text-xs">
              {error.stack}
            </pre>
            {errorInfo.componentStack && (
              <>
                <p className="font-medium mb-2 mt-4">Component Stack:</p>
                <pre className="whitespace-pre-wrap text-xs">
                  {errorInfo.componentStack}
                </pre>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={resetError}
            className="w-full bg-primary-600 hover:bg-primary-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex items-center justify-center"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center justify-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Support Information */}
        <div className="text-center text-sm text-gray-500">
          <p>
            If this problem continues, please{' '}
            <a 
              href="mailto:support@pacemaster.com"
              className="text-primary-600 hover:text-primary-700 underline"
            >
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Auth-specific error fallback with equestrian branding
 */
export function AuthErrorFallback({ error, errorInfo, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-green-50">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_35%,rgba(0,0,0,.05)_35%,rgba(0,0,0,.05)_65%,transparent_65%),linear-gradient(-45deg,transparent_35%,rgba(0,0,0,.05)_35%,rgba(0,0,0,.05)_65%,transparent_65%)] bg-[length:20px_20px] opacity-30" />
      
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Authentication Error
              </h2>
              <p className="text-gray-600">
                There was a problem with the authentication system
              </p>
            </div>

            {/* Error Message */}
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error.message || 'An authentication error occurred'}
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={resetError}
                className="w-full bg-primary-600 hover:bg-primary-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Professional equestrian facility management
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Network error fallback for connection issues
 */
export function NetworkErrorFallback({ error, errorInfo, resetError }: ErrorFallbackProps) {
  const isOffline = !navigator.onLine;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {isOffline ? 'Connection Lost' : 'Network Error'}
          </h1>
          <p className="text-gray-600">
            {isOffline 
              ? 'Please check your internet connection and try again.'
              : 'We are having trouble connecting to our servers. Please try again.'
            }
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isOffline ? 'No internet connection detected' : error.message}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button
            onClick={resetError}
            className="w-full bg-primary-600 hover:bg-primary-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isOffline ? 'Check Connection' : 'Retry'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;