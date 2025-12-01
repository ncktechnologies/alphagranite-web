import { useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
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
    console.log('Create revision hook:', { createRevision, isCreatingRevision });

    // Get revision reason from fab_notes
    const fabNotes = (fabData as any)?.fab_notes || [];
    const revisionNote = fabNotes.find((note: any) => note.stage === 'sales_ct')?.note || '';
    console.log('Revision note:', revisionNote);

    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    }

    const handleEditRole = () => {
        setViewMode('edit');
    };

    const handleSubmitDraft = async (submissionData: any) => {
        console.log('=== handleSubmitDraft called ===');
        console.log('Parent component received submission data:', submissionData);
        console.log('ID:', id);
        console.log('User:', user);
        console.log('Existing revisions:', revisionsData);
        console.log('Number of existing revisions:', revisionsData?.data?.length);

        if (!id || !user) {
            console.log('Missing id or user, returning early');
            return;
        }

        // Always use update endpoint if there are existing revisions
        // Only create new revision if there are no existing revisions
        try {
            let revisionId;
            
            // Check if there's an existing revision for this FAB
            // revisionsData is an object with a 'data' array property
            const revisionsArray = revisionsData?.data;
            const hasExistingRevisions = Array.isArray(revisionsArray) && revisionsArray.length > 0;
            console.log('Has existing revisions:', hasExistingRevisions);
            console.log('Revisions array:', revisionsArray);
            
            if (hasExistingRevisions) {
                // Use the earliest revision (lowest ID) according to project specification
                const existingRevision = revisionsArray.reduce((earliest, current) => 
                    (current.id < earliest.id) ? current : earliest, revisionsArray[0]
                );
                
                console.log('UPDATING EXISTING REVISION:', existingRevision.id);
                console.log('Updating with data:', {
                    revision_type: submissionData.revisionType || 'general',
                    revision_notes: revisionNote.replace('[REVISION REQUEST] ', '') || ''
                });
                
                // ALWAYS UPDATE existing revision - never create new one
                const updateResult = await updateRevision({
                    revision_id: existingRevision.id,
                    data: {
                        revision_type: submissionData.revisionType || 'general',
                        revision_notes: revisionNote.replace('[REVISION REQUEST] ', '') || ''
                    }
                }).unwrap();
                
                revisionId = existingRevision.id;
                console.log('Revision updated successfully with result:', updateResult);
            } else {
                // ONLY create a new revision if there are NO existing revisions
                console.log('CREATING NEW REVISION - no existing revisions found');
                console.log('Creating with data:', {
                    fab_id: Number(id),
                    revision_type: submissionData.revisionType || 'general',
                    requested_by: user.id || 1,
                    revision_notes: revisionNote.replace('[REVISION REQUEST] ', '') || ''
                });

                const createResult = await createRevision({
                    fab_id: Number(id),
                    revision_type: submissionData.revisionType || 'general',
                    requested_by: user.id || 1, // Use user.id if available, fallback to 1
                    revision_notes: revisionNote.replace('[REVISION REQUEST] ', '') || ''
                }).unwrap();
                
                revisionId = createResult.id;
                console.log('Revision created successfully with result:', createResult);
            }
            
            // If the revision is marked as complete, update it
            if (submissionData.complete && revisionId) {
                console.log('UPDATING REVISION TO MARK AS COMPLETE, revisionId:', revisionId);
                await updateRevision({
                    revision_id: revisionId,
                    data: {
                        is_completed: true
                    }
                }).unwrap();
                console.log('Revision marked as complete');
            }

            toast.success("Revision submitted successfully");
            setShowSubmissionModal(false);
            setViewMode('activity');
        } catch (error) {
            console.error('Failed to submit revision:', error);
            toast.error("Failed to submit revision");
        }
    };

    const sidebarSections = [
        {
            title: "Job Details",
            type: "details",
            items: [
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
            title: "",
            sectionTitle: "Drafting notes",
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
                </Toolbar>
            </Container>
            <div className=" border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0  items-start lg:flex-shrink-0">
                <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px]" >
                    <GraySidebar sections={sidebarSections as any} className='' />
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
                                        <Button onClick={handleEditRole}>Start Revision</Button>
                                    </CardToolbar>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className='py-5 border-b'>
                                    <TimeDisplay
                                        startTime={draftData?.drafter_start_date ? new Date(draftData.drafter_start_date) : undefined}
                                        endTime={draftData?.drafter_end_date ? new Date(draftData.drafter_end_date) : undefined}
                                        totalTime={draftData?.total_time_spent || 0}
                                    />
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