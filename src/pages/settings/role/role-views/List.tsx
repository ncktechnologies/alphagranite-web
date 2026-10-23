// components/RolesList.tsx
import { RoleCard } from '../component/RoleCard';
import { Can } from '@/components/permission';
import { Role } from '@/store/api/role';
import { MasterListPane, type StatusFilter } from '@/components/common/master-detail';

interface RolesListProps {
  roles: Role[];
  selectedRoleId: number | null;
  onRoleSelect: (role: Role) => void;
  onNewRole: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
  isLoading?: boolean;
}

export const RolesList = ({
  roles,
  selectedRoleId,
  onRoleSelect,
  onNewRole,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  counts,
  isLoading = false,
}: RolesListProps) => (
  <MasterListPane
    title="Roles"
    noun="roles"
    onNew={onNewRole}
    newButton={(button) => <Can action="create" on="Settings">{button}</Can>}
    search={search}
    onSearchChange={onSearchChange}
    searchPlaceholder="Search name, description"
    statusFilter={statusFilter}
    onStatusFilterChange={onStatusFilterChange}
    counts={counts}
    isEmpty={roles.length === 0}
    isLoading={isLoading}
  >
    {roles.map((role) => (
      <RoleCard
        key={role.id}
        role={role}
        isSelected={selectedRoleId === role.id}
        onClick={onRoleSelect}
      />
    ))}
  </MasterListPane>
);
