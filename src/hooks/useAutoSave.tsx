import { useEffect, useRef, useCallback } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';

interface UseAutoSaveOptions {
  type: string;
  data: any;
  enabled?: boolean;
  debounceMs?: number;
  onSave?: (draftId: string) => void;
}

export const useAutoSave = ({ 
  type, 
  data, 
  enabled = true, 
  debounceMs = 1000,
  onSave 
}: UseAutoSaveOptions) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const draftIdRef = useRef<string>();
  const isSavingRef = useRef(false);

  const saveDraft = useCallback(async () => {
    if (!enabled || !data || isSavingRef.current) return;

    const currentData = JSON.stringify(data);
    
    // Only save if data has changed
    if (currentData === lastSavedRef.current) return;

    isSavingRef.current = true;
    
    try {
      const draftId = await offlineStorage.saveDraft(type, data, draftIdRef.current);
      draftIdRef.current = draftId;
      lastSavedRef.current = currentData;
      
      if (onSave) {
        onSave(draftId);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [data, enabled, type, onSave]);

  useEffect(() => {
    if (!enabled) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save operation
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, enabled, saveDraft, debounceMs]);

  const clearDraft = useCallback(async () => {
    if (draftIdRef.current) {
      await offlineStorage.deleteDraft(draftIdRef.current);
      draftIdRef.current = undefined;
      lastSavedRef.current = '';
    }
  }, []);

  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveDraft();
  }, [saveDraft]);

  return { saveDraft: forceSave, clearDraft, draftId: draftIdRef.current };
};
