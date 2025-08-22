'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cloud, CloudOff, Loader2, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { useAuth } from '@/contexts/AuthContext';

export function CloudSyncStatus() {
  const { isOnline, isSyncing, lastSync, pendingChanges, hasLocalChanges, syncQueueLength } = useCloudStorage();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null; // Don't show status when not logged in
  }

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        label: "Offline",
        variant: "secondary" as const,
        description: `Working offline. ${syncQueueLength} changes pending sync.`,
        color: "text-orange-600"
      };
    }

    if (isSyncing) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        label: "Syncing",
        variant: "secondary" as const,
        description: "Syncing your events to the cloud...",
        color: "text-blue-600"
      };
    }

    if (syncQueueLength > 0) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        label: `${syncQueueLength} Pending`,
        variant: "destructive" as const,
        description: `${syncQueueLength} changes waiting to sync. Check your connection.`,
        color: "text-orange-600"
      };
    }

    if (hasLocalChanges) {
      return {
        icon: <Cloud className="h-4 w-4" />,
        label: "Saving",
        variant: "secondary" as const,
        description: "Recent changes are being saved...",
        color: "text-blue-600"
      };
    }

    if (lastSync) {
      const minutesAgo = Math.floor((Date.now() - lastSync.getTime()) / 60000);
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        label: "Synced",
        variant: "secondary" as const,
        description: `Last synced ${minutesAgo === 0 ? 'just now' : `${minutesAgo}m ago`}`,
        color: "text-green-600"
      };
    }

    return {
      icon: <Cloud className="h-4 w-4" />,
      label: "Ready",
      variant: "outline" as const,
      description: "Ready to sync your events",
      color: "text-gray-600"
    };
  };

  const { icon, label, variant, description, color } = getStatusInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className={`flex items-center gap-1 ${color} cursor-help`}>
            {icon}
            <span className="text-xs">{label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{description}</p>
          {lastSync && (
            <p className="text-xs opacity-70 mt-1">
              Last sync: {lastSync.toLocaleTimeString()}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}