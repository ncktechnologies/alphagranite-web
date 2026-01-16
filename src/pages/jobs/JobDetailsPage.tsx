import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGetJobByIdQuery, useGetFabsByJobQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Camera, Video, FileText, Plus } from 'lucide-react';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Can } from '@/components/permission';
import { BackButton } from '@/components/common/BackButton';
import { Badge } from '@/components/ui/badge';

export function JobDetailsPage() {
  const { job_id } = useParams<{ job_id: string }>();
  const navigate = useNavigate();
  const jobId = job_id ? parseInt(job_id) : 0;

  const { data: job, isLoading, isError, error } = useGetJobByIdQuery(jobId, { skip: !jobId });
  const { data: fabs, isLoading: fabsLoading } = useGetFabsByJobQuery(jobId, { skip: !jobId });

  // Create job info based on actual job data
  const jobInfo = job ? [
    { label: 'Job Number', value: job.job_number },
    { label: 'Job Name', value: job.name },
    { label: 'Account', value: job.account_name || 'N/A' },
    { label: 'Account Number', value: job.account_number || 'N/A' },
    { label: 'Contact Person', value: job.account_contact_person || 'N/A' },
    { label: 'Email', value: job.account_email || 'N/A' },
    { label: 'Phone', value: job.account_phone || 'N/A' },
    { label: 'Project Value', value: job.project_value ? `$${job.project_value.toLocaleString()}` : 'N/A' },
    { label: 'Sales Person', value: job.sales_person_name || 'N/A' },
    { label: 'Priority', value: job.priority || 'N/A' },
    { label: 'Status', value: getStatusText(job.status_id) },
    { label: 'Created Date', value: new Date(job.created_at).toLocaleDateString() },
    { label: 'Start Date', value: job.start_date ? new Date(job.start_date).toLocaleDateString() : 'N/A' },
    { label: 'Due Date', value: job.due_date ? new Date(job.due_date).toLocaleDateString() : 'N/A' },
  ] : [];

  // Get status text based on status_id
  function getStatusText(statusId: number): string {
    switch (statusId) {
      case 1: return 'Active';
      case 2: return 'Inactive';
      case 3: return 'Completed';
      default: return 'Unknown';
    }
  }

  if (isLoading) {
    return (
      <Container className="border-t">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className="lg:col-span-2 mt-6 pt-6">
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
      <Container className="border-t">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Job Details: Error</h1>
            <p className="text-sm text-muted-foreground">
              Unable to load job information
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error ? `Failed to load job data: ${JSON.stringify(error)}` : "Failed to load job data"}
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Container className='lg:mx-0'>
        <Toolbar className=' '>
          <ToolbarHeading title={`Job ${job?.job_number || 'Loading...'}: ${job?.name || ''}`} description="View job details, FABs, and media files" />
          <ToolbarActions>
            <BackButton fallbackUrl="/create-jobs" />
          </ToolbarActions>
        </Toolbar>
      </Container>

      <div className="border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0 items-start lg:flex-shrink-0">
        {/* LEFT: Job Info */}
        <Container className="lg:col-span-8">
          {/* Job Information Card */}
          <Card className='my-4'>
            <CardHeader>
              <CardTitle className='text-[#111827] leading-[32px] text-2xl font-bold'>Job Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 space-y-10">
                {jobInfo.map((item, index) => (
                  <div key={index}>
                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                      {item.label}
                    </p>
                    <p className="font-semibold text-text text-base leading-[28px]">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FABs Section */}
          <Card className='my-4'>
            <CardHeader>
              <CardHeading className='flex flex-col items-start py-4'>
                <CardTitle>FABs ({fabs?.length || 0})</CardTitle>
                <p className="text-sm text-[#4B5563]">
                  Fabrication items associated with this job
                </p>
              </CardHeading>
              <CardToolbar>
                <Can action="create" on="fab">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add FAB
                  </Button>
                </Can>
              </CardToolbar>
            </CardHeader>
            <CardContent>
              {fabsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : fabs && fabs.length > 0 ? (
                <div className="space-y-4">
                  {fabs.map((fab) => (
                    <div key={fab.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">{fab.id}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{fab.fab_type}</h4>
                          <p className="text-sm text-gray-600">
                            {fab.total_sqft} sq ft • {fab.stone_type_name || 'N/A'} • {fab.stone_color_name || 'N/A'}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={fab.status_id === 1 ? 'default' : fab.status_id === 2 ? 'secondary' : 'outline'}>
                              {getFabStatusText(fab.status_id)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/job/sales/${fab.id}`)}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No FABs found for this job</p>
                  <Can action="create" on="fab">
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First FAB
                    </Button>
                  </Can>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Media Section */}
          <Card className='my-4'>
            <CardHeader>
              <CardHeading className='flex flex-col items-start py-4'>
                <CardTitle>Media Files</CardTitle>
                <p className="text-sm text-[#4B5563]">
                  Photos and videos associated with this job
                </p>
              </CardHeading>
              <CardToolbar>
                <Can action="create" on="jobs">
                  <Button>
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Media
                  </Button>
                </Can>
              </CardToolbar>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="flex justify-center space-x-8 mb-4">
                  <div className="text-center">
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Photos (0)</p>
                  </div>
                  <div className="text-center">
                    <Video className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Videos (0)</p>
                  </div>
                  <div className="text-center">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Documents (0)</p>
                  </div>
                </div>
                <p className="text-gray-500">No media files uploaded yet</p>
                <Can action="create" on="jobs">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload First File
                  </Button>
                </Can>
              </div>
            </CardContent>
          </Card>
        </Container>

        {/* RIGHT: Actions Sidebar */}
        <div className="lg:col-span-4 w-full lg:w-[300px] xl:w-[350px] ultra:w-[400px]">
          <div className='border-l'>
            <Card className='border-none py-6'>
              <CardHeader className='border-b pb-4 flex-col items-start'>
                <CardTitle className='font-semibold text-text'>Actions</CardTitle>
                <p className="text-sm text-text-foreground">
                  Available actions for this job
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={() => navigate(`/create-jobs`)} className="w-full flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Jobs
                  </Button>
                  <Can action="update" on="jobs">
                    <Button variant="outline" className="w-full flex items-center gap-2">
                      Edit Job Details
                    </Button>
                  </Can>
                  <Can action="create" on="fab">
                    <Button variant="outline" className="w-full flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create FAB
                    </Button>
                  </Can>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper function to get FAB status text
function getFabStatusText(statusId: number): string {
  switch (statusId) {
    case 1: return 'Active';
    case 2: return 'Inactive';
    case 3: return 'Completed';
    default: return 'Unknown';
  }
}
