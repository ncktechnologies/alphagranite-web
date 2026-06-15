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
    /** Permission to create/edit plans */
    canManagePlans?: boolean;
}

/**
 * A generic cell component for any LN FT column that should open a planning sheet.
 *
 * - Resolves the correct planning section dynamically by keyword (no hardcoded IDs).
 * - If the fab already has a plan for that section, opens the sheet in edit mode.
 * - If not, opens in create mode with the section pre-selected.
 * - If `canManagePlans` is false, the cell is read‑only (plain text, not clickable).
 */
const PlanSectionCell: React.FC<PlanSectionCellProps> = ({
    value,
    sectionKeyword,
    fabId,
    fabPlans,
    onPlanSaved,
    canManagePlans = false,
}) => {
    const { findSectionByKeyword, isLoading: sectionsLoading } = usePlanSections();
    const [sheetOpen, setSheetOpen] = useState(false);

    const handleClick = () => {
        if (sectionsLoading || !canManagePlans) return;
        setSheetOpen(true);
    };

    const matchedSection = findSectionByKeyword(sectionKeyword);
    const existingPlan = matchedSection
        ? fabPlans.find((p: any) => p.planning_section_id === matchedSection.id) ?? null
        : null;

    // Determine if clickable: sections loaded, matched section exists, and user has permission
    const isClickable = !sectionsLoading && matchedSection && canManagePlans;

    return (
        <>
            <button
                onClick={handleClick}
                disabled={!isClickable}
                className={[
                    'text-sm text-left transition-colors',
                    isClickable
                        ? 'text-blue-600 hover:underline cursor-pointer'
                        : 'text-text cursor-default',
                ].join(' ')}
                title={
                    !canManagePlans
                        ? 'You do not have permission to manage plans'
                        : matchedSection
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
                    selectedEvent={existingPlan ?? null}
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