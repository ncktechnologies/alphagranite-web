// components/RolesList.tsx
import { Button } from '@/components/ui/button';
import { RoleCard } from '../component/RoleCard';
import { Can } from '@/components/permission';
import { Role } from '@/store/api/role';
import EmptyStateCard from '../component/empty-state';


interface RolesListProps {
  roles: Role[];
  selectedRoleId: number | null;
  onRoleSelect: (role: Role) => void;
  onNewRole: () => void;
  isLoading?: boolean;
}

export const RolesList = ({
  roles,
  selectedRoleId,
  onRoleSelect,
  onNewRole,
  isLoading = false,
}: RolesListProps) => {
  return (
    <div className="w-80 space-y-4 pr-6 border-r">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Roles</h2>
        <Can action="update" on="Settings">
          <Button onClick={onNewRole} className="bg-green-600 hover:bg-green-700">
            + New role
          </Button>
        </Can>
      </div>

      <div className="space-y-2">
        {roles.length === 0 ? (
          <EmptyStateCard/>
        ) : (
          roles?.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              isSelected={selectedRoleId === role.id}
              onClick={onRoleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};