import { Navigate } from 'react-router-dom';
import { useUserPermissions, ModuleName } from '@/hooks/useUserPermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  module: ModuleName;
  permission?: 'view' | 'create' | 'edit' | 'delete';
  fallback?: React.ReactNode;
}

export const PermissionGuard = ({ 
  children, 
  module, 
  permission = 'view',
  fallback 
}: PermissionGuardProps) => {
  const { canView, canCreate, canEdit, canDelete, loading, isAdmin } = useUserPermissions();

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  // Admin has all permissions
  if (isAdmin) {
    return <>{children}</>;
  }

  let hasPermission = false;
  switch (permission) {
    case 'view':
      hasPermission = canView(module);
      break;
    case 'create':
      hasPermission = canCreate(module);
      break;
    case 'edit':
      hasPermission = canEdit(module);
      break;
    case 'delete':
      hasPermission = canDelete(module);
      break;
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
