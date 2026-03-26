import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TemplatingActivityForm } from './templatingActivity';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useGetFabByIdQuery } from '@/store/api/job';
import { useParams, Link } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Fab } from '@/store/api/job';
import { formatDate } from '../TechnicianPage';

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
  return fabNotes || [];
};

// Helper function to get FAB status display
const getFabStatusInfo = (statusId: number | undefined) => {
  if (statusId === 0) {
    return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
  } else if (statusId === 1) {
    return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
  } else {
    return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
  }
};

export function TemplatingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));

  // Prepare clickable links
  const jobNameLink = fab?.job_details?.id ? `/job/details/${fab.job_details.id}` : '#';
  const jobNumberLink = fab?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fab.job_details.job_number}`
    : '#';

  // Create sidebar sections based on actual FAB data
  const sidebarSections = fab ? [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "Account Name", value: fab.account_name || '—' },
        {
          label: "Fab ID",
          value: (
            <Link to={`/sales/${fab.id}`} className="text-primary hover:underline">
              FAB-{fab.id}
            </Link>
          ),
        },
        { label: "Area", value: fab.input_area || '—' },
        {
          label: "Material",
          value: fab.stone_type_name
            ? `${fab.stone_type_name} - ${fab.stone_color_name || ''} - ${fab.stone_thickness_value || ''}`
            : '—',
        },
        {
          label: "Fab Type",
          value: <span className="uppercase">{fab.fab_type || '—'}</span>,
        },
        { label: "Edge", value: fab.edge_name || '—' },
        { label: "Total s.f.", value: fab.total_sqft?.toString() || '—' },
        {
          label: "Scheduled Date",
          value: fab.templating_schedule_start_date
            ? formatDate(fab.templating_schedule_start_date)
            : 'Not scheduled',
        },
        {
          label: "Assigned to",
          value: fab.technician_name || 'Unassigned',
        },
        { label: "Sales Person", value: fab.sales_person_name || '—' },
        {
          label: "SlabSmith Needed",
          value: fab.slabsmith_data ? 'Yes' : 'No', // adjust if field name differs
        },
      ],
    },
    {
      title: "FAB Notes",
      type: "notes",
      notes: getAllFabNotes(fab.fab_notes || []).map(note => {
        const stageConfig: Record<string, { label: string; color: string }> = {
          templating: { label: 'Templating', color: 'text-blue-700' },
          pre_draft_review: { label: 'Pre-Draft Review', color: 'text-indigo-700' },
          drafting: { label: 'Drafting', color: 'text-green-700' },
          sales_ct: { label: 'Sales CT', color: 'text-yellow-700' },
          slab_smith_request: { label: 'SlabSmith Request', color: 'text-red-700' },
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
  ] : [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "Account Name", value: '—' },
        { label: "Fab ID", value: id || '—' },
        { label: "Area", value: '—' },
        { label: "Material", value: '—' },
        { label: "Fab Type", value: '—' },
        { label: "Edge", value: '—' },
        { label: "Total s.f.", value: '—' },
        { label: "Scheduled Date", value: '—' },
        { label: "Assigned to", value: '—' },
        { label: "Sales Person", value: '—' },
        { label: "SlabSmith Needed", value: '—' },
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
          <div className="flex items-center justify-between w-full">
            <div>
              <ToolbarHeading
                title={<Skeleton className="h-8 w-96" />}
                description={<Skeleton className="h-4 w-80 mt-1" />}
              />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
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
          <ToolbarHeading title="Error loading FAB" description="Could not load templating details" />
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

  const statusInfo = getFabStatusInfo(fab?.status_id);

  return (
    <>
      <Container className='lg:mx-0 max-w-full'>
        <Toolbar className=''>
          <div className="flex items-center justify-between w-full">
            <ToolbarHeading
              title={
                <div className="text-2xl font-bold">
                  <a href={jobNameLink} className="hover:underline">
                    {fab?.job_details?.name || `Job ${fab?.job_id}`}
                  </a>
                  {' - '}
                  <a href={jobNumberLink} className="hover:underline" target="_blank">
                    {fab?.job_details?.job_number || fab?.job_id}
                  </a>
                </div>
              }
              // description={fab?.job_details?.description || 'No description available'}
            />
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                {statusInfo.text}
              </span>
            </div>
          </div>
        </Toolbar>
      </Container>

      {/* Main layout: sidebar + content */}
      <div className="border-t flex flex-col lg:flex-row gap-3 xl:gap-4 items-start max-w-full">
        {/* Sidebar - fixed width */}
        <div className="w-full lg:w-[250px] xl:w-[286px] ultra:w-[500px] lg:flex-shrink-0">
          <GraySidebar
            sections={sidebarSections as any}
            jobId={fab?.job_id}
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
                  <TemplatingActivityForm fabId={id} revenue={fab?.revenue} />
                </CardContent>
              </Card>
            </div>
          </Container>
        </div>
      </div>
    </>
  );
}