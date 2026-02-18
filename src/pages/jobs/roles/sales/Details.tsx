import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Pencil } from 'lucide-react';
import { useAuth } from '@/auth/context/auth-context';
import { Can } from '@/components/permission';

export function SalesDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));

  // Create job info based on actual FAB data
  const jobInfo = fab ? [
    { label: 'FAB ID', value: String(fab.id) },
    { label: 'FAB Type', value: fab.fab_type },
    { label: 'Account', value: fab.account_name }, // Placeholder
    { label: 'Job name', value: fab.job_details?.name }, // Placeholder
    { label: 'Job #', value: String(fab.job_details?.job_number) },
    { label: 'Area (s)', value: fab.input_area },
    { label: 'Stone type', value: fab.stone_type_name || 'N/A' },
    { label: 'Stone color', value: fab.stone_color_name || 'N/A' },
    { label: 'Stone thickness', value: fab.stone_thickness_value || 'N/A' },
    { label: 'Edge', value: fab.edge_name || 'N/A' },
    { label: 'Total square ft', value: String(fab.total_sqft) },
    { label: 'Notes', value: fab.templating_notes?.join(', ') || 'N/A' },
  ] : [];

  if (isLoading) {
    return (
      <Container className=" border-t">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
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
              Review and approve fabrication details
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

  const handleEdit = () => {
    navigate(`/sales/edit/${id}`);
  };

  return (
    <Container className=" border-t">
      {/* Header with Edit button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">FAB ID: {fab?.id}</h1>
          <p className="text-sm text-muted-foreground">
            Review fabrication details
          </p>
        </div>
        {/* <Can action="update" on="fab">
          <Button onClick={handleEdit} className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </Can> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT: Job Info */}
        <Card className=" lg:col-span-2 mt-6 pt-6">
          <CardHeader>
            <CardTitle className='text-[#111827] leading-[32px] text-2xl font-bold'>Job Information</CardTitle>
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

        {/* RIGHT: Actions */}
        <div className='border-l'>
          <Card className='border-none py-6'>
            <CardHeader className='border-b pb-4 flex-col items-start'>
              <CardTitle className='font-semibold text-text'>Actions</CardTitle>
              <p className="text-sm text-text-foreground">
                Available actions for this FAB
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={handleEdit} className="w-full flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit FAB Details
                </Button>
                <Link to="/sales">
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sales
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}