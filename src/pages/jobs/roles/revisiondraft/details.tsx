import { useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Separator } from '@/components/ui/separator';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { FileViewer } from '../drafters/components';
import { Documents } from '@/pages/shop/components/files';
import { RevisionForm } from './components/SubmissionModal';
import { TimeDisplay } from './components/DisplayTime';
import { useParams, useNavigate } from 'react-router-dom';
import {
    useGetFabByIdQuery,
    useGetRevisionsByFabIdQuery, // Add this import
    useCreateRevisionMutation,
    useUpdateRevisionMutation,
} from '@/store/api/job';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { Can } from '@/components/permission';
import { BackButton } from '@/components/common/BackButton';

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
    return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
    return fabNotes || [];
};

const ReviewDetailsPage = () => {
    type ViewMode = 'activity' | 'file' | 'edit';
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [totalTime, setTotalTime] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('activity');
    const [activeFile, setActiveFile] = useState<any | null>(null);
    const [hasEnded, setHasEnded] = useState(false);
    const [resetTimeTracking, setResetTimeTracking] = useState(0);

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const user = useSelector((s: any) => s.user.user);

    // Fetch FAB data
    const { data: fabData, isLoading: isFabLoading, isError: isFabError } = useGetFabByIdQuery(Number(id), { skip: !id });

    // Fetch revisions by FAB ID
    const { data: revisionsData, isLoading: isRevisionsLoading } = useGetRevisionsByFabIdQuery(Number(id), { skip: !id });

    // Use draft_data from FAB response
    const draftData = (fabData as any)?.draft_data;

    // SCT mutations - MUST be called unconditionally
    const [createRevision, { isLoading: isCreatingRevision }] = useCreateRevisionMutation();
    const [updateRevision] = useUpdateRevisionMutation();

    // Get revision reason from fab_notes
    const fabNotes = (fabData as any)?.fab_notes || [];
    const revisionNote = fabNotes.find((note: any) => note.stage === 'sales_ct')?.note || '';

    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    }

    const handleEditRole = () => {
        setViewMode('edit');
    };

    const handleStartRevision = async () => {
        if (!id || !user || !revisionsData) return;

        try {
            const revisionsArray = Array.isArray(revisionsData) ? revisionsData : (revisionsData as any)?.data || [];
            const existingRevisions = Array.isArray(revisionsArray) ? revisionsArray : [];

            if (existingRevisions.length > 0) {
                // Find the earliest revision (lowest ID)
                const earliestRevision = existingRevisions.reduce((earliest: any, current: any) =>
                    current.id < earliest.id ? current : earliest,
                    existingRevisions[0]
                );

                // Only update if actual_start_date is not set
                if (!earliestRevision.actual_start_date) {
                    await updateRevision({
                        revision_id: earliestRevision.id,
                        data: { actual_start_date: new Date().toISOString().split('.')[0]}
                    }).unwrap();
                    toast.success("Revision started");
                }
            } else {
                // Create new revision with actual_start_date
                const createData: any = {
                    fab_id: Number(id),
                    revision_type: 'general',
                    requested_by: user.id || 1,
                    revision_notes: revisionNote.replace('[REVISION REQUEST] ', '') || '',
                    actual_start_date: new Date().toISOString().split('.')[0]
                };

                await createRevision(createData).unwrap();
                toast.success("New revision created and started");
            }
            // Move to edit mode after starting
            setViewMode('edit');
        } catch (error) {
            console.error('Failed to start revision:', error);
            toast.error("Failed to start revision");
        }
    };

    const handleSubmitDraft = async (submissionData: any) => {
        console.log('=== handleSubmitDraft called ===');

        if (!id || !user) {
            console.log('Missing id or user, returning early');
            toast.error("Missing required data");
            return;
        }

        // CRITICAL FIX: Check if revisionsData is loaded and has data
        if (isRevisionsLoading) {
            toast.error("Please wait, revisions data is still loading");
            return;
        }

        try {
            let revisionId;

            // Check revisionsData structure - it might be { data: [...] } or directly an array
            const revisionsArray = Array.isArray(revisionsData) ? revisionsData : (revisionsData as any)?.data || [];
            console.log('Fetched revisions:', revisionsArray);

            // Get the earliest revision if any exist
            const existingRevisions = Array.isArray(revisionsArray) ? revisionsArray : [];
            const hasExistingRevisions = existingRevisions.length > 0;

            if (hasExistingRevisions) {
                // Find the earliest revision (lowest ID)
                const earliestRevision = existingRevisions.reduce((earliest: any, current: any) =>
                    current.id < earliest.id ? current : earliest,
                    existingRevisions[0]
                );


                // Prepare update data
                const updateData: any = {
                    revision_type: submissionData.revisionType || '',
                    revision_notes: revisionNote.replace('[REVISION REQUEST] ', '') || ''
                };

                // Add completion status and actual_end_date if needed
                if (submissionData.complete) {
                    updateData.is_completed = true;
                    updateData.actual_end_date = new Date().toISOString().split('.')[0];
                }

                // Update the existing revision
                await updateRevision({
                    revision_id: earliestRevision.id,
                    data: updateData
                }).unwrap();

                revisionId = earliestRevision.id;
                console.log('Successfully updated revision');

            } else {
                // Only create if truly no revisions exist
                console.log('CREATING NEW REVISION - no existing revisions found');

                // Prepare creation data
                const createData: any = {
                    fab_id: Number(id),
                    revision_type: submissionData.revisionType || 'general',
                    requested_by: user.id || 1,
                    revision_notes: revisionNote.replace('[REVISION REQUEST] ', '') || ''
                };

                // Set as completed if needed
                if (submissionData.complete) {
                    createData.is_completed = true;
                    createData.actual_end_date = new Date().toISOString().split('.')[0];
                }

                const createResult = await createRevision(createData).unwrap();
                revisionId = createResult.id;
                console.log('Created new revision with ID:', revisionId);
            }

            toast.success("Revision submitted successfully");
            navigate('/job/revision');

            setShowSubmissionModal(false);
            setViewMode('activity');

        } catch (error) {
            console.error('Failed to submit revision:', error);
            toast.error("Failed to submit revision. Please try again.");
        }
    };

    const sidebarSections = [
        {
            title: "Job Details",
            type: "details",
            items: [
                { label: "Job Name", value: fabData?.job_details?.name || `Job ${fabData?.job_id}` },
                { label: "Job Number", value: fabData?.job_details?.job_number || String(fabData?.job_id) },
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
                    content: (draftData as any)?.draft_note || `Drafting in progress with ${(draftData as any)?.no_of_piece_drafted || 0} pieces, ${(draftData as any)?.total_sqft_drafted || 0} sq ft`,
                    author: draftData?.drafter_name || 'Unknown Drafter',
                    timestamp: draftData?.updated_at ? new Date(draftData.updated_at).toLocaleDateString() : 'N/A',
                }
            ] : [], // Empty array if no draft data
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

    // Handle loading and error states AFTER all hooks are declared
    if (isFabLoading || isRevisionsLoading) {
        return <div>Loading...</div>;
    }

    if (isFabError) {
        return <div>Error loading data</div>;
    }

    // Early return if no data
    if (!fabData) {
        return <div>No data available</div>;
    }

    return (
        <>
            <Container className='lg:mx-0'>
                <Toolbar className=' '>
                    <ToolbarHeading title={`FAB ID: ${fabData?.id || 'Loading...'}`} description="Update drafting activity" />
                    <ToolbarActions>
                        <BackButton fallbackUrl="/job/revision" />
                    </ToolbarActions>
                </Toolbar>
            </Container>
            <div className=" border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0  items-start lg:flex-shrink-0">
                <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px]" >
                    <GraySidebar
                        sections={sidebarSections as any}
                        jobId={fabData?.job_id}  // Add this prop
                    />
                </div>
                <Container className="lg:col-span-9">
                    {/* Always render the RevisionForm but conditionally show/hide it */}
                    <div className={viewMode === 'edit' ? 'block' : 'hidden'}>
                        <RevisionForm
                            onSubmit={handleSubmitDraft}
                            onClose={() => setViewMode('activity')}
                            revisionReason={revisionNote.replace('[REVISION REQUEST] ', '')}
                            draftingData={draftData}
                        />
                    </div>

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
                    ) : viewMode !== 'edit' && (
                        <>
                            <Card className='my-4'>
                                <CardHeader >
                                    <CardHeading className='flex flex-col items-start py-4'>
                                        <CardTitle className='text-[#FF8D28] leading-[32px]'>Revision reason</CardTitle>
                                        <p className="text-sm text-[#4B5563]">
                                            {revisionNote.replace('[REVISION REQUEST] ', '') || 'No revision reason provided'}
                                        </p>
                                    </CardHeading>

                                    <CardToolbar>
                                        <Can
                                            action="create"
                                            on="Revisions">
                                            <Button onClick={handleStartRevision}>
                                                {(() => {
                                                    const revisionsArray = Array.isArray(revisionsData) ? revisionsData : (revisionsData as any)?.data || [];
                                                    const existingRevisions = Array.isArray(revisionsArray) ? revisionsArray : [];
                                                    const latestRevision = existingRevisions.length > 0
                                                        ? existingRevisions.reduce((earliest: any, current: any) => current.id < earliest.id ? current : earliest, existingRevisions[0])
                                                        : null;

                                                    return latestRevision?.actual_start_date ? "Continue Revision" : "Start Revision";
                                                })()}
                                            </Button>
                                        </Can>
                                    </CardToolbar>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className='py-5 border-b'>
                                    {(() => {
                                        const revisionsArray = Array.isArray(revisionsData) ? revisionsData : (revisionsData as any)?.data || [];
                                        const existingRevisions = Array.isArray(revisionsArray) ? revisionsArray : [];
                                        const latestRevision = existingRevisions.length > 0
                                            ? existingRevisions.reduce((earliest: any, current: any) => current.id < earliest.id ? current : earliest, existingRevisions[0])
                                            : null;

                                        return (
                                            <TimeDisplay
                                        startTime={draftData?.drafter_start_date ? new Date(draftData.drafter_start_date) : undefined}
                                        endTime={draftData?.drafter_end_date ? new Date(draftData.drafter_end_date) : undefined}
                                                totalTime={draftData?.total_time_spent || 0}
                                            />
                                        );
                                    })()}
                                </CardHeader>
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
            </div>
        </>
    );
};

export { ReviewDetailsPage };