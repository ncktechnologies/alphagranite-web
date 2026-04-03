import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReviewChecklistForm } from './ReviewChecklist';
import { Link, useParams } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { useGetEmployeeByIdQuery } from '@/store/api/employee';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { BackButton } from '@/components/common/BackButton';

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
  return fabNotes || [];
};

export function FabIdDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));

  // Get employee data for fab creator
  const { data: fabCreator } = useGetEmployeeByIdQuery(fab?.created_by || 0, {
    skip: !fab?.created_by,
  });

  // Get author name from fab creator
  const fabAuthorName = fabCreator
    ? `${fabCreator.first_name || ''} ${fabCreator.last_name || ''}`.trim() || fabCreator.email || 'Unknown User'
    : 'System';

  // Prepare clickable links
  const jobNameLink = fab?.job_details?.id ? `/job/details/${fab.job_details.id}` : '#';
  const jobNumberLink = fab?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fab.job_details.job_number}`
    : '#';

  // Build the fields for the Job Details card
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

  // Sidebar sections (only FAB Notes)
  const sidebarSections = [
    {
      title: 'Notes',
      type: 'notes',
      notes: Array.isArray(fab?.notes)
        ? fab.notes.map((note: string, index: number) => ({
          id: index,
          avatar: 'N',
          content: note,
          author: '',
          timestamp: '',
        }))
        : [],
    },
    {
      title: 'FAB Notes',
      type: 'notes',
      notes: Array.isArray(fab?.notes)
        ? fab.notes.map((noteItem: any, index: number) => {
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
            general: { label: 'General', color: 'text-gray-700' },
          };

          const stage = noteItem?.stage || 'general';
          const config = stageConfig[stage] || stageConfig.general;

          return {
            id: noteItem?.id ?? index,
            avatar: fabAuthorName.charAt(0).toUpperCase() || 'U',
            content: `<span class="inline-block px-2 py-1 rounded text-xs font-medium ${config.color} bg-gray-100 mr-2">${config.label}</span>${noteItem}`,
            author: fabAuthorName,
            timestamp: fab?.created_at ? new Date(fab.created_at).toLocaleDateString() : 'Unknown date',
          };
        })
        : [],
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
          <Skeleton className="h-8 w-72 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6 px-4 sm:px-6 lg:px-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="mt-4">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>

          <div className="border-l">
            <Card className="border-none py-6">
              <CardHeader className="border-b pb-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
          <ToolbarHeading title="Error loading FAB" description="Could not load fabrication details" />
        </div>
        <div className="p-6">
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : 'Failed to load FAB data'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const statusInfo = {
    className: fab.status_id === 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800',
    text: fab.status_id === 0 ? 'ON HOLD' : 'ACTIVE',
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 🔹 STICKY TOOLBAR – updated to match drafter details pattern */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="px-3 sm:px-4 lg:px-6">
          <Toolbar className="py-2 sm:py-3">
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <ToolbarHeading
                title={
                  <div className="text-base sm:text-lg lg:text-2xl font-bold leading-tight">
                    <a href={jobNameLink} className="hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
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
                description="Fabrication Details"
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

      {/* Main grid: left column (Job Details + Notes) and right column (Review) – unchanged */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6 px-4 sm:px-6 lg:px-8">
        {/* LEFT COLUMN (span 2) */}
        <div className="lg:col-span-2">
          {/* 🔹 JOB DETAILS CARD */}
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

          {/* 🔹 GRAYSIDEBAR (FAB Notes) */}
          <div className="mt-4">
            <GraySidebar sections={sidebarSections as any} className="bg-transparent border-none pl-0" />
          </div>
        </div>

        {/* RIGHT COLUMN (span 1) - Review checklist */}
        <div className="border-l">
          <Card className="border-none py-6">
            <CardHeader className="border-b pb-4 flex-col items-start">
              <CardTitle className="font-semibold text-text">FAB ID Review</CardTitle>
              <p className="text-sm text-text-foreground">Review and approve fabrication details</p>
            </CardHeader>
            <CardContent>
              <ReviewChecklistForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}