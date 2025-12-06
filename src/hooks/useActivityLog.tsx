import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActionType = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view';
export type EntityType = 'invoice' | 'order' | 'receipt' | 'customer' | 'supplier' | 'item' | 'bill' | 'payment' | 'return_note' | 'turn' | 'transaction';

interface LogActivityParams {
  actionType: ActionType;
  entityType?: EntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}

export const useActivityLog = () => {
  const { user } = useAuth();

  const logActivity = async ({
    actionType,
    entityType,
    entityId,
    entityName,
    details,
  }: LogActivityParams) => {
    if (!user) return;

    try {
      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        company_id: profile.company_id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        details: details ? JSON.stringify(details) : null,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  const logLogin = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      await supabase.from('login_history').insert({
        user_id: user.id,
        company_id: profile?.company_id,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Failed to log login:', error);
    }
  };

  const updateSalesStats = async (
    type: 'invoice' | 'order' | 'receipt',
    amount: number = 0
  ) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      const today = new Date().toISOString().split('T')[0];

      // Try to update existing record
      const { data: existing } = await supabase
        .from('sales_rep_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)
        .eq('period_date', today)
        .single();

      if (existing) {
        if (type === 'invoice') {
          await supabase
            .from('sales_rep_stats')
            .update({
              invoices_created: (existing.invoices_created || 0) + 1,
              total_sales: (existing.total_sales || 0) + amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else if (type === 'order') {
          await supabase
            .from('sales_rep_stats')
            .update({
              orders_created: (existing.orders_created || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else if (type === 'receipt') {
          await supabase
            .from('sales_rep_stats')
            .update({
              receipts_created: (existing.receipts_created || 0) + 1,
              total_collections: (existing.total_collections || 0) + amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        }
      } else {
        // Create new record
        await supabase.from('sales_rep_stats').insert({
          user_id: user.id,
          company_id: profile.company_id,
          period_date: today,
          invoices_created: type === 'invoice' ? 1 : 0,
          orders_created: type === 'order' ? 1 : 0,
          receipts_created: type === 'receipt' ? 1 : 0,
          total_sales: type === 'invoice' ? amount : 0,
          total_collections: type === 'receipt' ? amount : 0,
        });
      }
    } catch (error) {
      console.error('Failed to update sales stats:', error);
    }
  };

  return {
    logActivity,
    logLogin,
    updateSalesStats,
  };
};
