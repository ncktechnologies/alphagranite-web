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
  useManageFinalProgrammingSessionMutation, // Import the new mutation
  useToggleFabOnHoldMutation,
  useCreateFabNoteMutation
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
  const [manageFinalProgrammingSession] = useManageFinalProgrammingSessionMutation();
  const [toggleFabOnHold] = useToggleFabOnHoldMutation();
  const [createFabNote] = useCreateFabNoteMutation();

  // Local UI state
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [totalTime, setTotalTime] = useState<number>(0);

  // Start/end timestamps captured from child component
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // Simplistic file state - track files that need to be uploaded
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFileMetas, setUploadedFileMetas] = useState<UploadedFileMeta[]>([]);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [activeFile, setActiveFile] = useState<any | null>(null);

  // Sync state with session data
  React.useEffect(() => {
    if (fpSessionData?.data) {
      const session = fpSessionData.data;

      // Set status flags
      if (session.status === 'active') {
        setIsDrafting(true);
        setIsPaused(false);
        setHasEnded(false);
      } else if (session.status === 'paused') {
        setIsDrafting(true);
        setIsPaused(true);
        setHasEnded(false);
      } else if (session.status === 'ended') {
        setIsDrafting(false);
        setIsPaused(false);
        setHasEnded(true);
      }

      // Restore timestamps
      if (session.current_session_start_time) {
        setDraftStart(new Date(session.current_session_start_time));
      }
      if (session.last_action_time && session.status === 'ended') {
        setDraftEnd(new Date(session.last_action_time));
      }

      // Restore total time if available
      // If the timer is running/paused, TimeTrackingComponent will take over for live updates
      // but we set this for initial display or paused state
      if (typeof session.duration_seconds === 'number') {
        setTotalTime(session.duration_seconds);
      }
    }
  }, [fpSessionData]);

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
            started_by: currentEmployeeId,
            timestamp: startTime.toISOString(),
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

  const handlePause = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await manageFinalProgrammingSession({
        fab_id: fabId,
        data: {
          action: 'pause',
          note: data?.note,
          sqft_drafted: data?.sqft_drafted,
          timestamp: new Date().toISOString(),
        }
      }).unwrap();
      setIsPaused(true);
      await refetchFPSession();
      toast.success('Session paused');
    } catch (error) {
      console.error('Failed to pause:', error);
      toast.error('Failed to pause');
    }
  }, [fabId, manageFinalProgrammingSession, refetchFPSession]);

  const handleResume = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await manageFinalProgrammingSession({
        fab_id: fabId,
        data: {
          action: 'resume',
          note: data?.note,
          sqft_drafted: data?.sqft_drafted,
          timestamp: new Date().toISOString(),
        }
      }).unwrap();
      setIsPaused(false);
      await refetchFPSession();
      toast.success('Session resumed');
    } catch (error) {
      console.error('Failed to resume:', error);
      toast.error('Failed to resume');
    }
  }, [fabId, manageFinalProgrammingSession, refetchFPSession]);

  const handleEnd = useCallback(async (endDate: Date) => {
    try {
      await manageFinalProgrammingSession({
        fab_id: fabId,
        data: {
          action: 'end',
          timestamp: endDate.toISOString(),
        }
      }).unwrap();

      setIsDrafting(false);
      setIsPaused(false);
      setHasEnded(true);
      setDraftEnd(endDate);
      await refetchFPSession();
      toast.success('Session ended');
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session');
    }
  }, [fabId, manageFinalProgrammingSession, refetchFPSession]);

  const handleOnHold = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await toggleFabOnHold({ fab_id: fabId, on_hold: true }).unwrap();

      if (data?.note) {
        await createFabNote({
          fab_id: fabId,
          note: data.note,
          stage: 'final_programming'
        }).unwrap();
      }

      // We should also likely pause the session if it's running
      await manageFinalProgrammingSession({
        fab_id: fabId,
        data: {
          action: 'pause', // Use pause to stop the timer on backend
          note: data?.note ? `[On Hold] ${data.note}` : '[On Hold]',
          sqft_drafted: data?.sqft_drafted,
          timestamp: new Date().toISOString(),
        }
      }).unwrap();

      setIsPaused(true); // Treat On Hold as Paused in UI for now, or reset?
      // Actually usually OnHold might kick user out or reset state? 
      // For now, mirroring Drafting which often just updates status.
      // But here we keep it simple.

      await refetchFPSession();
      await refetchFab();
      toast.success('Job placed on hold');
    } catch (error) {
      console.error('Failed to place on hold:', error);
      toast.error('Failed to place on hold');
    }
  }, [fabId, toggleFabOnHold, createFabNote, manageFinalProgrammingSession, refetchFPSession, refetchFab]);

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

    // Use functional update to ensure we check against the LATEST state
    setPendingFiles(prev => {
      // 1. Filter against pending files
      const uniqueNewFiles = fileObjects.filter(
        newFile => !prev.some(existingFile => existingFile.name === newFile.name)
      );

      if (uniqueNewFiles.length === 0) {
        console.log('All selected files are already uploaded');
        return prev;
      }

      console.log('Added unique pending files:', uniqueNewFiles.length);

      // 2. Also update metas here to ensure sync, AND filter against existing metas to be double safe
      setUploadedFileMetas(prevMetas => {
        const trulyUniqueNewFiles = uniqueNewFiles.filter(
          f => !prevMetas.some(existing => existing.name === f.name)
        );

        if (trulyUniqueNewFiles.length === 0) return prevMetas;

        const newFileMetas: UploadedFileMeta[] = trulyUniqueNewFiles.map((file, index) => ({
          id: `pending-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
        }));
        return [...prevMetas, ...newFileMetas];
      });

      return [...prev, ...uniqueNewFiles];
    });

  }, []); // Empty dependency array - no stale closures!

  // Handle file clicks for viewing
  const handleFileClick = (file: any) => {
    setActiveFile(file);
    setViewMode('file');
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    // Check if it's a pending file (string ID starting with pending or just match by index logic if needed, 
    // but here we used generated IDs for metas).
    // If it's a pending file, remove from local state.
    if (fileId.toString().startsWith('pending-')) {
      setUploadedFileMetas(prev => prev.filter(f => f.id !== fileId));
      // We also need to remove from pendingFiles. This is tricky since pendingFiles are File objects without IDs.
      // We might need to match by name.
      const metaToRemove = uploadedFileMetas.find(f => f.id === fileId);
      if (metaToRemove) {
        setPendingFiles(prev => prev.filter(f => f.name !== metaToRemove.name));
      }
      return;
    }

    if (!fpSessionData?.data?.id) {
      // toast.error('Final programming session not available');
      return;
    }

    try {
      await deleteFileFromFinalProgramming({
        fp_id: fpSessionData.data.id,
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
        { label: "Job Name", value: fabData?.job_details?.name || `Job ${fabData?.job_id}` },
        { label: "Job Number", value: fabData?.job_details?.job_number || String(fabData?.job_id) },
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
        <GraySidebar
          sections={sidebarSections as any}
          jobId={fabData?.job_id}  // Add this prop
        />
      </div>

      <Container className="lg:col-span-9">
        <div className="pt-6">
          <div className="flex justify-between items-start">
            <div className="text-black">
              <div className="flex items-center gap-3">
                <p className="font-bold text-base">FAB-{fabData?.id || 'N/A'}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${{
                  0: 'bg-red-100 text-red-800',
                  1: 'bg-green-100 text-green-800'
                }[fabData?.status_id] || 'bg-gray-100 text-gray-800'}`}>
                  {{
                    0: 'ON HOLD',
                    1: 'ACTIVE'
                  }[fabData?.status_id] || 'LOADING'}
                </span>
              </div>
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
              onOnHold={handleOnHold} // Pass the handler
              onTimeUpdate={setTotalTime}
              hasEnded={hasEnded}
              pendingFilesCount={pendingFiles.length}
              uploadedFilesCount={uploadedFileMetas.length}
              sessionData={fpSessionData} // Pass session data for initialization
              isFabOnHold={fabData?.on_hold} // Pass on hold status
            />

            <Separator className="my-3" />

            {/* Only show upload if timer has started */}
            {shouldShowUploadSection && (
              <UploadDocuments
                onFileClick={handleFileClick}
                onFilesChange={handleFilesChange}
                simulateUpload={false}
                fpId={fpSessionData?.id}
                disabled={hasEnded || isPaused} // Disable when ended OR paused
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
              <Can action="create" on="Final Programming">
                <Button
                  onClick={handleOpenSubmissionModal}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                  // Enable if session has started (drafting or paused) AND files are uploaded
                  // AND not ended
                  disabled={
                    (!isDrafting && !isPaused) || // Not started

                    (pendingFiles.length === 0 && uploadedFileMetas.length === 0)
                  }
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
              // End the session upon successful submission
              handleEnd(new Date());
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