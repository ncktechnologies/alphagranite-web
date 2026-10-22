// planning_section_id of the two cut stages: CUT - SAW and CUT - WJ.
export const CUT_PLAN_SECTION_IDS = [7, 8];

interface CutPlanLike {
    id?: number;
    planning_section_id?: number;
    sequence?: number | null;
    scheduled_start_date?: string | null;
}

/**
 * The FAB's first cut plan (CUT - SAW or CUT - WJ) by sequence, so a FAB cut only on the
 * waterjet still gets a shop cut date. Ties go to the earlier scheduled date, then plan id.
 */
export function firstCutPlan<T extends CutPlanLike>(plans: T[]): T | undefined {
    return plans
        .filter((plan) => CUT_PLAN_SECTION_IDS.includes(plan.planning_section_id ?? -1))
        .sort((a, b) =>
            (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER)
            || (a.scheduled_start_date || '￿').localeCompare(b.scheduled_start_date || '￿')
            || (a.id ?? 0) - (b.id ?? 0),
        )[0];
}
