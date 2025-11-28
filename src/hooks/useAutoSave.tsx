import { useEffect, useRef, useCallback } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';
import { useToast } from '@/hooks/use-toast';
import { useOfflineSync } from './useOfflineSync';

interface UseAutoSaveOptions {
  type: string;
  data: any;
  enabled?: boolean;
  onSave?: (draftId: string) => void;
}

export const useAutoSave = ({ type, data, enabled = true, onSave }: UseAutoSaveOptions) => {
  const { toast } = useToast();
  const { isOnline } = useOfflineSync();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const draftIdRef = useRef<string>();

  const saveDraft = useCallback(async () => {
    if (!enabled || !data) return;

    const currentData = JSON.stringify(data);
    
    // Only save if data has changed
    if (currentData === lastSavedRef.current) return;

    try {
      const draftId = await offlineStorage.saveDraft(type, data, draftIdRef.current);
      draftIdRef.current = draftId;
      lastSavedRef.current = currentData;
      
      if (onSave) {
        onSave(draftId);
      }

      // Show save indicator only when offline
      if (!isOnline) {
        toast({
          title: "Saved Offline",
          description: "Changes saved locally. Will sync when online.",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }, [data, enabled, type, onSave, isOnline, toast]);

  useEffect(() => {
    if (!enabled) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Save immediately on every change
    saveDraft();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, enabled, saveDraft]);

  const clearDraft = useCallback(async () => {
    if (draftIdRef.current) {
      await offlineStorage.deleteDraft(draftIdRef.current);
      draftIdRef.current = undefined;
      lastSavedRef.current = '';
    }
  }, []);

  return { saveDraft, clearDraft, draftId: draftIdRef.current };
};
