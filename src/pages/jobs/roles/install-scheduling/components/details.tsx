import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Link, useLocation, useParams } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { InstallChecklistForm } from './reviewCheckList';
import { BackButton } from '@/components/common/BackButton';

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => fabNotes || [];

// Helper function to get FAB status display
const getFabStatusInfo = (statusId: number | undefined) => {
    if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
    if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
    return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
};

export function InstallSchedulingDetailsPage() {
    const location = useLocation();

    const { id } = useParams<{ id: string }>();
    const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));
    const isCompletionRoute = location.pathname.includes('install-completion');

    // Prepare clickable links
    const jobNameLink = fab?.job_details?.id ? `/job/details/${fab.job_details.id}` : '#';
    const jobNumberLink = fab?.job_details?.job_number
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fab.job_details.job_number}`
        : '#';

    const jobInfo = fab ? [
        { label: 'FAB ID', value: String(fab.id) },
        { label: 'FAB Type', value: <span className="uppercase">{fab.fab_type}</span> },
        { label: 'Account', value: fab.account_name },
        { label: 'Job name', value: fab.job_details?.name },
        { label: 'Job #', value: <Link to={`/job/details/${fab.job_details?.id}`} className="text-primary hover:underline">{fab.job_details?.job_number}</Link> },
        { label: 'Area (s)', value: fab.input_area },
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
                        content: note?.note || '',
                        author: fabAuthorName,
                        timestamp: fab?.created_at ? new Date(fab.created_at).toLocaleDateString() : 'Unknown date',
                        category: config.label,
                        categoryColor: config.color,
                    };
                })
                : [],
        },
    ];

    if (isLoading) {
        return (
            <Container className="border-t">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-80 mt-2" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 mt-6">
                        <div className="flex justify-between items-center">
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

    const statusInfo = getFabStatusInfo(fab.status_id);

    return (
        <Container className="border-t">
            {/* Sticky toolbar */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm -mx-4 px-4">
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
                            description="Install Scheduling Details"
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

            {/* Original grid layout – unchanged */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2">

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
                                        <p className="font-semibold text-text text-base leading-[28px]">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-4">
                        <GraySidebar sections={sidebarSections as any} className="bg-transparent border-none pl-0" />
                    </div>
                </div>

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
                            <InstallChecklistForm fabId={fab.id} showCompletionFields={isCompletionRoute} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Container>
    );
}