import { useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { FinalProgrammingTable } from './FinalProgrammingTable';
import { IJob } from '@/pages/jobs/components/job';
import { Fab, useGetFabsInFinalProgrammingPendingQuery, useGetFabsQuery } from '@/store/api/job';
// import { transformFabToJob } from '@/pages/jobs/roles/drafters/DrafterPage';
import { useIsSuperAdmin } from '@/hooks/use-permission';
import { JobTable } from '../../components/JobTable';
import { useJobStageFilter } from '@/hooks/use-job-stage';
import { useLocation } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

 const transformFabToJob = (fab: Fab): IJob => {
  return {
    id: fab.id,
    fab_type: fab.fab_type,
    fab_id: String(fab.id),
    job_name: `${fab.job_details?.name}`,
    job_no: String(fab.job_details?.job_number),
    date: fab.created_at,
    current_stage: fab.current_stage,
    // Optional fields with default values
    acct_name: '',
    no_of_pieces: fab.no_of_pieces ? `${fab.no_of_pieces}` : "-",
    total_sq_ft: String(fab.total_sqft || "-"),
    revenue:fab.job_details?.project_value || "-",
    gp: "-",
    draft_completed: fab.current_stage === 'completed' ? 'Yes' : 'No',
    // template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-',
    template_received: '',
    // templater: fab.technician_name || '-',
    revised: '',
    sct_completed: '',
  };
};
const FinalProgrammingPage = () => {
    const location = useLocation();
    const isNewFabForm = location.pathname.includes('/new-fab-id');
    const { currentStageFilter, isSuperAdmin } = useJobStageFilter();
    const isUserSuperAdmin = useIsSuperAdmin();
    
    // Fetch fabs with role-based filtering
    // const { data: fabs, isLoading, isError, error } = useGetFabsQuery({
    //     current_stage: 'final_programming',
    //     limit: 100,
    // });
    const { data: fabs, isLoading, isError, error } = useGetFabsInFinalProgrammingPendingQuery();

    if (isLoading) {
        return (
            <div className="">
                <Container>
                    <Toolbar className=' '>
                        <ToolbarHeading title="Final Programming" description="" />
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
                        <ToolbarHeading title="Final Programming" description="" />
                    </Toolbar>
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {error ? `Failed to load FAB data: ${JSON.stringify(error.data)}` : "Failed to load FAB data"}
                        </AlertDescription>
                    </Alert>
                </Container>
            </div>
        );
    }

    // Transform Fab data to IJob format
    const jobsData: IJob[] = fabs ? fabs.data?.map(transformFabToJob) : [];

    return (
        <>
            <Container className="lg:mx-0">
                <Toolbar className=" ">
                    <ToolbarHeading title="Final Programming" description="Jobs in final CNC programming stage" />
                </Toolbar>

                <JobTable jobs={jobsData} path='final-programming' isSuperAdmin={isUserSuperAdmin} isLoading={isLoading} />

            </Container>

            {/* <div className="mt-6">
                <FinalProgrammingTable 
                    jobs={jobs}
                    path="/job/final-programming"
                    isLoading={isLoading}
                    onRowClick={handleRowClick}
                />
            </div> */}
        </>
    );
};

export default FinalProgrammingPage;