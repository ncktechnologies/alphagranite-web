import { useMemo, useState } from 'react';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { useGetRolesQuery } from '@/store/api/role';

/**
 * Drafter dropdown shared by the CAD widgets (Drafting, Revisions, Final Programming,
 * SlabSmith, CNC). `filterValue` is undefined for "All", 0 for "No Drafter", else the user id;
 * each page sends it as the parameter its endpoint filters on.
 */
export function useDrafterFilter(onChange?: () => void) {
  const { data: rolesData } = useGetRolesQuery();
  const drafterRoleId = useMemo(() => {
    const roles = (rolesData as any)?.data?.data ?? (rolesData as any)?.data ?? rolesData;
    if (!Array.isArray(roles)) return null;
    const role = roles.find((r: any) => ['cad', 'drafter'].includes((r.name || '').toLowerCase().trim()));
    return role?.id ?? null;
  }, [rolesData]);

  const { data: draftersData } = useGetEmployeesQuery(
    { role_id: drafterRoleId ?? undefined, sort_by: 'first_name', sort_order: 'asc', limit: 500 },
    { skip: !drafterRoleId }
  );

  const drafters = useMemo(() => {
    const employees = (draftersData as any)?.data ?? draftersData;
    if (!Array.isArray(employees)) return [];
    return employees.map((e: any) => ({
      id: String(e.id),
      name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || 'Unknown Drafter',
    }));
  }, [draftersData]);

  const [drafterFilter, setDrafterFilterState] = useState('all');
  const setDrafterFilter = (value: string) => {
    setDrafterFilterState(value);
    onChange?.(); // e.g. back to page 1
  };

  const filterValue =
    drafterFilter === 'all' ? undefined : drafterFilter === 'unassigned' ? 0 : Number(drafterFilter);

  return { drafters, drafterFilter, setDrafterFilter, filterValue };
}
