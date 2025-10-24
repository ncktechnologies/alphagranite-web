import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubmissionModal } from './components/SubmissionModal';
import { X } from 'lucide-react';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Separator } from '@/components/ui/separator';
import GraySidebar from '../jobs/components/job-details.tsx/GraySidebar';
import { jobDetails } from '../jobs/components/job';
import { jobInfo } from '../jobs/roles/templating-coordinator/components/details';
import { Documents } from './components/files';
import { FileViewer } from '../jobs/roles/drafters/components';

const ShopDetailsPage = () => {
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
                    <GraySidebar sections={sidebarSections as any} />

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
                            <div className='py-6'>
                                <div className='text-black py-5'>
                                    <p className="font-bold text-base">FAB-2024-001</p>
                                    <p className='text-sm'>Conference Table - Quartz</p>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 space-y-6 ">
                                    {jobInfo.map((item, index) => (
                                        <div key={index}>
                                            <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                                                {item.label}
                                            </p>
                                            <p className="font-semibold text-text text-base leading-[28px] ">{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />


                            <Card>
                                <CardContent className="">
                                    <h2 className='font-semibold'>Uploaded files</h2>
                                    <Documents
                                        onFileClick={handleFileClick}
                                    />
                                </CardContent>
                            </Card>
                            <Separator className='my-6'/>
                            <div className="flex justify-end mb-10">
                                <Button
                                    onClick={() => setShowSubmissionModal(true)}
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={isDrafting || totalTime === 0}
                                    size="lg"
                                >
                                    Schedule for cutting
                                </Button>
                            </div>
                        </>
                    )}
                </Container>

                {/* Submission Modal */}
                {showSubmissionModal && (
                    <SubmissionModal
                        jobDetails={jobDetails}
                        totalTime={totalTime}
                        uploadedFiles={uploadedFiles}
                        onClose={() => setShowSubmissionModal(false)}
                        onSubmit={handleSubmitDraft}
                    />
                )}
            </div>
        </>
    );
};

export { ShopDetailsPage };