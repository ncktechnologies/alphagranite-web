import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useLocation, Link } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { Container } from '@/components/common/container';
import { useGetFabsQuery } from '@/store/api/job';
import { Fab } from '@/store/api/job';
import { useJobStageFilter } from '@/hooks/use-job-stage';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useIsSuperAdmin } from '@/hooks/use-permission';

// Transform Fab data to match IJob interface
export const transformFabToJob = (fab: Fab): IJob => {
  return {
    id: fab.id,
    fab_type: fab.fab_type,
    fab_id: String(fab.id),
    job_name: fab.job_details?.name || '',
    job_no: String(fab.job_details?.job_number || ''),
    date: fab.templating_schedule_start_date || '', // This can be an empty string since IJob.date is not marked as optional
    current_stage: fab.current_stage,
    // Optional fields with default values
    acct_name: '',
    no_of_pieces: '-', // fab.no_of_pieces doesn't exist in the Fab interface, but this field exists in IJob
    total_sq_ft: String(fab.total_sqft || "-"),
    revenue: fab.job_details?.project_value || "-",
    gp: "-",
    draft_completed: fab.current_stage === 'completed' ? 'Yes' : 'No',
    template_received: '',
    revised: '',
    sct_completed: '',
  };
};

const SlabSmithPage = () => {
    const location = useLocation();
    // const isNewFabForm = location.pathname.includes('/new-fab-id');
    // const { currentStageFilter, isSuperAdmin } = useJobStageFilter();
    const isUserSuperAdmin = useIsSuperAdmin();
    
    // Fetch fabs with role-based filtering
    const { data: fabs, isLoading, isError, error } = useGetFabsQuery({
        current_stage: 'slab_smith_request',
        limit: 100,
    });

    if (isLoading) {
        return (
            <div className="">
                <Container>
                    <Toolbar className=' '>
                        <ToolbarHeading title="Slab Smith" description="" />
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
                        <ToolbarHeading title="Slab Smith" description="" />
                    </Toolbar>
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {error ? `Failed to load FAB data: ${JSON.stringify((error as any)?.data || error)}` : "Failed to load FAB data"}
                        </AlertDescription>
                    </Alert>
                </Container>
            </div>
        );
    }

    // Transform Fab data to IJob format
    const jobsData: IJob[] = fabs ? (fabs as any)?.data ? (fabs as any).data.map(transformFabToJob) : fabs.map(transformFabToJob) : [];

    return (
        <div className="">
            <Container>
                <Toolbar className=' '>
                    <ToolbarHeading title="Slab Smith" description="" />
                    {/* <ToolbarActions>
                               <Link to="/jobs/sales/new-fab-id">
                                   <Button className="">
                                       <Plus/>
                                       New FAB ID
                                   </Button>
                               </Link>
                           </ToolbarActions> */}
                </Toolbar>
                <JobTable jobs={jobsData} path='slab-smith' isSuperAdmin={isUserSuperAdmin} isLoading={isLoading} />
            </Container>
        </div>
    );
}

export default SlabSmithPage;