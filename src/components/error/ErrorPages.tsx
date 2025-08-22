'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  Shield, 
  RefreshCw, 
  Home,
  Clock,
  Database,
  Search,
  ArrowLeft,
  Phone,
  Mail
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AppError } from '@/lib/types';

// =================================================================
// NETWORK ERROR PAGE
// =================================================================

interface NetworkErrorPageProps {
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function NetworkErrorPage({ onRetry, onGoHome }: NetworkErrorPageProps) {
  const router = useRouter();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              {isOnline ? (
                <Wifi className="h-6 w-6 text-orange-600" />
              ) : (
                <WifiOff className="h-6 w-6 text-orange-600" />
              )}
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">
            {isOnline ? 'Connection Timeout' : 'No Internet Connection'}
          </CardTitle>
          <CardDescription>
            {isOnline 
              ? 'The server is taking too long to respond. This might be temporary.'
              : 'Please check your internet connection and try again.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-3">
            <Button 
              onClick={onRetry || (() => window.location.reload())}
              className="w-full"
              disabled={!isOnline}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {isOnline ? 'Try Again' : 'Retry'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onGoHome || (() => router.push('/'))}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          <div className="bg-gray-100 p-3 rounded-lg text-xs text-gray-600">
            <p className="font-medium mb-1">Troubleshooting:</p>
            <ul className="space-y-1">
              <li>• Check your internet connection</li>
              <li>• Try refreshing the page</li>
              <li>• Contact support if the problem persists</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =================================================================
// PERMISSION DENIED PAGE
// =================================================================

interface PermissionErrorPageProps {
  error?: AppError;
  onGoBack?: () => void;
  onSignOut?: () => void;
}

export function PermissionErrorPage({ error, onGoBack, onSignOut }: PermissionErrorPageProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">
            Access Denied
          </CardTitle>
          <CardDescription>
            You don't have permission to view this page or perform this action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error.message}</p>
              {error.action && (
                <p className="text-xs text-red-600 mt-1">
                  Action: {error.action}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={onGoBack || (() => router.back())}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            
            <Button 
              onClick={onSignOut || (() => router.push('/login'))}
              className="w-full"
            >
              Sign In Again
            </Button>
          </div>

          <div className="bg-gray-100 p-3 rounded-lg text-xs text-gray-600">
            <p className="font-medium mb-1">Need help?</p>
            <ul className="space-y-1">
              <li>• Contact your event organizer</li>
              <li>• Check if you're signed in to the correct account</li>
              <li>• Verify your role permissions</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =================================================================
// NOT FOUND PAGE
// =================================================================

interface NotFoundPageProps {
  title?: string;
  description?: string;
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

export function NotFoundPage({ 
  title = "Page Not Found",
  description = "The page you're looking for doesn't exist or has been moved.",
  searchQuery,
  onSearch
}: NotFoundPageProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Search className="h-6 w-6 text-gray-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">
            {title}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {onSearch && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search for events, teams..."
                defaultValue={searchQuery}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onSearch(e.currentTarget.value);
                  }
                }}
              />
              <Button 
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement;
                  if (input && onSearch) onSearch(input.value);
                }}
                variant="outline"
                className="w-full"
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/')}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => router.back()}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =================================================================
// SERVER ERROR PAGE
// =================================================================

interface ServerErrorPageProps {
  error?: AppError;
  errorId?: string;
  onRetry?: () => void;
  onReport?: () => void;
}

export function ServerErrorPage({ error, errorId, onRetry, onReport }: ServerErrorPageProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Database className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">
            Server Error
          </CardTitle>
          <CardDescription>
            We're experiencing technical difficulties. Our team has been notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                {error.message}
              </p>
              {errorId && (
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  Error ID: {errorId}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            {onRetry && (
              <Button 
                onClick={onRetry}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          <div className="bg-gray-100 p-3 rounded-lg text-xs text-gray-600">
            <p className="font-medium mb-2">Still having issues?</p>
            <div className="space-y-2">
              <a 
                href="mailto:support@hunterpace.com" 
                className="flex items-center text-primary-600 hover:text-primary-700"
              >
                <Mail className="mr-2 h-3 w-3" />
                support@hunterpace.com
              </a>
              <a 
                href="tel:+1-555-PACE-APP" 
                className="flex items-center text-primary-600 hover:text-primary-700"
              >
                <Phone className="mr-2 h-3 w-3" />
                (555) PACE-APP
              </a>
            </div>
            {errorId && (
              <p className="mt-2 text-gray-500">
                Please include Error ID: <code className="font-mono">{errorId}</code>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =================================================================
// MAINTENANCE PAGE
// =================================================================

interface MaintenancePageProps {
  estimatedTime?: string;
  message?: string;
}

export function MaintenancePage({ 
  estimatedTime, 
  message = "We're currently performing scheduled maintenance to improve your experience." 
}: MaintenancePageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">
            Under Maintenance
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {estimatedTime && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-sm text-blue-700 font-medium">
                Estimated completion time:
              </p>
              <p className="text-lg text-blue-800 font-bold">
                {estimatedTime}
              </p>
            </div>
          )}

          <div className="text-center">
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Status
            </Button>
          </div>

          <div className="bg-gray-100 p-3 rounded-lg text-xs text-gray-600">
            <p className="font-medium mb-1">What's being updated:</p>
            <ul className="space-y-1">
              <li>• Performance improvements</li>
              <li>• Security updates</li>
              <li>• New features</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}