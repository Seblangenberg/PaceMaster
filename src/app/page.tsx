
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EventSetupTab from '@/components/EventSetupTab';
import DivisionsTab from '@/components/DivisionsTab';
import TeamsTab from '@/components/TeamsTab';
import TimingTab from '@/components/TimingTab';
import ResultsTab from '@/components/ResultsTab';
import type { EventDetails, Division, Team, SavedEvent } from '@/lib/types';
import type { ImportedTeamRow } from '@/components/ImportTeamsDialog';
import { Settings, ListOrdered, Users, Clock, Trophy } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import AuthPage from '@/components/auth/AuthPage';
import { registerServiceWorker, setupInstallPrompt } from '@/lib/pwa';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useCloudStorage } from '@/hooks/useCloudStorage';


const newEventTemplate = (): SavedEvent => ({
  id: nanoid(),
  lastModified: new Date(),
  eventDetails: { name: 'New Event', date: new Date(), location: '', organizer: '' },
  divisions: [],
  teams: [],
});

const safeTime = (d: any): number => {
  if (!d) return 0;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
};

export default function Home() {
  const [currentEvent, setCurrentEvent] = useState<SavedEvent | null>(null);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isOnline, pendingCount, performAction } = useOfflineStorage();
  const cloudStorage = useCloudStorage();

  // Initialize PWA features
  useEffect(() => {
    // Register service worker
    registerServiceWorker();
    
    // Setup install prompt
    setupInstallPrompt();
  }, []);

  const saveCurrentEvent = useCallback(async (eventToSave: SavedEvent) => {
    try {
      // Save to cloud (which also saves locally as backup)
      await cloudStorage.saveEvent(eventToSave);

      // Update local state
      setSavedEvents(prev => {
        const eventExists = prev.some(e => e.id === eventToSave.id);
        if (eventExists) {
          return prev.map(e => e.id === eventToSave.id ? eventToSave : e);
        } else {
          return [...prev, eventToSave];
        }
      });

    } catch (error) {
      console.error("Failed to save event:", error);
      toast({
        title: "Save Error",
        description: error instanceof Error ? error.message : "Could not save event.",
        variant: "destructive"
      });
    }
  }, [cloudStorage, toast]);

  // Load events ONCE per authenticated user. The merge callback ref churns
  // on online/offline flips; if we depended on it, a network blip mid-edit
  // would re-run this effect, read stale localStorage (autosave hadn't
  // flushed yet), and overwrite currentEvent — wiping the in-memory edits.
  // Holding the merge function in a ref breaks that cycle.
  const mergeRef = useRef(cloudStorage.mergeLocalAndCloudData);
  mergeRef.current = cloudStorage.mergeLocalAndCloudData;
  const loadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      loadedForUserRef.current = null;
      return;
    }
    const userKey = 'loaded';
    if (loadedForUserRef.current === userKey) return;
    loadedForUserRef.current = userKey;

    const loadEvents = async () => {
      try {
        const events = await mergeRef.current();
        setSavedEvents(events);
        setLoadError(null);

        if (events.length > 0) {
          const sortedEvents = [...events].sort(
            (a, b) => safeTime(b.lastModified) - safeTime(a.lastModified)
          );
          setCurrentEvent(sortedEvents[0]);
        } else {
          setCurrentEvent(newEventTemplate());
        }
      } catch (error) {
        console.error("Failed to load events:", error);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load events."
        );
        toast({
          title: "Loading Error",
          description:
            "Couldn't load your events. Your data is still saved — please refresh to retry.",
          variant: "destructive",
        });
      }
    };

    loadEvents();
  }, [isAuthenticated, toast]);

  // SYNCHRONOUS local persistence on every state change. localStorage writes
  // are <1ms — there is no benefit to debouncing them, and a debounce here
  // is a guaranteed data-loss window (refresh / crash / tab close inside the
  // debounce loses everything since the last flush). Cloud sync stays
  // debounced separately below.
  useEffect(() => {
    if (!currentEvent || !isAuthenticated) return;
    cloudStorage.saveEventLocal(currentEvent);
    setSavedEvents(prev => {
      const existsIdx = prev.findIndex(e => e.id === currentEvent.id);
      if (existsIdx >= 0) {
        const next = prev.slice();
        next[existsIdx] = currentEvent;
        return next;
      }
      return [...prev, currentEvent];
    });
  }, [currentEvent, isAuthenticated, cloudStorage.saveEventLocal]);

  // Debounced CLOUD save. Only fires when lastModified actually advances,
  // so the load path setting currentEvent doesn't echo back to the cloud.
  const lastCloudSavedRef = useRef<{ id: string; lastModified: number } | null>(null);
  const pendingCloudSaveRef = useRef(false);
  useEffect(() => {
    if (!currentEvent || !isAuthenticated) return;
    const currentTime = safeTime(currentEvent.lastModified);
    const last = lastCloudSavedRef.current;
    if (last && last.id === currentEvent.id && last.lastModified >= currentTime) {
      return;
    }
    pendingCloudSaveRef.current = true;
    const handler = setTimeout(async () => {
      await saveCurrentEvent(currentEvent);
      lastCloudSavedRef.current = { id: currentEvent.id, lastModified: currentTime };
      pendingCloudSaveRef.current = false;
    }, 500);
    return () => clearTimeout(handler);
  }, [currentEvent, isAuthenticated, saveCurrentEvent]);

  // Warn before unload if a save hasn't flushed to the cloud yet, or the
  // sync queue is non-empty. Local data is already persisted (above), but
  // the user still wants to know their changes haven't reached the cloud
  // before they close the tab.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const dirty =
        pendingCloudSaveRef.current ||
        cloudStorage.syncQueueLength > 0 ||
        cloudStorage.hasLocalChanges;
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [cloudStorage.syncQueueLength, cloudStorage.hasLocalChanges]);

  const updateCurrentEvent = (updater: (prev: SavedEvent) => SavedEvent) => {
    setCurrentEvent(prev => prev ? updater(prev) : null);
  };

  const handleSetEventDetails = (details: EventDetails) => {
    updateCurrentEvent(prev => ({ ...prev, eventDetails: details, lastModified: new Date() }));
  };

  const handleAddDivision = (name: string, optimalTime: number) => {
    const newDivision: Division = { id: nanoid(), name, optimalTime };
    updateCurrentEvent(prev => ({ ...prev, divisions: [...prev.divisions, newDivision], lastModified: new Date() }));
  };
  
  const handleUpdateDivision = (updatedDivision: Division) => {
    updateCurrentEvent(prev => ({
      ...prev,
      divisions: prev.divisions.map(d => d.id === updatedDivision.id ? updatedDivision : d),
      lastModified: new Date(),
    }));
  };

  const handleDeleteDivision = (id: string) => {
    updateCurrentEvent(prev => ({
      ...prev,
      divisions: prev.divisions.filter(d => d.id !== id),
      teams: prev.teams.map(t => t.divisionId === id ? { ...t, divisionId: undefined } : t),
      lastModified: new Date(),
    }));
  };
  
  const handleAddTeam = (name: string, riders: string, divisionId?: string, number?: number) => {
    updateCurrentEvent(prev => {
      // Check if the provided team number already exists
      if (number && prev.teams.some(t => t.number === number)) {
        toast({ 
          title: "Team Number Conflict", 
          description: `Team #${number} already exists. Please choose a different number.`,
          variant: "destructive" 
        });
        return prev; // Don't add the team
      }
      
      // Use provided number or auto-generate
      const teamNumber = number || (prev.teams.length > 0 ? Math.max(...prev.teams.map(t => t.number)) : 0) + 1;
      const newTeam: Team = { id: nanoid(), number: teamNumber, name, riders, divisionId, status: 'waiting' };
      return { ...prev, teams: [...prev.teams, newTeam], lastModified: new Date() };
    });
  };

  const handleImportTeams = (rows: ImportedTeamRow[]) => {
    if (rows.length === 0) return;
    updateCurrentEvent(prev => {
      const existingNumbers = new Set(prev.teams.map(t => t.number));
      const accepted: Team[] = [];
      const rejectedNumbers: number[] = [];
      for (const row of rows) {
        if (existingNumbers.has(row.number)) {
          rejectedNumbers.push(row.number);
          continue;
        }
        existingNumbers.add(row.number);
        accepted.push({
          id: nanoid(),
          number: row.number,
          name: row.name,
          riders: row.riders,
          divisionId: row.divisionId,
          status: 'waiting',
        });
      }
      if (rejectedNumbers.length > 0) {
        toast({
          title: 'Some teams skipped',
          description: `Team #${rejectedNumbers.join(', #')} already exist and were not re-imported.`,
          variant: 'destructive',
        });
      }
      if (accepted.length === 0) return prev;
      toast({
        title: 'Teams imported',
        description: `${accepted.length} team${accepted.length === 1 ? '' : 's'} added.`,
      });
      return {
        ...prev,
        teams: [...prev.teams, ...accepted],
        lastModified: new Date(),
      };
    });
  };

  const handleDeleteTeam = (id: string) => {
    updateCurrentEvent(prev => ({ ...prev, teams: prev.teams.filter(t => t.id !== id), lastModified: new Date() }));
  };
  
  const handleUpdateTeam = (updatedTeam: Team) => {
    updateCurrentEvent(prev => {
      // Check if the updated team number conflicts with another team (excluding the current team)
      if (prev.teams.some(t => t.id !== updatedTeam.id && t.number === updatedTeam.number)) {
        toast({ 
          title: "Team Number Conflict", 
          description: `Team #${updatedTeam.number} already exists. Please choose a different number.`,
          variant: "destructive" 
        });
        return prev; // Don't update the team
      }
      
      return { ...prev, teams: prev.teams.map(t => t.id === updatedTeam.id ? updatedTeam : t), lastModified: new Date() };
    });
  };

  const setTeams = (updater: React.SetStateAction<Team[]>) => {
     updateCurrentEvent(prev => {
        const newTeams = typeof updater === 'function' ? updater(prev.teams) : updater;
        return { ...prev, teams: newTeams, lastModified: new Date() };
     });
  };

  // Flush any pending in-memory event to local + cloud before swapping events.
  // Without this, the debounced cloud save for the previous event gets
  // cancelled by the effect cleanup when currentEvent changes.
  const flushPendingSave = useCallback(async () => {
    if (!currentEvent) return;
    cloudStorage.saveEventLocal(currentEvent);
    const t = safeTime(currentEvent.lastModified);
    const last = lastCloudSavedRef.current;
    if (!last || last.id !== currentEvent.id || last.lastModified < t) {
      await saveCurrentEvent(currentEvent);
      lastCloudSavedRef.current = { id: currentEvent.id, lastModified: t };
      pendingCloudSaveRef.current = false;
    }
  }, [currentEvent, cloudStorage.saveEventLocal, saveCurrentEvent]);

  const createNewEvent = async () => {
    await flushPendingSave();
    const newEvent = newEventTemplate();
    setCurrentEvent(newEvent);
    toast({ title: "New event created." });
  };

  const handleSave = async () => {
    if (currentEvent) {
      const eventToSave = { ...currentEvent, lastModified: new Date() };
      setCurrentEvent(eventToSave);
      await saveCurrentEvent(eventToSave);
      lastCloudSavedRef.current = {
        id: eventToSave.id,
        lastModified: safeTime(eventToSave.lastModified),
      };
      pendingCloudSaveRef.current = false;
      toast({ title: "Event Saved!", description: `${eventToSave.eventDetails.name} has been saved.` });
    }
  };

  const loadEvent = async (eventId: string) => {
    const eventToLoad = savedEvents.find(e => e.id === eventId);
    if (eventToLoad) {
      await flushPendingSave();
      setCurrentEvent(eventToLoad);
      toast({ title: "Event Loaded", description: `You are now editing "${eventToLoad.eventDetails.name}".` });
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      await cloudStorage.deleteEvent(eventId);
      setSavedEvents(prev => prev.filter(e => e.id !== eventId));
      toast({ title: "Event Deleted" });

      if (currentEvent?.id === eventId) {
        // Don't flush — the event is deleted; flushing would re-save it.
        // Replace currentEvent directly with a fresh template.
        const fresh = newEventTemplate();
        lastCloudSavedRef.current = null;
        pendingCloudSaveRef.current = false;
        setCurrentEvent(fresh);
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast({ title: "Error", description: "Could not delete event.", variant: "destructive" });
    }
  };


  const finishedTeams = useMemo(() => currentEvent?.teams.filter(team => team.status === 'finished') || [], [currentEvent]);

  // Show loading screen while auth is loading
  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Load error — never auto-substitute a blank event here, that would
  // overwrite the user's data on the next auto-save tick.
  if (loadError) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground items-center justify-center p-6 gap-4 text-center">
        <h2 className="text-xl font-semibold">Couldn't load your events</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Your data is safe — it's stored on this device and in the cloud.
          Please refresh to retry. If this keeps happening, check your network connection.
        </p>
        <button
          className="px-4 py-2 rounded bg-primary text-primary-foreground"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // Show event loading screen
  if (typeof isMobile === 'undefined' || !currentEvent) {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground items-center justify-center">
            <p>Loading Event...</p>
        </div>
    );
  }
  
  const { eventDetails, divisions, teams } = currentEvent;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header
        onNewEvent={createNewEvent}
        onSave={handleSave}
        onLoadEvent={loadEvent}
        onDeleteEvent={deleteEvent}
        savedEvents={savedEvents}
        currentEventId={currentEvent.id}
      />
      <main className="flex-grow container mx-auto px-4 py-6">
        <Tabs defaultValue="event-setup" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="event-setup"><Settings className="mr-2 h-4 w-4" />{isMobile ? 'Event' : 'Event Setup'}</TabsTrigger>
            <TabsTrigger value="divisions"><ListOrdered className="mr-2 h-4 w-4" />Divisions</TabsTrigger>
            <TabsTrigger value="teams"><Users className="mr-2 h-4 w-4" />Teams</TabsTrigger>
            <TabsTrigger value="timing"><Clock className="mr-2 h-4 w-4" />Timing</TabsTrigger>
            <TabsTrigger value="results"><Trophy className="mr-2 h-4 w-4" />Results</TabsTrigger>
          </TabsList>
          <TabsContent value="event-setup">
            <EventSetupTab eventDetails={eventDetails} onDetailsChange={handleSetEventDetails} />
          </TabsContent>
          <TabsContent value="divisions">
            <DivisionsTab 
              divisions={divisions} 
              onAddDivision={handleAddDivision}
              onUpdateDivision={handleUpdateDivision}
              onDeleteDivision={handleDeleteDivision}
            />
          </TabsContent>
          <TabsContent value="teams">
            <TeamsTab
              teams={teams}
              divisions={divisions}
              onAddTeam={handleAddTeam}
              onUpdateTeam={handleUpdateTeam}
              onDeleteTeam={handleDeleteTeam}
              onImportTeams={handleImportTeams}
            />
          </TabsContent>
          <TabsContent value="timing">
            <TimingTab teams={teams} setTeams={setTeams} divisions={divisions} />
          </TabsContent>
          <TabsContent value="results">
            <ResultsTab finishedTeams={finishedTeams} divisions={divisions} eventDetails={eventDetails} />
          </TabsContent>
        </Tabs>
      </main>
      <Footer eventDetails={eventDetails} totalTeams={teams.length} completedTeams={finishedTeams.length} />
    </div>
  );
}
