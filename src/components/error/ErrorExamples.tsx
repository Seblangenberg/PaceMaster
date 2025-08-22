// =================================================================
// EXAMPLES: HOW TO USE ERROR HANDLING IN COMPONENTS
// =================================================================
// This file shows practical examples of using the error handling system

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHunterPaceErrorHandler } from '@/contexts/ErrorContext';
import { api } from '@/lib/api';

// =================================================================
// EXAMPLE 1: EVENT MANAGEMENT WITH ERROR HANDLING
// =================================================================

export function EventManagementExample() {
  const { handleEventError, withErrorHandling } = useHunterPaceErrorHandler();
  const [isLoading, setIsLoading] = useState(false);
  const [eventData, setEventData] = useState<any>(null);

  // Manual error handling approach
  const loadEventManual = async (eventId: string) => {
    setIsLoading(true);
    try {
      const response = await api.events.getEvent(eventId);
      if (response.data) {
        setEventData(response.data);
      }
    } catch (error) {
      // This will automatically categorize, log, and show appropriate UI
      handleEventError(error, eventId);
    } finally {
      setIsLoading(false);
    }
  };

  // Automatic error handling with wrapper
  const loadEventAutomatic = withErrorHandling(
    async (eventId: string) => {
      setIsLoading(true);
      const response = await api.events.getEvent(eventId);
      if (response.data) {
        setEventData(response.data);
      }
      setIsLoading(false);
    },
    'load_event'
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={() => loadEventManual('test-event-1')}
          disabled={isLoading}
        >
          Load Event (Manual Error Handling)
        </Button>
        
        <Button 
          onClick={() => loadEventAutomatic?.('test-event-2')}
          disabled={isLoading}
          variant="outline"
        >
          Load Event (Automatic Error Handling)
        </Button>

        {eventData && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">Event loaded successfully!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =================================================================
// EXAMPLE 2: FORM SUBMISSION WITH VALIDATION ERRORS
// =================================================================

export function FormSubmissionExample() {
  const { handleError } = useHunterPaceErrorHandler();
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Simulate form validation
      if (!formData.name) {
        throw new Error('Name is required');
      }
      
      if (!formData.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Simulate API call that might fail
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Success
      alert('Form submitted successfully!');
      
    } catch (error) {
      // Error handling will categorize this as VALIDATION_ERROR or NETWORK_ERROR
      handleError(error, 'form_submission');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form with Error Handling</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <Button type="submit" className="w-full">
            Submit Form
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// =================================================================
// EXAMPLE 3: ASYNC OPERATIONS WITH RETRY
// =================================================================

export function AsyncOperationExample() {
  const { handleError, retryLastAction, canRetry } = useHunterPaceErrorHandler();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Simulate unreliable API call
      if (Math.random() > 0.6) {
        throw new Error('Network timeout - please try again');
      }
      
      // Simulate successful response
      const data = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        status: 'active'
      }));
      
      setResults(data);
      
    } catch (error) {
      // This error will be marked as recoverable and allow retry
      handleError(error, 'fetch_data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Async Operation with Retry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={fetchData}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Fetch Data (60% Failure Rate)'}
          </Button>
          
          {canRetry && (
            <Button 
              onClick={retryLastAction}
              variant="outline"
            >
              Retry Last Action
            </Button>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Results:</h4>
            {results.map(item => (
              <div key={item.id} className="p-2 bg-gray-50 rounded">
                {item.name} - {item.status}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =================================================================
// EXAMPLE 4: COMPONENT-LEVEL ERROR BOUNDARY
// =================================================================

import ErrorBoundary from '@/components/ErrorBoundary';

function ProblematicComponent() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('This is a deliberate component error for testing');
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h4 className="font-medium mb-2">Problematic Component</h4>
      <p className="text-sm text-gray-600 mb-3">
        This component will throw an error when you click the button.
      </p>
      <Button 
        onClick={() => setShouldError(true)}
        variant="danger"
        size="sm"
      >
        Trigger Component Error
      </Button>
    </div>
  );
}

export function ComponentErrorBoundaryExample() {
  const [key, setKey] = useState(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Component Error Boundary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ErrorBoundary 
          key={key} // Reset boundary when key changes
          onError={(error, errorInfo) => {
            console.log('Component error caught:', error, errorInfo);
          }}
        >
          <ProblematicComponent />
        </ErrorBoundary>
        
        <Button 
          onClick={() => setKey(prev => prev + 1)}
          variant="outline"
          size="sm"
        >
          Reset Component
        </Button>
      </CardContent>
    </Card>
  );
}

// =================================================================
// EXAMPLE CONTAINER
// =================================================================

export function ErrorHandlingExamples() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Error Handling Examples</h2>
      <p className="text-gray-600">
        These examples demonstrate different error handling patterns in the Hunter Pace app.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EventManagementExample />
        <FormSubmissionExample />
        <AsyncOperationExample />
        <ComponentErrorBoundaryExample />
      </div>
    </div>
  );
}