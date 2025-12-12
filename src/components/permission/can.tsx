import { type ReactNode } from 'react';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission';

interface CanProps {
  /**
   * The action to check permission for
   */
  action: 'create' | 'read' | 'update' | 'delete';
  
  /**
   * The menu code to check permission on (e.g., 'employees', 'departments', 'jobs')
   */
  on: string;
  
  /**
   * Content to render if user has permission
   */
  children: ReactNode;
  
  /**
   * Optional fallback content to render if user doesn't have permission
   */
  fallback?: ReactNode;
  
  /**
   * If true, renders children for super admins regardless of permissions
   * @default true
   */
  allowSuperAdmin?: boolean;
}

/**
 * Component for conditional rendering based on user permissions
 * 
 * @example
 * // Show create button only if user can create employees
 * <Can action="create" on="employees">
 *   <Button onClick={handleCreate}>Add Employee</Button>
 * </Can>
 * 
 * 
 * @example
 * // Show different content if no permission
 * <Can 
 *   action="delete" 
 *   on="departments"
 *   fallback={<Text>You don't have permission to delete</Text>}
 * >
 *   <Button variant="destructive" onClick={handleDelete}>Delete</Button>
 * </Can>
 */
export const Can = ({ 
  action, 
  on, 
  children, 
  fallback = null,
  allowSuperAdmin = true 
}: CanProps) => {
  const permissions = usePermission(on);
  const isSuperAdmin = useIsSuperAdmin();
  
  // Super admins bypass permission checks
  if (allowSuperAdmin && isSuperAdmin) {
    return <>{children}</>;
  }
  
  const hasPermission = permissions[`can_${action}`];
  
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component to show content only to super admins
 */
export const SuperAdminOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => {
  const isSuperAdmin = useIsSuperAdmin();
  return isSuperAdmin ? <>{children}</> : <>{fallback}</>;
};

/**
 * Component to show content only if user has ANY permission on a menu
 */
export const CanAccess = ({ on, children, fallback = null }: { on: string; children: ReactNode; fallback?: ReactNode }) => {
  const permissions = usePermission(on);
  const isSuperAdmin = useIsSuperAdmin();
  
  if (isSuperAdmin || permissions.hasAnyPermission) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};
