import { useState, useEffect, useRef, useCallback } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Separator } from '@/components/ui/separator';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { FileViewer } from '../drafters/components';
import { Documents } from '@/pages/shop/components/files';
import { RevisionModal } from './components/SubmissionModal';
import { MarkAsCompleteModal } from './components/MarkAsCompleteModal';
import { ApproveAndSendToSlabSmithModal } from './components/ApproveAndSendToSlabSmithModal';
import { useApproveAndSendToSlabSmithMutation } from '@/store/api/job';
import { TimeDisplay } from './components/DisplayTime';
import { useSCTService } from './components/SCTService';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetFabByIdQuery } from '@/store/api/job';
import { toast } from 'sonner';
import { useAuth } from '@/auth/context/auth-context';
import { Can } from '@/components/permission';

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
    return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
    return fabNotes || [];
};

// Add a simple loading component
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
    const [showApproveSlabSmithModal, setShowApproveSlabSmithModal] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('activity');
    const [activeFile, setActiveFile] = useState<any | null>(null);

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const authContext = useAuth();
    const user = authContext.user;

    // Convert id to number safely
    const fabId = id ? parseInt(id, 10) : null;

    console.log(`🆔 FAB ID:`, { id, fabId });

    // Fetch FAB data - using a stable query
    const {
        data: fabData,
        isLoading: isFabLoading,
        isError: isFabError
    } = useGetFabByIdQuery(fabId!, {
        skip: !fabId,
        refetchOnMountOrArgChange: false
    });

    // Use a ref to track if we've loaded FAB data
    const fabDataLoadedRef = useRef(false);

    // Update ref when FAB data is loaded
    useEffect(() => {
        if (fabData && !isFabLoading) {
            fabDataLoadedRef.current = true;
        }
    }, [fabData, isFabLoading]);

    // Use SCT service - only when FAB data is loaded
    const shouldSkipSCT = !fabId || isFabLoading || !fabDataLoadedRef.current;

    console.log(`⚙️ SCT Config:`, { fabId, shouldSkipSCT, isFabLoading, hasFabData: !!fabData });

    const {
        sctData,
        isSctLoading,
        isSctError,
        handleUpdateSCTReview,
    } = useSCTService({
        fabId: fabId!,
        skip: shouldSkipSCT
    });

    console.log(`🎯 SCT State:`, {
        hasSCTData: !!sctData,
        isSctLoading,
        isSctError,
        sctId: sctData?.id
    });

    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    };

    const handleSubmitDraft = useCallback((submissionData: any) => {
        setShowSubmissionModal(false);
        // Handle submission logic
    }, []);

    // Handle marking as complete
    const handleMarkAsComplete = useCallback(async (data: any) => {
        if (!fabId) return;

        try {
            await handleUpdateSCTReview({
                sct_completed: data.sctCompleted,
                revenue: parseFloat(data.revenue) || 0,
                slab_smith_used: data.slabSmithUsed || false,
                notes: data.notes || ""
            });

            toast.success("FAB marked as complete successfully");
            setShowMarkAsCompleteModal(false);
            navigate('/job/draft-review');
        } catch (error) {
            console.error('Failed to mark as complete:', error);
            toast.error("Failed to mark FAB as complete");
        }
    }, [fabId, handleUpdateSCTReview, navigate]);

    // Handle approve and send to slab smith
    const [approveAndSendToSlabSmith] = useApproveAndSendToSlabSmithMutation();

    const handleApproveAndSendToSlabSmith = useCallback(async (data: { revenue: number; slabSmithUsed: boolean; notes: string }) => {
        if (!fabId) return;

        try {
            await approveAndSendToSlabSmith({
                fab_id: fabId,
                data: {
                    sct_completed: true,
                    revenue: data.revenue,
                    slab_smith_used: data.slabSmithUsed,
                    notes: data.notes
                }
            }).unwrap();

            toast.success("FAB approved and sent to Slab Smith successfully");
            setShowApproveSlabSmithModal(false);
            navigate('/job/draft-review');
        } catch (error) {
            console.error('Failed to approve and send to slab smith:', error);
            toast.error("Failed to approve and send FAB to Slab Smith");
        }
    }, [fabId, approveAndSendToSlabSmith, navigate]);

    // Show loading while FAB is loading
    if (isFabLoading) {
        return <LoadingSpinner />;
    }

    if (isFabError || !fabData) {
        return <div className="text-red-500 p-4">Error loading FAB data</div>;
    }

    // Get current user's name
    const currentUserName = user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown User'
        : 'Unknown User';

    // Get sales person info from FAB data
    const fabSalesPerson = fabData?.sales_person_name || 'N/A';

    // Use draft_data from FAB response
    const draftData = (fabData as any)?.draft_data;

    // Check slab smith conditions
    const showApproveSlabSmithButton = fabData?.slab_smith_ag_needed === true && fabData?.slabsmith_completed_date === null;

    // Create sidebar sections
    const sidebarSections = [
        {
            title: "Job Details",
            type: "details",
            items: [
                { label: "Job Name", value: fabData.job_details?.name || `Job ${fabData.job_id}` },
                { label: "Job Number", value: fabData.job_details?.job_number || String(fabData.job_id) },
                { label: "Stone Type", value: fabData?.stone_type_name || 'N/A' },
                { label: "Stone Color", value: fabData?.stone_color_name || 'N/A' },
                { label: "Stone Thickness", value: fabData?.stone_thickness_value || 'N/A' },
                { label: "Edge Profile", value: fabData?.edge_name || 'N/A' },
                { label: "Total Sq Ft", value: fabData?.total_sqft?.toString() || 'N/A' },
                { label: "Input Area", value: fabData?.input_area || 'N/A' },
                { label: "FAB Type", value: fabData?.fab_type || 'N/A' },
                { label: "Template Needed", value: fabData?.template_needed ? 'Yes' : 'No' },
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
        <>
            <Container className='lg:mx-0'>
                <Toolbar>
                    <ToolbarHeading
                        title={`FAB ID: ${fabData?.id || 'Loading...'}`}
                        description="Review drafting activity"
                    />
                </Toolbar>
            </Container>
            <div className="border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0 items-start lg:flex-shrink-0">
                <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px]">
                    <GraySidebar
                        sections={sidebarSections as any}
                        jobId={fabData?.job_id}  // Add this prop
                    />
                </div>
                <Container className="lg:col-span-9">
                    {viewMode === 'file' && activeFile ? (
                        <div className="">
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
                                    <CardToolbar>
                                        {showApproveSlabSmithButton ? (
                                            <Can action="update" on="SCT">
                                                <Button
                                                    onClick={() => setShowApproveSlabSmithModal(true)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    Approve and Send to Slab Smith
                                                </Button>
                                            </Can>
                                        ) : (
                                            <Can action="update" on="SCT">
                                                <Button onClick={() => setShowMarkAsCompleteModal(true)}>
                                                    Mark as Complete
                                                </Button>
                                            </Can>
                                        )}
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
                                {/* <CardHeader className='py-5 border-b'>
                                    <TimeDisplay
                                        startTime={draftData?.drafter_start_date ? new Date(draftData.drafter_start_date) : undefined}
                                        endTime={draftData?.drafter_end_date ? new Date(draftData.drafter_end_date) : undefined}
                                        totalTime={draftData?.total_hours_drafted || 0}
                                    />
                                </CardHeader> */}
                                <CardContent className="">
                                    <h2 className='font-semibold text-sm py-3'>Uploaded files</h2>
                                    <Documents
                                        onFileClick={handleFileClick}
                                        draftingData={draftData}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </Container>

                {/* Submission Modal */}
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
                        sctId={sctData?.id} // Now using sctData directly
                        fabSalesPerson={fabSalesPerson}
                    />
                )}

                {/* Mark as Complete Modal */}
                <MarkAsCompleteModal
                    open={showMarkAsCompleteModal}
                    onClose={() => setShowMarkAsCompleteModal(false)}
                    onSubmit={handleMarkAsComplete}
                />

                {/* Approve and Send to Slab Smith Modal */}
                {showApproveSlabSmithButton && (
                    <ApproveAndSendToSlabSmithModal
                        open={showApproveSlabSmithModal}
                        onClose={() => setShowApproveSlabSmithModal(false)}
                        onSubmit={handleApproveAndSendToSlabSmith}
                        fabId={`FAB-${fabData.id}`}
                    />
                )}
            </div>
        </>
    );
};

export { DraftReviewDetailsPage };