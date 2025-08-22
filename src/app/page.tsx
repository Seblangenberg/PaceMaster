
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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

export default function Home() {
  const [currentEvent, setCurrentEvent] = useState<SavedEvent | null>(null);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
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

  // Load events from cloud + local storage when user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadEvents = async () => {
      try {
        // Merge local and cloud data for best reliability
        const events = await cloudStorage.mergeLocalAndCloudData();
        setSavedEvents(events);
        
        // Load the most recently modified event on startup
        if (events.length > 0) {
          const sortedEvents = [...events].sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
          setCurrentEvent(sortedEvents[0]);
        } else {
          setCurrentEvent(newEventTemplate());
        }
      } catch (error) {
        console.error("Failed to load events:", error);
        toast({
          title: "Loading Error",
          description: "Failed to load events. Check your connection.",
          variant: "destructive"
        });
        setCurrentEvent(newEventTemplate());
      }
    };

    loadEvents();
  }, [isAuthenticated, cloudStorage.mergeLocalAndCloudData, toast]);

  // Auto-save
  useEffect(() => {
    if (currentEvent && isAuthenticated) {
      const handler = setTimeout(async () => {
        await saveCurrentEvent(currentEvent);
      }, 1000); // 1-second debounce
      return () => clearTimeout(handler);
    }
  }, [currentEvent, isAuthenticated, saveCurrentEvent]);

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

  const createNewEvent = () => {
    const newEvent = newEventTemplate();
    setCurrentEvent(newEvent);
    toast({ title: "New event created." });
  };
  
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

  const handleSave = async () => {
    if (currentEvent) {
      const eventToSave = { ...currentEvent, lastModified: new Date() };
      setCurrentEvent(eventToSave); // Update state to reflect new modified time
      await saveCurrentEvent(eventToSave);
      toast({ title: "Event Saved!", description: `${eventToSave.eventDetails.name} has been saved.` });
    }
  };

  const loadEvent = (eventId: string) => {
    const eventToLoad = savedEvents.find(e => e.id === eventId);
    if (eventToLoad) {
      setCurrentEvent(eventToLoad);
      toast({ title: "Event Loaded", description: `You are now editing "${eventToLoad.eventDetails.name}".` });
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      // Delete from cloud (which also handles local storage)
      await cloudStorage.deleteEvent(eventId);
      
      // Update local state
      setSavedEvents(prev => prev.filter(e => e.id !== eventId));
      toast({ title: "Event Deleted" });
      
      if (currentEvent?.id === eventId) {
        createNewEvent();
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
