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

interface SchedulingNote {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
}

interface JobDetails {
  fabId: string;
  customer: string;
  jobNumber: string;
  area: string;
  fabType: string;
  slabSmithUsed: boolean;
}

const DrafterPage = () => {
  type ViewMode = 'activity' | 'file';
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('activity');
  const [activeFile, setActiveFile] = useState<any | null>(null);

  const jobDetails: JobDetails = {
    fabId: '44567',
    customer: 'Johnson Kitchen & Bath',
    jobNumber: '99999',
    area: '2847 Sq Ft',
    fabType: 'Standard',
    slabSmithUsed: false
  };

  const schedulingNotes: SchedulingNote[] = [
    {
      id: '1',
      author: 'Sarah Chen',
      avatar: 'S',
      content: 'Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      author: 'Mike Johnson',
      avatar: 'M',
      content: 'Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation',
      timestamp: '1 hour ago'
    }
  ];

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FAB ID: {jobDetails.fabId}</h1>
              <p className="text-sm text-gray-600 mt-1">Update drafting activity</p>
            </div>
           
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Job Details & Scheduling Notes */}
            <div className="w-80 border-r border-gray-200 p-6 overflow-y-auto bg-[#FAFAFA]">
            {/* Job Details */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Job Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Customer:</span>
                  <p className="text-gray-900">{jobDetails.customer}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Job #:</span>
                  <p className="text-gray-900">{jobDetails.jobNumber}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Area:</span>
                  <p className="text-gray-900">{jobDetails.area}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">FAB Type:</span>
                  <Badge variant="outline" className="ml-2">{jobDetails.fabType}</Badge>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Slab smith used?</span>
                  <Badge variant={jobDetails.slabSmithUsed ? "default" : "secondary"} className="ml-2">
                    {jobDetails.slabSmithUsed ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Drafting Notes */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Drafting notes</h3>
              <div className="space-y-4">
                {schedulingNotes.map((note) => (
                  <div key={note.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-gray-200">
                        {note.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 mb-1">{note.content}</p>
                      <p className="text-xs text-gray-500">{note.author} • {note.timestamp}</p>
                    </div>
                  </div>
                ))}
                
                {/* Final note */}
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-900 italic">
                    Square foot bigger than what was templated initially.
                  </p>
                </div>
              </div>
            </div>
          </div>

            {/* Right Column - Drafting Activity */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Drafting activity</CardTitle>
                  <p className="text-sm text-gray-600">Update your templating activity here</p>
                </CardHeader>
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
                      <FileUploadComponent
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
