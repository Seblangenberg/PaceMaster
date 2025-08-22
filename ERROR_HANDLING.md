# 🛡️ Error Handling & Resilience Guide

## Overview

The Hunter Pace App features a comprehensive error handling and resilience system designed to provide excellent user experience even when things go wrong. This system includes automatic error categorization, user-friendly error messages, retry mechanisms, offline support, and detailed error logging.

## 🏗️ Architecture

### Core Components

1. **Error Context** (`@/contexts/ErrorContext`)
   - Global error state management
   - Error categorization and logging
   - Retry functionality
   - Error history tracking

2. **Error Boundaries** (`@/components/ErrorBoundary`)
   - React error boundary components
   - Different fallback UIs for different scenarios
   - Component-level error recovery

3. **Error Pages** (`@/components/error/ErrorPages`)
   - User-friendly error pages
   - Network, permission, server, and maintenance error pages
   - Contextual help and recovery options

4. **Error Logging Service**
   - Structured error logging
   - Batch processing for performance
   - Integration ready for external services

## 🎯 Error Categories

The system automatically categorizes errors into:

- **NETWORK_ERROR**: Connection issues, timeouts
- **FIREBASE_ERROR**: Database and authentication errors  
- **VALIDATION_ERROR**: Form validation and input errors
- **PERMISSION_DENIED**: Access control violations
- **NOT_FOUND**: Missing resources
- **TIMEOUT**: Request timeouts
- **UNKNOWN_ERROR**: Uncategorized errors

## 🚀 Quick Start

### Basic Error Handling

```typescript
import { useHunterPaceErrorHandler } from '@/contexts/ErrorContext';

function MyComponent() {
  const { handleError, withErrorHandling } = useHunterPaceErrorHandler();
  
  // Manual error handling
  const saveEvent = async () => {
    try {
      await api.events.createEvent(eventData);
    } catch (error) {
      handleError(error, 'save_event');
    }
  };
  
  // Automatic error handling
  const loadEvent = withErrorHandling(
    async (eventId: string) => {
      const response = await api.events.getEvent(eventId);
      setEvent(response.data);
    },
    'load_event'
  );
}
```

### Component Error Boundaries

```typescript
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary onError={(error, errorInfo) => console.log(error)}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### Global Error State

```typescript
import { useError } from '@/contexts/ErrorContext';

function MyComponent() {
  const { 
    globalError, 
    clearError, 
    retryLastAction, 
    canRetry 
  } = useError();
  
  return (
    <div>
      {globalError && (
        <div className="error-banner">
          {globalError.message}
          {canRetry && (
            <button onClick={retryLastAction}>Retry</button>
          )}
        </div>
      )}
    </div>
  );
}
```

## 🔧 Advanced Usage

### Custom Error Types

```typescript
import { useError } from '@/contexts/ErrorContext';

function MyComponent() {
  const { reportError } = useError();
  
  const handleCustomError = () => {
    const customError = {
      code: 'CUSTOM_ERROR',
      message: 'Something specific went wrong',
      recoverable: true,
      details: { context: 'user_action' }
    };
    
    reportError(customError, 'custom_action');
  };
}
```

### Hunter Pace Specific Handlers

```typescript
import { useHunterPaceErrorHandler } from '@/contexts/ErrorContext';

function EventComponent() {
  const { handleEventError, handleTeamError, handleTimingError } = useHunterPaceErrorHandler();
  
  const saveTeam = async (teamData) => {
    try {
      await api.teams.create(teamData);
    } catch (error) {
      // Automatically adds context about team operations
      handleTeamError(error, teamData.id);
    }
  };
}
```

### Offline Error Handling

```typescript
import { useOfflineStorage } from '@/hooks/useOfflineStorage';

function OfflineComponent() {
  const { isOnline, pendingCount, performAction } = useOfflineStorage();
  
  const saveTeamOffline = async (teamData) => {
    await performAction('CREATE_TEAM', teamData);
    // Will automatically sync when online
  };
  
  return (
    <div>
      {!isOnline && <OfflineBanner />}
      {pendingCount > 0 && <span>Pending: {pendingCount}</span>}
    </div>
  );
}
```

## 🎨 Error UI Components

### Error Toast

```typescript
import { ErrorToast } from '@/components/error/ErrorToast';

<ErrorToast 
  error={error}
  onDismiss={() => setError(null)}
  onRetry={retryAction}
  autoClose={true}
  duration={5000}
/>
```

### Error Banner

```typescript
import { ErrorBanner } from '@/components/error/ErrorToast';

<ErrorBanner 
  error={error}
  onDismiss={() => setError(null)}
  onRetry={retryAction}
  showDetails={process.env.NODE_ENV === 'development'}
/>
```

### Error Pages

```typescript
import { NetworkErrorPage, PermissionErrorPage } from '@/components/error/ErrorPages';

// For network errors
<NetworkErrorPage 
  onRetry={() => window.location.reload()}
  onGoHome={() => router.push('/')}
/>

// For permission errors  
<PermissionErrorPage 
  error={error}
  onGoBack={() => router.back()}
  onSignOut={() => auth.signOut()}
/>
```

## 🔄 Retry Mechanisms

### Automatic Retry

The system automatically retries certain types of errors:
- Network errors (3 attempts with exponential backoff)
- Server errors (500, 502, 503, 504)
- Timeout errors

### Manual Retry

```typescript
const { retryLastAction, canRetry } = useError();

// Retry the last failed action
if (canRetry) {
  await retryLastAction();
}
```

### Custom Retry Logic

```typescript
const { withErrorHandling } = useHunterPaceErrorHandler();

