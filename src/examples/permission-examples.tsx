/**
 * PERMISSION SYSTEM - USAGE EXAMPLES
 * 
 * This file demonstrates how to use the permission system throughout your app.
 * Copy and adapt these examples to your components.
 */

import { Button } from '@/components/ui/button';
import { usePermission, useCan, useIsSuperAdmin } from '@/hooks/use-permission';
import { Can, SuperAdminOnly, CanAccess } from '@/components/permission';

// ============================================================================
// EXAMPLE 1: Using the usePermission hook
// ============================================================================
export function EmployeeListExample() {
  const { canCreate, canUpdate, canDelete, canRead } = usePermission('employees');
  
  return (
    <div>
      {/* Show create button only if user can create */}
      {canCreate && (
        <Button onClick={() => console.log('Create employee')}>
          Add Employee
        </Button>
      )}
      
      {/* Show export button only if user can read */}
      {canRead && (
        <Button variant="outline" onClick={() => console.log('Export')}>
          Export CSV
        </Button>
      )}
      
      {/* In table actions */}
      <div>
        {canUpdate && <Button size="sm">Edit</Button>}
        {canDelete && <Button size="sm" variant="destructive">Delete</Button>}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Using the <Can> component (Recommended approach)
// ============================================================================
export function EmployeeListWithCanComponent() {
  return (
    <div>
      {/* Only show if user can create employees */}
      <Can action="create" on="employees">
        <Button onClick={() => console.log('Create employee')}>
          Add Employee
        </Button>
      </Can>
      
      {/* Only show if user can read employees */}
      <Can action="read" on="employees">
        <Button variant="outline" onClick={() => console.log('Export')}>
          Export CSV
        </Button>
      </Can>
      
      {/* With fallback message */}
      <Can 
        action="delete" 
        on="employees"
        fallback={<span className="text-muted-foreground">No delete permission</span>}
      >
        <Button variant="destructive" onClick={() => console.log('Delete')}>
          Delete Employee
        </Button>
      </Can>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Using useCan hook (single permission check)
// ============================================================================
export function QuickPermissionCheck() {
  const canDeleteDepartment = useCan('departments', 'delete');
  const canCreateJob = useCan('jobs', 'create');
  
  const handleDelete = () => {
    if (!canDeleteDepartment) {
      alert('You do not have permission to delete departments');
      return;
    }
    // Proceed with deletion
  };
  
  return (
    <div>
      {canCreateJob && <Button>Create Job</Button>}
      <Button onClick={handleDelete}>Delete</Button>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Super Admin Only Content
// ============================================================================
export function SuperAdminSection() {
  return (
    <div>
      <SuperAdminOnly
        fallback={<div>Only super admins can see this</div>}
      >
        <Button variant="destructive">Dangerous Action</Button>
        <Button>System Settings</Button>
      </SuperAdminOnly>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Check if user has ANY access to a menu
// ============================================================================
export function MenuAccessCheck() {
  return (
    <div>
      {/* Show entire section only if user has any permission on settings */}
      <CanAccess on="settings">
        <div className="settings-section">
          <h2>Settings</h2>
          
          <Can action="update" on="settings">
            <Button>Update Settings</Button>
          </Can>
          
          <Can action="read" on="settings">
            <div>View current settings...</div>
          </Can>
        </div>
      </CanAccess>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Complex conditional rendering
// ============================================================================
export function ComplexExample() {
  const employeePerms = usePermission('employees');
  const departmentPerms = usePermission('departments');
  const isSuperAdmin = useIsSuperAdmin();
  
  return (
    <div>
      {/* Show admin panel if super admin OR has employee update permission */}
      {(isSuperAdmin || employeePerms.canUpdate) && (
        <div>Admin Panel</div>
      )}
      
      {/* Show bulk actions if can update employees AND departments */}
      {(employeePerms.canUpdate && departmentPerms.canUpdate) && (
        <Button>Bulk Transfer Employees</Button>
      )}
      
      {/* Dynamic button text based on permissions */}
      <Can action="update" on="employees">
        <Button>Edit Employee</Button>
      </Can>
      
      <Can 
        action="update" 
        on="employees"
        fallback={
          <Can action="read" on="employees">
            <Button variant="outline">View Employee</Button>
          </Can>
        }
      >
        <Button>Edit Employee</Button>
      </Can>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Table Actions with Permissions
// ============================================================================
export function TableActionsExample({ employee }: { employee: any }) {
  const { canUpdate, canDelete } = usePermission('employees');
  
  // Don't show dropdown if no actions available
  if (!canUpdate && !canDelete) {
    return null;
  }
  
  return (
    <div className="flex gap-2">
      <Can action="read" on="employees">
        <Button size="sm" variant="ghost">View</Button>
      </Can>
      
      <Can action="update" on="employees">
        <Button size="sm">Edit</Button>
      </Can>
      
      <Can action="delete" on="employees">
        <Button size="sm" variant="destructive">Delete</Button>
      </Can>
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: Form Submission with Permission Check
// ============================================================================
export function FormWithPermissionCheck() {
  const { canCreate, canUpdate } = usePermission('employees');
  
  const handleSubmit = (isEditMode: boolean) => {
    if (isEditMode && !canUpdate) {
      alert('You do not have permission to update employees');
      return;
    }
    
    if (!isEditMode && !canCreate) {
      alert('You do not have permission to create employees');
      return;
    }
    
    // Proceed with form submission
  };
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(true); }}>
      {/* Form fields */}
      
      <Can 
        action="create" 
        on="employees"
        fallback={
          <Can action="update" on="employees">
            <Button type="submit">Update</Button>
          </Can>
        }
      >
        <Button type="submit">Save</Button>
      </Can>
    </form>
  );
}

// ============================================================================
// YOUR MENU CODES (from backend):
// ============================================================================
/*
  - 'employees'   - Employee management
  - 'department'  - Department management  
  - 'jobs'        - Job management
  - 'shop'        - Shop management
  - 'settings'    - Settings pages
*/

export default {
  EmployeeListExample,
  EmployeeListWithCanComponent,
  QuickPermissionCheck,
  SuperAdminSection,
  MenuAccessCheck,
  ComplexExample,
  TableActionsExample,
  FormWithPermissionCheck,
};
