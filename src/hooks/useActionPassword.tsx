import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActionPassword = (module?: string) => {
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const checkPasswordRequired = useCallback(async (): Promise<boolean> => {
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
        .select('password_protection_enabled, protect_invoice_delete, protect_order_delete, protect_customer_delete, protect_bill_delete, protect_supplier_delete, protect_item_delete')
        .eq('id', profile.company_id)
        .single();

      if (!company?.password_protection_enabled) return false;

      const moduleMap: Record<string, boolean> = {
        'invoices': company.protect_invoice_delete || false,
        'orders': company.protect_order_delete || false,
        'customers': company.protect_customer_delete || false,
        'bills': company.protect_bill_delete || false,
        'suppliers': company.protect_supplier_delete || false,
        'items': company.protect_item_delete || false,
      };

      return module ? moduleMap[module] || false : false;
    } catch (error) {
      console.error('Error checking password requirement:', error);
      return false;
    }
  }, [module]);

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

  const requirePassword = useCallback(async (action: () => void) => {
    const isRequired = await checkPasswordRequired();
    if (!isRequired) {
      action();
      return;
    }
    setPendingAction(() => action);
    setIsPasswordDialogOpen(true);
  }, [checkPasswordRequired]);

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
