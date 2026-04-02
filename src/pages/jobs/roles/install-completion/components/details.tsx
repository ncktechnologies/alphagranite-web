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
const getAllFabNotes = (fabNotes: any[]) => {
    return fabNotes || [];
};

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

    // Job details fields for the left card (optional – can be removed if using GraySidebar)
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

    // Sidebar sections for GraySidebar (Job Details + FAB Notes)
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
                            {fab.id}
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
                { label: "Fab Type", value: <span className="uppercase">{fab.fab_type || '—'}</span> },
                { label: "Edge", value: fab.edge_name || '—' },
                { label: "Total s.f.", value: fab.total_sqft?.toString() || '—' },
                {
                    label: "Scheduled Date",
                    value: fab.templating_schedule_start_date
                        ? new Date(fab.templating_schedule_start_date).toLocaleDateString()
                        : 'Not scheduled',
                },
                { label: "Drafter Assigned", value: fab.draft_data?.drafter_name || 'Unassigned' },
                { label: "Sales Person", value: fab.sales_person_name || '—' },
                { label: "SlabSmith Needed", value: fab.slab_smith_ag_needed ? 'Yes' : 'No' },
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
    ] : [];

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
                    <Skeleton className="h-8 w-72 mb-1" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex flex-col lg:flex-row flex-1 min-h-0 p-4">
                    <div className="w-full lg:w-[220px] xl:w-[260px] shrink-0 border-r">
                        <Skeleton className="h-64 w-full mb-4" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                    <div className="flex-1 min-w-0 p-4">
                        <Skeleton className="h-24 w-full mb-4" />
                        <Skeleton className="h-96 w-full" />
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
                    <ToolbarHeading title="Error loading FAB" description="Could not load install scheduling details" />
                </div>
                <div className="p-6">
                    <Alert variant="destructive">
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
                                        <a href={jobNameLink} className="hover:underline">
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
            </div>

            {/* Main two‑column layout */}
            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                {/* Left column – sticky sidebar with Job Details and FAB Notes */}
                <aside
                    className={[
                        'w-full bg-white border-b',
                        'lg:w-[220px] xl:w-[260px] lg:shrink-0',
                        'lg:sticky lg:top-[50px]',
                        'lg:self-start',
                        'lg:max-h-[calc(100vh-50px)]',
                        'lg:overflow-y-auto',
                        'lg:border-b-0 lg:border-r',
                    ].join(' ')}
                >
                    <GraySidebar sections={sidebarSections as any} jobId={fab?.job_id} />
                </aside>

                {/* Right column – main content */}
                <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-5 space-y-4">
                    {/* Job Information Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-[#111827] text-xl font-bold">Job Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

                    {/* Notes Card (optional – can be removed if GraySidebar already contains FAB Notes) */}
                    {fab.fab_notes && fab.fab_notes.length > 0 && (
                        <Card>
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

                    {/* Install Checklist Form */}
                    <Card>
                        <CardHeader className="border-b pb-4">
                            <CardTitle className="font-semibold text-text">Install Scheduling Review</CardTitle>
                            <p className="text-sm text-text-foreground">Review and approve install scheduling details</p>
                        </CardHeader>
                        <CardContent>
                            <InstallChecklistForm fabId={fab.id} showCompletionFields={isCompletionRoute} />
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}