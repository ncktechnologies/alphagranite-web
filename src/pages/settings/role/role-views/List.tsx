// components/RolesList.tsx
import { Button } from '@/components/ui/button';
import { Role } from '@/config/types';
import { RoleCard } from '../component/RoleCard';


interface RolesListProps {
  roles: Role[];
  selectedRole: Role | null;
  onRoleSelect: (role: Role) => void;
  onNewRole: () => void;
}

export const RolesList = ({
  roles,
  selectedRole,
  onRoleSelect,
  onNewRole,
}: RolesListProps) => {
  return (
    <div className="w-80 space-y-4 pr-6 border-r">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Roles</h2>
        <Button onClick={onNewRole} className="bg-green-600 hover:bg-green-700">
          + New role
        </Button>
      </div>

      <div className="space-y-2">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            isSelected={selectedRole?.id === role.id}
            onClick={onRoleSelect}
          />
        ))}
      </div>
    </div>
  );
};