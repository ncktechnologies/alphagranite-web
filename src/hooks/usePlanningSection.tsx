import { useGetPlanningSectionsQuery } from '@/store/api';
import { useMemo } from 'react';
export interface PlanSection {
    id: number;
    plan_name: string;
    plan_description: string;
    status_id: number;
}


export const usePlanSections = () => {
    const { data, isLoading, isError } = useGetPlanningSectionsQuery();

    const sections: PlanSection[] = useMemo(() => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (typeof data === 'object' && 'data' in data) return (data as any).data ?? [];
        return [];
    }, [data]);

    /**
     * Find a planning section whose `plan_name` contains the given keyword (case-insensitive).
     * Returns undefined if not found or sections haven't loaded yet.
     */
    const findSectionByKeyword = (keyword: string): PlanSection | undefined => {
        const lower = keyword.toLowerCase();
        return sections.find(s => s.plan_name.toLowerCase().includes(lower));
    };

    return { sections, isLoading, isError, findSectionByKeyword };
};