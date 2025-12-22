import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Permission = {
  module: string;
  sub_module: string | null;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

// All available modules and sub-modules matching sidebar structure
export const PERMISSION_MODULES = {
  dashboard: {
    label: 'Dashboard',
    subModules: null,
  },
  hot_selling: {
    label: 'Hot Selling',
    subModules: null,
  },
  send_documents: {
    label: 'Send Documents',
    subModules: null,
  },
  sales: {
    label: 'Sales',
    subModules: {
      orders: 'Orders',
      invoices: 'Invoices',
      return_notes: 'Return Notes',
      receipts: 'Receipts',
      cheques: 'Cheques',
    },
  },
  customers: {
    label: 'Customers',
    subModules: {
      customers: 'Customers List',
      customer_profiles: 'Customer Profiles',
      outstanding: 'Outstanding',
    },
  },
  purchasing: {
    label: 'Purchasing',
    subModules: {
      reorder_form: 'Re-Order Form',
      bills: 'Bills',
      debit_notes: 'Debit Notes',
      payments: 'Payments',
      supplier_cheques: 'Supplier Cheques',
      suppliers: 'Suppliers',
    },
  },
  inventory: {
    label: 'Inventory',
    subModules: {
      items: 'Items',
      main_stock: 'Main Stock',
      lorry_stock: 'Lorry Stock',
      warehouse: 'Warehouse',
    },
  },
  accounting: {
    label: 'Expenses and Other',
    subModules: {
      expenses: 'Expenses and Other',
      turns: 'Turns',
    },
  },
  reports: {
    label: 'Reports',
    subModules: {
      all_reports: 'All Reports Details',
      profit_loss: 'Profit & Loss',
      ar_aging: 'AR Aging',
      ap_aging: 'AP Aging',
    },
  },
  settings: {
    label: 'Settings',
    subModules: {
      company: 'Company',
      users: 'Users',
      routes: 'Routes',
      tax_rates: 'Tax Rates',
      currencies: 'Currencies',
      custom_fields: 'Custom Fields',
      security: 'Security',
      backup: 'Backup',
      trash: 'Trash',
      app_update: 'App Update',
      sales_rep_activity: 'Sales Rep Activity',
    },
  },
};

export type ModuleName = keyof typeof PERMISSION_MODULES;
export type SubModuleName = string;

// Route to permission mapping
export const ROUTE_PERMISSION_MAP: Record<string, { module: ModuleName; subModule?: string }> = {
  '/': { module: 'dashboard' },
  '/purchasing/hot-selling': { module: 'hot_selling' },
  '/send-documents': { module: 'send_documents' },
  // Sales
  '/sales/orders': { module: 'sales', subModule: 'orders' },
  '/sales/create-order': { module: 'sales', subModule: 'orders' },
  '/sales/invoices': { module: 'sales', subModule: 'invoices' },
  '/sales/create-invoice': { module: 'sales', subModule: 'invoices' },
  '/sales/return-notes': { module: 'sales', subModule: 'return_notes' },
  '/sales/receipts': { module: 'sales', subModule: 'receipts' },
  '/sales/cheques': { module: 'sales', subModule: 'cheques' },
  // Customers
  '/sales/customers': { module: 'customers', subModule: 'customers' },
  '/sales/customer-profiles': { module: 'customers', subModule: 'customer_profiles' },
  '/sales/customer-outstanding': { module: 'customers', subModule: 'outstanding' },
  // Purchasing
  '/purchasing/reorder-form': { module: 'purchasing', subModule: 'reorder_form' },
  '/purchasing/bills': { module: 'purchasing', subModule: 'bills' },
  '/purchasing/debit-notes': { module: 'purchasing', subModule: 'debit_notes' },
  '/purchasing/payments': { module: 'purchasing', subModule: 'payments' },
  '/purchasing/cheques': { module: 'purchasing', subModule: 'supplier_cheques' },
  '/purchasing/suppliers': { module: 'purchasing', subModule: 'suppliers' },
  // Inventory
  '/inventory/items': { module: 'inventory', subModule: 'items' },
  '/inventory/main-stock': { module: 'inventory', subModule: 'main_stock' },
  '/inventory/lorry-stock': { module: 'inventory', subModule: 'lorry_stock' },
  '/inventory/warehouse': { module: 'inventory', subModule: 'warehouse' },
  // Accounting
  '/accounting/expenses': { module: 'accounting', subModule: 'expenses' },
  '/accounting/turns': { module: 'accounting', subModule: 'turns' },
  // Reports
  '/reports/all': { module: 'reports', subModule: 'all_reports' },
  '/reports/profit-loss': { module: 'reports', subModule: 'profit_loss' },
  '/reports/ar-aging': { module: 'reports', subModule: 'ar_aging' },
  '/reports/ap-aging': { module: 'reports', subModule: 'ap_aging' },
  // Settings
  '/settings': { module: 'settings' },
  '/settings/company': { module: 'settings', subModule: 'company' },
  '/settings/users': { module: 'settings', subModule: 'users' },
  '/settings/routes': { module: 'settings', subModule: 'routes' },
  '/settings/tax-rates': { module: 'settings', subModule: 'tax_rates' },
  '/settings/currencies': { module: 'settings', subModule: 'currencies' },
  '/settings/custom-fields': { module: 'settings', subModule: 'custom_fields' },
  '/settings/security': { module: 'settings', subModule: 'security' },
  '/settings/backup': { module: 'settings', subModule: 'backup' },
  '/settings/trash': { module: 'settings', subModule: 'trash' },
  '/settings/app-update': { module: 'settings', subModule: 'app_update' },
  '/settings/sales-rep-activity': { module: 'settings', subModule: 'sales_rep_activity' },
};

export const useUserPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
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

        if (!userIsAdmin) {
          // Fetch actual permissions from database
          const { data, error } = await supabase
            .from('user_permissions')
            .select('module, sub_module, can_view, can_create, can_edit, can_delete')
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

  // Check if user can view a module/sub-module
  const canView = useCallback((module: ModuleName, subModule?: string): boolean => {
    if (isAdmin) return true;
    
    // Check for exact match first
    const exactMatch = permissions.find(p => 
      p.module === module && p.sub_module === (subModule || null)
    );
    if (exactMatch?.can_view) return true;
    
    // If checking module level, also check if any sub-module has view permission
    if (!subModule) {
      const hasAnySubModuleView = permissions.some(p => 
        p.module === module && p.can_view
      );
      return hasAnySubModuleView;
    }
    
    return false;
  }, [permissions, isAdmin]);

  // Check if user can create in a module/sub-module
  const canCreate = useCallback((module: ModuleName, subModule?: string): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => 
      p.module === module && p.sub_module === (subModule || null)
    );
    return perm?.can_create || false;
  }, [permissions, isAdmin]);

  // Check if user can edit in a module/sub-module
  const canEdit = useCallback((module: ModuleName, subModule?: string): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => 
      p.module === module && p.sub_module === (subModule || null)
    );
    return perm?.can_edit || false;
  }, [permissions, isAdmin]);

  // Check if user can delete in a module/sub-module
  const canDelete = useCallback((module: ModuleName, subModule?: string): boolean => {
    if (isAdmin) return true;
    const perm = permissions.find(p => 
      p.module === module && p.sub_module === (subModule || null)
    );
    return perm?.can_delete || false;
  }, [permissions, isAdmin]);

  // Check any permission for a module
  const hasAnyPermission = useCallback((module: ModuleName, subModule?: string): boolean => {
    if (isAdmin) return true;
    
    if (subModule) {
      const perm = permissions.find(p => p.module === module && p.sub_module === subModule);
      return perm ? (perm.can_view || perm.can_create || perm.can_edit || perm.can_delete) : false;
    }
    
    // Check if module has any permission at any sub-module level
    const modulePerms = permissions.filter(p => p.module === module);
    return modulePerms.some(p => p.can_view || p.can_create || p.can_edit || p.can_delete);
  }, [permissions, isAdmin]);

  // Check permission for a specific route
  const canAccessRoute = useCallback((route: string): boolean => {
    if (isAdmin) return true;
    
    const mapping = ROUTE_PERMISSION_MAP[route];
    if (!mapping) return true; // Allow access to unmapped routes
    
    return canView(mapping.module, mapping.subModule);
  }, [isAdmin, canView]);

  // Get all accessible sub-modules for a module
  const getAccessibleSubModules = useCallback((module: ModuleName): string[] => {
    if (isAdmin) {
      const moduleDef = PERMISSION_MODULES[module];
      return moduleDef.subModules ? Object.keys(moduleDef.subModules) : [];
    }
    
    return permissions
      .filter(p => p.module === module && p.sub_module && (p.can_view || p.can_create || p.can_edit || p.can_delete))
      .map(p => p.sub_module as string);
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
    canAccessRoute,
    getAccessibleSubModules,
    PERMISSION_MODULES,
  };
};
