// DrafterDetailsPageRefactor.tsx - FIXED VERSION
import { useCallback, useState, useEffect, useRef } from 'react';
import { Container } from '@/components/common/container';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useGetFabByIdQuery, useGetDraftingByFabIdQuery, useManageDraftingSessionMutation, useGetCurrentDraftingSessionQuery, useToggleFabOnHoldMutation, useCreateFabNoteMutation } from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { UploadDocuments } from './components/fileUploads';
import { FileViewer } from './components/FileViewer';
import { SubmissionModal } from './components/SubmissionModal';
import { useSelector } from 'react-redux';
import { FileWithPreview } from '@/hooks/use-file-upload';
import { UploadedFileMeta } from '@/types/uploads';
import { X } from 'lucide-react';
import { Can } from '@/components/permission';
import { useTabClosingWarning } from '@/hooks';
import { BackButton } from '@/components/common/BackButton';
import { getFileStage, getStageBadge, EnhancedFileMetadata } from '@/utils/file-labeling';

// Helper function to format timestamp without 'Z'
const formatTimestamp = (date: Date) => {
  return date.toISOString();
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
  return fabNotes || [];
};

// Helper function to get FAB status display
const getFabStatusInfo = (statusId: number | undefined) => {
  if (statusId === 0) {
    return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
  } else if (statusId === 1) {
    return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
  } else {
    return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
  }
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

  const [manageDraftingSession] = useManageDraftingSessionMutation();
  const [toggleFabOnHold] = useToggleFabOnHoldMutation();
  const [createFabNote] = useCreateFabNoteMutation();

  // Use draft_data from FAB response for displaying existing files
  const draftData = fabData?.draft_data;

  // Local UI state
  const [totalTime, setTotalTime] = useState<number>(0);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // Session status derived from sessionData
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'drafting' | 'paused' | 'on_hold' | 'ended'>('idle');

  // File state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFileMetas, setUploadedFileMetas] = useState<UploadedFileMeta[]>([]);
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // Track processed file names to prevent duplicates
  const processedFileNamesRef = useRef<Set<string>>(new Set());

  // Initialize session state from server data
  useEffect(() => {
    if (sessionData && !isSessionLoading) {
      const session = sessionData?.data;
      if (session) {
        setSessionStatus(session.status || 'idle');

        if (session.total_time_spent) {
          setTotalTime(session.total_time_spent);
        }

        // Map API field names to local state
        if (session.current_session_start_time) {
          setDraftStart(new Date(session.current_session_start_time));
        }

        if (session.last_action_time && (session.status === 'ended' || session.status === 'on_hold')) {
          setDraftEnd(new Date(session.last_action_time));
        } else {
          setDraftEnd(null); // Clear end time for active/paused sessions
        }
      } else {
        // No active session found
        setSessionStatus('idle');
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
    onBeforeUnload: async () => {
      // Auto-pause the session when tab is closing
      if (isDrafting && fabId && currentEmployeeId) {
        try {
          await manageDraftingSession({
            fab_id: fabId,
            data: {
              action: 'pause',
              drafter_id: currentEmployeeId,
              timestamp: formatTimestamp(new Date()),
              note: 'Auto-paused due to tab closing'
            }
          }).unwrap();
        } catch (error) {
          console.error('Failed to auto-pause session:', error);
        }
      }
    }
  });

  // Session management functions
  const createOrStartSession = async (action: 'start' | 'resume', startDate: Date, note?: string, sqftDrafted?: string) => {
    try {
      await manageDraftingSession({
        fab_id: fabId,
        data: {
          action: action,
          drafter_id: currentEmployeeId,
          timestamp: formatTimestamp(startDate),
          note: note,
          sqft_drafted: sqftDrafted
        }
      }).unwrap();

      setSessionStatus('drafting');
      setDraftStart(startDate);
      setDraftEnd(null);

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
          timestamp: formatTimestamp(timestamp),
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
    // Check if drafting exists before starting - check both drafting query and FAB data
    const hasDraftingAssignment = draftingData?.id || fabData?.draft_data?.id;

    console.log('Drafting assignment check:', {
      draftingDataId: draftingData?.id,
      fabDraftDataId: fabData?.draft_data?.id,
      hasAssignment: !!hasDraftingAssignment
    });

    if (!hasDraftingAssignment) {
      toast.error('Cannot start drafting session - no drafting assignment found');
      return;
    }

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

  const handleOnHold = async (data?: { note?: string }) => {
    try {
      // If there's an active session, pause it first
      if (isDrafting) {
        await updateSession('pause', new Date(), 'Pausing session before placing on hold');
      }

      // Toggle the FAB hold status
      const currentHoldStatus = fabData?.status_id === 0; // 0 = on hold
      await toggleFabOnHold({ fab_id: fabId, on_hold: !currentHoldStatus }).unwrap();

      // Create FAB note with drafting stage
      if (data?.note) {
        await createFabNote({
          fab_id: fabId,
          note: data.note,
          stage: 'drafting'
        }).unwrap();
      }

      toast.success(`FAB ${!currentHoldStatus ? 'placed on hold' : 'released from hold'} successfully`);
      await refetchFab();
      await refetchSession();
    } catch (error) {
      console.error('Failed to handle on hold:', error);
      toast.error('Failed to update hold status');
    }
  };

  // Show files section if there are existing files OR if user has uploaded files
  const shouldShowFilesSection = (draftData && (draftData.files?.length ?? 0) > 0) || uploadedFileMetas.length > 0;

  // Prepare enhanced file metadata for display
  const enhancedUploadedFiles = uploadedFileMetas.map(meta => {
    const file = pendingFiles.find(f => f.name === meta.name);
    const stage = getFileStage(meta.name, {
      currentStage: 'drafting',
      isDrafting: true
    });

    return {
      ...meta,
      size: file?.size || meta.size || 0,
      type: file?.type || meta.type || '',
      stage: stage,
      uploadedAt: new Date(),
      uploadedBy: currentUser?.name || 'Current User'
    };
  });

  // Show upload section when timer is running, paused, OR when files have been uploaded (to maintain visibility after ending)
  const shouldShowUploadSection = (isDrafting || isPaused) || uploadedFileMetas.length > 0;

  // Handle files change - accumulate unique files only
  const handleFilesChange = useCallback((files: FileWithPreview[]) => {
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

    // Use ref to track globally processed files across all calls
    const processedNames = processedFileNamesRef.current;

    // Filter out already processed files
    const uniqueFileObjects = fileObjects.filter(
      newFile => !processedNames.has(newFile.name)
    );

    if (uniqueFileObjects.length === 0) {
      console.log('All selected files have already been processed');
      return;
    }

    console.log('Processing unique files:', uniqueFileObjects.map(f => f.name));

    // Mark these files as processed
    uniqueFileObjects.forEach(file => processedNames.add(file.name));

    // ACCUMULATE only unique pending files
    setPendingFiles(prev => {
      // Double-check against current pending files
      const currentNames = new Set(prev.map(file => file.name));
      const trulyUniqueFiles = uniqueFileObjects.filter(file => !currentNames.has(file.name));

      if (trulyUniqueFiles.length === 0) return prev;

      console.log('Actually adding files:', trulyUniqueFiles.map(f => f.name));
      return [...prev, ...trulyUniqueFiles];
    });

    // Create file metas for display and accumulate them (only for unique files)
    const newFileMetas: UploadedFileMeta[] = uniqueFileObjects.map((file, index) => ({
      id: `pending-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setUploadedFileMetas(prev => [...prev, ...newFileMetas]);

    console.log('Added unique pending files:', uniqueFileObjects.length);

  }, []); // Remove pendingFiles dependency to prevent recreation

  // File upload now handled only in submission modal

  const handleFileClick = (file: any) => {
    // Enhance file with stage information before viewing
    const enhancedFile = {
      ...file,
      stage: getFileStage(file.name, { isDrafting: true })
    };

    setActiveFile(enhancedFile);
    setViewMode('file');
    console.log('File clicked:', enhancedFile);
  };



  // Determine if submission is allowed (after on hold OR after ending normally)
  const canOpenSubmit = totalTime > 0 && (pendingFiles.length > 0 || uploadedFileMetas.length > 0);

  // Open submission modal directly (file upload happens in modal)
  const handleOpenSubmissionModal = async () => {
    setShowSubmissionModal(true);
  };

  const onSubmitModal = async () => {
    try {
      // Files are already uploaded in the submission modal
      await refetchDrafting();
      await refetchFab(); // Also refetch FAB data to get updated draft_data

      setShowSubmissionModal(false);
      // Clear all local state after successful submission
      setPendingFiles([]);
      setUploadedFileMetas([]);
      setTotalTime(0);
      setDraftStart(null);
      setDraftEnd(null);
      setSessionStatus('idle');

      // Clear processed file names to allow re-uploading same files in future
      processedFileNamesRef.current.clear();

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
        { label: "Job Name", value: fabData?.job_details?.name || `Job ${fabData?.job_id}` },
        { label: "Job Number", value: fabData?.job_details?.job_number || String(fabData?.job_id) },
        { label: "Area", value: fabData?.input_area || "Loading..." },
        { label: "Material", value: `${fabData?.stone_type_name || ''} ${fabData?.stone_color_name || ''} - ${fabData?.stone_thickness_value || ''}` },
        { label: "FAB Type", value: fabData?.fab_type || "Loading..." },
        { label: "Assigned to", value: draftingData?.drafter_name || 'Unassigned' },
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

  // Prepare enhanced files with stage information for SubmissionModal
  const filesForSubmission: EnhancedFileMetadata[] = uploadedFileMetas.map(meta => {
    const file = pendingFiles.find(f => f.name === meta.name);
    const stage = getFileStage(meta.name, {
      currentStage: 'drafting',
      isDrafting: true
    });

    return {
      id: meta.id,
      name: meta.name,
      size: file?.size || meta.size || 0,
      type: file?.type || meta.type || '',
      url: meta.url,
      stage: stage,
      uploadedAt: new Date(),
      uploadedBy: currentUser?.name || 'Current User'
    };
  });

  return (
    <>
      <Container className='lg:mx-0'>
        <div className='py-4'>
          <div className='flex items-center gap-3'>
            <h2 className='text-lg font-semibold'>FAB ID: {fabData?.id || 'Loading...'}</h2>
            {(() => {
              const statusInfo = getFabStatusInfo(fabData?.status_id);
              return (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                  {statusInfo.text}
                </span>
              );
            })()}
          </div>
          <p className='text-sm text-muted-foreground'>Update drafting activity</p>
        </div>

      </Container>

      <div className=" border-t grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <div className="lg:col-span-3 w-full lg:w-[200px]  2xl:w-[286px]  ultra:w-[500px]" >
          <GraySidebar
            sections={sidebarSections as any}
            jobId={fabData?.job_id}  // Add this prop
          />
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
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <CardTitle>Drafting activity</CardTitle>
                      <p className="text-sm text-[#4B5563]">Update your drafting activity here</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${{
                        'idle': 'bg-gray-100 text-gray-800',
                        'drafting': 'bg-green-100 text-green-800',
                        'paused': 'bg-yellow-100 text-yellow-800',
                        'on_hold': 'bg-orange-100 text-orange-800',
                        'ended': 'bg-blue-100 text-blue-800'
                      }[sessionStatus] || 'bg-gray-100 text-gray-800'}`}>
                        {{
                          'idle': 'Ready to Start',
                          'drafting': 'Drafting Active',
                          'paused': 'Paused',
                          'on_hold': 'On Hold',
                          'ended': 'Completed'
                        }[sessionStatus] || 'Unknown'}
                      </span>
                      {fabData?.status_id === 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          FAB ON HOLD
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>


              <Card>
                <CardContent>
                  <TimeTrackingComponent
                    isDrafting={isDrafting}
                    isPaused={isPaused}
                    totalTime={totalTime}
                    draftStart={draftStart}
                    draftEnd={draftEnd}
                    sessionData={sessionData}
                    isFabOnHold={fabData?.status_id === 0}
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
                      disabled={hasEnded || isOnHold || isPaused}
                      enhancedFiles={enhancedUploadedFiles}
                    />
                  )}

                  {/* Show message when timer hasn't started yet */}
                  {!shouldShowFilesSection && !isDrafting && sessionStatus === 'idle' && (
                    <div className="text-center py-4 text-muted-foreground">
                      Start the timer to enable file uploads
                    </div>
                  )}

                  {/* Submit Button - show after on hold OR after ending normally */}
                  {viewMode === 'activity' && (
                    <div className="flex justify-end gap-3">
                      <BackButton fallbackUrl="/job/draft" label='Cancel' />
                      <Can action="create" on="Drafting">
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
              if (success) onSubmitModal();
            }}
            drafting={draftingData}
            uploadedFiles={filesForSubmission}
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