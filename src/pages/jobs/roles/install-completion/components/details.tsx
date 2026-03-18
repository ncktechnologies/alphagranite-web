import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Link, useParams } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { InstallChecklistForm } from './reviewCheckList';

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
    return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
    return fabNotes || [];
};

export function InstallSchedulingDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));

    const jobInfo = fab ? [
        { label: 'FAB ID', value: String(fab.id) },
        { label: 'FAB Type', value: <span className="uppercase">{fab.fab_type}</span> },
        { label: 'Account', value: fab.account_name }, // Placeholder
        { label: 'Job name', value: fab.job_details?.name }, // Placeholder
        { label: 'Job #', value: <Link to={`/job/details/${fab.job_details?.id}`} className="text-primary hover:underline">{fab.job_details?.job_number}</Link> },
        { label: 'Area (s)', value: fab.input_area }, // Placeholder
        { label: 'Stone type', value: fab.stone_type_name || 'N/A' },
        { label: 'Stone color', value: fab.stone_color_name || 'N/A' },
        { label: 'Stone thickness', value: fab.stone_thickness_value || 'N/A' },
        { label: 'Edge', value: fab.edge_name || 'N/A' },
        { label: 'Total square ft', value: String(fab.total_sqft) },
        { label: 'Sales person', value: fab.sales_person_name || 'N/A' },
        { label: 'Job Notes', value: String(fab.job_details?.description || 'None') },


    ] : [];
    const sidebarSections = [
        {
            title: "Job Details",
            type: "details",
            items: [
                { label: "Job Name", value: fab?.job_details?.name || `Job ${fab?.job_id}` },
                { label: "Job Number", value: fab?.job_details?.job_number || String(fab?.job_id) },
                { label: "Stone Type", value: fab?.stone_type_name || 'N/A' },
                { label: "Stone Color", value: fab?.stone_color_name || 'N/A' },
                { label: "Stone Thickness", value: fab?.stone_thickness_value || 'N/A' },
                { label: "Edge Profile", value: fab?.edge_name || 'N/A' },
                { label: "Total Sq Ft", value: fab?.total_sqft?.toString() || 'N/A' },
                { label: "Input Area", value: fab?.input_area?.toString() || 'N/A' },
                { label: "FAB Type", value: fab?.fab_type || 'N/A' },
            ],
        },
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
                            <CardContent>
                                <Skeleton className="h-64 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                    <Skeleton className="h-96 w-full" />
                </div>
            </Container>
        );
    }

    if (isError) {
        return (
            <Container className="border-t">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Failed to load install scheduling details. {error && 'Please try again later.'}
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }

    if (!fab) {
        return (
            <Container className="border-t">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Not Found</AlertTitle>
                    <AlertDescription>
                        Install scheduling record not found.
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }

    return (
        <Container className="border-t">
            <Toolbar>
                <ToolbarHeading
                    title={`${fab.job_details?.name || 'Install Scheduling'}`}
                    description={`Job #${fab.job_details?.job_number || fab.id}`}
                />
            </Toolbar>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold">Install Scheduling Details</h3>
                            <p className="text-sm text-muted-foreground">Current Stage: {fab.current_stage}</p>
                        </div>
                        <Link to={`/app/job/install-scheduling`}>
                            <Badge variant="outline">Back to List</Badge>
                        </Link>
                    </div>

                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Job Information</CardTitle>
                        </CardHeader>
                        <CardContent>
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

                    {fab.fab_notes && fab.fab_notes.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {fab.fab_notes.map((note: any, index: number) => (
                                        <div key={index} className="text-sm p-2 bg-muted rounded">
                                            <p className="font-medium">{note.stage}</p>
                                            <p className="text-muted-foreground">{note.note || '-'}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* <GraySidebar sections={sidebarSections as any} /> */}
                {/* RIGHT: Review checklist */}
                <div className='border-l'>
                    <Card className='border-none py-6'>
                        <CardHeader className='border-b pb-4 flex-col items-start'>
                            <CardTitle className='font-semibold text-text'>FAB ID</CardTitle>
                            <p className="text-sm text-text-foreground">
                                Review and approve install scheduling details
                            </p>
                        </CardHeader>
                        <CardContent>
                            <InstallChecklistForm fabId={fab.id} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Container>
    );
}
