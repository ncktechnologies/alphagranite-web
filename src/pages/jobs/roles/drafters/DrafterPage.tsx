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



const DrafterPage = () => {
  type ViewMode = 'activity' | 'file';
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('activity');
  const [activeFile, setActiveFile] = useState<any | null>(null);

 

  const handleStartDrafting = () => {
    setIsDrafting(true);
    setIsPaused(false);
  };

  const handlePauseDrafting = () => {
    setIsPaused(true);
  };

  const handleResumeDrafting = () => {
    setIsPaused(false);
  };

  const handleEndDrafting = () => {
    setShowSubmissionModal(true);
  };

  const handleFileUpload = (files: any[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleSubmitDraft = (submissionData: any) => {
    console.log('Draft submitted:', submissionData);
    setShowSubmissionModal(false);
    setIsDrafting(false);
    setIsPaused(false);
    setTotalTime(0);
    setUploadedFiles([]);
  };

  return (
    <div className="relative">
      {/* <Container> */}
        <div className="py-6">
          {/* Header */}
          <div className="mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FAB ID: {jobDetails.fabId}</h1>
              <p className="text-sm text-gray-600 mt-1">Update drafting activity</p>
            </div>
           
        

        

            {/* Right Column - Drafting Activity */}
            <div className="lg:col-span-2">
               <Card className='my-4'>
                        <CardHeader className='flex flex-col items-start py-4'>
                            <CardTitle>Drafting activity</CardTitle>
                            <p className="text-sm text-[#4B5563]">
                                Update your templating activity here
                            </p>
                        </CardHeader>

                    </Card>
              <Card>
                {/* <CardHeader>
                  <CardTitle>Drafting activity</CardTitle>
                  <p className="text-sm text-gray-600">Update your templating activity here</p>
                </CardHeader> */}
                <CardContent className="space-y-6">
                  {viewMode === 'file' && activeFile ? (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setViewMode('activity'); setActiveFile(null); }}>
                          Close file
                        </Button>
                      </div>
                      <FileViewer
                        inline
                        file={activeFile}
                        jobDetails={jobDetails}
                        schedulingNotes={schedulingNotes}
                        onClose={() => { setViewMode('activity'); setActiveFile(null); }}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Time Tracking Component */}
                      <TimeTrackingComponent
                        isDrafting={isDrafting}
                        isPaused={isPaused}
                        totalTime={totalTime}
                        onStart={handleStartDrafting}
                        onPause={handlePauseDrafting}
                        onResume={handleResumeDrafting}
                        onEnd={handleEndDrafting}
                        onTimeUpdate={setTotalTime}
                      />

                      {/* File Upload Component */}
                      {/* <FileUploadComponent
                        uploadedFiles={uploadedFiles}
                        onFileUpload={handleFileUpload}
                        onRemoveFile={(index) => {
                          setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                        }}
                        jobDetails={jobDetails}
                        schedulingNotes={schedulingNotes}
                        // When opening a file, switch view to file mode
                        // @ts-ignore - extend prop inline without changing child signature
                        onOpenFile={(file: any) => { setActiveFile(file); setViewMode('file'); }}
                      /> */}
                      <UploadDocuments
                        onOpenFile={(file: any) => { setActiveFile(file); setViewMode('file'); }}
                      
                      />
                    </>
                  )}

                  {/* Submit Button */}
                  {viewMode === 'activity' && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleEndDrafting}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!isDrafting && totalTime === 0}
                    >
                      Submit draft
                    </Button>
                  </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

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
      {/* </Container> */}
    </div>
  );
};

export { DrafterPage };
