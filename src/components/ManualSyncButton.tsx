'use client';

import { Button } from '@/components/ui/button';
import { Cloud, Loader2 } from 'lucide-react';
import { useCloudStorage } from '@/hooks/useCloudStorage';

export function ManualSyncButton() {
  const { processSyncQueue, isSyncing, syncQueueLength } = useCloudStorage();

  if (syncQueueLength === 0) {
    return null; // Don't show button if nothing to sync
  }

  return (
    <Button
      onClick={processSyncQueue}
      disabled={isSyncing}
      size="sm"
      variant="outline"
      className="flex items-center gap-2"
    >
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Cloud className="h-4 w-4" />
      )}
      {isSyncing ? 'Syncing...' : `Sync ${syncQueueLength}`}
    </Button>
  );
}