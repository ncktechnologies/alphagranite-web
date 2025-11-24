import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { useGetFabsQuery } from '@/store/api/job';
import { Fab } from '@/store/api/job';
import { useJobStageFilter } from '@/hooks/use-job-stage';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useIsSuperAdmin } from '@/hooks/use-permission';

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
    fab_id: String(fab.id),
    job_name: `Job ${fab.job_id}`, // Use job_id as placeholder since job_details is not available
    job_no: String(fab.job_id),
    date: fab.templating_schedule_start_date || '',
    current_stage: fab.current_stage,
    // Optional fields with default values
    acct_name: '',
    // template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-',
    template_received: fab.current_stage === 'completed' ? 'Yes' : 'No',
    template_needed: fab.template_needed ? 'No' : 'Yes',
    // templater: fab.technician_name || '-',
    no_of_pieces: '',
    total_sq_ft: String(fab.total_sqft) || "NO",
    revenue: '',
    revised: '',
    sct_completed: '',
    draft_completed: '',
    review_completed: fab.current_stage === 'completed' ? 'Yes' : 'No',
    gp: ''
  };
};

export function PredraftPage() {
    const { currentStageFilter, isSuperAdmin } = useJobStageFilter();
    const isUserSuperAdmin = useIsSuperAdmin();
    
    // Fetch fabs with role-based filtering
    const { data: fabs, isLoading, isError, error } = useGetFabsQuery({
        current_stage:  'templating_technician' ,
        limit: 100,
    });

    if (isLoading) {
        return (
            <Container>
                <Toolbar>
                    <ToolbarHeading
                        title="Pre-draft review"
                        description=""
                    />
                   
                </Toolbar>
                 <div className="space-y-4 mt-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
            </Container>
        );
    }

    if (isError) {
        return (
            <Container>
                <Toolbar>
                    <ToolbarHeading
                        title="Pre-draft review"
                        description=""
                    />
                </Toolbar>
                <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : "Failed to load FAB data"}
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }

    // Transform Fab data to IJob format
    const jobsData: IJob[] = fabs ? fabs.fabs?.map(transformFabToJob) : [];

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading
                    title="Pre-draft review"
                    description=""
                />
            </Toolbar>
            <JobTable jobs={jobsData} path='predraft' isSuperAdmin={isUserSuperAdmin}/>
        </Container>
    );
}