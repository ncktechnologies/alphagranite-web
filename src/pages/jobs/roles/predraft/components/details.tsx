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
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { BackButton } from '@/components/common/BackButton';
import { stageConfig } from '@/utils/note-utils';

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => fabNotes || [];

// Helper function to get FAB status display
const getFabStatusInfo = (statusId: number | undefined) => {
    if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
    if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
    return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
};

export function PreDraftDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));

    // Prepare clickable links
    const jobNameLink = fab?.job_details?.id ? `/job/details/${fab.job_details.id}` : '#';
    const jobNumberLink = fab?.job_details?.job_number
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fab.job_details.job_number}`
        : '#';

    // Build sidebar sections
    const sidebarSections = fab
        ? [
            {
                title: "Job Details",
                type: "details",
                items: [
                    { label: "Account", value: fab.account_name || '—' },
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
                    { label: "Total S.F", value: fab.total_sqft?.toString() || '—' },
                    { label: "Sales Person", value: fab.sales_person_name || '—' },
                    {
                        label: "Job Notes",
                        value: fab.job_details?.description || 'None',
                        // Full width handled automatically by GraySidebar
                    },
                ],
            },
            {
                title: "FAB Notes",
                type: "notes",
                notes: getAllFabNotes(fab.fab_notes || []).map(note => {
                  
                    const stage = note.stage || 'general';
                    const config = stageConfig[stage] || stageConfig.general;
                    return {
                        id: note.id,
                        avatar: note.created_by_name?.charAt(0).toUpperCase() || 'U',
                        content: note?.note || '',
                        author: note.created_by_name || 'Unknown',
                        timestamp: note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date',
                        category: config.label,
                        categoryColor: config.color,
                    };
                })
            }
        ]
        : [];

    // Loading skeleton (mirrors drafter details)
    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
                    <Skeleton className="h-8 w-72 mb-1" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                    <div className="w-full lg:w-[220px] xl:w-[260px] shrink-0 border-r">
                        <Skeleton className="h-full min-h-[300px] w-full" />
                    </div>
                    <div className="flex-1 p-4 sm:p-6 space-y-4">
                        <Skeleton className="h-24 w-full rounded-xl" />
                        <Skeleton className="h-96 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !fab) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
                    <ToolbarHeading title="Error loading FAB" description="Could not load pre-draft details" />
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
    const isTemplatingCompleted = fab.templating_schedule_end_date ? true : false; // adjust logic as needed

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
                                description="Pre-Draft Review"
                            />
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                                    {statusInfo.text}
                                </span>
                                {isTemplatingCompleted && (
                                    <Badge className="text-[#0BC33F] bg-[#0BC33F]/20 rounded-[50px] h-[30px] font-medium text-[14px] px-2">
                                        Templating completed
                                    </Badge>
                                )}
                                <BackButton />
                            </div>
                        </div>
                    </Toolbar>
                </div>
            </div>

            {/* Main two‑column layout */}
            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                {/* Sticky sidebar */}
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

                {/* Main content */}
                <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-5 space-y-4">
                    <Card className="border-none bg-transparent">
                        <CardHeader className="border-b pb-4 flex-col items-start">
                            {fab?.template_needed ? (
                                <>
                                    <CardTitle className="text-text text-lg sm:text-xl">Templating Review</CardTitle>
                                    <p className="text-sm text-text-foreground leading-[20px]">
                                        Review and approve completed template
                                    </p>
                                </>
                            ) : (
                                <>
                                    <CardTitle className="text-text text-lg sm:text-xl">Predraft Review</CardTitle>
                                    <p className="text-sm text-text-foreground leading-[20px]">
                                        Review and approve completed Predraft
                                    </p>
                                </>
                            )}
                        </CardHeader>
                        <CardContent>
                            <ReviewChecklistForm fabId={Number(id)} />
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}