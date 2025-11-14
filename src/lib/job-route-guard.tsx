import { Navigate, useLocation } from 'react-router';
import { useJobStage } from '@/hooks/use-job-stage';

/**
 * Job Route Guard
 * Redirects users to their appropriate job page based on role
 * Super admins can access all routes
 */
export const JobRouteGuard = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();
    const { isSuperAdmin, canAccessStage } = useJobStage();
    const currentPath = location.pathname;

    // Super admin can access all job routes
    if (isSuperAdmin) {
        return <>{children}</>;
    }

    // Extract stage from current route
    const routeStages = {
        '/job/sales': 'sales',
        '/job/templating': 'templating_coordinator',
        '/job/templating-technician': 'templating_technician',
        '/job/predraft': 'predraft',
        '/job/draft': 'draft',
        '/job/draft-review': 'draft_review',
        '/job/revision': 'revision',
        '/shop': 'shop',
    };

    // Find matching stage for current route
    const matchedRoute = Object.entries(routeStages).find(([route]) => 
        currentPath.startsWith(route)
    );

    if (matchedRoute) {
        const [, stageName] = matchedRoute;
        
        // Check if user can access this stage
        if (!canAccessStage(stageName)) {
            // Redirect to user's default stage
            const { defaultStage } = useJobStage();
            return <Navigate to={defaultStage.route} replace />;
        }
    }

    return <>{children}</>;
};

/**
 * Default Job Redirect
 * Redirects /job route to user's appropriate job page
 */
export const JobDefaultRedirect = () => {
    const { defaultStage } = useJobStage();
    return <Navigate to={defaultStage.route} replace />;
};
