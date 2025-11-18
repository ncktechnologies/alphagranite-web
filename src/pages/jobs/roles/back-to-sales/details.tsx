import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Separator } from '@/components/ui/separator';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { FileViewer } from '../drafters/components';
// import { jobInfo } from '../templating-coordinator/components/details';
import { Documents } from '@/pages/shop/components/files';
import { RevisionModal } from './components/SubmissionModal';
import { TimeDisplay } from './components/DisplayTime';
const DraftReviewDetailsPage = () => {
    type ViewMode = 'activity' | 'file';
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [totalTime, setTotalTime] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState<any[]>(["300-2.png"]);
    const [viewMode, setViewMode] = useState<ViewMode>('activity');
    const [activeFile, setActiveFile] = useState<any | null>(null);
    const [hasEnded, setHasEnded] = useState(false);
    const [resetTimeTracking, setResetTimeTracking] = useState(0);

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
                    {/* <ToolbarHeading title="FAB ID: 4456" description="Update templating activity" /> */}
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
                                            Update your templating activity here
                                        </p>
                                    </CardHeading>
                                    <CardToolbar>
                                        <Button>Mark as Complete</Button>
                                        <Button variant="outline" onClick={() => setShowSubmissionModal(true)}>Create Revision</Button>
                                    </CardToolbar>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardHeader className='py-5 border-b'>
                                    <TimeDisplay
                                        startTime={new Date('2025-10-20T09:00:00')}
                                        endTime={new Date('2025-10-20T12:30:00')}
                                        totalTime={3 * 3600 + 30 * 60} // 3 hours 30 minutes
                                    />

                                </CardHeader>
                                <CardContent className="">
                                    <h2 className='font-semibold text-sm py-3'>Uploaded files</h2>
                                    <Documents
                                        onFileClick={handleFileClick}
                                    />
                                </CardContent>
                            </Card>
                            {/* <Separator className='my-6' />
                            <div className="flex justify-end mb-10">
                                <Button
                                    onClick={() => setShowSubmissionModal(true)}
                                    className="bg-green-600 hover:bg-green-700"
                                    // disabled={}
                                    size="lg"
                                >
                                    Schedule for cutting
                                </Button>
                            </div> */}
                        </>
                    )}
                </Container>

                {/* Submission Modal */}
                {showSubmissionModal && (
                    <RevisionModal
                        open={showSubmissionModal}
                        onClose={() => setShowSubmissionModal(false)}
                        onSubmit={handleSubmitDraft}
                        fabId='FAB-2024-0845'
                        fabType='Standard'
                        jobNumber='99999'
                        totalSqFt={17.1}
                        pieces={5}
                        salesPerson='Mike Rodriguez'
                    />
                )}
            </div>
        </>
    );
};

export { DraftReviewDetailsPage };