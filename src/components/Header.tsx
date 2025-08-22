

import { PaceMasterLogo } from '@/components/PaceMasterLogo';
import { Button } from '@/components/ui/button';
import { FilePlus2, FolderOpen, Save, LogOut, Wifi, WifiOff, Clock } from 'lucide-react';
import { OpenEventDialog } from '@/components/OpenEventDialog';
import type { SavedEvent } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { CloudSyncStatus } from '@/components/CloudSyncStatus';


interface HeaderProps {
  onNewEvent: () => void;
  onSave: () => void;
  onLoadEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  savedEvents: SavedEvent[];
  currentEventId: string;
}

export default function Header({ onNewEvent, onSave, onLoadEvent, onDeleteEvent, savedEvents, currentEventId }: HeaderProps) {
  const isMobile = useIsMobile();
  const { user, logout } = useAuth();
  const { isOnline, pendingCount } = useOfflineStorage();
  
  if (typeof isMobile === 'undefined') {
    return <header className="bg-card border-b shadow-sm sticky top-0 z-50 h-[73px]" />; // Placeholder to prevent layout shift
  }
  
  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <PaceMasterLogo />
          <h1 className="text-xl sm:text-2xl font-bold font-headline text-primary">
            PaceMaster
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size={isMobile ? 'sm' : 'sm'} onClick={onNewEvent} title="New Event">
            <FilePlus2 className={isMobile ? "" : "mr-2"} />
            <span className="hidden sm:inline">New</span>
          </Button>
          <OpenEventDialog 
            savedEvents={savedEvents}
            currentEventId={currentEventId}
            onLoadEvent={onLoadEvent}
            onDeleteEvent={onDeleteEvent}
            trigger={
              <Button variant="outline" size={isMobile ? 'sm' : 'sm'} title="Open Event">
                <FolderOpen className={isMobile ? "" : "mr-2"} />
                <span className="hidden sm:inline">Open</span>
              </Button>
            }
          />
          <Button variant="outline" size={isMobile ? 'sm' : 'sm'} onClick={onSave} title="Save Event">
            <Save className={isMobile ? "" : "mr-2"} />
            <span className="hidden sm:inline">Save</span>
          </Button>
          
          {/* Cloud Sync Status */}
          <CloudSyncStatus />
          
          {/* User Info & Logout */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l">
            {!isMobile && user && (
              <span className="text-sm text-muted-foreground">
                {user.displayName}
              </span>
            )}
            <Button variant="outline" size={isMobile ? 'sm' : 'sm'} onClick={logout} title="Sign Out">
              <LogOut className={isMobile ? "" : "mr-2"} />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
