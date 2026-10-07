import { useMemo } from 'react';
import { type FabType, useGetFabTypesQuery } from '@/store/api/job';

/**
 * Fab type names for the Fab Type filter on tables and reports, from GET /fab-types.
 *
 * The list comes from the fab types set up in the system, not from the rows
 * currently loaded, so every type is offered even when the page shows none of it.
 */
export function useFabTypeNames(): string[] {
  const { data } = useGetFabTypesQuery();
  return useMemo(() => {
    const list: FabType[] = Array.isArray(data) ? data : ((data as { data?: FabType[] } | undefined)?.data ?? []);
    const names = list.map((fabType) => fabType?.name?.trim()).filter((name): name is string => !!name);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [data]);
}

/** Fab type comparison for filters: stored values and fab type names can differ in case. */
export function isSameFabType(value: string | null | undefined, filter: string): boolean {
  return (value ?? '').trim().toLowerCase() === filter.trim().toLowerCase();
}
