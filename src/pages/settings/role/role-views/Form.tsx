// components/RoleForm.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { Permissions, Role } from '@/config/types';
import { UserAssignment } from '../component/AssignUser';
import { PermissionsTable } from '../component/PermisionsTable';

interface RoleFormProps {
    mode: 'new' | 'edit';
    role: Role | null;
    onBack: () => void;
    onSave: (data: RoleFormData) => void;
}

export interface RoleFormData {
    name: string;
    description: string;
    isActive: boolean;
    selectedUsers: string[];
    permissions: Permissions;
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
    const [roleName, setRoleName] = useState(role?.name || '');
    const [description, setDescription] = useState(role?.description || '');
    const [isActive, setIsActive] = useState(role?.status === 'Active' || true);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [permissions, setPermissions] = useState<Permissions>(initialPermissions);

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
        onSave({
            name: roleName,
            description,
            isActive,
            selectedUsers,
            permissions,
        });
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
                <PermissionsTable
                    permissions={permissions}
                    onPermissionChange={handlePermissionChange}
                />
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
                <UserAssignment
                    selectedUsers={selectedUsers}
                    onUserToggle={handleUserToggle}
                />


                {/* Right Column - Permissions */}

            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={onBack}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                    Save role
                </Button>
            </div>
        </div>
    );
};