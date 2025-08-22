'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WifiOff, Wifi, Download, RotateCcw as Sync, AlertTriangle } from 'lucide-react';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useError } from '@/contexts/ErrorContext';
import type { OfflineAction } from '@/lib/types';

// =================================================================
// OFFLINE BANNER COMPONENT
// =================================================================

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const { pendingCount } = useOfflineStorage();

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50 px-4 py-2
      ${isOnline ? 'bg-blue-500' : 'bg-orange-500'}
      text-white text-sm text-center
      transition-all duration-300
    `}>
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Sync className="h-4 w-4 animate-spin" />
            <span>Syncing {pendingCount} pending changes...</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You're offline - changes will sync when reconnected</span>
            {pendingCount > 0 && (
              <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">
                {pendingCount} pending
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// =================================================================
// OFFLINE PAGE COMPONENT
// =================================================================

interface OfflinePageProps {
  onRetry?: () => void;
  showInstallPrompt?: boolean;
  onInstall?: () => void;
}

export function OfflinePage({ onRetry, showInstallPrompt = false, onInstall }: OfflinePageProps) {
  const { pendingCount, syncPendingActions } = useOfflineStorage();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncPendingActions();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [syncPendingActions]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <WifiOff className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">
            You're Offline
          </CardTitle>
          <CardDescription>
            No internet connection detected. Some features may be limited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Offline Status */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">Working Offline</p>
            </div>
            <p className="text-xs text-orange-700 mt-1">
              Your changes will be saved locally and synced when you're back online.
            </p>
            {pendingCount > 0 && (
              <p className="text-xs text-orange-600 mt-2 font-medium">
                {pendingCount} changes waiting to sync
              </p>
            )}
          </div>

          {/* Available Features */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-medium text-green-800 mb-2">
              Available Offline:
            </p>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• View existing events and teams</li>
              <li>• Record timing data</li>
              <li>• Add new teams and divisions</li>
              <li>• Export results</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={onRetry || (() => window.location.reload())}
              className="w-full"
              variant="outline"
            >
              <Wifi className="mr-2 h-4 w-4" />
              Check Connection
            </Button>

            {pendingCount > 0 && (
              <Button 
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full"
                variant="secondary"
              >
                {isSyncing ? (
                  <Sync className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sync className="mr-2 h-4 w-4" />
                )}
                {isSyncing ? 'Syncing...' : `Sync ${pendingCount} Changes`}
              </Button>
            )}

            {showInstallPrompt && onInstall && (
              <Button 
                onClick={onInstall}
                className="w-full"
                variant="ghost"
              >
                <Download className="mr-2 h-4 w-4" />
                Install App for Better Offline Experience
              </Button>
            )}
          </div>

          {/* Tips */}
          <div className="bg-gray-100 p-3 rounded-lg text-xs text-gray-600">
            <p className="font-medium mb-1">Offline Tips:</p>
            <ul className="space-y-1">
              <li>• Data is automatically saved locally</li>
              <li>• Install the app for better offline performance</li>
              <li>• Changes sync automatically when connected</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =================================================================
// PENDING ACTIONS DISPLAY
// =================================================================

interface PendingActionsDisplayProps {
  actions: OfflineAction[];
  onClearAction?: (actionId: string) => void;
  onRetryAction?: (actionId: string) => void;
}

export function PendingActionsDisplay({ 
  actions, 
  onClearAction, 
  onRetryAction 
}: PendingActionsDisplayProps) {
  if (actions.length === 0) {
    return null;
  }

  const getActionIcon = (type: OfflineAction['type']) => {
    switch (type) {
      case 'CREATE_TEAM':
        return '👥';
      case 'UPDATE_TEAM':
        return '✏️';
      case 'UPDATE_TIME':
        return '⏱️';
      case 'CREATE_EVENT':
        return '📅';
      case 'UPDATE_EVENT':
        return '📝';
      default:
        return '💾';
    }
  };

  const getActionDescription = (action: OfflineAction) => {
    switch (action.type) {
      case 'CREATE_TEAM':
        return `Create team "${action.data.name}"`;
      case 'UPDATE_TEAM':
        return `Update team #${action.data.number}`;
      case 'UPDATE_TIME':
        return `Update timing for team #${action.data.teamNumber}`;
      case 'CREATE_EVENT':
        return `Create event "${action.data.name}"`;
      case 'UPDATE_EVENT':
        return `Update event "${action.data.name}"`;
      default:
        return 'Unknown action';
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Pending Changes ({actions.length})
        </CardTitle>
        <CardDescription className="text-xs">
          These changes will sync when you're back online
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map((action) => (
            <div 
              key={action.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs"
            >
              <div className="flex items-center gap-2">
                <span>{getActionIcon(action.type)}</span>
                <span>{getActionDescription(action)}</span>
              </div>
              <div className="flex gap-1">
                {onRetryAction && (
                  <button
                    onClick={() => onRetryAction(action.id)}
                    className="text-blue-600 hover:text-blue-800 px-1"
                    title="Retry"
                  >
                    🔄
                  </button>
                )}
                {onClearAction && (
                  <button
                    onClick={() => onClearAction(action.id)}
                    className="text-red-600 hover:text-red-800 px-1"
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =================================================================
// NETWORK STATUS INDICATOR
// =================================================================

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('');

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const updateConnectionInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection?.effectiveType || '');
      }
    };

    setIsOnline(navigator.onLine);
    updateConnectionInfo();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', updateConnectionInfo);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  return (
    <div className={`
      flex items-center gap-1 px-2 py-1 rounded-full text-xs
      ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
    `}>
      {isOnline ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span>
        {isOnline ? 'Online' : 'Offline'}
        {connectionType && ` (${connectionType.toUpperCase()})`}
      </span>
    </div>
  );
}