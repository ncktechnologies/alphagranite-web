import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Link, useParams } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { useGetEmployeeByIdQuery } from '@/store/api/employee';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Button } from '@/components/ui/button';
import { ReviewChecklistForm } from './ReviewChecklist';

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
  return fabNotes || [];
};
export function ResurfacingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));
  
  // Get employee data for fab creator
  const { data: fabCreator } = useGetEmployeeByIdQuery(fab?.created_by || 0, {
    skip: !fab?.created_by
  });
  
  // Get author name from fab creator
  const fabAuthorName = fabCreator 
    ? `${fabCreator.first_name || ''} ${fabCreator.last_name || ''}`.trim() || fabCreator.email || 'Unknown User'
    : 'System';

  // Create job info based on actual FAB data
  const jobInfo = fab ? [
    { label: 'FAB ID', value: String(fab.id) },
    { label: 'FAB Type', value: <span className="uppercase">{fab.fab_type}</span> },
    { label: 'Account', value: fab.account_name}, // Placeholder
    { label: 'Job name', value: fab.job_details?.name }, // Placeholder
    { label: 'Job #', value: <Link to={`/job/details/${fab.job_details?.id}`} className="text-primary hover:underline">{fab.job_details?.job_number}</Link> },
    { label: 'Area (s)', value: fab.input_area }, // Placeholder
    { label: 'Stone type', value: fab.stone_type_name || 'N/A' },
    { label: 'Stone color', value: fab.stone_color_name || 'N/A' },
    { label: 'Stone thickness', value: fab.stone_thickness_value || 'N/A' },
    { label: 'Edge', value: fab.edge_name || 'N/A' },
    { label: 'Total square ft', value: String(fab.total_sqft) },
    {label: 'Sales person', value: fab.sales_person_name || 'N/A'},
    { label: 'Job Notes', value: String(fab.job_details?.description || 'None') },


  ] : [];
  const sidebarSections = [
    // {
    //     title: "Template Information",
    //     type: "details",
    //     items: jobInfo,
    // },
    {
      title: "FAB Notes",
      type: "notes",
      notes: (fab?.notes || []).map((noteItem: any, index: number) => {
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

        const stage = noteItem.stage || 'general';
        const config = stageConfig[stage] || stageConfig.general;

        return {
          id: noteItem.id || index,
          avatar: fabAuthorName.charAt(0).toUpperCase() || 'U',
          content: `<span class="inline-block px-2 py-1 rounded text-xs font-medium ${config.color} bg-gray-100 mr-2">${config.label}</span>${noteItem}`,
          author: fabAuthorName,
          timestamp: fab?.created_at ? new Date(fab.created_at).toLocaleDateString() : 'Unknown date'
        };
      })
    }
  ];
  if (isLoading) {
    return (
      <Container className=" border-t">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className=" lg:col-span-2 mt-6 pt-6">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 space-y-10">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item}>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className='border-l'>
            <Card className='border-none py-6'>
              <CardHeader className='border-b pb-4 flex-col items-start'>
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
      </Container>
    );
  }

  if (isError) {
    return (
      <Container className=" border-t">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">FAB ID: Error</h1>
            <p className="text-sm text-muted-foreground">
                {error && `Failed to load FAB data: ${JSON.stringify(error)}`}
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : "Failed to load FAB data"}
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className=" border-t">
      {/* Header / Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
          <div>
              <h1 className="text-2xl font-semibold">Resurfacing</h1>
             
          </div>
          <Link to="/jobs/reschedule">
              <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back 
              </Button>
          </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT: Job Info */}
        <div className=" lg:col-span-2 mt-6 pt-6">
          <Card >
            <CardHeader>
              <CardTitle className='text-[#111827] leading-[32px] text-2xl font-bold'>Fab Details</CardTitle>
            </CardHeader>
            <CardContent >
              <div className="grid grid-cols-2 md:grid-cols-3 space-y-10">
                {jobInfo.map((item, index) => (
                  <div key={index}>
                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                      {item.label}
                    </p>
                    <p className="font-semibold text-text text-base leading-[28px] ">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="w-full lg:w-[250px] XL:W-[300PX] 2xl:w-[400px]  lg:flex-shrink-0">

            <GraySidebar sections={sidebarSections as any} className='bg-transparent border-none pl-0' />

          </div>
        </div>


        {/* RIGHT: Review checklist */}
        <div className='border-l'>
          <Card className='border-none py-6'>
            <CardHeader className='border-b pb-4 flex-col items-start'>
              <CardTitle className='font-semibold text-text'>FAB ID</CardTitle>
              <p className="text-sm text-text-foreground">
                Review and approve resurfacing details
              </p>
            </CardHeader>
            <CardContent>
              <ReviewChecklistForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}