// components/RolesSection.tsx
import { Fragment, useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { PageMenu } from '../page-menu';
import { ViewMode } from '@/config/types';
import { RoleForm, RoleFormData } from './role-views/Form';
import { RoleDetailsView } from './role-views/Details';
import { RolesList } from './role-views/List';
import { useGetRolesQuery, useCreateRoleMutation, useUpdateRoleMutation, useDeleteRoleMutation, Role, useGetRoleByIdQuery } from '@/store/api/role';
import { useGetAllActionMenusQuery } from '@/store/api/actionMenu';
import { EmptyState } from './component/EmptyState';
import { ContentLoader } from '@/components/common/content-loader';
import { Card } from '@/components/ui/card';

export const RolesSection = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  // API hooks
  const { data: rolesData, isLoading, refetch, error} = useGetRolesQuery({ with_stats: true });
  const { data: actionMenus } = useGetAllActionMenusQuery();
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();

  // Fetch detailed role data when a role is selected
  const { data: selectedRoleDetails, isLoading: isLoadingDetails } = useGetRoleByIdQuery(
    { id: selectedRoleId!, params: { with_permissions: true, with_members: true } },
    { skip: !selectedRoleId }
  );

  const roles = rolesData?.data || [];

  // Set first role as active when component mounts or when roles load
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId && viewMode === 'details') {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId, viewMode]);


  const handleRoleSelect = (role: Role) => {
    setSelectedRoleId(role.id);
    setViewMode('details');
  };

  const handleNewRole = () => {
    setViewMode('new');
    setSelectedRoleId(null);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRoleId(role.id);
    setViewMode('edit');
  };

  const handleCloseForm = () => {
    if (viewMode === 'new') {
      // When closing new mode, go to details of first role
      if (roles.length > 0) {
        setSelectedRoleId(roles[0].id);
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
        action_menu_permissions: data.action_menu_permissions || [],
        user_ids: data.selectedUsers.map(id => parseInt(id)),
        role_id: parseInt(data.role_id),
      };

      if (viewMode === 'new') {
        await createRole(rolePayload).unwrap();
      } else if (selectedRoleId) {
        await updateRole({ id: selectedRoleId, data: rolePayload }).unwrap();
      }

      refetch();
      handleCloseForm();
    } catch (error) {
      console.error('Failed to save role:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedRoleId) return;

    try {
      await deleteRole(selectedRoleId).unwrap();
      refetch();

      // After deletion, set first role as active if available
      if (roles.length > 1) {
        const remainingRoles = roles.filter(r => r.id !== selectedRoleId);
        setSelectedRoleId(remainingRoles[0].id);
        setViewMode('details');
      } else {
        setViewMode('list');
        setSelectedRoleId(null);
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  const handleActivateRole = async (roleId: number, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 2 : 1; // Toggle between active (1) and inactive (2)
      await updateRole({ id: roleId, data: { status: newStatus } }).unwrap();
      refetch();
    } catch (error) {
      console.error('Failed to update role status:', error);
    }
  };

  const renderRightContent = () => {
    // Show empty state when no roles exist
    if (roles.length === 0 && viewMode !== 'new') {
      return <EmptyState onNewRole={handleNewRole} />;
    }

    if (viewMode === 'details') {
      if (isLoadingDetails || !selectedRoleDetails) {
        return <ContentLoader className="min-h-[240px]" />;
      }

      return (
        <RoleDetailsView
          role={selectedRoleDetails}
          onEdit={handleEditRole}
          onDelete={handleDelete}
          onActivate={handleActivateRole}
        />
      );
    }

    if (viewMode === 'new') {
      return (
        <RoleForm
          mode={viewMode}
          role={null}
          onBack={handleCloseForm}
          onSave={handleSaveRole}
        />
      );
    }

    if (viewMode === 'edit') {
      if (isLoadingDetails || !selectedRoleDetails) {
        return <ContentLoader className="min-h-[240px]" />;
      }

      return (
        <RoleForm
          mode={viewMode}
          role={selectedRoleDetails}
          onBack={handleCloseForm}
          onSave={handleSaveRole}
        />
      );
    }

    return null;
  };


  // Loading state
  if (isLoading) {
    return (
      <Fragment>
        <PageMenu />
        <Container>
          <ContentLoader />
        </Container>
      </Fragment>
    );
  }

  // Error state
  if (error) {
    return (
      <Fragment>
        <PageMenu />
        <Container>
          <Card className="p-6">
            <div className="text-red-600">Failed to load roles. Please try again.</div>
          </Card>
        </Container>
      </Fragment>
    );
  }
  return (
    <Fragment>
      <PageMenu />
      <Container>
        <div className="flex h-full gap-6">
          <RolesList
            roles={roles}
            selectedRoleId={selectedRoleId}
            onRoleSelect={handleRoleSelect}
            onNewRole={handleNewRole}
            isLoading={isLoading}
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