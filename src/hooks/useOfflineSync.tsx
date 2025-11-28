import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { offlineStorage } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const syncQueue = await offlineStorage.getSyncQueue();
      
      if (syncQueue.length === 0) return;

      let successCount = 0;
      let failCount = 0;

      for (const item of syncQueue) {
        try {
          if (item.operation === 'create') {
            await (supabase as any).from(item.table).insert(item.data);
          } else if (item.operation === 'update') {
            await (supabase as any).from(item.table).update(item.data).eq('id', item.data.id);
          } else if (item.operation === 'delete') {
            await (supabase as any).from(item.table).delete().eq('id', item.data.id);
          }
          
          await offlineStorage.removeSyncItem(item.id);
          successCount++;
        } catch (error) {
          console.error('Sync error for item:', item, error);
          await offlineStorage.updateSyncRetry(item.id, item.retries + 1);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Data Synced",
          description: `Successfully synced ${successCount} changes`,
        });
      }

      if (failCount > 0) {
        toast({
          title: "Sync Incomplete",
          description: `${failCount} changes failed to sync. Will retry.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, toast]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Syncing your offline changes...",
      });
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "All changes saved locally. Auto-save active.",
        variant: "default",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize offline storage
    offlineStorage.initialize();

    // Sync on mount if online
    if (isOnline) {
      syncOfflineData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, syncOfflineData, isOnline]);

  return { isOnline, isSyncing, syncOfflineData };
};
