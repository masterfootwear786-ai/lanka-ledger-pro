import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ModulePermission = {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export type ModuleName = 'sales' | 'purchasing' | 'inventory' | 'expenses' | 'reports' | 'settings';

export const useUserPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions([]);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user is admin (admins have all permissions)
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const userIsAdmin = roles?.some(r => r.role === 'admin') || false;
        setIsAdmin(userIsAdmin);

        if (userIsAdmin) {
          // Admins have all permissions
          const allPermissions: ModulePermission[] = [
            { module: 'sales', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { module: 'purchasing', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { module: 'inventory', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { module: 'expenses', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { module: 'reports', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { module: 'settings', can_view: true, can_create: true, can_edit: true, can_delete: true },
          ];
          setPermissions(allPermissions);
        } else {
          // Fetch actual permissions from database
          const { data, error } = await supabase
            .from('user_permissions')
            .select('module, can_view, can_create, can_edit, can_delete')
            .eq('user_id', user.id);

          if (error) throw error;
          setPermissions(data || []);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  // Check if user can view a module
  const canView = useCallback((module: ModuleName): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => p.module === module);
    return perm?.can_view || false;
  }, [permissions, isAdmin]);

  // Check if user can create in a module
  const canCreate = useCallback((module: ModuleName): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => p.module === module);
    return perm?.can_create || false;
  }, [permissions, isAdmin]);

  // Check if user can edit in a module
  const canEdit = useCallback((module: ModuleName): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => p.module === module);
    return perm?.can_edit || false;
  }, [permissions, isAdmin]);

  // Check if user can delete in a module
  const canDelete = useCallback((module: ModuleName): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => p.module === module);
    return perm?.can_delete || false;
  }, [permissions, isAdmin]);

  // Check any permission for a module
  const hasAnyPermission = useCallback((module: ModuleName): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => p.module === module);
    return perm ? (perm.can_view || perm.can_create || perm.can_edit || perm.can_delete) : false;
  }, [permissions, isAdmin]);

  // Get all modules the user has access to
  const getAccessibleModules = useCallback((): ModuleName[] => {
    if (isAdmin) return ['sales', 'purchasing', 'inventory', 'expenses', 'reports', 'settings'];
    return permissions
      .filter(p => p.can_view || p.can_create || p.can_edit || p.can_delete)
      .map(p => p.module as ModuleName);
  }, [permissions, isAdmin]);

  return {
    permissions,
    loading,
    isAdmin,
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasAnyPermission,
    getAccessibleModules,
  };
};
