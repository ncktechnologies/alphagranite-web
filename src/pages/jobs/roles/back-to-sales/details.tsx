import { useState, useEffect, useRef, useCallback } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { FileViewer } from '../drafters/components';
import { Documents } from '@/pages/shop/components/files';
import { RevisionModal } from './components/SubmissionModal';
import { MarkAsCompleteModal } from './components/MarkAsCompleteModal';
import { Badge } from '@/components/ui/badge';
import {
    useUpdateSCTReviewMutation,
    useGetSalesCTByFabIdQuery,
    useDeleteFileFromDraftingMutation,
    useAddFilesToDraftingMutation
} from '@/store/api/job';
import { SCTTimer } from './components/SCTTimer';
import { useSCTService } from './components/SCTService';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGetFabByIdQuery } from '@/store/api/job';
import { toast } from 'sonner';
import { useAuth } from '@/auth/context/auth-context';
import { Can } from '@/components/permission';
import { Skeleton } from '@/components/ui/skeleton';
import { UniversalUploadModal } from '@/components/universal-upload';

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
    return fabNotes || [];
};

// Helper function to get FAB status display
const getFabStatusInfo = (statusId: number | undefined) => {
    if (statusId === 0) {
        return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
    } else if (statusId === 1) {
        return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
    } else {
        return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
    }
};

const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
);

