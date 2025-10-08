import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  members: number;
  avatars: string[];
}

interface EditRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
}

const EditRoleModal = ({ open, onOpenChange, role }: EditRoleModalProps) => {
  const [roleName, setRoleName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [isActive, setIsActive] = useState(role?.status === 'Active');

  const handleSave = () => {
    // Handle save logic here
    console.log('Saving role:', { roleName, description, isActive });
    onOpenChange(false);
  };

  if (!open || !role) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Role: {role.name}</h2>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Role Name */}
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { EditRoleModal };