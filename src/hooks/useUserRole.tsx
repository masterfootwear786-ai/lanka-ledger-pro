import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'accountant' | 'clerk' | 'sales_rep' | 'storekeeper';

// Only these emails can manage user permissions
export const PERMISSION_MANAGER_EMAILS = [
  'masterfootwear786@gmail.com',
  'ksm.nafran@gmail.com'
];

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setUserEmail(null);
        setLoading(false);
        return;
      }

      try {
        setUserEmail(user.email || null);
        
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

  // Check if current user can manage permissions
  const canManagePermissions = (): boolean => {
    return userEmail ? PERMISSION_MANAGER_EMAILS.includes(userEmail) : false;
  };

  return {
    roles,
    loading,
    userEmail,
    hasRole,
    isAdmin,
    isAccountant,
    isClerk,
    isSalesRep,
    isStorekeeper,
    canManagePermissions,
  };
};
