// Workstation list pane for Shop Settings: search, status filter and a scrollable list.
import { useEffect, useRef } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Station } from '@/config/types';
import { StationCard } from './StationCard';

export type StationStatusFilter = 'all' | 'active' | 'inactive';

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

const FILTERS: { value: StationStatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

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
}: StationListProps) => {
    const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    // Keep the selected workstation visible in the list (e.g. after filtering or auto-select).
    const selectedId = selectedRole?.id;
    useEffect(() => {
        if (selectedId) itemRefs.current.get(selectedId)?.scrollIntoView({ block: 'nearest' });
    }, [selectedId]);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="space-y-3 border-b border-border p-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-foreground">Workstations</h2>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {counts.all}
                        </span>
                    </div>
                    <Button size="sm" variant="primary" className="h-8" onClick={onNewRole}>
                        <Plus className="size-4" /> New
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search name, activity, operator"
                        className="h-[34px] ps-9 pe-8"
                    />
                    {search && (
                        <Button
                            mode="icon"
                            variant="ghost"
                            className="absolute end-1.5 top-1/2 h-6 w-6 -translate-y-1/2"
                            onClick={() => onSearchChange('')}
                            aria-label="Clear search"
                        >
                            <X />
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Workstation status">
                    {FILTERS.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={statusFilter === value}
                            onClick={() => onStatusFilterChange(value)}
                            className={cn(
                                'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                                statusFilter === value
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {label}
                            <span className="tabular-nums text-muted-foreground">{counts[value]}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {isLoading ? (
                    <p className="px-3 py-8 text-center text-sm text-muted-foreground">Loading workstations...</p>
                ) : roles.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                        {search ? `No workstations match "${search}".` : `No ${statusFilter === 'all' ? '' : `${statusFilter} `}workstations.`}
                    </p>
                ) : (
                    <div className="space-y-1">
                        {roles.map((role) => (
                            <StationCard
                                key={role.id}
                                ref={(el) => {
                                    if (el) itemRefs.current.set(role.id, el);
                                    else itemRefs.current.delete(role.id);
                                }}
                                role={role}
                                isSelected={selectedRole?.id === role.id}
                                onClick={onRoleSelect}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
