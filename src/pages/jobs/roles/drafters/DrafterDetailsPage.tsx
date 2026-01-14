// DrafterDetailsPageRefactor.tsx - FIXED VERSION
import React, { useCallback, useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useGetFabByIdQuery, useGetDraftingByFabIdQuery, useAddFilesToDraftingMutation, useDeleteFileFromDraftingMutation, useManageDraftingSessionMutation, useGetCurrentDraftingSessionQuery } from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { UploadDocuments } from './components/fileUploads';
import { FileViewer } from './components/FileViewer';
import { SubmissionModal } from './components/SubmissionModal';
import { useSelector } from 'react-redux';
import { FileWithPreview } from '@/hooks/use-file-upload';
import { UploadedFileMeta } from '@/types/uploads';
import { X } from 'lucide-react';
import { Documents } from '@/pages/shop/components/files';
import { Can } from '@/components/permission';
import { useTabClosingWarning } from '@/hooks';

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
  return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
  return fabNotes || [];
};

export function DrafterDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? Number(id) : 0;
  const navigate = useNavigate();

  const currentUser = useSelector((s: any) => s.user.user);
  const currentEmployeeId = currentUser?.employee_id || currentUser?.id;

  // load fab & drafting data (draft_data is included in FAB response)
  const { data: fabData, isLoading: isFabLoading, refetch: refetchFab } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const { data: draftingData, isLoading: isDraftingLoading, refetch: refetchDrafting } = useGetDraftingByFabIdQuery(fabId, { skip: !fabId });
  // NEW: Get current session state
  const { data: sessionData, isLoading: isSessionLoading, refetch: refetchSession } = useGetCurrentDraftingSessionQuery(fabId, { skip: !fabId });
  
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();
  const [deleteFileFromDrafting] = useDeleteFileFromDraftingMutation();

  // Use draft_data from FAB response for displaying existing files
  const draftData = fabData?.draft_data;

  // local UI state
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false); // New state for on-hold status
  const [totalTime, setTotalTime] = useState<number>(0);

  // Session management
  const [manageDraftingSession] = useManageDraftingSessionMutation();

  // Tab closing warning - active when drafting but not paused or ended
  useTabClosingWarning({
    isActive: isDrafting && !isPaused && !hasEnded,
    warningMessage: '⚠️ ACTIVE DRAFTING SESSION ⚠️\n\nYou have an active drafting session in progress. Closing this tab will pause your session and may result in lost work.\n\nPlease pause your session properly before leaving.',
    onBeforeUnload: async (event) => {
      // Auto-pause the session when tab is closing
      if (isDrafting && !isPaused && !hasEnded && fabId && currentEmployeeId) {
        try {
          await manageDraftingSession({
            fab_id: fabId,
            data: {
              action: 'auto_pause',
              drafter_id: currentEmployeeId,
              timestamp: new Date().toISOString(),
              note: 'Auto-paused due to tab closing/browser navigation'
            }
          }).unwrap();
          console.log('Auto-paused drafting session due to tab closing');
        } catch (error) {
          console.error('Failed to auto-pause session:', error);
        }
      }
    }
  });

  // NEW: Effect to initialize state from session data
  useEffect(() => {
    if (sessionData && !isSessionLoading) {
      // Set UI state based on the current session status
      const status = sessionData?.data?.status;
      if (status === 'drafting') {
        setIsDrafting(true);
        setIsPaused(false);
        setHasEnded(false);
        setIsOnHold(false);
      } else if (status === 'paused') {
        setIsDrafting(true); // Still in a session, just paused
        setIsPaused(true);
        setHasEnded(false);
        setIsOnHold(false);
      } else if (status === 'on_hold') {
        setIsDrafting(false);
        setIsPaused(false);
        setHasEnded(true);
        setIsOnHold(true);
      }
      
      // Set time if available
      if (sessionData?.data?.total_time_spent) {
        setTotalTime(sessionData?.data?.total_time_spent);
      }
    }
  }, [sessionData, isSessionLoading]);

  // start/end timestamps captured from child component
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // Simplified file state - track files that need to be uploaded
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFileMetas, setUploadedFileMetas] = useState<UploadedFileMeta[]>([]);
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);

  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // Show files section if there are existing files OR if user has uploaded files
  const shouldShowFilesSection = (draftData && (draftData.files?.length ?? 0) > 0) || uploadedFileMetas.length > 0;
  // Show upload section when timer is running OR when files have been uploaded (to maintain visibility after ending)
  const shouldShowUploadSection = isDrafting || uploadedFileMetas.length > 0;

  // Handle files change - accumulate unique files only
  const handleFilesChange = useCallback(async (files: FileWithPreview[]) => {
    if (!files || files.length === 0) {
      return;
    }

    console.log('New files selected:', files);

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

  }, [pendingFiles]); // Dependencies include pendingFiles for duplicate checking

  // Upload files when needed (like when opening submission modal)
  const uploadPendingFiles = useCallback(async () => {
    if (pendingFiles.length === 0 || !draftingData?.id) {
      return [];
    }

    try {
      setIsUploadingDocuments(true);
      console.log('Uploading pending files:', pendingFiles);

      const response = await addFilesToDrafting({
        drafting_id: draftingData.id,
        files: pendingFiles
      }).unwrap();

      console.log('File upload response:', response);

      let uploadedIds: number[] = [];
      if (response?.data && Array.isArray(response.data)) {
        uploadedIds = response.data.map((file: any) => file.id);

        // Update file metas with real IDs
        const updatedMetas = response.data.map((fileData: any) => {
          // Find the corresponding pending file by name
          const pendingFile = pendingFiles.find(f => f.name === fileData.name);
          return {
            id: fileData.id,
            name: fileData.name || (pendingFile ? pendingFile.name : `File_${fileData.id}`),
            size: fileData.size || (pendingFile ? pendingFile.size : 0),
            type: fileData.type || (pendingFile ? pendingFile.type : 'application/octet-stream'),
          };
        });

        setUploadedFileMetas(updatedMetas);
      }

      // Clear pending files after successful upload
      setPendingFiles([]);
      return uploadedIds;

    } catch (error) {
      console.error('Failed to upload files:', error);
      toast.error('Failed to upload files');
      throw error;
    } finally {
      setIsUploadingDocuments(false);
    }
  }, [pendingFiles, draftingData, addFilesToDrafting]);

  const handleFileClick = (file: any) => {
    setActiveFile(file);
    setViewMode('file');
  };

  // Handle file deletion with permission check
  const handleDeleteFile = async (fileId: string) => {
    if (!draftData?.id) {
      toast.error('Drafting data not available');
      return;
    }

    try {
      await deleteFileFromDrafting({
        drafting_id: draftData.id,
        file_id: fileId
      }).unwrap();

      toast.success('File deleted successfully');
      // Refetch to update the UI
      await refetchFab();
      await refetchDrafting();
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  // Time tracking handlers
  const handleStart = (startDate: Date) => {
    setIsDrafting(true);
    setIsPaused(false);
    setHasEnded(false);
    setIsOnHold(false); // Reset on-hold when starting
    setDraftStart(startDate);
  };

  const handlePause = (data?: { note?: string; sqft_drafted?: string }) => {
    setIsPaused(true);
    // You can handle the square footage and notes here
    console.log('Paused with data:', data);
  };

  const handleResume = (data?: { note?: string; sqft_drafted?: string }) => {
    setIsPaused(false);
    // You can handle the square footage and notes here
    console.log('Resumed with data:', data);
  };

  const handleEnd = (endDate: Date) => {
    setIsDrafting(false);
    setIsPaused(false);
    setHasEnded(true);
    setDraftEnd(endDate);
  };

  // Updated onHold handler
  const handleOnHold = (data?: { note?: string; sqft_drafted?: string }) => {
    // Set the session as on hold
    setIsDrafting(false);
    setIsPaused(false);
    setIsOnHold(true); // Mark as on hold
    setHasEnded(true);
    setDraftEnd(new Date()); // Set end time when putting on hold
    // You can handle the square footage and notes here
    console.log('On hold with data:', data);
  };

  // Determine if submission is allowed (only after on hold)
  const canOpenSubmit = isOnHold && totalTime > 0 && (pendingFiles.length > 0 || uploadedFileMetas.length > 0);

  // Modified to handle file upload before showing modal
  const handleOpenSubmissionModal = async () => {
    try {
      // Upload any pending files first
      if (pendingFiles.length > 0) {
        await uploadPendingFiles();
      }
      setShowSubmissionModal(true);
    } catch (error) {
      console.error('Failed to prepare files for submission:', error);
      // Don't open modal if file upload fails
    }
  };

  const onSubmitModal = async (payload: any) => {
    try {
      await refetchDrafting();
      await refetchFab(); // Also refetch FAB data to get updated draft_data
      setShowSubmissionModal(false);
      setPendingFiles([]);
      setUploadedFileMetas([]);
      setTotalTime(0);
      setDraftStart(null);
      setDraftEnd(null);
      setIsOnHold(false); // Reset on-hold status after submission
      navigate('/job/draft');
    } catch (err) {
      console.error(err);
      toast.error('Failed to finalize submission flow');
    }
  };

  if (isFabLoading || isDraftingLoading || isSessionLoading) return <div>Loading...</div>;

  const sidebarSections = [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "Area", value: fabData?.input_area || "Loading..." },
        { label: "Material", value: `${fabData?.stone_type_name || ''} ${fabData?.stone_color_name || ''} - ${fabData?.stone_thickness_value || ''}` },
        { label: "FAB Type", value: fabData?.fab_type || "Loading..." },
        { label: "Assigned to", value: draftingData?.drafter_name || (currentEmployeeId ? "You (Self-assigned)" : "Loading...") },
      ],
    },
    {
      title: "Notes",
      type: "notes",
      notes: fabData?.notes?.map((note: string, index: number) => ({
        id: index,
        avatar: "N",
        content: note,
        author: "",
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

  // Prepare files for SubmissionModal
  const filesForSubmission = uploadedFileMetas.map(meta => {
    const file = pendingFiles.find(f => f.name === meta.name);
    return {
      id: meta.id,
      name: meta.name,
      url: meta.url,
      file: file || undefined
    };
  });

  return (
    <>
      <Container className='lg:mx-0'>
        <div className='py-4'>
          <h2 className='text-lg font-semibold'>FAB ID: {fabData?.id || 'Loading...'}</h2>
          <p className='text-sm text-muted-foreground'>Update drafting activity</p>
        </div>
      </Container>

      <div className=" border-t grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <div className="lg:col-span-3 w-full lg:w-[200px]  2xl:w-[286px]  ultra:w-[500px]" >
          <GraySidebar sections={sidebarSections as any} />
        </div>
        <Container className="lg:col-span-9 px-0 mx-0">
          {viewMode === 'file' && activeFile ? (
            <div>
              <div className="flex justify-end">
                <Button variant="inverse" size="sm" onClick={() => { setViewMode('activity'); setActiveFile(null); }}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <FileViewer file={activeFile} onClose={() => { setActiveFile(null); setViewMode('activity'); }} />
            </div>
          ) : (
            <>
              <Card className='my-4'>
                <CardHeader className='flex flex-col items-start py-4'>
                  <CardTitle>Drafting activity</CardTitle>
                  <p className="text-sm text-[#4B5563]">Update your drafting activity here</p>
                </CardHeader>
              </Card>


              <Card>
                <CardContent>
                  <TimeTrackingComponent
                    isDrafting={isDrafting}
                    isPaused={isPaused}
                    totalTime={totalTime}
                    onStart={handleStart}
                    onPause={handlePause}
                    onResume={handleResume}
                    onEnd={handleEnd}
                    onOnHold={handleOnHold} // Pass the new onHold handler
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
                      disabled={hasEnded}
                    />
                  )}
                  {/* Show message when timer hasn't started yet */}
                  {!shouldShowFilesSection && !isDrafting && (
                    <div className="text-center py-4 text-muted-foreground">
                      Start the timer to enable file uploads
                    </div>
                  )}
                  


                  {/* Submit Button - only show after on hold */}
                  {viewMode === 'activity' && isOnHold && (
                    <div className="flex justify-end">
                      <Can action="update" on="Drafting">
                        <Button
                          onClick={handleOpenSubmissionModal}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={!canOpenSubmit}
                        >
                          Submit draft
                        </Button>
                      </Can>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </Container>

        {showSubmissionModal && (
          <SubmissionModal
            open={showSubmissionModal}
            onClose={(success?: boolean) => {
              setShowSubmissionModal(false);
              if (success) onSubmitModal({});
            }}
            drafting={draftingData}
            uploadedFiles={filesForSubmission}
            draftStart={draftStart}
            draftEnd={draftEnd}
            totalTime={totalTime}
            fabId={fabId}
            userId={currentEmployeeId}
            fabData={fabData}
          />
        )}
      </div>
    </>
  );
}

export default DrafterDetailsPage;