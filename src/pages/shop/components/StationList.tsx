// Workstation list pane for Shop Settings: search, status filter and a scrollable list.
import { MasterListPane, type StatusFilter } from '@/components/common/master-detail';
import { Station } from '@/config/types';
import { StationCard } from './StationCard';

export type StationStatusFilter = StatusFilter;

interface StationListProps {
    roles: Station[];
    selectedRole: Station | null;
    onRoleSelect: (role: Station) => void;
    onNewRole: () => void;
    search: string;
    onSearchChange: (value: string) => void;
    statusFilter: StationStatusFilter;
    onStatusFilterChange: (value: StationStatusFilter) => void;
    counts: Record<StationStatusFilter, number>;
    isLoading?: boolean;
}

export const StationList = ({
    roles,
    selectedRole,
    onRoleSelect,
    onNewRole,
    search,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    counts,
    isLoading = false,
}: StationListProps) => (
    <MasterListPane
        title="Workstations"
        noun="workstations"
        onNew={onNewRole}
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search name, activity, operator"
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        counts={counts}
        isEmpty={roles.length === 0}
        isLoading={isLoading}
    >
        {roles.map((role) => (
            <StationCard
                key={role.id}
                role={role}
                isSelected={selectedRole?.id === role.id}
                onClick={onRoleSelect}
            />
        ))}
    </MasterListPane>
);
