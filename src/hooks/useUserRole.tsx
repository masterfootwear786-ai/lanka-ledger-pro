import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'accountant' | 'clerk' | 'sales_rep' | 'storekeeper';

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        setRoles(data?.map(r => r.role as UserRole) || []);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: UserRole): boolean => {
    return roles.includes(role);
  };

  const isAdmin = (): boolean => {
    return roles.includes('admin');
  };

  const isAccountant = (): boolean => {
    return roles.includes('accountant');
  };

  const isClerk = (): boolean => {
    return roles.includes('clerk');
  };

  const isSalesRep = (): boolean => {
    return roles.includes('sales_rep');
  };

  const isStorekeeper = (): boolean => {
    return roles.includes('storekeeper');
  };

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isAccountant,
    isClerk,
    isSalesRep,
    isStorekeeper,
  };
};
