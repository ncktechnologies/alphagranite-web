import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLocation, Link } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useGetFabsQuery } from '@/store/api/job';
import { Fab } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
    current_stage: fab.current_stage, // Add current_stage
    // Optional fields with default values
    acct_name: '',
    template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-', // Format the date
    template_received: fab.current_stage === 'completed' ? 'Yes' : 'No', // Simplified logic
    templater: fab.technician_name || '-', // Use technician name if available
    no_of_pieces: '',
    total_sq_ft: String(fab.total_sqft),
    revenue: '',
    revised: '',
    sct_completed: '',
    draft_completed: '',
    gp: ''
  };
};

export function TemplatingPage() {
    // Fetch all fabs
    const { data: fabs, isLoading, isError, error } = useGetFabsQuery({
        limit: 100,
    });

    if (isLoading) {
        return (
            <Container>
                <Toolbar>
                    <ToolbarHeading
                        title="Templating"
                        description="Manage and track all Alpha Granite templating jobs"
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
                        title="Templating"
                        description="Manage and track all Alpha Granite templating jobs"
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
    const jobsData: IJob[] = fabs ? fabs.map(transformFabToJob) : [];

    // Filter logic
    const unscheduledJobs = jobsData.filter(job => job.template_schedule === '-' || job.template_schedule === '');
    const incompleteJobs = jobsData.filter(job => job.template_received === 'No');
    const completedJobs = jobsData.filter(job => job.template_received === 'Yes');

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading
                    title="Templating"
                    description="Manage and track all Alpha Granite templating jobs"
                />

            </Toolbar>

            <Tabs defaultValue="all" className="mt-4">
                <TabsList className=" bg-transparent p-2 border  flex flex-wrap gap-1">
                    <TabsTrigger value="all">
                         
                        <span className="flex items-center gap-2">
                            FabId
                            <span className=" bg-[#E1FCE9] text-base px-[6px] text-text rounded-[50px]" >
                            {jobsData.length}
                            </span>
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="unscheduled">
                        Unscheduled
                    </TabsTrigger>
                    <TabsTrigger value="incomplete">
                        <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                            Incomplete
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            Completed ({completedJobs.length})
                        </span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <JobTable jobs={jobsData} path='templating' />
                </TabsContent>

                <TabsContent value="unscheduled" className="mt-4">
                    <JobTable jobs={unscheduledJobs} path='templating'/>
                </TabsContent>

                <TabsContent value="incomplete" className="mt-4">
                    <JobTable jobs={incompleteJobs} path='templating'/>
                </TabsContent>

                <TabsContent value="completed" className="mt-4">
                    <JobTable jobs={completedJobs} path='templating'/>
                </TabsContent>
            </Tabs>
        </Container>
    );
}