const DraftReviewDetailsPage = () => {
    console.log(`📄 DraftReviewDetailsPage rendering`);

    type ViewMode = 'activity' | 'file';
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [showMarkAsCompleteModal, setShowMarkAsCompleteModal] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('activity');
    const [activeFile, setActiveFile] = useState<any | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const authContext = useAuth();
    const user = authContext.user;

    const fabId = id ? parseInt(id, 10) : null;

    // Fetch FAB data
    const {
        data: fabData,
        isLoading: isFabLoading,
        isError: isFabError,
        refetch: refetchFab
    } = useGetFabByIdQuery(fabId!, {
        skip: !fabId,
        refetchOnMountOrArgChange: false
    });

    const fabDataLoadedRef = useRef(false);
    useEffect(() => {
        if (fabData && !isFabLoading) {
            fabDataLoadedRef.current = true;
        }
    }, [fabData, isFabLoading]);

    // Use SCT service
    const shouldSkipSCT = !fabId || isFabLoading || !fabDataLoadedRef.current;
    const {
        sctData,
        handleUpdateSCTReview,
    } = useSCTService({
        fabId: fabId!,
        skip: shouldSkipSCT
    });

    const currentUserName = user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown User'
        : 'Unknown User';

    const fabSalesPerson = fabData?.sales_person_name || 'N/A';
    const draftData = (fabData as any)?.draft_data;

    // Delete mutation
    const [deleteFileFromDrafting] = useDeleteFileFromDraftingMutation();
    const [addFilesToDrafting] = useAddFilesToDraftingMutation();

    // Check if upload should be disabled (timer not started or paused)
    const draftCompletedDate = draftData?.drafter_end_date;
    const sctCompletedDate = fabData?.sct_completed_date;
    const isUploadDisabled = !draftCompletedDate || !!sctCompletedDate;

    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    };

    // Handle file deletion
    const handleDeleteFile = async (fileId: string) => {
        if (!draftData?.id) {
            toast.error('Drafting ID not available');
            return;
        }
        
        try {
            await deleteFileFromDrafting({
                drafting_id: draftData.id,
                file_id: fileId,
            }).unwrap();
            toast.success('File deleted successfully');
            refetchFab(); // Refresh FAB data to show updated files
        } catch (error) {
            console.error('Failed to delete file:', error);
            toast.error('Failed to delete file');
        }
    };

    const handleSubmitDraft = useCallback((submissionData: any) => {
        setShowSubmissionModal(false);
        // Handle submission logic
    }, []);

    const slabSmithNeeded = fabData?.slab_smith_ag_needed;
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
                block_drawing_approved: data.blockDrawingApproved
            });
            setShowMarkAsCompleteModal(false);
            navigate('/job/draft-review');
        } catch (error) {
            console.error('Failed to mark as complete:', error);
        }
    }, [fabId, handleUpdateSCTReview, navigate]);

    // Prepare clickable links
    const jobNameLink = fabData?.job_details?.id ? `/job/details/${fabData.job_details.id}` : '#';
    const jobNumberLink = fabData?.job_details?.job_number
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fabData.job_details.job_number}`
        : '#';

    // Loading state with skeletons (optional; keep original spinner if preferred)
    if (isFabLoading) {
        return (
            <Container className='lg:mx-0 max-w-full'>
                <Toolbar className=''>
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <ToolbarHeading
                                title={<Skeleton className="h-8 w-96" />}
                                description={<Skeleton className="h-4 w-80 mt-1" />}
                            />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                </Toolbar>
                <div className="border-t grid grid-cols-1 lg:grid-cols-12 gap-3 items-start h-[calc(100vh-120px)] overflow-y-auto">
                    <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px] sticky top-0 self-start">
                        <Skeleton className="h-64 w-full" />
                    </div>
                    <div className="lg:col-span-9">
                        <Card className='my-4'>
                            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                            <CardContent><Skeleton className="h-96 w-full" /></CardContent>
                        </Card>
                    </div>
                </div>
            </Container>
        );
    }

    if (isFabError || !fabData) {
        return <div className="text-red-500 p-4">Error loading FAB data</div>;
    }

    const statusInfo = getFabStatusInfo(fabData?.status_id);

    // Sidebar sections – Job Details with long format fields
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
                            FAB-{fabData.id}
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
                { label: "Assigned to", value: fabData.draft_data?.drafter_name || 'Unassigned' },
                { label: "Sales Person", value: fabData.sales_person_name || '—' },
                { label: "SlabSmith Needed", value: fabData.slab_smith_ag_needed ? 'Yes' : 'No' },
            ],
        },
        {
            title: "Drafting Notes",
            type: "notes",
            notes: draftData ? [
                {
                    id: 1,
                    avatar: draftData?.drafter_name?.substring(0, 2).toUpperCase() || 'DR',
                    content: draftData?.draft_note || `Drafting completed with ${draftData?.no_of_piece_drafted || 0} pieces, ${draftData?.total_sqft_drafted || 0} sq ft`,
                    author: draftData?.drafter_name || 'Unknown Drafter',
                    timestamp: draftData?.updated_at ? new Date(draftData.updated_at).toLocaleDateString() : 'N/A',
                }
            ] : [],
        },
        {
            title: "FAB Notes",
            type: "notes",
            notes: getAllFabNotes(fabData?.fab_notes || []).map(note => {
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
        <>
            {/* Top toolbar with clickable job name/number and status badge */}
            <Container className='lg:mx-0 max-w-full'>
                <Toolbar className=''>
                    <div className="flex items-center justify-between w-full">
                        <ToolbarHeading
                            title={
                                <div className="text-2xl font-bold">
                                    <a href={jobNameLink} className="hover:underline">
                                        {fabData?.job_details?.name || `Job ${fabData?.job_id}`}
                                    </a>
                                    {' - '}
                                    <a href={jobNumberLink} className="hover:underline">
                                        {fabData?.job_details?.job_number || fabData?.job_id}
                                    </a>
                                </div>
                            }
                        />
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                                {statusInfo.text}
                            </span>
                        </div>
                    </div>
                </Toolbar>
            </Container>

            {/* Main area with sticky sidebar and scrollable content */}
            <div className="border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0 items-start h-[calc(100vh-120px)] overflow-y-auto">
                {/* Sticky sidebar */}
                <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px] sticky top-0 self-start">
                    <GraySidebar
                        sections={sidebarSections as any}
                        jobId={fabData?.job_id}
                    />
                </div>

                {/* Scrollable main content */}
                <Container className="lg:col-span-9">
                    {viewMode === 'file' && activeFile ? (
                        <div>
                            <div className="flex justify-end">
                                <Button
                                    variant="inverse"
                                    size="sm"
                                    onClick={() => {
                                        setViewMode('activity');
                                        setActiveFile(null);
                                    }}
                                >
                                    <X className="w-6 h-6" />
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
                        <>
                            <Card className='my-4'>
                                <CardHeader>
                                    <CardHeading className='flex flex-col items-start py-4'>
                                        <CardTitle>SCT activity</CardTitle>
                                        <p className="text-sm text-[#4B5563]">
                                            Review drafting work and mark as complete or create revision
                                        </p>
                                    </CardHeading>
                                    <CardToolbar className="flex items-center gap-2">
                                        {slabSmithNeeded && (
                                            <Badge variant={isSlabSmithActivityComplete ? "success" : "destructive"}>
                                                {isSlabSmithActivityComplete ? "Slab Smith Complete" : "Slab Smith Incomplete"}
                                            </Badge>
                                        )}
                                        <Can action="update" on="SCT">
                                            <Button onClick={() => setShowMarkAsCompleteModal(true)}>
                                                Mark as Complete
                                            </Button>
                                        </Can>
                                        <Can action="update" on="SCT">
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowSubmissionModal(true)}
                                            >
                                                Create Revision
                                            </Button>
                                        </Can>
                                    </CardToolbar>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className='py-5 border-b'>
                                    <SCTTimer
                                        startTime={draftData?.drafter_end_date || null}
                                        endTime={fabData?.sct_completed_date || null}
                                    />
                                </CardHeader>
                                <CardContent className="">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className='font-semibold text-sm'>Uploaded files</h2>
                                        <Can action="create" on="Drafting">
                                            <Button
                                                variant="dashed"
                                                size="sm"
                                                onClick={() => setShowUploadModal(true)}
                                                disabled={isUploadDisabled}
                                                className="flex items-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Files
                                            </Button>
                                        </Can>
                                    </div>
                                    <Documents
                                        onFileClick={handleFileClick}
                                        draftingData={draftData}
                                        slabsmithData={(fabData as any)?.slabsmith_data}
                                        onDeleteFile={handleDeleteFile}
                                        draftingId={draftData?.id}
                                        showDeleteButton={!isUploadDisabled}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </Container>
            </div>

            {/* Upload Modal */}
            <UniversalUploadModal
              open={showUploadModal}
              onOpenChange={setShowUploadModal}
              title="Upload SCT Files"
              entityId={draftData?.id}
              uploadMutation={addFilesToDrafting}
              stages={[
                  { value: 'sales_ct', label: 'Sales CT' },
              ]}
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
                  refetchFab(); // Refresh FAB data to show new files
                  setShowUploadModal(false);
              }}
            />

            {/* Modals */}
            {showSubmissionModal && fabData && (
                <RevisionModal
                    open={showSubmissionModal}
                    onClose={() => setShowSubmissionModal(false)}
                    onSubmit={handleSubmitDraft}
                    fabId={`FAB-${fabData.id}`}
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
            />
        </>
    );
};

export { DraftReviewDetailsPage };