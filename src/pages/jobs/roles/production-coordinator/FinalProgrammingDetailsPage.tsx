// FinalProgrammingDetailsPage.tsx
import React, { useCallback, useState } from 'react';
import { Container } from '@/components/common/container';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { 
  useGetFabByIdQuery, 
  useGetFinalProgrammingSessionStatusQuery,
  useDeleteFileFromFinalProgrammingMutation,
  useUpdateFabMutation,
  useManageFinalProgrammingSessionMutation // Import the new mutation
} from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { UploadDocuments } from './components/fileUploads';
import { FileViewer } from './components/FileViewer';
import { SubmissionModal } from './components/SubmissionModal';
import { useSelector } from 'react-redux';
import { FileWithPreview } from '@/hooks/use-file-upload';
import { UploadedFileMeta } from '@/types/uploads';
import { X } from 'lucide-react';
import { Can } from '@/components/permission'; // Import Can component for permissions

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
  return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
  return fabNotes || [];
};

export function FinalProgrammingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? Number(id) : 0;
  const navigate = useNavigate();

  const currentUser = useSelector((s: any) => s.user.user);
  const currentEmployeeId = currentUser?.employee_id || currentUser?.id;

  // Load fab and final programming session status
  const { data: fabData, isLoading: isFabLoading, refetch: refetchFab } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const { data: fpSessionData, isLoading: isFPLoading, refetch: refetchFPSession } = useGetFinalProgrammingSessionStatusQuery(fabId, { skip: !fabId });
  
  // Mutations
  const [deleteFileFromFinalProgramming] = useDeleteFileFromFinalProgrammingMutation();
  const [updateFab] = useUpdateFabMutation();
  const [manageFinalProgrammingSession] = useManageFinalProgrammingSessionMutation(); // Add the new mutation

  // Local UI state
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [totalTime, setTotalTime] = useState<number>(0);

  // Start/end timestamps captured from child component
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // Simplified file state - track files that need to be uploaded
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFileMetas, setUploadedFileMetas] = useState<UploadedFileMeta[]>([]);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [activeFile, setActiveFile] = useState<any | null>(null);

  // Show upload section when timer is running OR when files have been uploaded (to maintain visibility after ending)
  const shouldShowUploadSection = isDrafting || uploadedFileMetas.length > 0;

  // Handle time tracking events
  const handleStart = useCallback(async (startTime: Date) => {
    // Create a new final programming session when starting
    if (fabId) {
      try {
        await manageFinalProgrammingSession({
          fab_id: fabId,
          data: {
            action: 'start',
            started_by: currentEmployeeId
          }
        }).unwrap();
        
        // Refresh session status after creating session
        await refetchFPSession();
        toast.success('Final programming session started');
      } catch (error) {
        console.error('Failed to start final programming session:', error);
        toast.error('Failed to start final programming session');
        return; // Don't proceed if session creation fails
      }
    }

    setIsDrafting(true);
    setIsPaused(false);
    setHasEnded(false);
    setDraftStart(startTime);
  }, [fabId, currentEmployeeId, manageFinalProgrammingSession, refetchFPSession]);

  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const handleEnd = useCallback((endTime: Date) => {
    setIsDrafting(false);
    setIsPaused(false);
    setHasEnded(true);
    setDraftEnd(endTime);
  }, []);

  // Handle files change - accumulate unique files only
  const handleFilesChange = useCallback(async (files: FileWithPreview[]) => {
    if (!files || files.length === 0) {
      return;
    }

    // Filter to only actual File objects
    const validFiles = files.filter((fileItem) => fileItem.file instanceof File);

    if (validFiles.length === 0) {
      console.log('No valid files to process');
      return;
    }

    // Extract the File objects
    const fileObjects = validFiles.map(f => f.file as File);

    // Filter out duplicates by file name
    const uniqueFileObjects = fileObjects.filter(
      newFile => !pendingFiles.some(existingFile => existingFile.name === newFile.name)
    );

    if (uniqueFileObjects.length === 0) {
      console.log('All selected files are already uploaded');
      return;
    }

    // ACCUMULATE only unique pending files
    setPendingFiles(prev => [...prev, ...uniqueFileObjects]);

    // Create file metas for display and accumulate them (only for unique files)
    const newFileMetas: UploadedFileMeta[] = uniqueFileObjects.map((file, index) => ({
      id: `pending-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setUploadedFileMetas(prev => [...prev, ...newFileMetas]);

    console.log('Added unique pending files:', uniqueFileObjects.length);
  }, [pendingFiles]);

  // Handle file clicks for viewing
  const handleFileClick = (file: any) => {
    setActiveFile(file);
    setViewMode('file');
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    if (!fpSessionData?.id) {
      toast.error('Final programming session not available');
      return;
    }

    try {
      await deleteFileFromFinalProgramming({
        fp_id: fpSessionData.id,
        file_id: fileId
      }).unwrap();

      toast.success('File deleted successfully');
      // Refetch to update the UI
      await refetchFab();
      await refetchFPSession();
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  // Handle submission modal
  const handleOpenSubmissionModal = () => {
    setShowSubmissionModal(true);
  };

  // Create sidebar sections with actual FAB data
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
      ],
    },
    {
      title: "",
      sectionTitle: "Final Programming notes",
      type: "notes",
      notes: fabData?.notes?.map((note: string, index: number) => ({
        id: index,
        avatar: "FP",
        content: note,
        author: "Final Programming",
        timestamp: "",
      })) || [],
    },
    {
      title: "FAB Notes",
      type: "notes",
      notes: getAllFabNotes(fabData?.fab_notes || []).map(note => ({
        id: note.id,
        avatar: note.created_by_name?.charAt(0).toUpperCase() || 'U',
        content: note.note,
        author: note.created_by_name || 'Unknown',
        timestamp: note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date'
      }))
    }
  ];

  if (isFabLoading || isFPLoading) {
    return <div>Loading...</div>;
  }

  if (viewMode === 'file' && activeFile) {
    return (
      <Container className="lg:mx-0">
        <div className="flex justify-end mb-4">
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
      </Container>
    );
  }

  return (
    <div className="border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0 items-start lg:flex-shrink-0">
      <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px]">
        <GraySidebar sections={sidebarSections as any} className='' />
      </div>
      
      <Container className="lg:col-span-9">
        <div className="pt-6">
          <div className="flex justify-between items-start">
            <div className="text-black">
              <p className="font-bold text-base">FAB-{fabData?.id || 'N/A'}</p>
              <p className="text-sm">{fabData?.job_details?.name || 'N/A'}</p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <Card>
          <CardHeader>
            <CardTitle>Final Programming Activity</CardTitle>
            <p className="text-sm text-[#4B5563]">Update your final programming activity here</p>
          </CardHeader>
          <CardContent>
            <TimeTrackingComponent
              isDrafting={isDrafting}
              isPaused={isPaused}
              totalTime={totalTime}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onEnd={handleEnd}
              onTimeUpdate={setTotalTime}
              hasEnded={hasEnded}
              pendingFilesCount={pendingFiles.length}
              uploadedFilesCount={uploadedFileMetas.length}
            />

            <Separator className="my-3" />

            {/* Only show upload if timer has started */}
            {shouldShowUploadSection && (
              <UploadDocuments
                onFileClick={handleFileClick}
                onFilesChange={handleFilesChange}
                simulateUpload={false}
                fpId={fpSessionData?.id}
                disabled={hasEnded}
              />
            )}
            {/* Show message when timer hasn't started yet */}
            {!shouldShowUploadSection && !isDrafting && (
              <div className="text-center py-4 text-muted-foreground">
                Start the timer to enable file uploads
              </div>
            )}

            {/* Submit Button with permission check */}
            <div className="flex justify-end mt-6">
              <Can action="update" on="Final Programming">
                <Button
                  onClick={handleOpenSubmissionModal}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                  disabled={isDrafting || totalTime === 0 || (pendingFiles.length === 0 && uploadedFileMetas.length === 0)}
                >
                  Submit Final Programming
                </Button>
              </Can>
            </div>
          </CardContent>
        </Card>

        <SubmissionModal
          open={showSubmissionModal}
          onClose={(success?: boolean) => {
            setShowSubmissionModal(false);
            if (success) {
              navigate('/job/final-programming');
            }
          }}
          drafting={fpSessionData}
          uploadedFiles={uploadedFileMetas.map(meta => ({ ...meta }))}
          draftStart={draftStart}
          draftEnd={draftEnd}
          totalTime={totalTime}
          fabId={fabId}
          userId={currentEmployeeId}
          fabData={fabData}
        />
      </Container>
    </div>
  );
}

export default FinalProgrammingDetailsPage;