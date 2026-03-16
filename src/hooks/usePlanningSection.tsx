import { useGetPlanningSectionsQuery } from '@/store/api';
import { useMemo } from 'react';
export interface PlanSection {
    id: number;
    plan_name: string;
    plan_description: string;
    status_id: number;
}

/**
 * Provides planning sections fetched from the API.
 * Use `findSectionByKeyword` to resolve a section by a partial name match —
 * this way your UI never hardcodes IDs; only names are coupled.
 *
 * Example:
 *   findSectionByKeyword('wj')      → { id: 8, plan_name: 'WJ Planning', ... }
 *   findSectionByKeyword('cnc')     → { id: 1, plan_name: 'CNC Planning', ... }
 *   findSectionByKeyword('edg')     → { id: 9, plan_name: 'Edging Planning', ... }
 *   findSectionByKeyword('mit')     → { id: 2, plan_name: 'Miter Planning', ... }
 *   findSectionByKeyword('cut')     → { id: 7, plan_name: 'Cut Planning', ... }
 */
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