import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus } from 'lucide-react';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { useGetFabsQuery } from '@/store/api/job';
import { Fab } from '@/store/api/job';
import { useJobStageFilter } from '@/hooks/use-job-stage';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { NewFabIdForm } from './NewFabIdForm';
import { useIsSuperAdmin } from '@/hooks/use-permission';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Format date to "08 Oct, 2025" format
const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month}, ${year}`;
    } catch (error) {
        return '-';
    }
};

// Transform Fab data to match IJob interface
const transformFabToJob = (fab: Fab): IJob => {
    return {
        id: fab.id,
        fab_type: fab.fab_type,
        fab_id: String(fab.id), // Using fab.id as fab_id since there's no fab_id in Fab type
        job_name: `${fab.job_details?.name}`,
        job_no: String(fab.job_details?.job_number),
        date: fab.created_at, // Using created_at as date
        current_stage: fab.current_stage, // Add current_stage
        // Optional fields with default values
        acct_name: '',
        template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-',
        template_received: '',
        templater: fab.technician_name || '-',
        no_of_pieces: '',
        total_sq_ft: String(fab.total_sqft),
        revenue: '',
        revised: '',
        sct_completed: '',
        draft_completed: '',
        gp: ''
    };
};

export function SalesPage() {
    const location = useLocation();
    const isNewFabForm = location.pathname.includes('/new-fab-id');
    // Get current stage filter based on user role
    const { currentStageFilter, isSuperAdmin } = useJobStageFilter();
    const user = useSelector((state: RootState) => state.user?.user);
    const isUserSuperAdmin = useIsSuperAdmin();

    // Fetch fabs with role-based filtering
    // Super admin: currentStageFilter is undefined, so gets ALL fabs
    // Sales role: currentStageFilter is 'sales', so gets only sales fabs
    const { data: fabs, isLoading, error, isError } = useGetFabsQuery({
        // current_stage: currentStageFilter,
        limit: 100,
    });

    if (isNewFabForm) {
        return <NewFabIdForm />;
    }

     if (isLoading) {
            return (
                <div className="">
                    <Container>
                        <Toolbar className=' '>
                            <ToolbarHeading title="FAB ID'S" description="" />
                        </Toolbar>
                        <div className="space-y-4 mt-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    </Container>
                </div>
            );
        }
    
        if (isError) {
            return (
                <div className="">
                    <Container>
                        <Toolbar className=' '>
                            <ToolbarHeading title="FAB ID'S" description="" />
                        </Toolbar>
                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : "Failed to load FAB data"}
                            </AlertDescription>
                        </Alert>
                    </Container>
                </div>
            );
        }
    // Transform Fab data to IJob format
    const transformedJobs: IJob[] = fabs ? fabs.data?.map(transformFabToJob) : [];

    return (
        <div className="">
            <Container>
                <Toolbar className=' '>
                    <ToolbarHeading title="FAB ID'S" description="View & track all Alpha granite FAB ID'S" />
                    <ToolbarActions>
                        <Link to="/jobs/sales/new-fab-id">
                            <Button className="">
                                <Plus />
                                New FAB ID
                            </Button>
                        </Link>
                        <Link to="/create-jobs">
                            <Button className="">
                                <Plus />
                                New Job
                            </Button>
                        </Link>
                    </ToolbarActions>
                </Toolbar>
                <JobTable jobs={transformedJobs} path='sales' isSuperAdmin={isUserSuperAdmin} />
            </Container>
        </div>
    );
}