import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { Documents } from '@/pages/shop/components/files';
import { FileViewer } from '../drafters/components';
import { RevisionModal } from './components/SubmissionModal';
import { MarkAsCompleteModal } from './components/MarkAsCompleteModal';
import { Badge } from '@/components/ui/badge';
import { SCTTimer } from './components/SCTTimer';
import { useSCTService } from './components/SCTService';
import { UniversalUploadModal } from '@/components/universal-upload';
import { BackButton } from '@/components/common/BackButton';
import { Can } from '@/components/permission';
import { Skeleton } from '@/components/ui/skeleton';

import {
    useUpdateSCTReviewMutation,
    useGetSalesCTByFabIdQuery,
    useDeleteFileFromDraftingMutation,
    useAddFilesToDraftingMutation,
    useGetFabByIdQuery,
} from '@/store/api/job';
import { useAuth } from '@/auth/context/auth-context';
import { stageConfig } from '@/utils/note-utils';

// Helper functions
const getAllFabNotes = (fabNotes: any[]) => fabNotes || [];

const getFabStatusInfo = (statusId: number | undefined) => {
    if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
    if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
    return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
};

export const DraftReviewDetailsPage = () => {
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [showMarkAsCompleteModal, setShowMarkAsCompleteModal] = useState(false);
    const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
    const [activeFile, setActiveFile] = useState<any | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const authContext = useAuth();
    const user = authContext.user;

    const fabId = id ? parseInt(id, 10) : null;

    // Fetch FAB data
    const { data: fabData, isLoading: isFabLoading, isError: isFabError, refetch: refetchFab } = useGetFabByIdQuery(fabId!, {
        skip: !fabId,
        refetchOnMountOrArgChange: false,
    });

    const fabDataLoadedRef = useRef(false);
    useEffect(() => {
        if (fabData && !isFabLoading) fabDataLoadedRef.current = true;
    }, [fabData, isFabLoading]);

    // SCT service
    const shouldSkipSCT = !fabId || isFabLoading || !fabDataLoadedRef.current;
    const { sctData, handleUpdateSCTReview } = useSCTService({ fabId: fabId!, skip: shouldSkipSCT });

    const currentUserName = user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown User'
        : 'Unknown User';

    const fabSalesPerson = fabData?.sales_person_name || 'N/A';
    const draftData = (fabData as any)?.draft_data;

    // Mutations
    const [deleteFileFromDrafting] = useDeleteFileFromDraftingMutation();
    const [addFilesToDrafting] = useAddFilesToDraftingMutation();

    // Upload disabled when drafting not completed or SCT already completed
    const draftCompletedDate = draftData?.drafter_end_date;
    const sctCompletedDate = fabData?.sct_completed_date;
    const isUploadDisabled = !draftCompletedDate || !!sctCompletedDate;

    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!draftData?.id) {
            toast.error('Drafting ID not available');
            return;
        }
        try {
            await deleteFileFromDrafting({ drafting_id: draftData.id, file_id: fileId }).unwrap();
            toast.success('File deleted successfully');
            refetchFab();
        } catch (error) {
            console.error('Failed to delete file:', error);
            toast.error('Failed to delete file');
        }
    };

    const handleSubmitDraft = useCallback((submissionData: any) => {
        setShowSubmissionModal(false);
        // Submission logic handled by modal
    }, []);

    const slabSmithNeeded = fabData?.slab_smith_ag_needed || fabData?.slab_smith_cust_needed;
    const isSlabSmithActivityComplete = !!fabData?.slabsmith_completed_date;

    const handleMarkAsComplete = useCallback(async (data: any) => {
        if (!fabId) return;
        try {
            await handleUpdateSCTReview({
                sct_completed: data.sctCompleted,
                revenue: parseFloat(data.revenue) || 0,
                slab_smith_used: isSlabSmithActivityComplete,
                notes: data.notes || "",
                slab_smith_approved: data.slabSmithApproved,
                block_drawing_approved: data.blockDrawingApproved,
            });
            setShowMarkAsCompleteModal(false);
            navigate('/job/draft-review');
        } catch (error) {
            console.error('Failed to mark as complete:', error);
        }
    }, [fabId, handleUpdateSCTReview, navigate]);

    // Prepare links
    const jobNameLink = fabData?.job_details?.id ? `/job/details/${fabData.job_details.id}` : '#';
    const jobNumberLink = fabData?.job_details?.job_number
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fabData.job_details.job_number}`
        : '#';

    // Loading skeleton (mirror draft details)
    if (isFabLoading) {
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

    if (isFabError || !fabData) {
        return <div className="text-red-500 p-4">Error loading FAB data</div>;
    }

    const statusInfo = getFabStatusInfo(fabData?.status_id);

    // Sidebar sections
    const sidebarSections = [
        {
            title: "Job Details",
            type: "details",
            items: [
                { label: "Account Name", value: fabData.account_name || '—' },
                {
                    label: "Fab ID",
                    value: (
                        <Link to={`/sales/${fabData.id}`} className="text-primary hover:underline">
                            {fabData.id}
                        </Link>
                    ),
                },
                { label: "Area", value: fabData.input_area || '—' },
                {
                    label: "Material",
                    value: fabData.stone_type_name
                        ? `${fabData.stone_type_name} - ${fabData.stone_color_name || ''} - ${fabData.stone_thickness_value || ''}`
                        : '—',
                },
                { label: "Fab Type", value: <span className="uppercase">{fabData.fab_type || '—'}</span> },
                { label: "Edge", value: fabData.edge_name || '—' },
                { label: "Total s.f.", value: fabData.total_sqft?.toString() || '—' },
                {
                    label: "Scheduled Date",
                    value: fabData.templating_schedule_start_date
                        ? new Date(fabData.templating_schedule_start_date).toLocaleDateString()
                        : 'Not scheduled',
                },
                { label: "Drafter Assigned", value: fabData.draft_data?.drafter_name || 'Unassigned' },
                { label: "Sales Person", value: fabData.sales_person_name || '—' },
                { label: "SlabSmith Needed", value: fabData.slab_smith_ag_needed ? 'Yes' : 'No' },
            ],
        },
        {
            title: 'Notes',
            type: 'notes',
            notes: Array.isArray(fabData?.notes)
                ? fabData.notes.map((note: string, index: number) => ({
                    id: index,
                    avatar: 'N',
                    content: note,
                    author: '',
                    timestamp: '',
                }))
                : [],
        },

        {
            title: "FAB Notes",
            type: "notes",
            notes: Array.isArray(fabData?.fab_notes)
                ? fabData.fab_notes.map((note: any) => {
                    const stage = note?.stage || 'general';
                    const config = stageConfig[stage] || stageConfig.general;
                    return {
                        id: note?.id,
                        avatar: note?.created_by_name?.charAt(0).toUpperCase() || 'U',
                        content: note?.note || '',
                        author: note?.created_by_name || 'Unknown',
                        timestamp: note?.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date',
                        category: config.label,
                        categoryColor: config.color,
                    };
                })
                : [],
        }
    ];

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
                                            {fabData?.job_details?.name || `Job ${fabData?.job_id}`}
                                        </a>
                                        <span className="mx-1 text-gray-400">·</span>
                                        <a
                                            href={jobNumberLink}
                                            className="hover:underline text-gray-600"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {fabData?.job_details?.job_number || fabData?.job_id}
                                        </a>
                                    </div>
                                }
                                description="SCT Review Details"
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
                    <GraySidebar sections={sidebarSections as any} jobId={fabData?.job_id} />
                </aside>

                {/* Main content */}
                <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-5 space-y-4">
                    {viewMode === 'file' && activeFile ? (
                        // File viewer
                        <div className="bg-white rounded-xl border overflow-hidden">
                            <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                                <div>
                                    <h3 className="font-semibold text-sm">{activeFile.name}</h3>
                                    <p className="text-xs text-gray-500">
                                        {activeFile.size ? `${Math.round(activeFile.size / 1024)} KB` : 'Unknown size'} · {activeFile.stage_name}
                                    </p>
                                </div>
                                <Button
                                    variant="inverse"
                                    size="sm"
                                    onClick={() => {
                                        setViewMode('activity');
                                        setActiveFile(null);
                                    }}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <FileViewer
                                file={activeFile}
                                onClose={() => {
                                    setViewMode('activity');
                                    setActiveFile(null);
                                }}
                            />
                        </div>
                    ) : (
                        // Activity mode
                        <>
                            <Card>
                                <CardHeader className="py-3 px-4 sm:px-5">
                                    <CardTitle className="text-sm sm:text-base">SCT activity
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Review drafting work and mark as complete or create revision
                                        </p>
                                    </CardTitle>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        {slabSmithNeeded && (
                                            <Badge variant={isSlabSmithActivityComplete ? "success" : "destructive"}>
                                                {isSlabSmithActivityComplete ? "Slab Smith Complete" : "Slab Smith Incomplete"}
                                            </Badge>
                                        )}
                                        {/* <Can action="update" on="SCT"> */}
                                            <Button onClick={() => setShowMarkAsCompleteModal(true)}>
                                                Mark as Complete
                                            </Button>
                                        {/* </Can> */}
                                        {/* <Can action="update" on="SCT"> */}
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowSubmissionModal(true)}
                                            >
                                                Create Revision
                                            </Button>
                                        {/* </Can> */}
                                    </div>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardContent className="p-3 sm:p-4 lg:p-5 space-y-5">
                                    <SCTTimer
                                        startTime={draftData?.drafter_end_date || null}
                                        endTime={fabData?.sct_completed_date || null}
                                    />

                                    {/* File section */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-sm">Uploaded files</h3>
                                            {/* <Can action="create" on="Drafting"> */}
                                                <Button
                                                    variant="dashed"
                                                    size="sm"
                                                    onClick={() => setShowUploadModal(true)}
                                                    // disabled={isUploadDisabled}
                                                    className="flex items-center gap-1.5 text-xs"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Add Files
                                                </Button>
                                            {/* </Can> */}
                                        </div>

                                        <Documents
                                            onFileClick={handleFileClick}
                                            draftingData={draftData}
                                            slabsmithData={(fabData as any)?.slabsmith_data}
                                            draftingId={draftData?.id}
                                            showDeleteButton={true}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </main>
            </div>

            {/* Upload Modal */}
            <UniversalUploadModal
                open={showUploadModal}
                onOpenChange={setShowUploadModal}
                title="Upload SCT Files"
                entityId={draftData?.id}
                uploadMutation={addFilesToDrafting}
                stages={[{ value: 'sales_ct', label: 'SCT' }]}
                fileTypes={[
                    { value: 'block_drawing', label: 'Block Drawing' },
                    { value: 'layout', label: 'Layout' },
                    { value: 'ss_layout', label: 'SS Layout' },
                    { value: 'shop_drawing', label: 'Shop Drawing' },
                    { value: 'photo_media', label: 'Photo/Media' },
                ]}
                additionalParams={{
                    drafting_id: draftData?.id,
                    stage_name: 'sales_ct',
                }}
                onUploadComplete={() => {
                    toast.success('Files uploaded successfully');
                    refetchFab();
                    setShowUploadModal(false);
                }}
            />

            {/* Modals */}
            {showSubmissionModal && fabData && (
                <RevisionModal
                    open={showSubmissionModal}
                    onClose={() => setShowSubmissionModal(false)}
                    onSubmit={handleSubmitDraft}
                    fabId={fabData.id}
                    fabType={fabData.fab_type}
                    jobNumber={fabData.job_details?.job_number || ''}
                    totalSqFt={fabData.total_sqft}
                    pieces={draftData?.no_of_piece_drafted || 0}
                    sctId={sctData?.id}
                    fabSalesPerson={fabSalesPerson}
                />
            )}

            <MarkAsCompleteModal
                open={showMarkAsCompleteModal}
                onClose={() => setShowMarkAsCompleteModal(false)}
                onSubmit={handleMarkAsComplete}
                slabSmithNeeded={slabSmithNeeded}
                isSlabSmithActivityComplete={isSlabSmithActivityComplete}
                fabId={fabData.id}
                initialRevenue={fabData?.revenue || ''}
            />
        </div>
    );
};