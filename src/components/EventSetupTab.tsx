'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { EventDetails } from '@/lib/types';

interface EventSetupTabProps {
  eventDetails: EventDetails;
  onDetailsChange: (details: EventDetails) => void;
}

export default function EventSetupTab({ eventDetails, onDetailsChange }: EventSetupTabProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDetailsChange({ ...eventDetails, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date: Date | undefined) => {
    onDetailsChange({ ...eventDetails, date });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Details</CardTitle>
        <CardDescription>Set up the general information for your event.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Event Name</Label>
          <Input id="name" name="name" value={eventDetails.name} onChange={handleChange} placeholder="e.g., Spring Hunter Pace" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Event Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !eventDetails.date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {eventDetails.date ? format(eventDetails.date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={eventDetails.date}
                onSelect={handleDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" value={eventDetails.location} onChange={handleChange} placeholder="e.g., Millstone Creek Park" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organizer">Organizer</Label>
          <Input id="organizer" name="organizer" value={eventDetails.organizer} onChange={handleChange} placeholder="e.g., Local Riding Club" />
        </div>
      </CardContent>
    </Card>
  );
}
