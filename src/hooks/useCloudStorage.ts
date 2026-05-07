'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';
import type { SavedEvent } from '@/lib/types';

interface CloudStorageState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  hasLocalChanges: boolean;
}

interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  data: SavedEvent | null;
  timestamp: number;
  retryCount: number;
}

// Per-user localStorage keys. Without the user.id suffix, two users on the
// same browser would see each other's events / sync queue.
const eventsKeyFor = (uid: string) => `hunterPaceEvents:${uid}`;
const queueKeyFor = (uid: string) => `hunterPace_syncQueue:${uid}`;

// JSON.parse turns Dates into strings. Comparing a string to a Date with `>`
// always returns false (NaN coercion), which silently breaks the merge and
// causes data loss. Always rehydrate after reading from localStorage.
const hydrateLocalEvent = (raw: any): SavedEvent => ({
  ...raw,
  lastModified: raw?.lastModified ? new Date(raw.lastModified) : new Date(0),
  createdAt: raw?.createdAt ? new Date(raw.createdAt) : undefined,
  updatedAt: raw?.updatedAt ? new Date(raw.updatedAt) : undefined,
  eventDetails: {
    ...raw?.eventDetails,
    date: raw?.eventDetails?.date ? new Date(raw.eventDetails.date) : new Date(),
  },
  teams: Array.isArray(raw?.teams)
    ? raw.teams.map((team: any) => ({
        ...team,
        startTime: team?.startTime ? new Date(team.startTime) : undefined,
        finishTime: team?.finishTime ? new Date(team.finishTime) : undefined,
      }))
    : [],
});

const safeTime = (d: any): number => {
  if (!d) return 0;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
};

