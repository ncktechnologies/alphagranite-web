// Shared list/details layout used by settings screens (Workstations, Shop Activities, Roles):
// a bordered two-pane shell, a searchable list pane with a status filter, compact list rows and info tiles.
import { useEffect, useRef, type ReactNode } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { StatusFilter } from './master-detail-utils';

export type { StatusFilter };

const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

interface MasterDetailLayoutProps {
    list: ReactNode;
    children: ReactNode;
    // The details view renders its own sticky header, so it sits flush with the top edge.
    flushTop?: boolean;
}

// List and details scroll independently, so the selected item stays in view.
export const MasterDetailLayout = ({ list, children, flushTop = false }: MasterDetailLayoutProps) => (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-background lg:h-[calc(100vh-260px)] lg:min-h-[520px] lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex max-h-[60vh] min-h-0 flex-col border-b border-border lg:max-h-none lg:border-b-0 lg:border-r">
            {list}
        </div>
        <div className={cn('min-h-0 overflow-y-auto px-6 pb-6', flushTop ? 'pt-0' : 'pt-6')}>{children}</div>
    </div>
);

interface MasterListPaneProps {
    title: string;
    noun: string; // plural, used in empty and loading messages, e.g. "workstations"
    onNew?: () => void;
    newButton?: (button: ReactNode) => ReactNode; // wrap the New button, e.g. in a permission check
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder: string;
    statusFilter: StatusFilter;
    onStatusFilterChange: (value: StatusFilter) => void;
    counts: Record<StatusFilter, number>;
    isEmpty: boolean;
    isLoading?: boolean;
    children: ReactNode;
}

export const MasterListPane = ({
    title,
    noun,
    onNew,
    newButton = (button) => button,
    search,
    onSearchChange,
    searchPlaceholder,
    statusFilter,
    onStatusFilterChange,
    counts,
    isEmpty,
    isLoading = false,
    children,
}: MasterListPaneProps) => (
    <div className="flex h-full min-h-0 flex-col">
        <div className="space-y-3 border-b border-border p-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {counts.all}
                    </span>
                </div>
                {onNew && newButton(
                    <Button size="sm" variant="primary" className="h-8" onClick={onNew}>
                        <Plus className="size-4" /> New
                    </Button>
                )}
            </div>

            <div className="relative">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
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

            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label={`${title} status`}>
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
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">Loading {noun}...</p>
            ) : isEmpty ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {search ? `No ${noun} match "${search}".` : `No ${statusFilter === 'all' ? '' : `${statusFilter} `}${noun}.`}
                </p>
            ) : (
                <div className="space-y-1">{children}</div>
            )}
        </div>
    </div>
);

interface MasterListItemProps {
    title: string;
    active: boolean;
    isSelected: boolean;
    onClick: () => void;
    subtitle?: string;
    aside?: ReactNode; // shown opposite the subtitle, e.g. member avatars
}

export const MasterListItem = ({ title, active, isSelected, onClick, subtitle, aside }: MasterListItemProps) => {
    const ref = useRef<HTMLButtonElement>(null);

    // Keep the selected item visible in the list (e.g. after filtering or auto-select).
    useEffect(() => {
        if (isSelected) ref.current?.scrollIntoView({ block: 'nearest' });
    }, [isSelected]);

    return (
        <button
            ref={ref}
            type="button"
            onClick={onClick}
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
                    {title}
                </span>
                <StatusIndicator active={active} />
            </div>
            {(subtitle || aside) && (
                <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground" title={subtitle}>
                        {subtitle}
                    </span>
                    {aside}
                </div>
            )}
        </button>
    );
};

export const StatusIndicator = ({ active }: { active: boolean }) => (
    <span
        className={cn(
            'inline-flex shrink-0 items-center gap-1.5 text-xs font-medium',
            active ? 'text-green-700' : 'text-muted-foreground',
        )}
    >
        <span className={cn('size-2 rounded-full', active ? 'bg-green-500' : 'bg-[#9AA1AD]')} />
        {active ? 'Active' : 'Inactive'}
    </span>
);

// Stays at the top of the details pane while its content scrolls.
export const DetailStickyHeader = ({ children }: { children: ReactNode }) => (
    <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background/95 px-6 pb-4 pt-5 backdrop-blur">
        {children}
    </div>
);

export const DetailField = ({ label, value, className }: { label: string; value: ReactNode; className?: string }) => (
    <div className={cn('rounded-lg border border-border bg-muted/40 p-4', className)}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1.5 font-semibold text-foreground">{value}</p>
    </div>
);