const retryableOperation = withErrorHandling(
  async () => {
    // Your operation here
    return await api.someEndpoint();
  },
  'operation_context'
);
```

## 📱 Offline Support

### Offline Indicators

- **OfflineBanner**: Shows connection status
- **NetworkStatusIndicator**: Shows connection type
- **PendingActionsDisplay**: Shows queued actions

### Offline Operations

```typescript
import { useOfflineStorage } from '@/hooks/useOfflineStorage';

const { performAction, syncPendingActions, pendingCount } = useOfflineStorage();

// Queue actions for offline
await performAction('CREATE_TEAM', teamData);
await performAction('UPDATE_TIME', timingData);

// Manual sync when back online
await syncPendingActions();
```

## 📊 Error Logging

### Development Logging

In development, all errors are logged to the console with:
- Error categorization
- Stack traces
- Context information
- User actions leading to error

### Production Logging

In production, errors are:
- Batched for performance
- Sent to logging service
- Sanitized of sensitive data
- Structured for analysis

### Custom Logging Integration

```typescript
// In ErrorContext.tsx, modify the ErrorLogger class:

class ErrorLogger {
  async logError(error: AppError): Promise<void> {
    // Your custom logging service
    await fetch('/api/errors', {
      method: 'POST',
      body: JSON.stringify(error)
    });
    
    // Or integrate with services like:
    // Sentry.captureException(error);
    // LogRocket.captureException(error);
    // Firebase.crashlytics().recordError(error);
  }
}
```

## 🛠️ Configuration

### Error Provider Setup

```typescript
// In your app layout
<ErrorProvider 
  enableErrorReporting={true}
  maxErrorHistory={50}
>
  <App />
</ErrorProvider>
```

### Environment Variables

```bash
# Enable detailed error reporting
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true

# Error logging endpoint
NEXT_PUBLIC_ERROR_ENDPOINT=https://api.yourservice.com/errors

# Show stack traces in development
SHOW_STACK_TRACES=true
```

## 🧪 Testing Error Handling

### Manual Testing

Use the error examples component:

```typescript
import { ErrorHandlingExamples } from '@/components/error/ErrorExamples';

// Add to your development routes
<ErrorHandlingExamples />
```

### Automated Testing

```typescript
// Test error boundary behavior
it('should handle component errors', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };
  
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});

// Test error recovery
it('should allow error recovery', async () => {
  const { retryLastAction } = useError();
  
  // Trigger error
  fireEvent.click(screen.getByText('Cause Error'));
  
  // Retry
  fireEvent.click(screen.getByText('Retry'));
  
  await waitFor(() => {
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
});
```

## 📋 Best Practices

### Do's ✅

- Always categorize errors appropriately
- Provide user-friendly error messages  
- Include contextual information
- Make errors recoverable when possible
- Log errors for monitoring
- Test error scenarios regularly
- Use specific error handlers for different domains

### Don'ts ❌

- Don't expose sensitive information in errors
- Don't ignore non-recoverable errors
- Don't show technical details to end users
- Don't retry non-retryable errors infinitely
- Don't block the UI permanently on errors
- Don't log sensitive user data

### Error Message Guidelines

- **Be specific**: "Failed to save team #5" vs "Save failed"
- **Be actionable**: "Check your internet connection and try again"
- **Be empathetic**: "We're sorry, something went wrong"
- **Be helpful**: "Contact support with error ID: ABC123"

## 🔍 Monitoring and Analytics

### Error Metrics to Track

- Error rate by category
- Recovery success rate  
- User actions leading to errors
- Most common error scenarios
- Performance impact of error handling

### Integration Examples

```typescript
// Google Analytics
gtag('event', 'exception', {
  description: error.message,
  fatal: !error.recoverable
});

// Custom metrics
fetch('/api/metrics', {
  method: 'POST',
  body: JSON.stringify({
    event: 'error_occurred',
    category: error.code,
    recoverable: error.recoverable,
    context: error.action
  })
});
```

## 🆘 Troubleshooting

### Common Issues

1. **Errors not being caught**
   - Ensure components are wrapped in ErrorBoundary
   - Check that async errors are properly handled
   - Verify ErrorProvider is at root level

2. **Infinite retry loops**
   - Check retry conditions in `shouldRetry()`
   - Verify exponential backoff is working
   - Set maximum retry limits

3. **Missing error context**
   - Ensure error handlers are called with context
   - Check that error categorization is working
   - Verify logging configuration

### Debug Mode

Enable debug logging:

```typescript
// In development
localStorage.setItem('hunter-pace-debug', 'true');

// This will show additional error information
```

## 🔧 Customization

### Custom Error Categories

```typescript
// Add to types.ts
export type ErrorCode = 
  | 'FIREBASE_ERROR'
  | 'NETWORK_ERROR'
  | 'CUSTOM_BUSINESS_ERROR' // Your custom error
  | ...existing codes;

// Add to error handling logic
export function categorizeError(error: ErrorDetails): ErrorCategory {
  if (error.code === 'CUSTOM_BUSINESS_ERROR') {
    return ErrorCategory.BUSINESS_LOGIC;
  }
  // ... existing logic
}
```

### Custom Error Pages

```typescript
// Create custom error fallback
function CustomErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="custom-error-page">
      <h1>Oops! Something went wrong in the Hunter Pace</h1>
      <p>{error.message}</p>
      <button onClick={resetError}>Try Again</button>
    </div>
  );
}

// Use with ErrorBoundary
<ErrorBoundary fallback={CustomErrorFallback}>
  <Component />
</ErrorBoundary>
```

This comprehensive error handling system ensures that your Hunter Pace app provides excellent user experience even when encountering problems, with automatic recovery, helpful error messages, and robust offline support.