export const useCloudStorage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [state, setState] = useState<CloudStorageState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingChanges: 0,
    hasLocalChanges: false,
  });

  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);

  // =================================================================
  // ONLINE/OFFLINE DETECTION
  // =================================================================
  
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      toast({
        title: "Back Online",
        description: "Syncing your events...",
      });
      processSyncQueue();
    };
    
    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      toast({
        title: "Offline",
        description: "Changes are saved locally and will sync when reconnected.",
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // =================================================================
  // LOAD SYNC QUEUE FROM LOCALSTORAGE (per-user)
  // =================================================================

  useEffect(() => {
    if (!user) {
      setSyncQueue([]);
      return;
    }
    try {
      const storedQueue = localStorage.getItem(queueKeyFor(user.id));
      if (storedQueue) {
        setSyncQueue(JSON.parse(storedQueue));
      } else {
        setSyncQueue([]);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }, [user?.id]);

  // =================================================================
  // SAVE SYNC QUEUE TO LOCALSTORAGE
  // =================================================================

  const saveQueueToStorage = useCallback((queue: SyncQueueItem[]) => {
    if (!user) return;
    try {
      localStorage.setItem(queueKeyFor(user.id), JSON.stringify(queue));
      setState(prev => ({ ...prev, pendingChanges: queue.length }));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }, [user?.id]);

  // =================================================================
  // ADD ITEM TO SYNC QUEUE
  // =================================================================
  
  const addToSyncQueue = useCallback((item: Omit<SyncQueueItem, 'timestamp' | 'retryCount'>) => {
    const queueItem: SyncQueueItem = {
      ...item,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    setSyncQueue(prev => {
      // Remove any existing items for the same event
      const filtered = prev.filter(existing => existing.id !== item.id);
      const newQueue = [...filtered, queueItem];
      saveQueueToStorage(newQueue);
      return newQueue;
    });
  }, [saveQueueToStorage]);

  // =================================================================
  // SAVE EVENT — LOCAL ONLY (synchronous, no debounce)
  // Used for every state change so a refresh / crash / network blip
  // can never lose data sitting in React state.
  // =================================================================

  const saveEventLocal = useCallback((event: SavedEvent): boolean => {
    if (!user) return false;
    try {
      const key = eventsKeyFor(user.id);
      const stored = localStorage.getItem(key) || '[]';
      const parsed = JSON.parse(stored);
      const events: SavedEvent[] = Array.isArray(parsed) ? parsed : [];
      const idx = events.findIndex(e => e.id === event.id);
      const stamped: SavedEvent = {
        ...event,
        organizerId: user.id,
        lastModified: event.lastModified || new Date(),
      };
      if (idx >= 0) events[idx] = stamped;
      else events.push(stamped);
      localStorage.setItem(key, JSON.stringify(events));
      setState(prev => ({ ...prev, hasLocalChanges: true }));
      return true;
    } catch (err) {
      console.error('Failed to save locally:', err);
      return false;
    }
  }, [user?.id]);

  // =================================================================
  // SAVE EVENT (LOCAL + CLOUD)
  // =================================================================

  const saveEvent = useCallback(async (event: SavedEvent): Promise<void> => {
    if (!user) {
      throw new Error('Must be logged in to save events');
    }

    // 1. ALWAYS save to localStorage first (immediate backup)
    try {
      const key = eventsKeyFor(user.id);
      const stored = localStorage.getItem(key) || '[]';
      const events: SavedEvent[] = JSON.parse(stored);
      const eventIndex = events.findIndex(e => e.id === event.id);

      // PRESERVE the user-set lastModified — it's the edit timestamp,
      // not the save timestamp. Overwriting it here previously caused
      // the merge to mis-rank in-flight saves vs. fresh edits.
      const eventWithMetadata = {
        ...event,
        organizerId: user.id,
        updatedAt: new Date(),
        lastModified: event.lastModified || new Date(),
      };

      if (eventIndex >= 0) {
        events[eventIndex] = eventWithMetadata;
      } else {
        events.push(eventWithMetadata);
      }

      localStorage.setItem(key, JSON.stringify(events));
      setState(prev => ({ ...prev, hasLocalChanges: true }));
      
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw new Error('Failed to save locally');
    }

    // 2. If online, try to save to cloud immediately
    if (state.isOnline) {
      try {
        await saveToCloud(event);
        setState(prev => ({ ...prev, lastSync: new Date(), hasLocalChanges: false }));
      } catch (error) {
        console.warn('Failed to save to cloud, queuing for retry:', error);
        addToSyncQueue({ id: event.id, action: 'update', data: event });
      }
    } else {
      // 3. If offline, add to sync queue
      addToSyncQueue({ id: event.id, action: 'update', data: event });
    }
  }, [user, state.isOnline, addToSyncQueue]);

  // =================================================================
  // SAVE TO CLOUD (Firebase Firestore)
  // =================================================================
  
  const saveToCloud = useCallback(async (event: SavedEvent): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    setState(prev => ({ ...prev, isSyncing: true }));
    
    try {
      const eventDoc = {
        ...event,
        organizerId: user.id,
        createdAt: event.createdAt || new Date(),
        updatedAt: new Date(),
        // Ensure dates are proper Date objects for Firestore
        eventDetails: {
          ...event.eventDetails,
          date: event.eventDetails.date ? new Date(event.eventDetails.date) : new Date(),
        },
        teams: event.teams.map(team => ({
          ...team,
          startTime: team.startTime ? new Date(team.startTime) : undefined,
          finishTime: team.finishTime ? new Date(team.finishTime) : undefined,
        })),
        // Preserve user-set lastModified (edit time), not save time.
        lastModified: event.lastModified
          ? new Date(event.lastModified)
          : new Date(),
      };
      
      await setDoc(doc(db, 'events', event.id), eventDoc);
      
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [user]);

  // =================================================================
  // LOAD EVENTS FROM CLOUD
  // =================================================================
  
  const loadEventsFromCloud = useCallback(async (): Promise<SavedEvent[]> => {
    if (!user) return [];
    
    try {
      const q = query(
        collection(db, 'events'),
        where('organizerId', '==', user.id),
        orderBy('lastModified', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps back to Date objects
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastModified: doc.data().lastModified?.toDate(),
        eventDetails: {
          ...doc.data().eventDetails,
          date: doc.data().eventDetails?.date?.toDate(),
        },
        teams: doc.data().teams?.map((team: any) => ({
          ...team,
          startTime: team.startTime?.toDate(),
          finishTime: team.finishTime?.toDate(),
        })) || [],
      })) as SavedEvent[];
      
    } catch (error) {
      console.error('Failed to load events from cloud:', error);
      throw error;
    }
  }, [user]);

  // =================================================================
  // DELETE EVENT
  // =================================================================
  
  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    if (!user) return;
    // 1. Delete from localStorage immediately
    try {
      const key = eventsKeyFor(user.id);
      const stored = localStorage.getItem(key) || '[]';
      const events: SavedEvent[] = JSON.parse(stored);
      const filtered = events.filter(e => e.id !== eventId);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete from localStorage:', error);
    }

    // 2. Delete from cloud or queue for deletion
    if (state.isOnline) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
      } catch (error) {
        console.warn('Failed to delete from cloud, queuing:', error);
        addToSyncQueue({ id: eventId, action: 'delete', data: null });
      }
    } else {
      addToSyncQueue({ id: eventId, action: 'delete', data: null });
    }
  }, [user?.id, state.isOnline, addToSyncQueue]);

  // =================================================================
  // PROCESS SYNC QUEUE
  // =================================================================
  
  const processSyncQueue = useCallback(async (): Promise<void> => {
    if (!state.isOnline || syncQueue.length === 0) return;
    
    setState(prev => ({ ...prev, isSyncing: true }));
    
    const maxRetries = 3;
    const successful: string[] = [];
    const failed: SyncQueueItem[] = [];
    
    for (const item of syncQueue) {
      try {
        switch (item.action) {
          case 'update':
          case 'create':
            if (item.data) {
              await saveToCloud(item.data);
            }
            break;
          case 'delete':
            await deleteDoc(doc(db, 'events', item.id));
            break;
        }
        successful.push(item.id);
        
      } catch (error) {
        console.error(`Failed to sync ${item.action} for ${item.id}:`, error);
        
        if (item.retryCount < maxRetries) {
          failed.push({ ...item, retryCount: item.retryCount + 1 });
        } else {
          console.error(`Max retries exceeded for ${item.id}, dropping from queue`);
          // No toast — the CloudSyncStatus indicator already reflects this,
          // and a per-failure toast spams the screen on systemic errors.
        }
      }
    }
    
    // Functional update: items added to the queue WHILE we were processing
    // (e.g., a save that fired mid-drain) must be preserved. Replacing the
    // queue with `failed` alone would silently drop those new items.
    const successIds = new Set(successful);
    const failedById = new Map(failed.map(f => [f.id, f]));
    setSyncQueue(prev => {
      const next = prev
        .filter(item => !successIds.has(item.id))
        .map(item => failedById.get(item.id) ?? item);
      saveQueueToStorage(next);
      return next;
    });

    setState(prev => ({
      ...prev,
      isSyncing: false,
      lastSync: new Date(),
      hasLocalChanges: failed.length > 0,
    }));
    
    // No "Sync Complete" toast — CloudSyncStatus shows sync state.
  }, [state.isOnline, syncQueue, saveToCloud, saveQueueToStorage]);

  // =================================================================
  // AUTO-SYNC ON RECONNECT
  // =================================================================
  
  useEffect(() => {
    if (state.isOnline && syncQueue.length > 0) {
      const timer = setTimeout(processSyncQueue, 1000); // Delay to avoid rapid retries
      return () => clearTimeout(timer);
    }
  }, [state.isOnline, syncQueue.length, processSyncQueue]);

  // =================================================================
  // MERGE LOCAL AND CLOUD DATA
  // =================================================================
  
  const mergeLocalAndCloudData = useCallback(async (): Promise<SavedEvent[]> => {
    if (!user) return [];
    const key = eventsKeyFor(user.id);

    // Always hydrate locals up-front so merge/sort never see string dates.
    const readLocals = (): SavedEvent[] => {
      const raw = localStorage.getItem(key) || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(hydrateLocalEvent) : [];
    };

    try {
      let cloudEvents: SavedEvent[] = [];
      let cloudReadFailed = false;
      if (state.isOnline) {
        try {
          cloudEvents = await loadEventsFromCloud();
        } catch (e) {
          // Don't let a transient cloud failure trigger a localStorage overwrite.
          console.warn('Cloud read failed during merge — falling back to local:', e);
          cloudReadFailed = true;
        }
      }

      const localEvents = readLocals();

      // CRITICAL: never overwrite local data with an empty/failed cloud read.
      // Empty cloud could mean: rules denial, transient error, queue still draining.
      // Returning locals unchanged preserves user data.
      if ((cloudReadFailed || cloudEvents.length === 0) && localEvents.length > 0) {
        return localEvents;
      }

      const merged = new Map<string, SavedEvent>();
      cloudEvents.forEach(event => merged.set(event.id, event));

      localEvents.forEach(localEvent => {
        const cloudEvent = merged.get(localEvent.id);
        const localTime = safeTime(localEvent.lastModified);
        const cloudTime = safeTime(cloudEvent?.lastModified);
        if (!cloudEvent || localTime > cloudTime) {
          merged.set(localEvent.id, localEvent);
          if (cloudEvent) {
            addToSyncQueue({ id: localEvent.id, action: 'update', data: localEvent });
          }
        }
      });

      const mergedEvents = Array.from(merged.values()).sort(
        (a, b) => safeTime(b.lastModified) - safeTime(a.lastModified)
      );

      // Only persist back to localStorage if the merge actually produced something.
      // Writing an empty array here would be the worst-case data-loss path.
      if (mergedEvents.length > 0) {
        localStorage.setItem(key, JSON.stringify(mergedEvents));
      }

      return mergedEvents;

    } catch (error) {
      console.error('Failed to merge data:', error);
      // Fallback to localStorage only — hydrated, never raw.
      try {
        return readLocals();
      } catch {
        return [];
      }
    }
  }, [user?.id, state.isOnline, loadEventsFromCloud, addToSyncQueue]);

  return {
    // State
    ...state,

    // Actions
    saveEvent,
    saveEventLocal,
    deleteEvent,
    loadEventsFromCloud,
    mergeLocalAndCloudData,
    processSyncQueue,

    // Queue info
    syncQueueLength: syncQueue.length,
  };
};