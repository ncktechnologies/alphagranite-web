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
import { TimeDisplay } from './components/DisplayTime';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetFabByIdQuery, useGetDraftingByFabIdQuery, useGetSalesCTByFabIdQuery, useCreateSalesCTMutation, useUpdateSCTReviewMutation } from '@/store/api/job';
import { toast } from 'sonner';

const DraftReviewDetailsPage = () => {
    type ViewMode = 'activity' | 'file';
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
    
    // Fetch FAB data
    const { data: fabData, isLoading: isFabLoading, isError: isFabError } = useGetFabByIdQuery(Number(id), { skip: !id });
    
    // Fetch drafting data
    const { data: draftingData, isLoading: isDraftingLoading, isError: isDraftingError } = useGetDraftingByFabIdQuery(Number(id), { skip: !id });
    
    // Fetch or create SCT data
    const { data: sctData, isLoading: isSctLoading, isError: isSctError } = useGetSalesCTByFabIdQuery(Number(id), { skip: !id });
    const [createSalesCT] = useCreateSalesCTMutation();
    const [updateSCTReview] = useUpdateSCTReviewMutation();

    useEffect(() => {
        // If SCT doesn't exist, create it
        if (fabData && !sctData && !isSctLoading && !isSctError) {
            createSalesCT({
                fab_id: Number(id),
                notes: "Sales check created"
            });
        }
    }, [fabData, sctData, isSctLoading, isSctError, createSalesCT, id]);

    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    }

    const handleSubmitDraft = (submissionData: any) => {
        console.log('Draft submitted:', submissionData);
        setShowSubmissionModal(false);
        setIsDrafting(false);
        setIsPaused(false);
        setTotalTime(0);
        setUploadedFiles([]);
        setHasEnded(false)
        setResetTimeTracking(prev => prev + 1);
    };

    // Handle marking as complete
    const handleMarkAsComplete = async () => {
        if (!id) return;
        
        try {
            await updateSCTReview({
                fab_id: Number(id),
                data: {
                    sct_completed: true,
                    notes: "Sales check completed"
                }
            }).unwrap();
            
            toast.success("FAB marked as complete successfully");
            // Navigate to next stage or back to sales list
            navigate('/job/sales');
        } catch (error) {
            console.error('Failed to mark as complete:', error);
            toast.error("Failed to mark FAB as complete");
        }
    };

    if (isFabLoading || isDraftingLoading || isSctLoading) {
        return <div>Loading...</div>;
    }

    if (isFabError || isDraftingError || isSctError) {
        return <div>Error loading data</div>;
    }

    const sidebarSections = [
        {
            title: "Job Details",
            type: "details",
            items: [
                { label: "Slab smith used?", value: "No" },
            ],
        },
        {
            title: "",
            sectionTitle: "Drafting notes",
            type: "notes",
            // className: "",
            notes: [
                {
                    id: 1,
                    avatar: "MR",
                    content: "Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation ",
                    author: "Mike Rodriguez",
                    timestamp: "Oct 3, 2025",
                },
                {
                    id: 1,
                    avatar: "MR",
                    content: "Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation ",
                    author: "Mike Rodriguez",
                    timestamp: "Oct 3, 2025",
                },
            ],
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
                                        <Button onClick={handleMarkAsComplete}>Mark as Complete</Button>
                                        <Button variant="outline" onClick={() => setShowSubmissionModal(true)}>Create Revision</Button>
                                    </CardToolbar>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className='py-5 border-b'>
                                    <TimeDisplay
                                        startTime={draftingData?.drafter_start_date ? new Date(draftingData.drafter_start_date) : undefined}
                                        endTime={draftingData?.drafter_end_date ? new Date(draftingData.drafter_end_date) : undefined}
                                        totalTime={draftingData?.total_time_spent || 0}
                                    />
                                </CardHeader>
                                <CardContent className="">
                                    <h2 className='font-semibold text-sm py-3'>Uploaded files</h2>
                                    <Documents
                                        onFileClick={handleFileClick}
                                        draftingData={draftingData}
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
                        pieces={5} // This should come from drafting data
                        salesPerson="Mike Rodriguez" // This should come from user data
                        sctId={sctData?.id} // Pass SCT ID for revision update
                    />
                )}
            </div>
        </>
    );
};

export { DraftReviewDetailsPage };