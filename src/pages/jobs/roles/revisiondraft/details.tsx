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
import { useGetFabByIdQuery, useGetDraftingByFabIdQuery, useSubmitDraftingForReviewMutation } from '@/store/api/job';
import { toast } from 'sonner';

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
    
    // Fetch FAB data
    const { data: fabData, isLoading: isFabLoading, isError: isFabError } = useGetFabByIdQuery(Number(id), { skip: !id });
    
    // Fetch drafting data
    const { data: draftingData, isLoading: isDraftingLoading, isError: isDraftingError } = useGetDraftingByFabIdQuery(Number(id), { skip: !id });
    
    // Submit drafting for review
    const [submitDraftingForReview, { isLoading: isSubmitting }] = useSubmitDraftingForReviewMutation();

    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    }

    const handleEditRole = () => {
        setViewMode('edit');
    };

    const handleSubmitDraft = async (submissionData: any) => {
        if (!id || !draftingData) return;
        
        try {
            // Prepare the data for submission
            const submitData = {
                drafting_id: draftingData.id,
                data: {
                    file_ids: submissionData.files?.map((file: any) => file.id).join(',') || '',
                    no_of_piece_drafted: submissionData.pieces || 0,
                    total_sqft_drafted: submissionData.totalSqFt || '0',
                    draft_note: submissionData.notes || '',
                    mentions: '',
                    is_completed: submissionData.complete || false
                }
            };
            
            await submitDraftingForReview(submitData).unwrap();
            toast.success("Draft submitted successfully");
            setShowSubmissionModal(false);
            setViewMode('activity');
        } catch (error) {
            console.error('Failed to submit draft:', error);
            toast.error("Failed to submit draft");
        }
    };

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
            notes: [
                {
                    id: 1,
                    avatar: "MR",
                    content: "Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation ",
                    author: "Mike Rodriguez",
                    timestamp: "Oct 3, 2025",
                },
                {
                    id: 2,
                    avatar: "MR",
                    content: "Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation ",
                    author: "Mike Rodriguez",
                    timestamp: "Oct 3, 2025",
                },
            ],
        },
    ];
    
    if (isFabLoading || isDraftingLoading) {
        return <div>Loading...</div>;
    }

    if (isFabError || isDraftingError) {
        return <div>Error loading data</div>;
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
                    {viewMode === 'edit' ? (
                        <RevisionForm onSubmit={handleSubmitDraft} />
                    ) : viewMode === 'file' && activeFile ? (
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
                                        <CardTitle className='text-[#FF8D28] leading-[32px]'>Revision reason</CardTitle>
                                        <p className="text-sm text-[#4B5563]">
                                            Increase the edge size on the kitchen island
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
            </div>
        </>
    );
};

export { ReviewDetailsPage };