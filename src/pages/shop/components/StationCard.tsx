// Compact workstation row for the Shop Settings list.
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MasterListItem } from '@/components/common/master-detail';
import { getInitials } from '@/components/common/master-detail-utils';
import { Station } from '@/config/types';

interface StationCardProps {
    role: Station;
    isSelected: boolean;
    onClick: (role: Station) => void;
}

const MAX_AVATARS = 3;

export const StationCard = ({ role, isSelected, onClick }: StationCardProps) => {
    const operators = role.operators ?? [];

    return (
        <MasterListItem
            title={role.workstationName}
            active={role.status === 'Active'}
            isSelected={isSelected}
            onClick={() => onClick(role)}
            subtitle={role.description}
            aside={operators.length > 0 ? (
                <div className="flex shrink-0 items-center -space-x-1.5" title={operators.join(', ')}>
                    {operators.slice(0, MAX_AVATARS).map((name) => (
                        <Avatar key={name} className="size-5 border border-background">
                            <AvatarFallback className="bg-primary/15 text-[9px] font-semibold text-primary">
                                {getInitials(name)}
                            </AvatarFallback>
                        </Avatar>
                    ))}
                    {operators.length > MAX_AVATARS && (
                        <span className="pl-2.5 text-[11px] text-muted-foreground">+{operators.length - MAX_AVATARS}</span>
                    )}
                </div>
            ) : (
                <span className="shrink-0 text-[11px] text-muted-foreground">No operators</span>
            )}
        />
    );
};
