// components/UserAssignment.tsx
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { availableUsers } from '@/config/menu.config';

interface UserAssignmentProps {
  selectedUsers: string[];
  onUserToggle: (userId: string) => void;
}

export const UserAssignment = ({ selectedUsers, onUserToggle }: UserAssignmentProps) => {
  return (
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
                onCheckedChange={() => onUserToggle(user.id)}
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
  );
};