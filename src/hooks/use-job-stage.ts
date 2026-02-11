import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

/**
 * JOB WORKFLOW & ROLE-BASED ACCESS CONTROL
 * 
 * This module manages role-based access to different job stages.
 * 
 * WORKFLOW:
 * 1. Sales → Creates Job + FAB (current_stage: 'sales')
 * 2. Templating Coordinator → Reviews & schedules (current_stage: 'templating_coordinator')
 * 3. Templating Technician → Executes templating (current_stage: 'templating_technician')
 * 4. Pre-Draft → Prepares for drafting (current_stage: 'predraft')
 * 5. Drafter → Creates draft (current_stage: 'draft')
 * 6. Draft Review → Sales reviews draft (current_stage: 'draft_review')
 * 7. Revision → Handles revisions if needed (current_stage: 'revision')
 * 8. Slab Smith → Processes slabs (current_stage: 'slab_smith')
 * 9. Shop → Production stages (current_stage: 'shop')
 * 
 * ROLE-BASED ACCESS:
 * - Super Admin: Can see ALL stages, no filtering
 * - Sales: Only sees fabs with current_stage='sales'
 * - Templating Coordinator: Only sees current_stage='templating_coordinator'
 * - Templating Technician: Only sees current_stage='templating_technician'
 * - Drafter: Only sees current_stage='predraft' or 'draft'
 * - Slab Smith: Only sees current_stage='slab_smith'
 * - Shop roles: Only see current_stage='shop'
 * 
 * USAGE:
 * ```tsx
 * // In a component
 * const { currentStageFilter } = useJobStageFilter();
 * const { data: fabs } = useGetFabsQuery({ current_stage: currentStageFilter });
 * // Super admin gets undefined → sees all fabs
 * // Sales user gets 'sales' → sees only sales fabs
 * ```
 */

/**
 * Job stages mapped to routes and roles
 */
export const JOB_STAGES = {
    SALES: {
        stage: 'fab_created',
        route: '/job/sales',
        title: 'Sales - New FAB IDs',
    },
    TEMPLATING_COORDINATOR: {
        stage: 'templatin',
        route: '/job/templating',
        title: 'Templating Coordinator',
    },
    // TEMPLATING_TECHNICIAN: {
    //     stage: 'templating',
    //     route: '/job/templating-technician',
    //     title: 'Templating Technician',
    // },
    PREDRAFT: {
        stage: 'templating_technician',
        route: '/job/predraft',
        title: 'Pre-Draft',
    },
    DRAFT: {
        stage: 'pre_draft',
        route: '/job/draft',
        title: 'Drafting',
    },
    DRAFT_REVIEW: {
        stage: 'draft_review',
        route: '/job/draft-review',
        title: 'Draft Review',
    },
    REVISION: {
        stage: 'revision',
        route: '/job/revision',
        title: 'Draft Revision',
    },
    SLAB_SMITH: {
        stage: 'slab_smith',
        route: '/job/slab-smith',
        title: 'SlabSmith',
    },
    SHOP: {
        stage: 'shop',
        route: '/shop',
        title: 'Shop - Production',
    },
} as const;

/**
 * Role to stage mapping
 * Maps user roles to their default job stage
 */
export const ROLE_STAGE_MAP: Record<string, keyof typeof JOB_STAGES> = {
    'sales': 'SALES',
    'templating_coordinator': 'TEMPLATING_COORDINATOR',
    'templating_technician': 'TEMPLATING_TECHNICIAN',
    'drafter': 'PREDRAFT',
    'slab_smith': 'SLAB_SMITH',
    'shop_manager': 'SHOP',
    'shop_technician': 'SHOP',
};

/**
 * Hook to get user's job stage information based on their role
 * Super admins get access to all stages
 */
export const useJobStage = () => {
    const user = useSelector((state: RootState) => state.user?.user);
    const isSuperAdmin = user?.is_super_admin || false;

    // Super admin can access all stages
    if (isSuperAdmin) {
        return {
            isSuperAdmin: true,
            defaultStage: JOB_STAGES.SALES,
            allowedStages: Object.values(JOB_STAGES),
            canAccessStage: () => true,
        };
    }

    // Get user's role name (you might need to adjust this based on your user object structure)
    const userRoleName = user?.role?.name?.toLowerCase() || '';
    
    // Map role to stage
    const stageKey = ROLE_STAGE_MAP[userRoleName];
    const defaultStage = stageKey ? JOB_STAGES[stageKey] : JOB_STAGES.SALES;

    return {
        isSuperAdmin: false,
        defaultStage,
        allowedStages: [defaultStage], // Non-admin users only see their stage
        canAccessStage: (stageName: string) => defaultStage.stage === stageName,
    };
};

/**
 * Get current stage filter for API calls based on route
 */
export const getStageFromRoute = (pathname: string): string | undefined => {
    const stageEntry = Object.values(JOB_STAGES).find(
        (stage) => pathname.startsWith(stage.route)
    );
    return stageEntry?.stage;
};

/**
 * Hook to get fabs filtered by user's role/stage
 */
export const useJobStageFilter = () => {
    const { isSuperAdmin, defaultStage } = useJobStage();
    
    return {
        // For super admin, no filter (return undefined to get all)
        // For regular users, filter by their stage
        currentStageFilter: isSuperAdmin ? undefined : defaultStage.stage,
        isSuperAdmin,
    };
};