import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { useGetFabsQuery } from '@/store/api/job';
import { Fab } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AssignDrafterModal } from '../drafters/components/AssignDrafterModal';

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
    job_name: `FAB-${fab.id}`,
    job_no: String(fab.id),
    date: fab.created_at,
    current_stage: fab.current_stage || '',
    // Optional fields with default values
    acct_name: '',
    no_of_pieces: fab.total_sqft ? `${fab.total_sqft}` : "-",
    total_sq_ft: String(fab.total_sqft || "-"),
    revenue: "-",
    gp: "-",
    draft_completed: fab.current_stage === 'completed' ? 'Yes' : 'No',
    template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-',
    template_received: '',
    templater: fab.technician_name || '-',
    revised: '',
    sct_completed: '',
    template_needed: fab.template_needed ? 'No' : 'Yes',
    review_completed: ''
  };
};

export function PreDraftReviewPage() {
  const [selectedFabId, setSelectedFabId] = useState<number | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // Fetch FABs that are in pre-draft review stage
  const { data: fabs, isLoading, isError, error, refetch } = useGetFabsQuery({
    current_stage: 'pre_draft_review',
    limit: 100,
  });

  const handleAssignDrafter = (fabId: number) => {
    setSelectedFabId(fabId);
    setIsAssignModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="">
        <Container>
          <Toolbar className=' '>
            <ToolbarHeading title="Pre-Draft Review" description="Review templating results and assign to drafters" />
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
            <ToolbarHeading title="Pre-Draft Review" description="Review templating results and assign to drafters" />
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
  const jobsData: IJob[] = fabs ? fabs.map(transformFabToJob) : [];

  return (
    <div className="">
      <Container>
        <Toolbar className=' '>
          <ToolbarHeading title="Pre-Draft Review" description="Review templating results and assign to drafters" />
        </Toolbar>
        
        <JobTable 
          jobs={jobsData} 
          path='predraft' 
          onRowClick={(fabId) => handleAssignDrafter(parseInt(fabId))}
        />
      </Container>
      
      {selectedFabId && (
        <AssignDrafterModal
          fabId={selectedFabId}
          open={isAssignModalOpen}
          onOpenChange={setIsAssignModalOpen}
          onAssignSuccess={refetch}
        />
      )}
    </div>
  );
}