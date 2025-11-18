import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { useGetFabsQuery } from '@/store/api/job';
import { Fab } from '@/store/api/job';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useIsSuperAdmin } from '@/hooks/use-permission';
import { useJobStageFilter } from '@/hooks/use-job-stage';

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
    job_name: `Job ${fab.job_id}`, // Placeholder - would need actual job data
    job_no: String(fab.job_id), // Using job_id as job_no
    date: fab.created_at, // Using created_at as date
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

export function TechnicianPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const isNewFabForm = location.pathname.includes('/new-fab-id');
    useJobStageFilter(); // Call the hook without destructuring since we don't use its values
    const user = useSelector((state: RootState) => state.user?.user);
    const isUserSuperAdmin = useIsSuperAdmin();
    
    // Fetch fabs with role-based filtering
    // Technicians typically see all fabs in the templating stage
    const { data: fabs, isLoading, isError, error } = useGetFabsQuery({
        current_stage: 'templating', // Filter for templating stage
        limit: 100,
    });

    if (isLoading) {
        return (
            <div className="">
                <Container>
                    <Toolbar className=' '>
                        <ToolbarHeading title="Templating" description="" />
                    </Toolbar>
                    <div className="space-y-4">
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
                        <ToolbarHeading title="Templating" description="" />
                    </Toolbar>
                    <Alert variant="destructive">
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
    const transformedJobs: IJob[] = fabs ? fabs.map(transformFabToJob) : [];

    // Handle row click to navigate to templating details
    const handleRowClick = (fabId: string) => {
        navigate(`/job/templating-details/${fabId}`);
    };

    return (
        <div className="">
            <Container>
                <Toolbar className=' '>
                    <ToolbarHeading title="Templating" description="" />
                </Toolbar>
                <JobTable jobs={transformedJobs} path='technician' isSuperAdmin={isUserSuperAdmin} onRowClick={handleRowClick} />
            </Container>
        </div>
    );
}