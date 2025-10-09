// components/RolesSection.tsx
import { Fragment, useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { PageMenu } from '../page-menu';
import { Role, ViewMode } from '@/config/types';
import { RoleForm, RoleFormData } from './role-views/Form';
import { RoleDetailsView } from './role-views/Details';
import { RolesList } from './role-views/List';
import { roles } from '@/config/menu.config';

export const RolesSection = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  // Set first role as active when component mounts
  useEffect(() => {
    if (roles.length > 0 && !selectedRole) {
      setSelectedRole(roles[0]);
      setViewMode('details');
    }
  }, [selectedRole]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setViewMode('details');
  };

  const handleNewRole = () => {
    setSelectedRole(null);
    setViewMode('new');
  };

  const handleEditRole = (role: Role) => {
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

  const handleSaveRole = (data: RoleFormData) => {
    console.log('Saving role:', data);
    handleCloseForm();
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
      return <RoleDetailsView role={selectedRole} onEdit={handleEditRole} />;
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