import { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { offlineStorage } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';

const SYNC_DEBOUNCE_MS = 2000;
const MAX_RETRIES = 5;
const BATCH_SIZE = 10;

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const lastToastRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  // Throttled toast to prevent spam
  const showToast = useCallback((title: string, description: string, variant?: 'default' | 'destructive') => {
    const now = Date.now();
    // Only show toast if 5 seconds have passed since last one
    if (now - lastToastRef.current > 5000) {
      lastToastRef.current = now;
      toast({ title, description, variant, duration: 3000 });
    }
  }, [toast]);

  const updatePendingCount = useCallback(async () => {
    try {
      const count = await offlineStorage.getSyncQueueCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Error getting pending count:', error);
    }
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    
    try {
      const syncQueue = await offlineStorage.getSyncQueue();
      
      if (syncQueue.length === 0) {
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Process in batches
      const batches = [];
      for (let i = 0; i < syncQueue.length; i += BATCH_SIZE) {
        batches.push(syncQueue.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(async (item) => {
            // Skip items that have exceeded max retries
            if (item.retries >= MAX_RETRIES) {
              await offlineStorage.removeSyncItem(item.id);
              return { status: 'skipped' as const, item };
            }

            try {
              if (item.operation === 'create') {
                const { error } = await (supabase as any).from(item.table).insert(item.data);
                if (error) throw error;
              } else if (item.operation === 'update') {
                const { error } = await (supabase as any).from(item.table).update(item.data).eq('id', item.data.id);
                if (error) throw error;
              } else if (item.operation === 'delete') {
                const { error } = await (supabase as any).from(item.table).delete().eq('id', item.data.id);
                if (error) throw error;
              }
              
              await offlineStorage.removeSyncItem(item.id);
              return { status: 'success' as const, item };
            } catch (error) {
              console.error('Sync error for item:', item.id, error);
              await offlineStorage.updateSyncRetry(item.id, item.retries + 1);
              return { status: 'error' as const, item, error };
            }
          })
        );

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            if (result.value.status === 'success') successCount++;
            else if (result.value.status === 'error') failCount++;
          }
        });
      }

      // Update pending count
      await updatePendingCount();

      // Show summary toast (throttled)
      if (successCount > 0) {
        showToast("Synced", `${successCount} changes synced successfully`);
      }

      if (failCount > 0) {
        showToast("Sync Issues", `${failCount} changes pending retry`, "destructive");
      }

      // Clean up failed items that exceeded max retries
      await offlineStorage.clearFailedSyncItems(MAX_RETRIES);
      
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, showToast, updatePendingCount]);

  // Debounced sync
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncOfflineData();
    }, SYNC_DEBOUNCE_MS);
  }, [syncOfflineData]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Back Online", "Syncing changes...");
      debouncedSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("Offline Mode", "Changes will sync when back online");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize on mount
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      offlineStorage.initialize().then(() => {
        updatePendingCount();
        // Sync on mount if online
        if (navigator.onLine) {
          debouncedSync();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [showToast, debouncedSync, updatePendingCount]);

  // Force sync function
  const forceSync = useCallback(async () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    await syncOfflineData();
  }, [syncOfflineData]);

  return { 
    isOnline, 
    isSyncing, 
    pendingCount,
    syncOfflineData: forceSync,
    updatePendingCount
  };
};
