import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReviewChecklistForm } from './ReviewChecklist';
import { Badge } from '@/components/ui/badge';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Link, useParams } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
  return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
  return fabNotes || [];
};

export function PreDraftDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));

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
                    <div className="lg:col-span-2 mt-6 ">
                        <div className="flex justify-between items-center" >
                            <div>
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-16 mt-1" />
                            </div>
                            <div>
                                <Skeleton className="h-8 w-24" />
                            </div>
                        </div>
                        <Card className="mt-6 pt-6">
                            <CardHeader>
                                <Skeleton className="h-8 w-48" />
                            </CardHeader>
                            <CardContent >
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
                        <div className="w-full lg:w-[250px] XL:W-[300PX] 2xl:w-[400px]  lg:flex-shrink-0">
                            <Skeleton className="h-64 w-full" />
                        </div>
                    </div>

                    <div className=' bg-[#FAFAFA] min-h-screen pt-12 pb-3'>
                        <Card className='border-none bg-transparent'>
                            <CardHeader className='border-b pb-4 flex-col items-start'>
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-4 w-64 mt-2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-96 w-full" />
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

    // Create job info based on actual FAB data
    const jobInfo = fab ? [
        { label: 'FAB ID', value: `FAB-${fab.id}` },
        { label: 'FAB Type', value: fab.fab_type },
        { label: 'Account', value: (fab as any).account_name || `Account ${(fab as any).account_id || 'N/A'}` },
       {
    label: 'Job name',
    value: (
      <Link
        to={`/job/details/${fab.job_id}`}
        className="text-primary underline hover:no-underline"
      >
        {(fab as any).job_details?.name || `Job ${fab.job_id}`}
      </Link>
    )
  },
  {
    label: 'Job #',
    value: (
      <Link
        to={`/job/details/${fab.job_id}`}
        className="text-primary underline hover:no-underline"
      >
        {(fab as any).job_details?.job_number || String(fab.job_id)}
      </Link>
    )
  },
        { label: 'Area (s)', value: fab.input_area },
        { label: 'Stone type', value: fab.stone_type_name || 'N/A' },
        { label: 'Stone color', value: fab.stone_color_name || 'N/A' },
        { label: 'Stone thickness', value: fab.stone_thickness_value || 'N/A' },
        { label: 'Edge', value: fab.edge_name || 'N/A' },
        { label: 'Total square ft', value: String(fab.total_sqft) },
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
            notes: getAllFabNotes(fab?.fab_notes || []).map(note => {
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
    ];

    return (
        <Container className=" border-t">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 mt-6 ">
                    <div className="flex justify-between items-center" >
                        <div>
                            <p className="font-semibold text-text text-xl tracking-wide">FAB-{fab?.id || id}</p>
                            <p className="text-sm text-text-foreground font-normal uppercase ">
                                FAB ID
                            </p>
                        </div>
                        <div className='text-text-foreground'>
                            Template Status:
                            <Badge className='text-[#0BC33F] bg-[#0BC33F]/20 rounded-[50px] h-[30px] font-medium text-[14px] ml-2 px-2'>
                                compeleted
                            </Badge>
                        </div>
                    </div>
                    <Card className="mt-6 pt-6">
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
                    <div className="w-full lg:w-[250px] XL:W-[300PX] 2xl:w-[400px]  lg:flex-shrink-0">
                        
                        <GraySidebar sections={sidebarSections as any} className='bg-transparent border-none pl-0' />
                    
                    </div>
                </div>

                <div className=' bg-[#FAFAFA] min-h-screen pt-12 pb-3'>
                    <Card className='border-none bg-transparent'>
                        <CardHeader className='border-b pb-4 flex-col items-start'>
                            <CardTitle className='text-text'>Templating Review</CardTitle>
                            <p className="text-sm text-text-foreground leading-[20px]">
                                Review and approve Complete template
                            </p>
                        </CardHeader>
                        <CardContent>
                            <ReviewChecklistForm 
                                fabId={Number(id)} 
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Container>
    );
}