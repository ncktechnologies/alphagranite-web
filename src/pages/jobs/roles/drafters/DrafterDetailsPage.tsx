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

  // Load fab & drafting data
  const { data: fabData, isLoading: isFabLoading, refetch: refetchFab } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const { data: draftingData, isLoading: isDraftingLoading, refetch: refetchDrafting } = useGetDraftingByFabIdQuery(fabId, { skip: !fabId });
  
  // Get current session state
  const { data: sessionData, isLoading: isSessionLoading, refetch: refetchSession } = useGetCurrentDraftingSessionQuery(fabId, { skip: !fabId });
  
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();
  const [deleteFileFromDrafting] = useDeleteFileFromDraftingMutation();
  const [manageDraftingSession, { isLoading: isManagingSession }] = useManageDraftingSessionMutation();

  // Use draft_data from FAB response for displaying existing files
  const draftData = fabData?.draft_data;

  // Local UI state
  const [totalTime, setTotalTime] = useState<number>(0);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  
  // Session status derived from sessionData
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'drafting' | 'paused' | 'on_hold' | 'ended'>('idle');
  const [sessionId, setSessionId] = useState<number | null>(null);

  // File state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFileMetas, setUploadedFileMetas] = useState<UploadedFileMeta[]>([]);
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // Initialize session state from server data
  useEffect(() => {
    if (sessionData && !isSessionLoading) {
      const session = sessionData?.data;
      if (session) {
        setSessionId(session.id);
        setSessionStatus(session.status || 'idle');
        
        if (session.total_time_spent) {
          setTotalTime(session.total_time_spent);
        }
        
        if (session.start_time) {
          setDraftStart(new Date(session.start_time));
        }
        
        if (session.end_time) {
          setDraftEnd(new Date(session.end_time));
        }
      } else {
        // No active session found
        setSessionStatus('idle');
        setSessionId(null);
        setTotalTime(0);
        setDraftStart(null);
        setDraftEnd(null);
      }
    }
  }, [sessionData, isSessionLoading]);

  // Helper functions to check session state
  const isDrafting = sessionStatus === 'drafting';
  const isPaused = sessionStatus === 'paused';
  const isOnHold = sessionStatus === 'on_hold';
  const hasEnded = sessionStatus === 'ended';

  // Tab closing warning - active when drafting but not paused or ended
  useTabClosingWarning({
    isActive: isDrafting && !isPaused,
    warningMessage: '⚠️ ACTIVE DRAFTING SESSION ⚠️\n\nYou have an active drafting session in progress. Closing this tab will pause your session and may result in lost work.\n\nPlease pause your session properly before leaving.',
    onBeforeUnload: async (event) => {
      // Auto-pause the session when tab is closing
      if (isDrafting && fabId && currentEmployeeId) {
        try {
          await manageDraftingSession({
            fab_id: fabId,
            data: {
              action: 'pause',
              drafter_id: currentEmployeeId,
              timestamp: new Date().toISOString(),
              total_time_spent: totalTime,
              note: 'Auto-paused due to tab closing'
            }
          }).unwrap();
          console.log('Auto-paused drafting session due to tab closing');
        } catch (error) {
          console.error('Failed to auto-pause session:', error);
        }
      }
    }
  });

  // Session management functions
  const createOrStartSession = async (action: 'start' | 'resume', startDate: Date, note?: string, sqftDrafted?: string) => {
    try {
      const response = await manageDraftingSession({
        fab_id: fabId,
        data: {
          action: action,
          drafter_id: currentEmployeeId,
          timestamp: startDate.toISOString(),
          total_time_spent: action === 'start' ? 0 : totalTime,
          note: note,
          sqft_drafted: sqftDrafted
        }
      }).unwrap();

      setSessionStatus('drafting');
      setDraftStart(startDate);
      setDraftEnd(null);
      
      if (response?.data?.id) {
        setSessionId(response.data.id);
      }
      
      await refetchSession();
      toast.success(`Session ${action === 'start' ? 'started' : 'resumed'} successfully`);
    } catch (error) {
      console.error(`Failed to ${action} session:`, error);
      toast.error(`Failed to ${action} session`);
      throw error;
    }
  };

  const updateSession = async (action: 'pause' | 'on_hold' | 'end', timestamp: Date, note?: string, sqftDrafted?: string) => {
    try {
      await manageDraftingSession({
        fab_id: fabId,
        data: {
          action: action,
          drafter_id: currentEmployeeId,
          timestamp: timestamp.toISOString(),
          total_time_spent: totalTime,
          note: note,
          sqft_drafted: sqftDrafted
        }
      }).unwrap();

      setSessionStatus(action === 'end' ? 'ended' : action === 'on_hold' ? 'on_hold' : 'paused');
      setDraftEnd(timestamp);
      
      await refetchSession();
      toast.success(`Session ${action}ed successfully`);
    } catch (error) {
      console.error(`Failed to ${action} session:`, error);
      toast.error(`Failed to ${action} session`);
      throw error;
    }
  };

  // Time tracking handlers
  const handleStart = async (startDate: Date, data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await createOrStartSession('start', startDate, data?.note, data?.sqft_drafted);
    } catch (error) {
      // Error handled in createOrStartSession
    }
  };

  const handlePause = async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await updateSession('pause', new Date(), data?.note, data?.sqft_drafted);
    } catch (error) {
      // Error handled in updateSession
    }
  };

  const handleResume = async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await createOrStartSession('resume', new Date(), data?.note, data?.sqft_drafted);
    } catch (error) {
      // Error handled in createOrStartSession
    }
  };

  const handleEnd = async (endDate: Date, data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await updateSession('end', endDate, data?.note, data?.sqft_drafted);
    } catch (error) {
      // Error handled in updateSession
    }
  };

  const handleOnHold = async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await updateSession('on_hold', new Date(), data?.note, data?.sqft_drafted);
    } catch (error) {
      // Error handled in updateSession
    }
  };

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

  // Determine if submission is allowed (after on hold OR after ending normally)
  const canOpenSubmit = (isOnHold || hasEnded) && totalTime > 0 && (pendingFiles.length > 0 || uploadedFileMetas.length > 0);

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
      setSessionStatus('idle');
      setSessionId(null);
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
      notes: getAllFabNotes(fabData?.fab_notes || []).map(note => {
        // Stage display mapping
        const stageConfig: Record<string, { label: string; color: string }> = {
          templating: { label: 'Templating', color: 'text-blue-700' },
          pre_draft_review: { label: 'Pre-Draft Review', color: 'text-indigo-700' },
          drafting: { label: 'Drafting', color: 'text-green-700' },
          sales_ct: { label: 'Sales CT', color: 'text-yellow-700' },
          slab_smith_request: { label: 'Slab Smith Request', color: 'text-red-700' },
          cut_list: { label: 'Final Programming', color: 'text-purple-700' },
          cutting: { label: 'Cutting', color: 'text-orange-700' },
          revisions: { label: 'Revisions', color: 'text-purple-700' },
          draft: { label: 'Draft', color: 'text-green-700' },
          general: { label: 'General', color: 'text-gray-700' }
        };

        const stage = note.stage || 'general';
        const config = stageConfig[stage] || stageConfig.general;

        return {
          id: note.id,
          avatar: note.created_by_name?.charAt(0).toUpperCase() || 'U',
          content: `<span class="inline-block px-2 py-1 rounded text-xs font-medium ${config.color} bg-gray-100 mr-2">${config.label}</span>${note.note}`,
          author: note.created_by_name || 'Unknown',
          timestamp: note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date'
        };
      })
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
                    onOnHold={handleOnHold}
                    onTimeUpdate={setTotalTime}
                    hasEnded={hasEnded}
                    pendingFilesCount={pendingFiles.length}
                    uploadedFilesCount={uploadedFileMetas.length}
                  />

                  <Separator className="my-3" />

                  {/* Only show upload if timer has started or there are uploaded files */}
                  {shouldShowUploadSection && (
                    <UploadDocuments
                      onFileClick={handleFileClick}
                      onFilesChange={handleFilesChange}
                      simulateUpload={false}
                      disabled={hasEnded || isOnHold}
                    />
                  )}
                  
                  {/* Show message when timer hasn't started yet */}
                  {!shouldShowFilesSection && !isDrafting && sessionStatus === 'idle' && (
                    <div className="text-center py-4 text-muted-foreground">
                      Start the timer to enable file uploads
                    </div>
                  )}

                  {/* Submit Button - show after on hold OR after ending normally */}
                  {viewMode === 'activity' && (isOnHold || hasEnded) && (
                    <div className="flex justify-end">
                      <Can action="update" on="Drafting">
                        <Button
                          onClick={handleOpenSubmissionModal}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={!canOpenSubmit || isUploadingDocuments}
                        >
                          {isUploadingDocuments ? 'Uploading...' : 'Submit draft'}
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