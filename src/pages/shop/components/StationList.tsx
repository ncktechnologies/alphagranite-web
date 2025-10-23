// components/RolesList.tsx
import { Button } from '@/components/ui/button';
import { Station } from '@/config/types';
import { StationCard } from './StationCard';


interface RolesListProps {
    roles: Station[];
    selectedRole: Station | null;
    onRoleSelect: (role: Station) => void;
    onNewRole: () => void;
}

export const StationList = ({
    roles,
    selectedRole,
    onRoleSelect,
    onNewRole,
}: RolesListProps) => {
    return (
        <div className="w-80 space-y-4 pr-6 border-r">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">Workstation</h2>
                <Button onClick={onNewRole} className="font-semibold text-sm">
                    + New workstation
                </Button>
            </div>

            <div className="space-y-2">
                {roles.map((role) => (
                    <StationCard
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