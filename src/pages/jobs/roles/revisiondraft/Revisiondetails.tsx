'use client';

import { useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Separator } from '@/components/ui/separator';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { FileViewer, TimeTrackingComponent } from '../drafters/components';
import { RevisionForm } from './components/SubmissionModal';
import { TimeDisplay } from './components/DisplayTime';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    useGetFabByIdQuery,
    useGetRevisionsByFabIdQuery, // Add this import
    useCreateRevisionMutation,
    useUpdateRevisionMutation,
    useManageDraftingSessionMutation, // Add session management mutation
    useGetSalesCTByFabIdQuery, // Add SCT query import
    useGetDraftingSessionStatusQuery, // Add session status query
} from '@/store/api/job';
import { Documents } from '@/pages/shop/components/files';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { Can } from '@/components/permission';
import { BackButton } from '@/components/common/BackButton';
// import RevisionUploadFlow from './components/RevisionUploadFlow';

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
    return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
    return fabNotes || [];
};

const RevisionDetailsPage = () => {
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
    const [draftStart, setDraftStart] = useState<Date | null>(null);
    const [draftEnd, setDraftEnd] = useState<Date | null>(null);
    const [sessionStatus, setSessionStatus] = useState<'idle' | 'drafting' | 'paused' | 'on_hold' | 'ended'>('idle');
    const [sessionData, setSessionData] = useState<any>(null);
    const [isOnHold, setIsOnHold] = useState(false);

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const user = useSelector((s: any) => s.user.user);

    // Fetch FAB data
    const { data: fabData, isLoading: isFabLoading, isError: isFabError } = useGetFabByIdQuery(Number(id), { skip: !id });

    const { data: revisionsData, isLoading: isRevisionsLoading } = useGetRevisionsByFabIdQuery(Number(id), { skip: !id });

    // Fetch SCT data by FAB ID - this should contain sales_ct_data
    const { data: sctData, isLoading: isSctLoading } = useGetSalesCTByFabIdQuery(Number(id), { skip: !id });

    // Check if the main fabData has sales_ct_data embedded
    const salesCTData = (fabData as any)?.sales_ct_data || sctData;

    // Use draft_data from FAB response
    const draftData = (fabData as any)?.draft_data;

    // Separate files into SCT-related and draft-related
    const allFiles = draftData?.files || [];

    // Get SCT-specific files from salesCTData if available
    const sctSpecificFiles = salesCTData?.files || [];

    // If sales_ct_data has files, those are the SCT files
    const sctFiles = sctSpecificFiles.length > 0 ? sctSpecificFiles : [];
    // The remaining files are draft files
    const draftFiles = allFiles.filter((file: any) =>
        !sctSpecificFiles.some((sctFile: any) => sctFile.id === file.id)
    );

    // Get revision type from the revision note or default to general
    const revisionType = salesCTData?.revision_type?.toLowerCase().includes('cad') ? 'cad' :
        salesCTData?.revision_type?.toLowerCase().includes('client') ? 'client' :
            salesCTData?.revision_type?.toLowerCase().includes('sales') ? 'sales' :
                salesCTData?.revision_type?.toLowerCase().includes('template') ? 'template' : 'general';


    // SCT mutations - MUST be called unconditionally
    const [createRevision, { isLoading: isCreatingRevision }] = useCreateRevisionMutation();
    const [updateRevision] = useUpdateRevisionMutation();
    const [manageDraftingSession] = useManageDraftingSessionMutation();
    console.log('Create revision hook:', { createRevision, isCreatingRevision });

    // Fetch session status
    const { data: sessionStatusData, isLoading: isSessionLoading } = useGetDraftingSessionStatusQuery(Number(id), {
        skip: !id,
        pollingInterval: 5000 // Poll every 5 seconds to keep session state updated
    });

    // Initialize session state from backend data
    useEffect(() => {
        if (sessionStatusData && !isSessionLoading) {
            const session = sessionStatusData.data || sessionStatusData;
            console.log('Session data from backend:', session);

            if (session) {
                setSessionData(session);

                // Set session status based on backend data
                if (session.status === 'ended' || session.drafter_end_date) {
                    setSessionStatus('ended');
                    setHasEnded(true);
                    setIsDrafting(false);
                    setIsPaused(false);
                } else if (session.status === 'paused' || session.paused_times?.length > 0) {
                    setSessionStatus('paused');
                    setIsDrafting(false);
                    setIsPaused(true);
                } else if (session.status === 'drafting' || session.drafter_start_date) {
                    setSessionStatus('drafting');
                    setIsDrafting(true);
                    setIsPaused(false);
                }

                // Set start/end dates
                if (session.drafter_start_date) {
                    setDraftStart(new Date(session.drafter_start_date));
                }
                if (session.drafter_end_date) {
                    setDraftEnd(new Date(session.drafter_end_date));
                }

                // Calculate total time if available
                if (session.total_hours_drafted) {
                    setTotalTime(session.total_hours_drafted * 3600); // Convert hours to seconds
                }
            }
        }
    }, [sessionStatusData, isSessionLoading]);

    // Get revision reason from fab_notes
    const fabNotes = (fabData as any)?.fab_notes || [];
    const revisionNote = fabNotes.find((note: any) => note.stage === 'sales_ct')?.note || '';
    console.log('Revision note:', revisionNote);

    // Format timestamp helper
    const formatTimestamp = (date: Date) => {
        return date.toISOString().split('Z')[0];
    };

    // Session management functions with is_revision flag
    const createOrStartSession = async (action: 'start' | 'resume', startDate: Date, note?: string, sqftDrafted?: string) => {
        try {
            const fabId = Number(id);
            const userId = user?.id || user?.employee_id;

            await manageDraftingSession({
                fab_id: fabId,
                data: {
                    action: action,
                    drafter_id: userId,
                    timestamp: formatTimestamp(startDate),
                    note: note,
                    sqft_drafted: sqftDrafted,
                    is_revision: true, // Mark as revision session
                }
            }).unwrap();

            setSessionStatus('drafting');
            setDraftStart(startDate);
            setDraftEnd(null);
            toast.success(`Revision session ${action === 'start' ? 'started' : 'resumed'} successfully`);
        } catch (error) {
            console.error(`Failed to ${action} revision session:`, error);
            toast.error(`Failed to ${action} revision session`);
            throw error;
        }
    };

    const updateSession = async (action: 'pause' | 'on_hold' | 'end', timestamp: Date, note?: string, sqftDrafted?: string) => {
        try {
            const fabId = Number(id);
            const userId = user?.id || user?.employee_id;

            await manageDraftingSession({
                fab_id: fabId,
                data: {
                    action: action,
                    drafter_id: userId,
                    timestamp: formatTimestamp(timestamp),
                    note: note,
                    sqft_drafted: sqftDrafted,
                    is_revision: true, // Mark as revision session
                }
            }).unwrap();

            setSessionStatus(action === 'end' ? 'ended' : action === 'on_hold' ? 'on_hold' : 'paused');
            setDraftEnd(timestamp);
            toast.success(`Revision session ${action}ed successfully`);
        } catch (error) {
            console.error(`Failed to ${action} revision session:`, error);
            toast.error(`Failed to ${action} revision session`);
            throw error;
        }
    };

    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    }

    const handleEditRole = () => {
        setViewMode('edit');
    };

    // Time tracking handlers for revisions
    const handleStart = async (startDate: Date, data?: { note?: string; sqft_drafted?: string }) => {
        try {
            await createOrStartSession('start', startDate, data?.note, data?.sqft_drafted);
        } catch (error) {
            // Error handled in createOrStartSession
        }
    };

    const handlePause = async (data?: { note?: string; sqft_drafted?: string }) => {
        try {
            await updateSession('pause', new Date(), data?.note, data?.sqft_drafted);
        } catch (error) {
            // Error handled in updateSession
        }
    };

    const handleResume = async (data?: { note?: string; sqft_drafted?: string }) => {
        try {
            await createOrStartSession('resume', new Date(), data?.note, data?.sqft_drafted);
        } catch (error) {
            // Error handled in createOrStartSession
        }
    };

    const handleEnd = async (endDate: Date, data?: { note?: string; sqft_drafted?: string }) => {
        try {
            await updateSession('end', endDate, data?.note, data?.sqft_drafted);
            setShowSubmissionModal(true); // Open submission modal
        } catch (error) {
            // Error handled in updateSession
        }
    };

    const handleOnHold = async (data?: { note?: string; sqft_drafted?: string }) => {
        try {
            if (isDrafting) {
                await updateSession('pause', new Date(), 'Pausing session before placing on hold');
            }

            if (data?.note) {
                // Optional: Create FAB note with revisions stage
            }

            toast.success('Revision session placed on hold');
        } catch (error) {
            console.error('Failed to put on hold:', error);
            toast.error('Failed to put revision session on hold');
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
            console.log('Type:', typeof revisionsArray);
            console.log('Is array?', Array.isArray(revisionsArray));
            console.log('Length:', revisionsArray.length);

            // Get the earliest revision if any exist
            const existingRevisions = Array.isArray(revisionsArray) ? revisionsArray : [];
            const hasExistingRevisions = existingRevisions.length > 0;

            if (hasExistingRevisions) {
                // Find the earliest revision (lowest ID)
                const earliestRevision = existingRevisions.reduce((earliest, current) =>
                    current.id < earliest.id ? current : earliest,
                    existingRevisions[0]
                );

                console.log('UPDATING EXISTING REVISION ID:', earliestRevision.id);

                // Prepare update data
                const updateData: any = {
                    revision_type: salesCTData?.revision_type || '',
                    revision_notes: revisionNote.replace('[REVISION REQUEST] ', '') || ''
                };

                // Add completion status if needed
                if (submissionData.complete) {
                    updateData.is_completed = true;
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
                    revision_type: salesCTData?.revision_type || 'general',
                    requested_by: user.id || 1,
                    revision_notes: revisionNote.replace('[REVISION REQUEST] ', '') || ''
                };

                // Set as completed if needed
                if (submissionData.complete) {
                    createData.is_completed = true;
                }

                const createResult = await createRevision(createData).unwrap();
                revisionId = createResult.id;
                console.log('Created new revision with ID:', revisionId);
            }

            // Refresh the revisions data
            // You might want to trigger a refetch here
            // dispatch(api.endpoints.getRevisionsByFabId.initiate(Number(id), { forceRefetch: true })); // Uncomment if needed

            toast.success("Revision submitted successfully");
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
                    {/* Always render the RevisionForm but conditionally show/hide it - REMOVED INLINE FORM */}

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
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm text-[#4B5563]">
                                                {revisionNote.replace('[REVISION REQUEST] ', '') || 'No revision reason provided'}
                                            </p>
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {revisionType.toUpperCase()}
                                            </span>
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Revision Count #{salesCTData?.current_revision_count || 0}
                                            </span>
                                        </div>
                                    </CardHeading>

                                    <CardToolbar>
                                        <Button onClick={() => setViewMode(viewMode === 'file' ? 'activity' : 'file')}>
                                            {viewMode === 'file' ? 'Hide Files' : 'View Files'}
                                        </Button>
                                    </CardToolbar>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className='py-5 border-b'>
                                    <CardTitle>Revision activity</CardTitle>
                                    <p className="text-sm text-[#4B5563]">Track your revision time and upload files</p>
                                </CardHeader>
                                <CardContent>
                                    <TimeTrackingComponent
                                        isDrafting={isDrafting}
                                        isPaused={isPaused}
                                        totalTime={totalTime}
                                        draftStart={draftStart}
                                        draftEnd={draftEnd}
                                        sessionData={sessionData}
                                        isFabOnHold={isOnHold}
                                        onStart={handleStart}
                                        onPause={handlePause}
                                        onResume={handleResume}
                                        onEnd={handleEnd}
                                        onOnHold={handleOnHold}
                                        onTimeUpdate={setTotalTime}
                                        hasEnded={hasEnded}
                                        pendingFilesCount={0}
                                        uploadedFilesCount={uploadedFiles.length}
                                    />

                                    <Separator className="my-3" />

                                    <h2 className='font-semibold text-sm py-3'>Upload revised files</h2>
                                    {/* <RevisionUploadFlow
                                        onFileClick={handleFileClick}
                                        draftingData={draftData}
                                    /> */}

                                    {viewMode === 'file' && (
                                        <div className="mt-6 border-t pt-4">
                                            <h3 className="text-lg font-semibold mb-4">Project Files</h3>

                                            {/* Display SCT files first */}
                                            {sctFiles && sctFiles.length > 0 && (
                                                <>
                                                    <h2 className='font-semibold text-sm py-3 text-blue-600'>SCT Files</h2>
                                                    <Documents
                                                        onFileClick={handleFileClick}
                                                        draftingData={{
                                                            id: salesCTData?.id,
                                                            fab_id: salesCTData?.fab_id,
                                                            drafter_id: draftData?.drafter_id,
                                                            status_id: draftData?.status_id,
                                                            created_at: salesCTData?.created_at,
                                                            files: sctFiles
                                                        }}
                                                        currentStage="sct_uploads"
                                                    />
                                                </>
                                            )}

                                            <h2 className='font-semibold text-sm py-3 text-green-600'>Drafting Files</h2>
                                            <Documents
                                                onFileClick={handleFileClick}
                                                draftingData={{
                                                    ...draftData,
                                                    files: draftFiles
                                                }}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </Container>
            </div>
            {/* Submission Modal */}
            <Dialog open={showSubmissionModal} onOpenChange={setShowSubmissionModal}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Submit Revision</DialogTitle>
                    </DialogHeader>
                    <RevisionForm
                        onSubmit={handleSubmitDraft}
                        onClose={() => setShowSubmissionModal(false)}
                        revisionReason={revisionNote.replace('[REVISION REQUEST] ', '')}
                        draftingData={draftData}
                        isRevision={true} // Identify as revision
                    />
                </DialogContent>
            </Dialog>
        </>
    );
};

export { RevisionDetailsPage };
