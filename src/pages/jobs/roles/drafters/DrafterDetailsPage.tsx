import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { FileUploadComponent } from './components/FileUploadComponent';
import { FileViewer } from './components/FileViewer';
import { SubmissionModal } from './components/SubmissionModal';
import { jobDetails, schedulingNotes } from '../../components/job';
import { ImageInput } from '@/components/image-input';
import { UploadDocuments } from './components/fileUploads';
import { X } from 'lucide-react';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router';

const DrafterDetailsPage = () => {
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
   const navigate = useNavigate()
  const handleFilesChange = (files: any[]) => {
    setUploadedFiles(files);
  };

  const handleFileClick = (file: any) => {
    setActiveFile(file);
    setViewMode('file');
  };

  const handleStartDrafting = () => {
    setIsDrafting(true);
    setIsPaused(false);
    setHasEnded(false);

  };

  const handlePauseDrafting = () => {
    setIsPaused(true);
  };

  const handleResumeDrafting = () => {
    setIsPaused(false);
  };

  const handleEndDrafting = () => {
    setIsDrafting(false);
    setIsPaused(false);
    setHasEnded(true);

    // setShowSubmissionModal(true);
  };

  const handleSubmitDraft = (submissionData: any) => {
    console.log('Draft submitted:', submissionData);
    setShowSubmissionModal(false);
    setIsDrafting(false);
    setIsPaused(false);
    setTotalTime(0);
    setUploadedFiles([]);
    setHasEnded(false)
    setResetTimeTracking(prev => prev + 1);
    navigate('/job/draft-review')
  };




  const sidebarSections = [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "Customer", value: "Johnson Kitchen & Bath" },
        { label: "Area", value: "2847 Oak Street, Denver, CO" },
        { label: "Material", value: "Calacatta Gold Quartz - 3cm" },
        { label: "Scheduled Date", value: "03 Oct, 2025" },
        { label: "Assigned to", value: "Mike Rodriguez" },
      ],
    },
    {
      title: "Notes",
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
          <ToolbarHeading title="FAB ID: 4456" description="Update templating activity" />
        </Toolbar>
      </Container>
      <div className=" border-t grid grid-cols-1 lg:grid-cols-12 gap-3 ultra:gap-0  items-start lg:flex-shrink-0">
        <div className="lg:col-span-3 w-full lg:w-[200px]  2xl:w-[286px]  ultra:w-[500px]" >
          <GraySidebar sections={sidebarSections as any} />

        </div>
        <Container className="lg:col-span-9 px-0 mx-0">
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
                <CardHeader className='flex flex-col items-start py-4'>
                  <CardTitle>Drafting activity</CardTitle>
                  <p className="text-sm text-[#4B5563]">
                    Update your templating activity here
                  </p>
                </CardHeader>
              </Card>

              <Card>
                <CardContent className="">


                  {/* Time Tracking Component */}
                  <TimeTrackingComponent
                    key={resetTimeTracking}
                    isDrafting={isDrafting}
                    isPaused={isPaused}
                    totalTime={totalTime}
                    onStart={handleStartDrafting}
                    onPause={handlePauseDrafting}
                    onResume={handleResumeDrafting}
                    onEnd={handleEndDrafting}
                    onTimeUpdate={setTotalTime}
                    hasEnded={hasEnded}
                  />
                  <Separator className='my-3' />
                  {/* Upload Documents with file viewing support */}
                  <UploadDocuments
                    onFileClick={handleFileClick}
                    onFilesChange={handleFilesChange}
                  />



                  {/* Submit Button */}
                  {viewMode === 'activity' && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => setShowSubmissionModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isDrafting || totalTime === 0}
                      >
                        Submit draft
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
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

export { DrafterDetailsPage };