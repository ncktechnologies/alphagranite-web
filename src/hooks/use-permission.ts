import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface PermissionSet {
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

/**
 * Hook to check permissions for a specific menu/action
 * @param menuCode - The menu code (e.g., 'employees', 'departments', 'jobs')
 * @returns Permission object with boolean flags for CRUD operations
 * 
 * @example
 * const { canCreate, canRead, canUpdate, canDelete } = usePermission('employees');
 * 
 * if (canCreate) {
 *   // Show create button
 * }
 */
export const usePermission = (menuCode: string) => {
  const permissions = useSelector((state: RootState) => state.user?.permissions || {});
  const user = useSelector((state: RootState) => state.user?.user);
  
  // Super admin has all permissions
  if (user?.is_super_admin) {
    return {
      can_create: true,
      can_read: true,
      can_update: true,
      can_delete: true,
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
      hasAnyPermission: true,
      hasAllPermissions: true,
    };
  }

  const menuPermissions: PermissionSet = permissions[menuCode] || {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  return {
    // Original format (snake_case)
    can_create: menuPermissions.can_create,
    can_read: menuPermissions.can_read,
    can_update: menuPermissions.can_update,
    can_delete: menuPermissions.can_delete,
    
    // Camel case aliases for convenience
    canCreate: menuPermissions.can_create,
    canRead: menuPermissions.can_read,
    canUpdate: menuPermissions.can_update,
    canDelete: menuPermissions.can_delete,
    
    // Helper flags
    hasAnyPermission: Object.values(menuPermissions).some(p => p),
    hasAllPermissions: Object.values(menuPermissions).every(p => p),
  };
};

/**
 * Hook to check if user has a specific permission
 * @param menuCode - The menu code
 * @param action - The action to check ('create' | 'read' | 'update' | 'delete')
 * @returns boolean indicating if user has the permission
 * 
 * @example
 * const canDeleteEmployee = useCan('employees', 'delete');
 */
export const useCan = (menuCode: string, action: 'create' | 'read' | 'update' | 'delete'): boolean => {
  const permissions = usePermission(menuCode);
  return permissions[`can_${action}` as keyof typeof permissions] as boolean;
};

/**
 * Hook to get all user permissions
 * @returns All permissions object
 */
export const useAllPermissions = () => {
  const permissions = useSelector((state: RootState) => state.user?.permissions || {});
  return permissions;
};

/**
 * Hook to check if user is super admin
 * @returns boolean
 */
export const useIsSuperAdmin = (): boolean => {
  const user = useSelector((state: RootState) => state.user?.user);
  return user?.is_super_admin || false;
};
