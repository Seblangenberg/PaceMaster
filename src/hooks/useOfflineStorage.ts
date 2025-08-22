'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

export const useOfflineStorage = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const { toast } = useToast();

  // Initialize online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Syncing your data...",
      });
      syncPendingActions();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Working Offline",
        description: "Your changes will sync when you're back online.",
        variant: "destructive"
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Load pending actions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pendingOfflineActions');
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }, []);

  // Save pending actions to localStorage
  const savePendingActions = useCallback((actions: OfflineAction[]) => {
    try {
      localStorage.setItem('pendingOfflineActions', JSON.stringify(actions));
      setPendingActions(actions);
    } catch (error) {
      console.error('Failed to save pending actions:', error);
    }
  }, []);

  // Add action to offline queue
  const queueAction = useCallback((type: string, data: any): string => {
    const action: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      synced: false
    };

    const newActions = [...pendingActions, action];
    savePendingActions(newActions);

    if (!isOnline) {
      toast({
        title: "Action Queued",
        description: `${type} will sync when you're back online.`,
      });
    }

    return action.id;
  }, [pendingActions, savePendingActions, isOnline, toast]);

  // Sync pending actions when back online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0) {
      return;
    }

    const unsynced = pendingActions.filter(action => !action.synced);
    if (unsynced.length === 0) {
      return;
    }

    try {
      // In a real implementation, you'd send these to your API
      console.log('Syncing pending actions:', unsynced);
      
      // Simulate API calls
      for (const action of unsynced) {
        try {
          // Mock API call
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log(`Synced action: ${action.type}`, action.data);
          
          // Mark as synced
          action.synced = true;
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
        }
      }

      // Update pending actions
      const updatedActions = pendingActions.map(action => 
        unsynced.find(u => u.id === action.id) || action
      );
      
      // Remove synced actions after 24 hours
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      const filteredActions = updatedActions.filter(
        action => !action.synced || action.timestamp > cutoff
      );
      
      savePendingActions(filteredActions);

      if (unsynced.length > 0) {
        toast({
          title: "Sync Complete",
          description: `${unsynced.length} action(s) synced successfully.`,
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Some actions couldn't be synced. Will retry later.",
        variant: "destructive"
      });
    }
  }, [isOnline, pendingActions, savePendingActions, toast]);

  // Perform action (online immediately, offline queued)
  const performAction = useCallback(async (type: string, data: any, onlineAction?: () => Promise<any>) => {
    if (isOnline && onlineAction) {
      try {
        // Try to perform action online
        const result = await onlineAction();
        return result;
      } catch (error) {
        // If online action fails, queue it for later
        console.error('Online action failed, queuing for later:', error);
        queueAction(type, data);
        throw error;
      }
    } else {
      // Queue action for when back online
      queueAction(type, data);
      return null;
    }
  }, [isOnline, queueAction]);

  // Clear all pending actions (for testing/admin)
  const clearPendingActions = useCallback(() => {
    savePendingActions([]);
  }, [savePendingActions]);

  return {
    isOnline,
    pendingActions,
    pendingCount: pendingActions.filter(a => !a.synced).length,
    queueAction,
    performAction,
    syncPendingActions,
    clearPendingActions
  };
};
