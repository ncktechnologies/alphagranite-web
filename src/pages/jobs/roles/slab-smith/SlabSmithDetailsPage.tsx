// DrafterDetailsPageRefactor.tsx - FIXED VERSION
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
  useGetDraftingByFabIdQuery,
  useGetSlabSmithByFabIdQuery,
  useCreateSlabSmithMutation,
  useAddFilesToSlabSmithMutation,
  useManageSlabSmithSessionMutation, // Import new mutation
  useGetSlabSmithSessionStatusQuery, // Import new query
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
import { Can } from '@/components/permission';

export function SlabSmithDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? Number(id) : 0;
  const navigate = useNavigate();

  const currentUser = useSelector((s: any) => s.user.user);
  const currentEmployeeId = currentUser?.employee_id || currentUser?.id;

  // load fab & drafting (we assume drafting already exists)
  const { data: fabData, isLoading: isFabLoading } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const { data: draftingData, isLoading: isDraftingLoading, refetch: refetchDrafting } = useGetDraftingByFabIdQuery(fabId, { skip: !fabId });
  const { data: slabSmithData, isLoading: isSlabSmithLoading } = useGetSlabSmithByFabIdQuery(fabId, { skip: !fabId });
  const { data: ssSessionData, isLoading: isSSLoading, refetch: refetchSSSession } = useGetSlabSmithSessionStatusQuery(fabId, { skip: !fabId }); // Session status
  const [createSlabSmith] = useCreateSlabSmithMutation();
  const [addFilesToSlabSmith] = useAddFilesToSlabSmithMutation();
  const [manageSlabSmithSession] = useManageSlabSmithSessionMutation(); // Session mutation
  const [toggleFabOnHold] = useToggleFabOnHoldMutation();
  const [createFabNote] = useCreateFabNoteMutation();

  // local UI state
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [totalTime, setTotalTime] = useState<number>(0);

  // start/end timestamps captured from child component
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // Sync state with session data
  React.useEffect(() => {
    if (ssSessionData?.data) {
      const session = ssSessionData.data;

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
      if (typeof session.duration_seconds === 'number') {
        setTotalTime(session.duration_seconds);
      }
    }
  }, [ssSessionData]);

  // Simplified file state - track files that need to be uploaded
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFileMetas, setUploadedFileMetas] = useState<UploadedFileMeta[]>([]);
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);

  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const getAllFabNotes = (fabNotes: any[]) => {
    return fabNotes || [];
  };
  // Fixed handleFilesChange - REPLACES files instead of accumulating
  const handleFilesChange = useCallback(async (files: FileWithPreview[]) => {
    if (!files || files.length === 0) {
      setPendingFiles([]);
      return;
    }

    console.log('New files selected:', files);

    // Filter to only actual File objects
    const validFiles = files.filter((fileItem) => fileItem.file instanceof File);

    if (validFiles.length === 0) {
      console.log('No valid files to process');
      setPendingFiles([]);
      return;
    }

    // Extract the File objects
    const fileObjects = validFiles.map(f => f.file as File);

    // REPLACE the pending files (don't accumulate)
    setPendingFiles(fileObjects);

    // Create file metas for display
    const newFileMetas: UploadedFileMeta[] = fileObjects.map((file, index) => ({
      id: `pending-${Date.now()}-${index}`, // Temporary ID
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setUploadedFileMetas(newFileMetas);

    console.log('Set pending files:', fileObjects.length);
    console.log('File names:', fileObjects.map(f => f.name));

  }, []); // Removed dependencies since we're replacing, not accumulating

  // Upload files when needed (like when opening submission modal)
  const uploadPendingFiles = useCallback(async () => {
    if (pendingFiles.length === 0) {
      return [];
    }

    // Ensure slab smith entry exists
    let slabSmithId = slabSmithData?.id;
    if (!slabSmithId) {
      try {
        const result = await createSlabSmith({
          fab_id: fabId,
          slab_smith_type: 'standard',
          drafter_id: currentEmployeeId,
          start_date: new Date().toISOString().substring(0, 19)
        }).unwrap();
        slabSmithId = result.id;
      } catch (error) {
        console.error('Failed to create slab smith entry:', error);
        toast.error('Failed to initialize slab smith work');
        throw error;
      }
    }

    if (!slabSmithId) {
      throw new Error('No slab smith ID available');
    }

    try {
      setIsUploadingDocuments(true);
      console.log('Uploading pending files:', pendingFiles);

      const response = await addFilesToSlabSmith({
        slabsmith_id: slabSmithId,
        files: pendingFiles
      }).unwrap();

      console.log('File upload response:', response);

      let uploadedIds: number[] = [];
      if (response && Array.isArray(response)) {
        uploadedIds = response.map((file: any) => file.id);

        // Update file metas with real IDs
        const updatedMetas = response.map((fileData: any, index: number) => ({
          id: fileData.id,
          name: fileData.name || pendingFiles[index].name,
          size: fileData.size || pendingFiles[index].size,
          type: fileData.type || pendingFiles[index].type,
        }));

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
  }, [pendingFiles, slabSmithData, fabId, currentEmployeeId, createSlabSmith, addFilesToSlabSmith]);

  const handleFileClick = (file: any) => {
    setActiveFile(file);
    setViewMode('file');
  };

  // Time tracking handlers
  const handleStart = useCallback(async (startDate: Date) => {
    if (fabId) {
      try {
        // Ensure SlabSmith record exists first? 
        // Usually manageSession might handle it or we expect it to exist.
        // But let's just call manageSession with action 'start'.
        await manageSlabSmithSession({
          fab_id: fabId,
          data: {
            action: 'start',
            started_by: currentEmployeeId,
            timestamp: startDate.toISOString(),
          }
        }).unwrap();

        await refetchSSSession();
        toast.success('Slabsmith session started');
      } catch (error) {
        console.error('Failed to start session:', error);
        toast.error('Failed to start session');
        return;
      }
    }

    setIsDrafting(true);
    setIsPaused(false);
    setHasEnded(false);
    setDraftStart(startDate);
  }, [fabId, currentEmployeeId, manageSlabSmithSession, refetchSSSession]);

  const handlePause = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await manageSlabSmithSession({
        fab_id: fabId,
        data: {
          action: 'pause',
          note: data?.note,
          sqft_completed: data?.sqft_drafted, // Map drafted to completed
          timestamp: new Date().toISOString(),
        }
      }).unwrap();
      setIsPaused(true);
      await refetchSSSession();
      toast.success('Session paused');
    } catch (error) {
      console.error('Failed to pause:', error);
      toast.error('Failed to pause');
    }
  }, [fabId, manageSlabSmithSession, refetchSSSession]);

  const handleResume = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await manageSlabSmithSession({
        fab_id: fabId,
        data: {
          action: 'resume',
          note: data?.note,
          sqft_completed: data?.sqft_drafted,
          timestamp: new Date().toISOString(),
        }
      }).unwrap();
      setIsPaused(false);
      await refetchSSSession();
      toast.success('Session resumed');
    } catch (error) {
      console.error('Failed to resume:', error);
      toast.error('Failed to resume');
    }
  }, [fabId, manageSlabSmithSession, refetchSSSession]);

  const handleOnHold = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await toggleFabOnHold({ fab_id: fabId, on_hold: true }).unwrap();

      if (data?.note) {
        // Stage: 'slab_smith_request' or ?? 
        // Looking at sidebar mapping: slab_smith_request is Red.
        // But this is the Slabsmith role working. 
        // I'll use 'slab_smith' or 'general'? 
        // Let's use 'slab_smith'.
        await createFabNote({
          fab_id: fabId,
          note: data.note,
          stage: 'slab_smith'
        }).unwrap();
      }

      await manageSlabSmithSession({
        fab_id: fabId,
        data: {
          action: 'pause',
          note: data?.note ? `[On Hold] ${data.note}` : '[On Hold]',
          sqft_completed: data?.sqft_drafted,
          timestamp: new Date().toISOString(),
        }
      }).unwrap();

      setIsPaused(true);
      await refetchSSSession();
      toast.success('Job placed on hold');
    } catch (error) {
      console.error('Failed to hold:', error);
      toast.error('Failed to place on hold');
    }
  }, [fabId, toggleFabOnHold, createFabNote, manageSlabSmithSession, refetchSSSession]);

  const handleEnd = useCallback(async (endDate: Date) => {
    try {
      await manageSlabSmithSession({
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
      await refetchSSSession();
      toast.success('Session ended');
    } catch (error) {
      console.error('Failed to end:', error);
      toast.error('Failed to end session');
    }
  }, [fabId, manageSlabSmithSession, refetchSSSession]);

  const canOpenSubmit = (isDrafting || hasEnded) && (pendingFiles.length > 0 || uploadedFileMetas.length > 0);

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
      setShowSubmissionModal(false);
      setPendingFiles([]);
      setUploadedFileMetas([]);
      setTotalTime(0);
      setDraftStart(null);
      setDraftEnd(null);
      navigate('/job/slab-smith');
    } catch (err) {
      console.error(err);
      toast.error('Failed to finalize submission flow');
    }
  };

  if (isFabLoading || isDraftingLoading || isSlabSmithLoading) return <div>Loading...</div>;

  const sidebarSections = [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "FAB ID", value: fabData?.id ? `FAB-${fabData.id}` : "N/A" },
        { label: "FAB Type", value: fabData?.fab_type || "N/A" },
        { label: "Account ID", value: fabData?.job_details?.account_id?.toString() || "N/A" },
        { label: "Job name", value: fabData?.job_details?.name || "N/A" },
        { label: "Job #", value: fabData?.job_details?.job_number || "N/A" },
        { label: "Area (s)", value: fabData?.input_area || "N/A" },
        { label: "Stone type", value: fabData?.stone_type_name || "N/A" },
        { label: "Stone color", value: fabData?.stone_color_name || "N/A" },
        { label: "Stone thickness", value: fabData?.stone_thickness_value || "N/A" },
        { label: "Edge", value: fabData?.edge_name || "N/A" },
        { label: "Total square ft", value: fabData?.total_sqft || "N/A" },
      ],
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
          slab_smith: { label: 'Slabsmith', color: 'text-red-700' },
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
    <div className=" border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0  items-start lg:flex-shrink-0">
      <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px]" >
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  SLAB SMITH
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fabData?.status_id === 0 ? 'bg-red-100 text-red-800' : fabData?.status_id === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {fabData?.status_id === 0 ? 'ON HOLD' : fabData?.status_id === 1 ? 'ACTIVE' : 'LOADING'}
                </span>
              </div>
              <p className="text-sm">{fabData?.job_details?.name || 'N/A'}</p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

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
              onOnHold={handleOnHold} // Pass handler
              onTimeUpdate={setTotalTime}
              hasEnded={hasEnded}
              sessionData={ssSessionData} // Pass session data
              isFabOnHold={fabData?.on_hold} // Pass on hold status
              pendingFilesCount={pendingFiles.length} // Pass file counts
              uploadedFilesCount={uploadedFileMetas.length}
            />

            <Separator className="my-3" />

            <UploadDocuments
              onFilesChange={handleFilesChange}
              onFileClick={handleFileClick}
              slabSmithId={slabSmithData?.id}
            />
          </CardContent>
          {/* Submit Button inside Card */}
          <div className="flex justify-end p-6 pt-0">
            <Can action="create" on="Slab Smith">
              <Button
                onClick={handleOpenSubmissionModal}
                disabled={!canOpenSubmit}
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Submit Slab Smith Work
              </Button>
            </Can>
          </div>
        </Card>

        {/* Removed external UploadDocuments and Separators - they should ideally be inside the card or organized similarly to FinalProgramming if exact UI parity is desired, but for now moving Submit button is key for flow.
           Actually, checking FinalProgrammingDetailsPage again, UploadDocuments IS inside the CardContent.
           Let's move UploadDocuments inside CardContent too.
        */}

        <SubmissionModal
          open={showSubmissionModal}
          onClose={(success?: boolean) => {
            setShowSubmissionModal(false);
            if (success) {
              // End the session upon successful submission
              // Use current date as end time
              handleEnd(new Date());
              // Navigate after a brief delay or immediately (usually safely immediately if state is handled)
              onSubmitModal({});
            }
          }}
          drafting={slabSmithData}
          uploadedFiles={uploadedFileMetas.map(meta => ({ ...meta, file: pendingFiles.find(f => f.name === meta.name) }))}
          draftStart={draftStart}
          draftEnd={draftEnd}
          fabId={fabId}
          userId={currentEmployeeId}
          fabData={fabData}
          slabSmithId={slabSmithData?.id}
        />
      </Container>
    </div>
  );
}