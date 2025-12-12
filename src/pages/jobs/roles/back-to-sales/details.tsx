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
import { RevisionModal } from './components/SubmissionModal';
import { MarkAsCompleteModal } from './components/MarkAsCompleteModal'; // Import the new modal
import { TimeDisplay } from './components/DisplayTime';
import { useSCTService } from './components/SCTService'; // Import our SCT service
import { useParams, useNavigate } from 'react-router-dom';
import { useGetFabByIdQuery } from '@/store/api/job'; // Remove unused drafting query
import { toast } from 'sonner';
import { useAuth } from '@/auth/context/auth-context'; // Import auth context to get current user
import { Can } from '@/components/permission'; // Import Can component for permissions

const DraftReviewDetailsPage = () => {
    type ViewMode = 'activity' | 'file';
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [showMarkAsCompleteModal, setShowMarkAsCompleteModal] = useState(false); // Add this state
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
    const authContext = useAuth(); // Get auth context
    const user = authContext.user; // Extract user from auth context
    
    // Fetch FAB data
    const { data: fabData, isLoading: isFabLoading, isError: isFabError } = useGetFabByIdQuery(Number(id), { skip: !id });
    
    // Remove unused drafting data query since we're using data from FAB response
    // const { data: draftingData, isLoading: isDraftingLoading, isError: isDraftingError } = useGetDraftingByFabIdQuery(Number(id), { skip: !id });
    
    // Use our SCT service
    const {
      sctData,
      isSctLoading,
      isSctError,
      creationFailed,
      handleUpdateSCTReview,
      refetchSCT
    } = useSCTService({ fabId: Number(id) });
    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    }

    const handleSubmitDraft = (submissionData: any) => {
        setShowSubmissionModal(false);
        setIsDrafting(false);
        setIsPaused(false);
        setTotalTime(0);
        setUploadedFiles([]);
        setHasEnded(false)
        setResetTimeTracking(prev => prev + 1);
    };

    // Handle marking as complete
    const handleMarkAsComplete = (data: any) => {
        if (!id) return;
        
        try {
            // Send the actual payload with all fields from the modal
            handleUpdateSCTReview({
                sct_completed: data.sctCompleted,
                revenue: parseFloat(data.revenue) || 0,
                slab_smith_used: data.slabSmithUsed || false,
                notes: data.notes || ""
            });
            
            toast.success("FAB marked as complete successfully");
            setShowMarkAsCompleteModal(false); // Close the modal
            // Navigate to next stage or back to sales list
            navigate('/job/draft-review');
        } catch (error) {
            console.error('Failed to mark as complete:', error);
            toast.error("Failed to mark FAB as complete");
        }
    };

    if (isFabLoading) {
        return <div>Loading...</div>;
    }

    if (isFabError) {
        return <div>Error loading data</div>;
    }

    // Get current user's name for sales person field
    const currentUserName = user 
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown User'
        : 'Unknown User';

    // Get sales person info from FAB data
    const fabSalesPerson = ` ${fabData?.sales_person_name
         || 'N/A'}`;

    // Use draft_data from FAB response (type assertion since it's not in the interface but exists in the response)
    const draftData = (fabData as any)?.draft_data;

    // Create dynamic sidebar sections with actual FAB data
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
            sectionTitle: "Drafting Notes",
            type: "notes",
            // Use actual drafting notes from FAB response
            notes: draftData ? [
                {
                    id: 1,
                    avatar: draftData?.drafter_name?.substring(0, 2).toUpperCase() || 'DR',
                    content: draftData?.draft_note || `Drafting completed with ${draftData?.no_of_piece_drafted || 0} pieces, ${draftData?.total_sqft_drafted || 0} sq ft`,
                    author: draftData?.drafter_name || 'Unknown Drafter',
                    timestamp: draftData?.updated_at ? new Date(draftData.updated_at).toLocaleDateString() : 'N/A',
                }
            ] : [], // Empty array if no draft data
        },
    ];
    return (
        <>
            <Container className='lg:mx-0'>
                <Toolbar className=' '>
                    <ToolbarHeading title={`FAB ID: ${fabData?.id || 'Loading...'}`} description="Review drafting activity" />
                </Toolbar>
            </Container>
            <div className=" border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0  items-start lg:flex-shrink-0">
                <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px]" >
                    <GraySidebar sections={sidebarSections as any} className='' />
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
                                <CardHeader >
                                    <CardHeading className='flex flex-col items-start py-4'>
                                        <CardTitle>Drafting activity</CardTitle>
                                        <p className="text-sm text-[#4B5563]">
                                            Review drafting work and mark as complete or create revision
                                        </p>
                                    </CardHeading>
                                    <CardToolbar>
                                        <Can action="update" on="SCT">
                                            <Button onClick={() => setShowMarkAsCompleteModal(true)}>Mark as Complete</Button>
                                        </Can>
                                        <Can action="update" on="SCT">
                                            <Button variant="outline" onClick={() => setShowSubmissionModal(true)}>Create Revision</Button>
                                        </Can>
                                    </CardToolbar>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className='py-5 border-b'>
                                    <TimeDisplay
                                        startTime={draftData?.drafter_start_date ? new Date(draftData.drafter_start_date) : undefined}
                                        endTime={draftData?.drafter_end_date ? new Date(draftData.drafter_end_date) : undefined}
                                        totalTime={draftData?.total_hours_drafted || 0}
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
                        pieces={draftData?.no_of_piece_drafted || 0} // Use real data from draft_data
                        sctId={sctData?.data?.id} // Pass SCT ID for revision update
                        // Pass sales person from FAB data
                        fabSalesPerson={fabSalesPerson}
                    />
                )}
                
                {/* Mark as Complete Modal */}
                <MarkAsCompleteModal
                    open={showMarkAsCompleteModal}
                    onClose={() => setShowMarkAsCompleteModal(false)}
                    onSubmit={handleMarkAsComplete}
                />
            </div>
        </>
    );
};

export { DraftReviewDetailsPage };