/**
 * Comprehensive error handling utilities for PaceMaster
 */

export interface ErrorDetails {
  message: string;
  code?: string;
  statusCode?: number;
  timestamp: string;
  context?: Record<string, any>;
}

export interface ErrorReport {
  error: ErrorDetails;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Error categories for better error handling
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Common error codes with user-friendly messages
 */
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request took too long. Please try again.',
  CONNECTION_REFUSED: 'Unable to connect to the server. Please try again later.',
  
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
  ACCOUNT_LOCKED: 'Your account has been temporarily locked. Please contact support.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before signing in.',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'You don\'t have permission to perform this action.',
  ACCESS_DENIED: 'Access denied. Please contact your administrator.',
  
  // Validation errors
  INVALID_EMAIL: 'Please enter a valid email address.',
  WEAK_PASSWORD: 'Password must meet security requirements.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_FORMAT: 'Please check the format and try again.',
  
  // Server errors
  SERVER_ERROR: 'A server error occurred. Our team has been notified.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  
  // Default
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again or contact support.',
} as const;

/**
 * Parse and categorize errors from different sources
 */
export function parseError(error: any): ErrorDetails {
  const timestamp = new Date().toISOString();
  
  // Handle API errors
  if (error?.response) {
    const { status, data } = error.response;
    return {
      message: data?.message || data?.error || getMessageForStatusCode(status),
      code: data?.code || `HTTP_${status}`,
      statusCode: status,
      timestamp,
      context: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      }
    };
  }
  
  // Handle network errors
  if (error?.request) {
    return {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      code: 'NETWORK_ERROR',
      timestamp,
      context: {
        type: 'network',
        url: error.config?.url,
      }
    };
  }
  
  // Handle Firebase Auth errors
  if (error?.code?.startsWith('auth/')) {
    return {
      message: getFirebaseErrorMessage(error.code),
      code: error.code,
      timestamp,
      context: {
        type: 'firebase_auth',
      }
    };
  }
  
  // Handle validation errors
  if (error?.name === 'ValidationError' || error?.errors) {
    return {
      message: error.message || ERROR_MESSAGES.INVALID_FORMAT,
      code: 'VALIDATION_ERROR',
      timestamp,
      context: {
        type: 'validation',
        errors: error.errors,
      }
    };
  }
  
  // Handle JavaScript errors
  if (error instanceof Error) {
    return {
      message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
      code: error.name || 'JAVASCRIPT_ERROR',
      timestamp,
      context: {
        type: 'javascript',
        stack: error.stack,
      }
    };
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error || ERROR_MESSAGES.UNKNOWN_ERROR,
      code: 'STRING_ERROR',
      timestamp,
    };
  }
  
  // Default case
  return {
    message: ERROR_MESSAGES.UNKNOWN_ERROR,
    code: 'UNKNOWN_ERROR',
    timestamp,
    context: {
      type: 'unknown',
      originalError: error,
    }
  };
}

/**
 * Get user-friendly message for HTTP status codes
 */
function getMessageForStatusCode(status: number): string {
  switch (status) {
    case 400:
      return 'Bad request. Please check your input and try again.';
    case 401:
      return ERROR_MESSAGES.INVALID_CREDENTIALS;
    case 403:
      return ERROR_MESSAGES.ACCESS_DENIED;
    case 404:
      return 'The requested resource was not found.';
    case 408:
      return ERROR_MESSAGES.TIMEOUT_ERROR;
    case 409:
      return 'This action conflicts with existing data. Please refresh and try again.';
    case 422:
      return 'The submitted data is invalid. Please check your input.';
    case 429:
      return ERROR_MESSAGES.RATE_LIMITED;
    case 500:
      return ERROR_MESSAGES.SERVER_ERROR;
    case 502:
    case 503:
      return ERROR_MESSAGES.SERVICE_UNAVAILABLE;
    case 504:
      return ERROR_MESSAGES.TIMEOUT_ERROR;
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
}

/**
 * Get user-friendly message for Firebase Auth errors
 */
function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return ERROR_MESSAGES.INVALID_CREDENTIALS;
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return ERROR_MESSAGES.WEAK_PASSWORD;
    case 'auth/invalid-email':
      return ERROR_MESSAGES.INVALID_EMAIL;
    case 'auth/user-disabled':
      return ERROR_MESSAGES.ACCOUNT_LOCKED;
    case 'auth/too-many-requests':
      return ERROR_MESSAGES.RATE_LIMITED;
    case 'auth/network-request-failed':
      return ERROR_MESSAGES.NETWORK_ERROR;
    case 'auth/email-not-verified':
      return ERROR_MESSAGES.EMAIL_NOT_VERIFIED;
    case 'auth/expired-action-code':
      return 'This reset code has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'Invalid reset code. Please check the code and try again.';
    case 'auth/requires-recent-login':
      return 'Please sign in again to complete this action.';
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
}

/**
 * Categorize errors for better handling
 */
export function categorizeError(error: ErrorDetails): ErrorCategory {
  if (error.code?.includes('NETWORK') || error.statusCode === 0) {
    return ErrorCategory.NETWORK;
  }
  
  if (error.code?.startsWith('auth/') || [401, 403].includes(error.statusCode || 0)) {
    return ErrorCategory.AUTHENTICATION;
  }
  
  if (error.code?.includes('PERMISSION') || error.statusCode === 403) {
    return ErrorCategory.AUTHORIZATION;
  }
  
  if (error.code?.includes('VALIDATION') || [400, 422].includes(error.statusCode || 0)) {
    return ErrorCategory.VALIDATION;
  }
  
  if (error.statusCode && error.statusCode >= 500) {
    return ErrorCategory.SERVER;
  }
  
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return ErrorCategory.CLIENT;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Check if an error should trigger a retry
 */
export function shouldRetry(error: ErrorDetails, attemptCount: number): boolean {
  const maxRetries = 3;
  
  if (attemptCount >= maxRetries) {
    return false;
  }
  
  const category = categorizeError(error);
  
  // Retry network errors and server errors
  if (category === ErrorCategory.NETWORK || category === ErrorCategory.SERVER) {
    return true;
  }
  
  // Retry specific status codes
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (error.statusCode && retryableStatusCodes.includes(error.statusCode)) {
    return true;
  }
  
  return false;
}

/**
 * Get retry delay with exponential backoff
 */
export function getRetryDelay(attemptCount: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 10000; // 10 seconds
  
  const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
  
  // Add some jitter to avoid thundering herd
  const jitter = Math.random() * 0.3 * delay;
  
  return delay + jitter;
}

/**
 * Create an error report for logging/monitoring
 */
export function createErrorReport(
  error: ErrorDetails,
  userId?: string,
  sessionId?: string
): ErrorReport {
  return {
    error,
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId,
    sessionId,
  };
}

/**
 * Log error to console in development
 */
export function logError(error: ErrorDetails, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔥 Error${context ? ` (${context})` : ''}`);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Status:', error.statusCode);
    console.error('Timestamp:', error.timestamp);
    if (error.context) {
      console.error('Context:', error.context);
    }
    console.groupEnd();
  }
}

/**
 * Determine if error should be reported to user
 */
export function shouldShowToUser(error: ErrorDetails): boolean {
  const category = categorizeError(error);
  
  // Always show validation and authentication errors
  if (category === ErrorCategory.VALIDATION || category === ErrorCategory.AUTHENTICATION) {
    return true;
  }
  
  // Show network errors to help user understand
  if (category === ErrorCategory.NETWORK) {
    return true;
  }
  
  // Don't show internal server errors in detail
  if (category === ErrorCategory.SERVER) {
    return false;
  }
  
  return true;
}