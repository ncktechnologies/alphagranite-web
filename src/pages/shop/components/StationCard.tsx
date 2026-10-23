// Compact workstation row for the Shop Settings list.
import { forwardRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Station } from '@/config/types';

interface StationCardProps {
    role: Station;
    isSelected: boolean;
    onClick: (role: Station) => void;
}

const MAX_AVATARS = 3;

const getInitials = (name: string) => {
    const parts = name.split(' ').filter((p) => p.trim().length > 0);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export const StationCard = forwardRef<HTMLButtonElement, StationCardProps>(({ role, isSelected, onClick }, ref) => {
    const active = role.status === 'Active';
    const operators = role.operators ?? [];

    return (
        <button
            ref={ref}
            type="button"
            onClick={() => onClick(role)}
            aria-current={isSelected ? 'true' : undefined}
            className={cn(
                'group w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected
                    ? 'border-primary/50 bg-primary-soft'
                    : 'border-transparent hover:border-border hover:bg-muted/60',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <span className={cn('truncate text-sm font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>
                    {role.workstationName}
                </span>
                <span
                    className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 text-xs font-medium',
                        active ? 'text-green-700' : 'text-muted-foreground',
                    )}
                >
                    <span className={cn('size-2 rounded-full', active ? 'bg-green-500' : 'bg-[#9AA1AD]')} />
                    {active ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground" title={role.description}>
                    {role.description}
                </span>
                {operators.length > 0 ? (
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
            </div>
        </button>
    );
});

StationCard.displayName = 'StationCard';
