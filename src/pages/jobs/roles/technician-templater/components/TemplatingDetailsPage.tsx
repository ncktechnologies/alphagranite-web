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

export function TemplatingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));

  // Create sidebar sections based on actual FAB data
  const sidebarSections = fab ? [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "FAB ID", value: String(fab.id) },
        { label: "Job ID", value: String(fab.job_id) },
        { label: "FAB Type", value: fab.fab_type },
        { label: "Total Sq Ft", value: String(fab.total_sqft) },
        { label: "Current Stage", value: fab.current_stage },
        { label: "Next Stage", value: fab.next_stage || 'N/A' },
        { label: "Created At", value: new Date(fab.created_at).toLocaleDateString() },
      ],
    },
    {
      title: "Materials",
      type: "details",
      items: [
        { label: "Stone Type", value: fab.stone_type_name || 'N/A' },
        { label: "Stone Color", value: fab.stone_color_name || 'N/A' },
        { label: "Thickness", value: fab.stone_thickness_value || 'N/A' },
        { label: "Edge", value: fab.edge_name || 'N/A' },
      ],
    },
    {
      title: "Requirements",
      type: "details",
      items: [
        { label: "Template Needed", value: fab.template_needed ? 'Yes' : 'No' },
        { label: "Drafting Needed", value: fab.drafting_needed ? 'Yes' : 'No' },
        { label: "SCT Needed", value: fab.sct_needed ? 'Yes' : 'No' },
        { label: "Final Programming Needed", value: fab.final_programming_needed ? 'Yes' : 'No' },
      ],
    },
    {
      title: "Slab Smith",
      type: "details",
      items: [
        { label: "Customer Needed", value: fab.slab_smith_cust_needed ? 'Yes' : 'No' },
        { label: "AG Needed", value: fab.slab_smith_ag_needed ? 'Yes' : 'No' },
      ],
    },
    {
      title: "Personnel",
      type: "details",
      items: [
        { label: "Sales Person", value: fab.sales_person_name || 'N/A' },
        { label: "Created By", value: String(fab.created_by) },
        { label: "Updated By", value: String(fab.updated_by || 'N/A') },
      ],
    },
  ] : [];

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
                    <TemplatingActivityForm />
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
          <ToolbarHeading title={`FAB ID: ${fab?.id || id}`} description="Update templating activity" />
        </Toolbar>
      </Container>
      
      {/* Changed to use flex on large screens with consistent spacing */}
      <div className="border-t flex flex-col lg:flex-row gap-3 xl:gap-4 items-start max-w-full">
        {/* Sidebar - fixed width */}
        <div className="w-full lg:w-[250px] xl:w-[286px] ultra:w-[500px] lg:flex-shrink-0">
          <GraySidebar sections={sidebarSections as any} />
          <div className="bg-text w-full py-4 px-6 shadow-sm mt-3">
            <h3 className="font-semibold text-white text-lg mb-5">Progress Timeline</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <p className="text-base text-white">Scheduled date</p>
            </div>
            <p className="text-xs text-white ml-4 mt-1">March 14, 4:45 PM</p>
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
                  <TemplatingActivityForm />
                </CardContent>
              </Card>
            </div>
          </Container>
        </div>
      </div>
    </>
  );
}