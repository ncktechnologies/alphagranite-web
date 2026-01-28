import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TemplatingActivityForm } from './templatingActivity';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useGetFabByIdQuery } from '@/store/api/job';
import { useParams } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Fab } from '@/store/api/job';
import { formatDate } from '../TechnicianPage';

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
  return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
  return fabNotes || [];
};

export function TemplatingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));

  // Create sidebar sections based on actual FAB data
  const sidebarSections = fab ? [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "FAB ID", value: `FAB-${fab.id}` },
        { label: "Job Name", value: fab.job_details?.name || `Job ${fab.job_id}` },
        { label: "Job Number", value: fab.job_details?.job_number || String(fab.job_id) },
        
        { label: "Area", value: String(fab.input_area) },
        { label: "Material", value: `${fab.stone_type_name || 'N/A'} - ${fab.stone_thickness_value || 'N/A'}` },
        { label: 'Total square ft', value: String(fab.total_sqft) },
        { label: "Scheduled Date", value: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-', },
        { label: "Assigned to", value: String(fab.technician_name) },
      ],
    },
    // Option 1: Show ALL fab notes (current)
    {
      title: "FAB Notes",
      type: "notes",
      notes: getAllFabNotes(fab.fab_notes || []).map(note => {
        // Stage display mapping
        const stageConfig: Record<string, { label: string; color: string }> = {
          templating: { label: 'Templating', color: 'text-blue-700' },
          pre_draft_review: { label: 'Pre-Draft Review', color: 'text-indigo-700' },
          drafting: { label: 'Drafting', color: 'text-green-700' },
          sales_ct: { label: 'Sales CT', color: 'text-yellow-700' },
          slab_smith_request: { label: 'Slab Smith Request', color: 'text-red-700' },
          cut_list: { label: 'Final Programming', color: 'text-purple-700' },
          cutting: { label: 'Cutting', color: 'text-orange-700' },
          revisions: { label: 'Revisions', color: 'text-purple-700' },
          draft: { label: 'Draft', color: 'text-green-700' },
          general: { label: 'General', color: 'text-gray-700' }
        };

        const stage = note.stage || 'general';
        const config = stageConfig[stage] || stageConfig.general;

        return {
          id: note.id,
          avatar: note.created_by_name?.charAt(0).toUpperCase() || 'U',
          content: `<span class="inline-block px-2 py-1 rounded text-xs font-medium ${config.color} bg-gray-100 mr-2">${config.label}</span>${note.note}`,
          author: note.created_by_name || 'Unknown',
          timestamp: note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date'
        };
      })
    }
    // Option 2: Show only TEMPLATING stage notes (commented out)
    // {
    //   title: "Templating Notes",
    //   type: "notes",
    //   notes: filterNotesByStage(fab.fab_notes || [], 'templating').map(note => ({
    //     id: note.id,
    //     avatar: note.created_by_name?.charAt(0).toUpperCase() || 'U',
    //     content: note.note,
    //     author: note.created_by_name || 'Unknown',
    //     timestamp: note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date'
    //   }))
    // }
  ] : [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "FAB ID", value: id || 'N/A' },
        { label: "Job Name", value: 'N/A' },
        { label: "Job Number", value: 'N/A' },
        { label: "Area", value: 'N/A' },
        { label: "Material", value: 'N/A' },
        { label: "Total square ft", value: 'N/A' },
        { label: "Scheduled Date", value: 'N/A' },
        { label: "Assigned to", value: 'N/A' },
      ],
    },
    {
      title: "FAB Notes",
      type: "notes",
      notes: []
    }
  ];

  if (isLoading) {
    return (
      <Container className='lg:mx-0 max-w-full'>
        <Toolbar className=''>
          <ToolbarHeading title="FAB ID: Loading..." description="Update templating activity" />
        </Toolbar>
        <div className="border-t flex flex-col lg:flex-row gap-3 xl:gap-4 items-start max-w-full">
          <div className="w-full lg:w-[250px] xl:w-[286px] ultra:w-[500px] lg:flex-shrink-0">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-24 w-full mt-3" />
          </div>
          <div className="lg:flex-1 min-w-0">
            <Container className='mx-0 max-w-full px-0'>
              <div className='max-w-6xl w-full mx-auto lg:mr-auto'>
                <Card className='my-4'>
                  <CardHeader className='flex flex-col items-start py-4'>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                  </CardHeader>
                </Card>
                <Card>
                  <CardContent>
                    <Skeleton className="h-96 w-full" />
                  </CardContent>
                </Card>
              </div>
            </Container>
          </div>
        </div>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container className='lg:mx-0 max-w-full'>
        <Toolbar className=''>
          <ToolbarHeading title="FAB ID: Error" description="Update templating activity" />
        </Toolbar>
        <div className="border-t flex flex-col lg:flex-row gap-3 xl:gap-4 items-start max-w-full">
          <div className="w-full lg:w-[250px] xl:w-[286px] ultra:w-[500px] lg:flex-shrink-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : "Failed to load FAB data"}
              </AlertDescription>
            </Alert>
          </div>
          <div className="lg:flex-1 min-w-0">
            <Container className='mx-0 max-w-full px-0'>
              <div className='max-w-6xl w-full mx-auto lg:mr-auto'>
                <Card className='my-4'>
                  <CardHeader className='flex flex-col items-start py-4'>
                    <CardTitle className='text-[#111827]'>Template activity</CardTitle>
                    <p className="text-base text-[#4B5563]">
                      Update your templating activity here
                    </p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardContent>
                    <TemplatingActivityForm fabId={id} />
                  </CardContent>
                </Card>
              </div>
            </Container>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container className='lg:mx-0 max-w-full'>
        <Toolbar className=''>
          <div className="flex items-center justify-between w-full">
            <div>
              <ToolbarHeading
                title={`FAB ID: ${fab?.id || id}`}
                description="Update templating activity"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${{
                0: 'bg-red-100 text-red-800',
                1: 'bg-green-100 text-green-800'
              }[fab?.status_id] || 'bg-gray-100 text-gray-800'}`}>
                {{
                  0: 'ON HOLD',
                  1: 'ACTIVE'
                }[fab?.status_id] || 'LOADING'}
              </span>
            </div>
          </div>
        </Toolbar>
      </Container>

      {/* Changed to use flex on large screens with consistent spacing */}
      <div className="border-t flex flex-col lg:flex-row gap-3 xl:gap-4 items-start max-w-full">
        {/* Sidebar - fixed width */}
        <div className="w-full lg:w-[250px] xl:w-[286px] ultra:w-[500px] lg:flex-shrink-0">
          <GraySidebar
            sections={sidebarSections as any}
            jobId={fab?.job_id}  // Add this prop
          />
          <div className="bg-text w-full py-4 px-6 shadow-sm mt-3">
            <h3 className="font-semibold text-white text-lg mb-5">Progress Timeline</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <p className="text-base text-white">Scheduled date</p>
            </div>
            <p className="text-xs text-white ml-4 mt-1">
              {fab?.templating_schedule_start_date
                ? new Date(fab.templating_schedule_start_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
                : 'Not scheduled'}
            </p>
          </div>
        </div>

        {/* Main content - flexible */}
        <div className="lg:flex-1 min-w-0">
          <Container className='mx-0 max-w-full px-0'>
            <div className='max-w-6xl w-full mx-auto lg:mr-auto'>
              <Card className='my-4'>
                <CardHeader className='flex flex-col items-start py-4'>
                  <CardTitle className='text-[#111827]'>Template activity</CardTitle>
                  <p className="text-base text-[#4B5563]">
                    Update your templating activity here
                  </p>
                </CardHeader>
              </Card>
              <Card>
                <CardContent>
                  <TemplatingActivityForm fabId={id} />
                </CardContent>
              </Card>
            </div>
          </Container>
        </div>
      </div>
    </>
  );
}