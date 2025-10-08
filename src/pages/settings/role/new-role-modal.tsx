import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X } from 'lucide-react';

interface NewRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewRoleModal = ({ open, onOpenChange }: NewRoleModalProps) => {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
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

  const availableUsers = [
    { id: '1', name: 'Alex Johnson', initials: 'AJ' },
    { id: '2', name: 'Sarah Miller', initials: 'SM' },
    { id: '3', name: 'David Chen', initials: 'DC' },
    { id: '4', name: 'Maria Garcia', initials: 'MG' },
    { id: '5', name: 'James Wilson', initials: 'JW' },
  ];

  const modules = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'job', label: 'Job' },
    { key: 'employees', label: 'Employees' },
    { key: 'sales', label: 'Sales' },
    { key: 'fabrication', label: 'Fabrication' },
    { key: 'installation', label: 'Installation' },
    { key: 'report', label: 'Report' },
    { key: 'settings', label: 'Settings' },
  ];

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
    // Handle save logic here
    console.log('Saving role:', { roleName, description, isActive, selectedUsers, permissions });
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">New Role:</h2>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
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
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              Save role
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { NewRoleModal };