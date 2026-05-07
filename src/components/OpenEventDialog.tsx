
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SavedEvent } from '@/lib/types';
import { format } from 'date-fns';
import { Trash2, Edit } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface OpenEventDialogProps {
  trigger: React.ReactNode;
  savedEvents: SavedEvent[];
  currentEventId: string;
  onLoadEvent: (id: string) => void;
  onDeleteEvent: (id: string) => void;
}

export function OpenEventDialog({ trigger, savedEvents, currentEventId, onLoadEvent, onDeleteEvent }: OpenEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);

  const handleLoad = (id: string) => {
    onLoadEvent(id);
    setOpen(false);
  };

  const safeTime = (d: any): number => {
    if (!d) return 0;
    const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  const sortedEvents = [...savedEvents].sort(
    (a, b) => safeTime(b.lastModified) - safeTime(a.lastModified)
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Open Saved Event</DialogTitle>
            <DialogDescription>Select an event to load or manage your saved events.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-72 w-full pr-4">
            <div className="space-y-2">
              {sortedEvents.length > 0 ? sortedEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50">
                  <div>
                    <p className="font-semibold">{event.eventDetails.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last modified: {format(event.lastModified, 'PPP p')}
                      {event.id === currentEventId && <span className="text-primary font-bold ml-2">(Currently open)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleLoad(event.id)}>
                      <Edit className="mr-2 h-4 w-4" /> Load
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteCandidate(event.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-10">No saved events found.</p>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deleteCandidate} onOpenChange={(isOpen) => !isOpen && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteCandidate) {
                onDeleteEvent(deleteCandidate);
                setDeleteCandidate(null);
              }
            }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
