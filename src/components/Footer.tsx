import type { EventDetails } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface FooterProps {
  eventDetails: EventDetails;
  totalTeams: number;
  completedTeams: number;
}

export default function Footer({ eventDetails, totalTeams, completedTeams }: FooterProps) {
  return (
    <footer className="bg-card border-t text-sm text-muted-foreground">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <span>
          Event: <span className="font-semibold text-foreground">{eventDetails.name || 'Untitled Event'}</span>
        </span>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">Total Teams: {totalTeams}</Badge>
          <Badge variant="secondary">Completed: {completedTeams}</Badge>
        </div>
      </div>
    </footer>
  );
}
