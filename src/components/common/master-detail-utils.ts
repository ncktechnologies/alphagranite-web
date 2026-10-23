// Helpers for the shared list/details layout in master-detail.tsx.
export type StatusFilter = 'all' | 'active' | 'inactive';

export const matchesStatusFilter = (active: boolean, filter: StatusFilter) =>
    filter === 'all' || (filter === 'active') === active;

export const getInitials = (name: string) => {
    const parts = name.split(' ').filter((p) => p.trim().length > 0);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};
