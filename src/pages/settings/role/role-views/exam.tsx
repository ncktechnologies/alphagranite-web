import { Fragment, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { X, CheckCircle } from 'lucide-react';
import { Role } from '@/config/types';
import { availableUsers, modules, roles } from '@/config/menu.config';
import { Container } from '@/components/common/container';
import { PageMenu } from '../page-menu';
import { UsersSection } from './component/users-section';

type ViewMode = 'details' | 'new' | 'edit' | 'list';

const RolesSection = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
      if (selectedRole) {
        setViewMode('details');
      } else if (roles.length > 0) {
        setSelectedRole(roles[0]);
        setViewMode('details');
      } else {
        setViewMode('list');
      }
    }
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
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
    if (isDeleted) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Role deleted successfully
            </h3>
            <p className="text-sm text-gray-600">
              The role '{selectedRole?.name}' has been deleted successfully.
            </p>
          </div>
        </div>
      );
    }

    if (viewMode === 'details') {
      // If no role is selected but we have roles, show the first one
      if (!selectedRole && roles.length > 0) {
        return (
          <div className="space-y-6">
            {/* Role summary header with actions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{roles[0].name}</h3>
                    <p className="text-xs text-gray-600">{roles[0].description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditRole(roles[0])}>Edit</Button>
                    <Button variant="outline" size="sm">Deactivate role</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats row */}
            <Card className="bg-gray-50">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-sm">📅</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date created</p>
                      <p className="font-semibold text-gray-900">Mar 14, 2025</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-sm">👥</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total No. of staff</p>
                      <p className="font-semibold text-gray-900">121</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-sm">✓</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active staff</p>
                      <p className="font-semibold text-gray-900">95</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-sm">⏳</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Pending staff</p>
                      <p className="font-semibold text-gray-900">21</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <UsersSection />
          </div>
        );
      }

      return (
        <div className="space-y-6">
          {/* Role summary header with actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{selectedRole?.name}</h3>
                  <p className="text-xs text-gray-600">{selectedRole?.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditRole(selectedRole!)}>Edit</Button>
                  <Button variant="outline" size="sm">Deactivate role</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats row */}
          <Card className="bg-gray-50">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm">📅</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date created</p>
                    <p className="font-semibold text-gray-900">Mar 14, 2025</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm">👥</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total No. of staff</p>
                    <p className="font-semibold text-gray-900">121</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active staff</p>
                    <p className="font-semibold text-gray-900">95</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-sm">⏳</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending staff</p>
                    <p className="font-semibold text-gray-900">21</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <UsersSection />
        </div>
      );
    }

    if (viewMode === 'new' || viewMode === 'edit') {
      return <RoleFormView mode={viewMode} role={selectedRole} onBack={handleCloseForm} />;
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
          {/* Left Sidebar - Roles List */}
          <div className="w-80 space-y-4 pr-6 border-r">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Roles</h2>
              <Button onClick={handleNewRole} className="bg-green-600 hover:bg-green-700">
                + New role
              </Button>
            </div>

            <div className="space-y-2">
              {roles.map((role) => (
                <Card 
                  key={role.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedRole?.id === role.id ? 'ring-2 ring-green-500 bg-green-50' : ''
                  }`}
                  onClick={() => handleRoleSelect(role)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{role.name}</h3>
                        <Badge 
                          variant={role.status === 'Active' ? 'default' : 'secondary'}
                          className={role.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                        >
                          {role.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600">{role.description}</p>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">MEMBERS ({role.members}) +2</span>
                        <div className="flex -space-x-2">
                          {role.avatars?.map((avatar, index) => (
                            <Avatar key={index} className="w-6 h-6 border-2 border-white">
                              <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                                {avatar}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 pl-6">
            {renderRightContent()}
          </div>
        </div>
      </Container>
    </Fragment>
  );
};

// Role Form Component
const RoleFormView = ({ mode, role, onBack }: { mode: 'new' | 'edit', role: Role | null, onBack: () => void }) => {
  const [roleName, setRoleName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [isActive, setIsActive] = useState(role?.status === 'Active' || true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [permissions, setPermissions] = useState({
    dashboard: { create: true, read: true, update: true, delete: true },
    job: { create: true, read: true, update: true, delete: true },
    employees: { create: true, read: true, update: true, delete: true },
    sales: { create: true, read: true, update: true, delete: false },
    fabrication: { create: false, read: false, update: false, delete: false },
    installation: { create: true, read: true, update: true, delete: true },
    report: { create: true, read: true, update: true, delete: true },
    settings: { create: true, read: true, update: true, delete: true },
  });

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module as keyof typeof prev],
        [action]: checked
      }
    }));
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = () => {
    console.log('Saving role:', { roleName, description, isActive, selectedUsers, permissions });
    onBack();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {mode === 'new' ? 'New Role:' : `Edit Role: ${role?.name}`}
        </h2>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Role Name */}
          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name</Label>
            <Input
              id="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="ADMIN/EXECUTIVES"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Department KPIs, financial, operational insights"
            />
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="status"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="status">Status Active</Label>
          </div>

          {/* Assign Users */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Assign Users</h3>
            <div className="space-y-2">
              <Input placeholder="Search users..." />
              <div className="space-y-2">
                {availableUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleUserToggle(user.id)}
                    />
                    <Label htmlFor={user.id} className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.name}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Permissions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Permissions</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-700">Module</th>
                  <th className="text-center py-2 font-medium text-gray-700">Create</th>
                  <th className="text-center py-2 font-medium text-gray-700">Read</th>
                  <th className="text-center py-2 font-medium text-gray-700">Update</th>
                  <th className="text-center py-2 font-medium text-gray-700">Delete</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((module) => (
                  <tr key={module.key} className="border-b">
                    <td className="py-2 font-medium text-gray-900">{module.label}</td>
                    <td className="py-2 text-center">
                      <Checkbox
                        checked={permissions[module.key as keyof typeof permissions].create}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(module.key, 'create', checked as boolean)
                        }
                      />
                    </td>
                    <td className="py-2 text-center">
                      <Checkbox
                        checked={permissions[module.key as keyof typeof permissions].read}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(module.key, 'read', checked as boolean)
                        }
                      />
                    </td>
                    <td className="py-2 text-center">
                      <Checkbox
                        checked={permissions[module.key as keyof typeof permissions].update}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(module.key, 'update', checked as boolean)
                        }
                      />
                    </td>
                    <td className="py-2 text-center">
                      <Checkbox
                        checked={permissions[module.key as keyof typeof permissions].delete}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(module.key, 'delete', checked as boolean)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
          Save role
        </Button>
      </div>
    </div>
  );
};

export { RolesSection };