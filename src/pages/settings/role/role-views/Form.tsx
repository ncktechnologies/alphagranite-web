// components/RoleForm.tsx
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Settings } from 'lucide-react';
import { Permissions } from '@/config/types';
import { UserAssignment } from '../component/AssignUser';
import { PermissionsTable } from '../component/PermisionsTable';
import { FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useGetAllActionMenusQuery } from '@/store/api/actionMenu';
import { Role } from '@/store/api/role';
import { Link } from 'react-router';

interface RoleFormProps {
    mode: 'new' | 'edit';
    role: Role | null | undefined;
    onBack: () => void;
    onSave: (data: RoleFormData) => void;
}

export interface RoleFormData {
    name: string;
    description: string;
    isActive: boolean;
    selectedUsers: string[];
    permissions: Permissions;
    role_id:number;
    action_menu_permissions?: Array<{
        action_menu_id: number;
        can_create: boolean;
        can_read: boolean;
        can_update: boolean;
        can_delete: boolean;
    }>;
}

const initialPermissions: Permissions = {
    dashboard: { create: true, read: true, update: true, delete: true },
    job: { create: true, read: true, update: true, delete: true },
    employees: { create: true, read: true, update: true, delete: true },
    sales: { create: true, read: true, update: true, delete: false },
    fabrication: { create: false, read: false, update: false, delete: false },
    installation: { create: true, read: true, update: true, delete: true },
    report: { create: true, read: true, update: true, delete: true },
    settings: { create: true, read: true, update: true, delete: true },
};

export const RoleForm = ({ mode, role, onBack, onSave }: RoleFormProps) => {
    const [roleName, setRoleName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState<boolean>(true);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [permissions, setPermissions] = useState<Permissions>({});

    // Fetch action menus to get IDs
    const { data: actionMenus } = useGetAllActionMenusQuery();
    // Create a map of action menu codes to IDs
    const actionMenuMap = useMemo(() => {
        if (!actionMenus) return {};
        return actionMenus.reduce((acc, menu) => {
            acc[menu.code] = menu.id;
            return acc;
        }, {} as Record<string, number>);
    }, [actionMenus]);

    // Populate form data when role changes (for edit mode)
    useEffect(() => {
        if (role) {
            setRoleName(role.name || '');
            setDescription(role.description || '');
            setIsActive(role.status === 1);
            
            // Populate selected users from role members
            if (role.members?.data && role.members?.data.length > 0) {
                const userIds = role.members?.data.map(member => String(member.id));
                setSelectedUsers(userIds);
            }
            
            // Populate permissions from role permissions
            if (role.permissions && role.permissions.length > 0) {
                const permsObj: Permissions = {};
                role.permissions.forEach(perm => {
                    if (perm.action_menu_name) {
                        permsObj[perm.action_menu_name] = {
                            create: perm.can_create,
                            read: perm.can_read,
                            update: perm.can_update,
                            delete: perm.can_delete,
                        };
                    }
                });
                setPermissions(permsObj);
            }
        } else {
            // Reset form for new mode
            setRoleName('');
            setDescription('');
            setIsActive(true);
            setSelectedUsers([]);
            setPermissions({});
        }
    }, [role]);

    const handlePermissionChange = (module: string, action: string, checked: boolean) => {
        setPermissions(prev => ({
            ...prev,
            [module]: {
                ...prev[module],
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

    const handleSubmit = () => {
        // Transform permissions to use action menu IDs instead of codes
        const transformedPermissions = permissions ? Object.entries(permissions).map(([code, perms]) => {
            const actionMenuId = actionMenuMap[code];
            if (!actionMenuId) return null; // Skip if no matching action menu found
            
            return {
                action_menu_id: actionMenuId,
                can_create: perms.create,
                can_read: perms.read,
                can_update: perms.update,
                can_delete: perms.delete,
            };
        }).filter(Boolean) : []; // Remove null values

        onSave({
            name: roleName,
            role_id: role ? role.id : 0,
            description,
            isActive,
            selectedUsers,
            permissions,
            // Add transformed permissions for API submission
            action_menu_permissions: transformedPermissions,
        } as any);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-normal text-black">
                    {mode === 'new' ? 'New Role:' : `Edit Role: ${role?.name}`}
                </h2>
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Left Column */}
            <div className="space-y-6">
                {/* Role Name */}
                <div className="space-y-2">
                    <Label htmlFor="roleName" className='font-normal text-secondary'>Role Name</Label>
                    <Input
                        id="roleName"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        placeholder="ADMIN/EXECUTIVES"
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="description" className='font-normal text-secondary'>Description</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Department KPIs, financial, operational insights"
                    />
                </div>
                <h3 className="font-semibold text-black leading-6">Permissions</h3>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">Configure access permissions for this role</p>
                  <Link to="/settings/permissions">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                      <Settings className="w-4 h-4 mr-1" />
                      Manage Permissions
                    </Button>
                  </Link>
                </div>
                <PermissionsTable
                    permissions={permissions}
                    onPermissionChange={handlePermissionChange}
                />
                {/* Status */}


                {/* Assign Users */}
                <UserAssignment
                    selectedUsers={selectedUsers}
                    onUserToggle={handleUserToggle}
                />
                <div className="flex items-center justify-between">
                    <div className='flex gap-2 items-center'>
                        <h3 className="font-semibold text-text leading-6  ">Status</h3>
                        <Badge>Active</Badge>
                    </div>
                    <Switch
                        id="status"
                        checked={isActive}
                        onCheckedChange={setIsActive}
                    />
                </div>

                {/* Right Column - Permissions */}

            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 py-6 ">
                <Button variant="outline" onClick={onBack} className=" px-3  text-base py-3 font-normal">
                    Cancel
                </Button>
                <Button onClick={handleSubmit} className=" px-6 text-base py-3 font-normal">
                    Save role
                </Button>
            </div>
        </div>
    );
};