import { Navigate } from 'react-router-dom';
import { useUserPermissions, ModuleName } from '@/hooks/useUserPermissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  module: ModuleName;
  subModule?: string;
  permission?: 'view' | 'create' | 'edit' | 'delete';
  fallback?: React.ReactNode;
}

export const PermissionGuard = ({ 
  children, 
  module, 
  subModule,
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
      hasPermission = canView(module, subModule);
      break;
    case 'create':
      hasPermission = canCreate(module, subModule);
      break;
    case 'edit':
      hasPermission = canEdit(module, subModule);
      break;
    case 'delete':
      hasPermission = canDelete(module, subModule);
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
