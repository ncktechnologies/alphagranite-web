import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Separator } from '@/components/ui/separator';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { FileViewer } from '@/pages/jobs/roles/drafters/components';
import { Documents } from '../components/files';
import { ScheduleCuttingModal } from './components/SubmissionModal';
import { BackButton } from '@/components/common/BackButton';
// import { jobInfo } from '@/pages/jobs/roles/templating-coordinator/components/details';

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

const jobInfo = [
        { label: 'FAB ID', value: 'FAB-2024-001' },
        { label: 'FAB Type', value: 'FAB-toilet tiles' },
        { label: 'Account', value: 'FAB-2024-001' },
        { label: 'Job name', value: 'Johnson Kitchen Remodel' },
        { label: 'Job #', value: 'Fabrication' },
        { label: 'Area (s)', value: '2847 Oak Street, Denver, CO' },
        { label: 'Stone type', value: 'Marble tiles' },
        { label: 'Stone colour', value: 'Grey' },
        { label: 'Stone thickness', value: '20cm' },
        { label: 'Edge', value: 'Flat edge' },
        { label: 'Total square ft', value: '234 square ft' },
    ];
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
                    <ToolbarActions>
                        <BackButton fallbackUrl="/shop/cutting-plan" />
                    </ToolbarActions>
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
                            <div className='pt-6'>
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

                            <Separator className='my-3' />


                            <Card>
                                <CardContent className="">
                                    <h2 className='font-semibold text-sm py-3'>Uploaded files</h2>
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
                                    // disabled={}
                                    size="lg"
                                >
                                    Schedule for cutting
                                </Button>
                            </div>
                        </>
                    )}
                </Container>

                {/* Submission Modal */}
                {/* {showSubmissionModal && ( */}
                    <ScheduleCuttingModal
                        open={showSubmissionModal}
                        onClose={() => setShowSubmissionModal(false)}
                        onSubmit={handleSubmitDraft}
                    />
                {/* )} */}
            </div>
        </>
    );
};

export { ShopDetailsPage };