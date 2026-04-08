import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TemplatingActivityForm } from './templatingActivity';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useGetFabByIdQuery } from '@/store/api/job';
import { useParams, Link, useNavigate } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { formatDate } from '../TechnicianPage';
import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/ui/button';
import { getAllFabNotes } from '@/lib/helpers';

// Helper function to get all fab notes (unfiltered)

// Helper function to get FAB status display
const getFabStatusInfo = (statusId: number | undefined) => {
  if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
  if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
  return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
};

export function TemplatingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));
  const navigate = useNavigate();
  // Prepare clickable links
  const jobNameLink = fab?.job_details?.id ? `/job/details/${fab.job_details.id}` : '#';
  const jobNumberLink = fab?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fab.job_details.job_number}`
    : '#';


  const jobDetailsFields = fab
    ? [
      { label: 'Account', value: fab.account_name || '—' },
      {
        label: 'Fab ID',
        value: (
          <Link to={`/sales/${fab.id}`} className="text-primary hover:underline">
            {fab.id}
          </Link>
        ),
      },
      { label: 'Area', value: fab.input_area || '—' },
      {
        label: 'Material',
        value: fab.stone_type_name
          ? `${fab.stone_type_name} - ${fab.stone_color_name || ''} - ${fab.stone_thickness_value || ''}`
          : '—',
      },
      {
        label: 'Fab Type',
        value: <span className="uppercase">{fab.fab_type || '—'}</span>,
      },
      { label: 'Edge', value: fab.edge_name || '—' },
      { label: 'Total S.F', value: fab.total_sqft?.toString() || '—' },
      { label: 'Sales Person', value: fab.sales_person_name || '—' },
      {
        label: 'Job Notes',
        value: fab.job_details?.description || 'None',
        fullWidth: true,
      },
    ]
    : [];

  // Create sidebar sections based on actual FAB data
  const sidebarSections = fab ? [
    // {
    //   title: "Job Details",
    //   type: "details",
    //   items: [
    //     { label: "Account Name", value: fab.account_name || '—' },
    //     {
    //       label: "Fab ID",
    //       value: (
    //         <Link to={`/sales/${fab.id}`} className="text-primary hover:underline">
    //           {fab.id}
    //         </Link>
    //       ),
    //     },
    //     { label: "Area", value: fab.input_area || '—' },
    //     {
    //       label: "Material",
    //       value: fab.stone_type_name
    //         ? `${fab.stone_type_name} - ${fab.stone_color_name || ''} - ${fab.stone_thickness_value || ''}`
    //         : '—',
    //     },
    //     {
    //       label: "Fab Type",
    //       value: <span className="uppercase">{fab.fab_type || '—'}</span>,
    //     },
    //     { label: "Edge", value: fab.edge_name || '—' },
    //     { label: "Total s.f.", value: fab.total_sqft?.toString() || '—' },
    //     {
    //       label: "Scheduled Date",
    //       value: fab.templating_schedule_start_date
    //         ? formatDate(fab.templating_schedule_start_date)
    //         : 'Not scheduled',
    //     },
    //     {
    //       label: "Technician Assigned",
    //       value: fab.technician_name || 'Unassigned',
    //     },
    //     { label: "Sales Person", value: fab.sales_person_name || '—' },
    //     {
    //       label: "SlabSmith Needed",
    //       value: fab.slabsmith_data ? 'Yes' : 'No',
    //     },
    //   ],
    // },
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

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
          <Skeleton className="h-8 w-72 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          <div className="w-full lg:w-[220px] xl:w-[260px] shrink-0 border-r p-4 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="flex-1 p-4 sm:p-6 space-y-4">
            <Skeleton className="h-24 w-full max-w-2xl rounded-xl" />
            <Skeleton className="h-96 w-full max-w-2xl rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !fab) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
          <ToolbarHeading title="Error loading FAB" description="Could not load templating details" />
        </div>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : "Failed to load FAB data"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const statusInfo = getFabStatusInfo(fab.status_id);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="px-3 sm:px-4 lg:px-6">
          <Toolbar className="py-2 sm:py-3">
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <ToolbarHeading
                title={
                  <div className="text-base sm:text-lg lg:text-2xl font-bold leading-tight">
                    <a href={jobNameLink} className="hover:underline"
                      target="_blank"
                      rel="noreferrer">
                      {fab?.job_details?.name || `Job ${fab?.job_id}`}
                    </a>
                    <span className="mx-1 text-gray-400">·</span>
                    <a
                      href={jobNumberLink}
                      className="hover:underline text-gray-600"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {fab?.job_details?.job_number || fab?.job_id}
                    </a>
                  </div>
                }
                description="Templating Details"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                  {statusInfo.text}
                </span>
                <BackButton />
              </div>
            </div>
          </Toolbar>
        </div>
      </div>

      {/* Main two‑column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6 px-4 sm:px-6 lg:px-8">
        {/* Sticky sidebar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#111827] text-2xl font-bold">Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-sm">
                {jobDetailsFields.map((field, index) => (
                  <div key={index} className={field.fullWidth ? 'col-span-full' : ''}>
                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                      {field.label}
                    </p>
                    <p className="font-semibold text-text text-base leading-[24px] whitespace-pre-wrap">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* <aside
            className={[
              'w-full bg-white border-b',
              'lg:w-[220px] xl:w-[260px] lg:shrink-0',
              'lg:sticky lg:top-[50px]',
              'lg:self-start',
              'lg:max-h-[calc(100vh-50px)]',
              'lg:overflow-y-auto',
              'lg:border-b-0 lg:border-r',
            ].join(' ')}
          > */}
            <div className="p-3 sm:p-4 space-y-4">
              <GraySidebar sections={sidebarSections as any} jobId={fab?.job_id} />
              {/* Progress Timeline (original component) */}
              <div className="bg-text w-full py-4 px-6 shadow-sm rounded-md">
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
          {/* </aside> */}
        </div>


        {/* Main content */}
        <main className="">
          <Card>
            <CardHeader className="py-3 px-4 sm:px-5">
              <CardTitle className="text-sm sm:text-base">Template activity
                <p className="text-xs text-gray-500 mt-0.5">Update your templating activity here</p>
              </CardTitle>
              {/* <Button
                onClick={() => navigate(`/jobs/${fab?.job_details?.id || ''}/templater/timer`)}
              >
                Go to Timer
              </Button> */}
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-5">
              <TemplatingActivityForm fabId={id} revenue={fab?.revenue} />
            </CardContent>

          </Card>

          
        </main>
      </div>
    </div>
  );
}