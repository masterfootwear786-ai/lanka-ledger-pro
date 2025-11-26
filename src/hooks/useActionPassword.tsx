import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActionPassword = () => {
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return false;

      const { data: company } = await supabase
        .from('companies')
        .select('action_password')
        .eq('id', profile.company_id)
        .single();

      return company?.action_password === password;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }, []);

  const requirePassword = useCallback((action: () => void) => {
    setPendingAction(() => action);
    setIsPasswordDialogOpen(true);
  }, []);

  const handlePasswordConfirm = useCallback(() => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const handlePasswordCancel = useCallback(() => {
    setIsPasswordDialogOpen(false);
    setPendingAction(null);
  }, []);

  return {
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    verifyPassword,
    requirePassword,
    handlePasswordConfirm,
    handlePasswordCancel,
  };
};
