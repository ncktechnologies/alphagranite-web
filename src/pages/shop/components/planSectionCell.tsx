import React, { useState } from 'react';
import CreatePlanSheet from './createEvent'; // adjust path as needed
import { usePlanSections } from '@/hooks/usePlanningSection';

interface PlanSectionCellProps {
    /** The display value (e.g. "12.50") */
    value: string;
    /** Keyword to match against plan_name, e.g. "wj", "cnc", "edg", "mit" */
    sectionKeyword: string;
    /** The fab this cell belongs to */
    fabId: string;
    /**
     * All plans on this fab (from the raw API fab object).
     * Each plan should have: { id, planning_section_id, ... }
     */
    fabPlans: any[];
    /** Called after a plan is created or updated so the parent can refetch */
    onPlanSaved: () => void;
}

/**
 * A generic cell component for any LN FT column that should open a planning sheet.
 *
 * - Resolves the correct planning section dynamically by keyword (no hardcoded IDs).
 * - If the fab already has a plan for that section, opens the sheet in edit mode.
 * - If not, opens in create mode with the section pre-selected.
 *
 * Usage in your column definition:
 *
 *   cell: ({ row }) => (
 *     <PlanSectionCell
 *       value={row.original.wl_ln_ft.toFixed(2)}
 *       sectionKeyword="wj"
 *       fabId={row.original.fab_id}
 *       fabPlans={row.original._rawPlans}
 *       onPlanSaved={refetch}
 *     />
 *   )
 */
const PlanSectionCell: React.FC<PlanSectionCellProps> = ({
    value,
    sectionKeyword,
    fabId,
    fabPlans,
    onPlanSaved,
}) => {
    const { findSectionByKeyword, isLoading: sectionsLoading } = usePlanSections();
    const [sheetOpen, setSheetOpen] = useState(false);

    const handleClick = () => {
        if (sectionsLoading) return;
        setSheetOpen(true);
    };

    // Resolve the matched section (done at render time, not just on click,
    // so we can also derive the existing plan below)
    const matchedSection = findSectionByKeyword(sectionKeyword);

    // Find existing plan for this fab + section (if any) → drives edit vs create mode
    const existingPlan = matchedSection
        ? fabPlans.find((p: any) => p.planning_section_id === matchedSection.id) ?? null
        : null;

    return (
        <>
            <button
                onClick={handleClick}
                disabled={sectionsLoading || !matchedSection}
                className={[
                    'text-sm text-left transition-colors',
                    matchedSection && !sectionsLoading
                        ? 'text-blue-600 hover:underline cursor-pointer'
                        : 'text-text cursor-default',
                ].join(' ')}
                title={
                    matchedSection
                        ? existingPlan
                            ? `Edit plan: ${matchedSection.plan_name}`
                            : `Create plan: ${matchedSection.plan_name}`
                        : 'No matching planning section found'
                }
            >
                {value}
            </button>

            {sheetOpen && (
                <CreatePlanSheet
                    open={sheetOpen}
                    onOpenChange={setSheetOpen}
                    selectedDate={null}
                    selectedTimeSlot={null}
                    prefillFabId={fabId}
                    // Pass the existing plan so CreatePlanSheet knows it's an edit
                    selectedEvent={existingPlan ?? null}
                    // Pre-select the resolved section ID so the form opens on the right section
                    prefillPlanSectionId={matchedSection?.id}
                    onEventCreated={() => {
                        onPlanSaved();
                        setSheetOpen(false);
                    }}
                />
            )}
        </>
    );
};

export default PlanSectionCell;