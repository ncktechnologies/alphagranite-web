// components/RolesSection.tsx
import { Fragment, useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { PageMenu } from '../page-menu';
import { Role as ConfigRole, ViewMode } from '@/config/types';
import { RoleForm, RoleFormData } from './role-views/Form';
import { RoleDetailsView } from './role-views/Details';
import { RolesList } from './role-views/List';
import { useGetRolesQuery, useCreateRoleMutation, useUpdateRoleMutation, Role } from '@/store/api/role';
import { useGetAllActionMenusQuery } from '@/store/api/actionMenu';

export const RolesSection = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [selectedRole, setSelectedRole] = useState<ConfigRole | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  // API hooks
  const { data: rolesData, isLoading, refetch } = useGetRolesQuery({ with_stats: true });
  const { data: actionMenus } = useGetAllActionMenusQuery();
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();

  // Transform API roles to Config roles
  const roles: ConfigRole[] = rolesData?.items?.map((role: Role): ConfigRole => ({
    id: role.id,
    name: role.name,
    description: role.description || '',
    status: role.status === 1 ? 'Active' : 'Inactive',
    users: role.total_members || 0,
    activeUsers: role.active_members || 0,
    inactiveUsers: role.inactive_members || 0,
    pendingUsers: role.pending_members || 0,
  })) || [];

  // Set first role as active when component mounts
 useEffect(() => {
  if (roles.length > 0 && !selectedRole && viewMode !== 'new' && viewMode !== 'edit') {
    setSelectedRole(roles[0]);
    setViewMode('details');
  }
}, [selectedRole, viewMode]);


  const handleRoleSelect = (role: ConfigRole) => {
    setSelectedRole(role);
    setViewMode('details');
  };

  const handleNewRole = () => {
    setViewMode('new');
    setSelectedRole(null);
  };

  const handleEditRole = (role: ConfigRole) => {
    setSelectedRole(role);
    setViewMode('edit');
  };

  const handleCloseForm = () => {
    if (viewMode === 'new') {
      // When closing new mode, go to details of first role
      if (roles.length > 0) {
        setSelectedRole(roles[0]);
        setViewMode('details');
      } else {
        setViewMode('list');
      }
    } else if (viewMode === 'edit') {
      // When closing edit mode, go to details of the role being edited
      setViewMode('details');
    }
  };

  const handleSaveRole = async (data: RoleFormData) => {
    try {
      const rolePayload = {
        name: data.name,
        description: data.description,
        status: data.isActive ? 1 : 2,
        action_menu_permissions: data.permissions ? Object.entries(data.permissions).map(([key, perms]) => ({
          action_menu_id: parseInt(key), // You'll need to map permission keys to action menu IDs
          can_create: perms.create,
          can_read: perms.read,
          can_update: perms.update,
          can_delete: perms.delete,
        })) : [],
        user_ids: data.selectedUsers.map(id => parseInt(id)),
      };

      if (viewMode === 'new') {
        await createRole(rolePayload).unwrap();
      } else if (selectedRole) {
        await updateRole({ id: selectedRole.id, data: rolePayload }).unwrap();
      }

      refetch();
      handleCloseForm();
    } catch (error) {
      console.error('Failed to save role:', error);
    }
  };

  const handleDelete = () => {
    // Simulate deletion
    setTimeout(() => {
      setIsDeleted(true);
      setTimeout(() => {
        setIsDeleted(false);
        // After deletion, set first role as active if available
        if (roles.length > 0) {
          setSelectedRole(roles[0]);
          setViewMode('details');
        } else {
          setViewMode('list');
          setSelectedRole(null);
        }
      }, 2000);
    }, 1000);
  };

  const renderRightContent = () => {
    // if (isDeleted) {
    //   return <SuccessMessage message="Role deleted successfully" roleName={selectedRole?.name} />;
    // }

    if (viewMode === 'details' && selectedRole) {
      return <RoleDetailsView role={selectedRole} onEdit={handleEditRole} onDelete={handleDelete} />;
    }

    if (viewMode === 'new' || viewMode === 'edit') {
      return (
        <RoleForm
          mode={viewMode}
          role={selectedRole}
          onBack={handleCloseForm}
          onSave={handleSaveRole}
        />
      );
    }

    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No roles available. Create a new role to get started.
      </div>
    );
  };

  return (
    <Fragment>
      <PageMenu />
      <Container>
        <div className="flex h-full gap-6">
          <RolesList
            roles={roles}
            selectedRole={selectedRole}
            onRoleSelect={handleRoleSelect}
            onNewRole={handleNewRole}
          />

          {/* Right Content Area */}
          <div className="flex-1 pl-6">
            {renderRightContent()}
          </div>
        </div>
      </Container>
    </Fragment>
  );
};