import { useCallback, useEffect, useState } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';

interface UseOfflineCacheOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttlMs?: number;
  enabled?: boolean;
}

interface UseOfflineCacheResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isCached: boolean;
}

export function useOfflineCache<T>({
  key,
  fetcher,
  ttlMs = 5 * 60 * 1000, // 5 minutes default
  enabled = true,
}: UseOfflineCacheOptions<T>): UseOfflineCacheResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try cache first
      const cached = await offlineStorage.getCache<T>(key);
      if (cached !== null) {
        setData(cached);
        setIsCached(true);
        setIsLoading(false);
        
        // Background refresh if online
        if (navigator.onLine) {
          fetcher()
            .then(async (freshData) => {
              setData(freshData);
              setIsCached(false);
              await offlineStorage.setCache(key, freshData, ttlMs);
            })
            .catch(console.error);
        }
        return;
      }

      // No cache, fetch fresh
      if (navigator.onLine) {
        const freshData = await fetcher();
        setData(freshData);
        setIsCached(false);
        await offlineStorage.setCache(key, freshData, ttlMs);
      } else {
        // Offline and no cache
        setError(new Error('No cached data available offline'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      
      // Try to use stale cache on error
      try {
        const staleCache = await offlineStorage.getCache<T>(key);
        if (staleCache !== null) {
          setData(staleCache);
          setIsCached(true);
        }
      } catch {
        // Ignore cache errors
      }
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttlMs, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await offlineStorage.deleteCache(key);
    await fetchData();
  }, [key, fetchData]);

  return { data, isLoading, error, refetch, isCached };
}

// Hook for cached Supabase queries
export function useSupabaseCache<T>(
  queryKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: { ttlMs?: number; enabled?: boolean }
) {
  return useOfflineCache<T>({
    key: `supabase:${queryKey}`,
    fetcher: async () => {
      const { data, error } = await queryFn();
      if (error) throw error;
      return data as T;
    },
    ...options,
  });
}
