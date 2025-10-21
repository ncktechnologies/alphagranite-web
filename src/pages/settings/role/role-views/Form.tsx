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
import { FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

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
                <h3 className="font-semibold text-black leading-6  ">Permissions</h3>
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