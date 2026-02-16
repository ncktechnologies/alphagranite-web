// SlabSmithDetailsPage.tsx - FULLY REFACTORED WITH UNIFIED FILE VIEWER
import React, { useCallback, useState, useEffect } from 'react';
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
  useManageSlabSmithSessionMutation,
  useGetSlabSmithSessionStatusQuery,
  useToggleFabOnHoldMutation,
  useCreateFabNoteMutation,
} from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { UploadDocuments } from './components/fileUploads';
import { FileViewer } from './components/FileViewer';
import { Documents } from '@/pages/shop/components/files';
import { SubmissionModal } from './components/SubmissionModal';
import { useSelector } from 'react-redux';
import { FileWithPreview } from '@/hooks/use-file-upload';
import { UploadedFileMeta } from '@/types/uploads';
import { X } from 'lucide-react';
import { Can } from '@/components/permission';
import { getFileStage } from '@/utils/file-labeling';      // <-- IMPORT for stage detection


const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export function SlabSmithDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? Number(id) : 0;
  const navigate = useNavigate();

  const currentUser = useSelector((s: any) => s.user.user);
  const currentEmployeeId = currentUser?.employee_id || currentUser?.id;

  // Queries
  const { data: fabData, isLoading: isFabLoading, refetch: refetchFab } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const { data: draftingData, isLoading: isDraftingLoading, refetch: refetchDrafting } = useGetDraftingByFabIdQuery(fabId, { skip: !fabId });
  const { data: slabSmithData, isLoading: isSlabSmithLoading, refetch: refetchSlabSmith } = useGetSlabSmithByFabIdQuery(fabId, { skip: !fabId });
  const { data: ssSessionData, isLoading: isSSLoading, refetch: refetchSSSession } = useGetSlabSmithSessionStatusQuery(fabId, { skip: !fabId });
  
  // Mutations
  const [createSlabSmith] = useCreateSlabSmithMutation();
  const [addFilesToSlabSmith] = useAddFilesToSlabSmithMutation();
  const [manageSlabSmithSession] = useManageSlabSmithSessionMutation();
  const [toggleFabOnHold] = useToggleFabOnHoldMutation();
  const [createFabNote] = useCreateFabNoteMutation();

  // -----------------------------------------------------------------
  // Timer / Session State
  // -----------------------------------------------------------------
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // Sync with session API
  useEffect(() => {
    if (ssSessionData?.data) {
      const session = ssSessionData.data;
      if (session.status === 'active') {
        setIsDrafting(true); setIsPaused(false); setHasEnded(false);
      } else if (session.status === 'paused') {
        setIsDrafting(true); setIsPaused(true); setHasEnded(false);
      } else if (session.status === 'ended') {
        setIsDrafting(false); setIsPaused(false); setHasEnded(true);
      }
      if (session.current_session_start_time) setDraftStart(new Date(session.current_session_start_time));
      if (session.last_action_time && session.status === 'ended') setDraftEnd(new Date(session.last_action_time));
      if (typeof session.duration_seconds === 'number') setTotalTime(session.duration_seconds);
    }
  }, [ssSessionData]);

  // -----------------------------------------------------------------
  // FILE STATE – pending local files + uploaded server files
  // -----------------------------------------------------------------
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFileMetas, setUploadedFileMetas] = useState<UploadedFileMeta[]>([]);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);

  // VIEW STATE – unified file viewer
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');

  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // -----------------------------------------------------------------
  // Helper: Normalise any file object for FileViewer
  // -----------------------------------------------------------------
  const enhanceFileForViewer = (file: any) => ({
    ...file,
    id: file.id,
    name: file.name || file.file_name,
    size: parseInt(file.file_size) || file.size || 0,
    type: file.file_type || file.type || '',
    url: file.file_url || file.url,
    file_url: file.file_url || file.url,
    stage: getFileStage(file.name || file.file_name, {
      currentStage: 'slab_smith',   // adjust to your exact stage name
      isDrafting: true,
    }),
    formattedSize: formatBytes(parseInt(file.file_size) || file.size || 0),
    uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
    uploadedBy: file.uploaded_by || currentUser?.name || 'Unknown',
  });

  // -----------------------------------------------------------------
  // File click handler – used by UploadDocuments AND Documents
  // -----------------------------------------------------------------
  const handleFileClick = (file: any) => {
    const enhanced = enhanceFileForViewer(file);
    setActiveFile(enhanced);
    setViewMode('file');
  };

  // -----------------------------------------------------------------
  // Local file selection (from UploadDocuments)
  // -----------------------------------------------------------------
  const handleFilesChange = useCallback(async (files: FileWithPreview[]) => {
    if (!files || files.length === 0) {
      setPendingFiles([]);
      return;
    }

    const validFiles = files.filter((fileItem) => fileItem.file instanceof File);
    if (validFiles.length === 0) {
      setPendingFiles([]);
      return;
    }

    const fileObjects = validFiles.map(f => f.file as File);
    setPendingFiles(fileObjects);

    const newFileMetas: UploadedFileMeta[] = fileObjects.map((file, index) => ({
      id: `pending-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setUploadedFileMetas(newFileMetas);
  }, []);

  // -----------------------------------------------------------------
  // Upload pending files to server
  // -----------------------------------------------------------------
  const uploadPendingFiles = useCallback(async () => {
    if (pendingFiles.length === 0) return [];

    let slabSmithId = slabSmithData?.id;
    if (!slabSmithId) {
      try {
        const result = await createSlabSmith({
          fab_id: fabId,
          slab_smith_type: 'standard',
          drafter_id: currentEmployeeId,
          start_date: new Date().toISOString().substring(0, 19),
          total_sqft_completed: String(fabData?.total_sqft || '0'),
        }).unwrap();
        slabSmithId = result.id;
        await refetchSlabSmith();
      } catch (error) {
        console.error('Failed to create slab smith entry:', error);
        toast.error('Failed to initialize slab smith work');
        throw error;
      }
    }

    if (!slabSmithId) throw new Error('No slab smith ID available');

    try {
      setIsUploadingDocuments(true);
      const response = await addFilesToSlabSmith({
        slabsmith_id: slabSmithId,
        files: pendingFiles,
      }).unwrap();

      let uploadedIds: number[] = [];
      if (response && Array.isArray(response)) {
        uploadedIds = response.map((file: any) => file.id);
        const updatedMetas = response.map((fileData: any, index: number) => ({
          id: fileData.id,
          name: fileData.name || pendingFiles[index].name,
          size: fileData.size || pendingFiles[index].size,
          type: fileData.type || pendingFiles[index].type,
        }));
        setUploadedFileMetas(updatedMetas);
      }

      setPendingFiles([]);
      return uploadedIds;
    } catch (error) {
      console.error('Failed to upload files:', error);
      toast.error('Failed to upload files');
      throw error;
    } finally {
      setIsUploadingDocuments(false);
    }
  }, [pendingFiles, slabSmithData, fabId, currentEmployeeId, createSlabSmith, addFilesToSlabSmith, refetchSlabSmith, fabData?.total_sqft]);

  // -----------------------------------------------------------------
  // Timer Handlers
  // -----------------------------------------------------------------
  const handleStart = useCallback(async (startDate: Date) => {
    if (fabId) {
      try {
        let currentSlabSmithId = slabSmithData?.id;
        if (!currentSlabSmithId) {
          const createResponse = await createSlabSmith({
            fab_id: fabId,
            slab_smith_type: 'standard',
            drafter_id: currentEmployeeId,
            start_date: startDate.toISOString().substring(0, 19),
            total_sqft_completed: String(fabData?.total_sqft || '0'),
          }).unwrap();
          currentSlabSmithId = createResponse.id;
          toast.success('SlabSmith entry created successfully');
          await refetchSlabSmith();
        }

        await manageSlabSmithSession({
          fab_id: fabId,
          data: {
            action: 'start',
            started_by: currentEmployeeId,
            timestamp: startDate.toISOString(),
          },
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
  }, [fabId, currentEmployeeId, manageSlabSmithSession, refetchSSSession, slabSmithData?.id, createSlabSmith, refetchSlabSmith, fabData?.total_sqft]);

  const handlePause = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await manageSlabSmithSession({
        fab_id: fabId,
        data: {
          action: 'pause',
          note: data?.note,
          sqft_completed: data?.sqft_drafted,
          timestamp: new Date().toISOString(),
        },
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
        },
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
        await createFabNote({
          fab_id: fabId,
          note: data.note,
          stage: 'slab_smith',
        }).unwrap();
      }
      await manageSlabSmithSession({
        fab_id: fabId,
        data: {
          action: 'pause',
          note: data?.note ? `[On Hold] ${data.note}` : '[On Hold]',
          sqft_completed: data?.sqft_drafted,
          timestamp: new Date().toISOString(),
        },
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
        },
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

  // -----------------------------------------------------------------
  // Submission flow
  // -----------------------------------------------------------------
  const canOpenSubmit = (!isDrafting) && ((fabData as any)?.slabsmith_data?.files.length > 0);

  const handleOpenSubmissionModal = async () => {
    try {
     
      setShowSubmissionModal(true);
    } catch (error) {
      console.error('Failed to prepare files for submission:', error);
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

  // -----------------------------------------------------------------
  // Sidebar data
  // -----------------------------------------------------------------
  const getAllFabNotes = (fabNotes: any[]) => fabNotes || [];

  if (isFabLoading || isDraftingLoading || isSlabSmithLoading) return <div>Loading...</div>;

  const sidebarSections = [
    {
      title: 'Job Details',
      type: 'details',
      items: [
        { label: 'FAB ID', value: fabData?.id ? `FAB-${fabData.id}` : 'N/A' },
        { label: 'FAB Type', value: fabData?.fab_type || 'N/A' },
        { label: 'Account ID', value: fabData?.job_details?.account_id?.toString() || 'N/A' },
        { label: 'Job name', value: fabData?.job_details?.name || 'N/A' },
        { label: 'Job #', value: fabData?.job_details?.job_number || 'N/A' },
        { label: 'Area (s)', value: fabData?.input_area || 'N/A' },
        { label: 'Stone type', value: fabData?.stone_type_name || 'N/A' },
        { label: 'Stone color', value: fabData?.stone_color_name || 'N/A' },
        { label: 'Stone thickness', value: fabData?.stone_thickness_value || 'N/A' },
        { label: 'Edge', value: fabData?.edge_name || 'N/A' },
        { label: 'Total square ft', value: fabData?.total_sqft || 'N/A' },
        { label: "SlabSmith Needed", value: fabData?.slab_smith_ag_needed ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'FAB Notes',
      type: 'notes',
      notes: getAllFabNotes(fabData?.fab_notes || []).map((note) => {
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
          general: { label: 'General', color: 'text-gray-700' },
        };

        const stage = note.stage || 'general';
        const config = stageConfig[stage] || stageConfig.general;

        return {
          id: note.id,
          avatar: note.created_by_name?.charAt(0).toUpperCase() || 'U',
          content: `<span class="inline-block px-2 py-1 rounded text-xs font-medium ${config.color} bg-gray-100 mr-2">${config.label}</span>${note.note}`,
          author: note.created_by_name || 'Unknown',
          timestamp: note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date',
        };
      }),
    },
  ];

  // -----------------------------------------------------------------
  // RENDER – MAIN LAYOUT (sidebar always visible)
  // -----------------------------------------------------------------
  return (
    <div className="border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0 items-start lg:flex-shrink-0">
      {/* Sidebar – always present */}
      <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px]">
        <GraySidebar sections={sidebarSections as any} jobId={fabData?.job_id} />
      </div>

      {/* Main content – toggles between file viewer and activity UI */}
      <Container className="lg:col-span-9">
        {viewMode === 'file' && activeFile ? (
          // -------------------- FILE VIEWER MODE (sidebar stays visible) --------------------
          <div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-t-lg">
              <div>
                <h3 className="font-semibold">{activeFile.name}</h3>
                <p className="text-sm text-gray-500">
                  {activeFile.formattedSize} • {activeFile.stage?.label || activeFile.stage}
                </p>
              </div>
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
                setActiveFile(null);
                setViewMode('activity');
              }}
            />
          </div>
        ) : (
          // -------------------- ACTIVITY MODE (timer, uploads, etc.) --------------------
          <>
            <div className="pt-6">
              <div className="flex justify-between items-start">
                <div className="text-black">
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-base">FAB-{fabData?.id || 'N/A'}</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      SLABSMITH
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        fabData?.status_id === 0
                          ? 'bg-red-100 text-red-800'
                          : fabData?.status_id === 1
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {fabData?.status_id === 0 ? 'ON HOLD' : fabData?.status_id === 1 ? 'ACTIVE' : 'LOADING'}
                    </span>
                  </div>
                  <p className="text-sm">{fabData?.job_details?.name || 'N/A'}</p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <Card className="my-4">
              <CardHeader className="flex flex-col items-start py-4">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <CardTitle>SlabSmith activity</CardTitle>
                    <p className="text-sm text-[#4B5563]">Update your SlabSmith activity here</p>
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
                  onStart={handleStart}
                  onPause={handlePause}
                  onResume={handleResume}
                  onEnd={handleEnd}
                  onOnHold={handleOnHold}
                  onTimeUpdate={setTotalTime}
                  hasEnded={hasEnded}
                  sessionData={ssSessionData}
                  isFabOnHold={fabData?.on_hold}
                  pendingFilesCount={pendingFiles.length}
                  uploadedFilesCount={uploadedFileMetas.length}
                />

                <Separator className="my-3" />

                {/* UploadDocuments – now uses the unified file click handler */}
                <UploadDocuments
                  onFilesChange={handleFilesChange}
                  onFileClick={handleFileClick}          // <-- fixed: uses enhanced handler
                  slabSmithId={slabSmithData?.id}
                  refetchFiles={refetchFab}
                />

                {/* Server‑uploaded files – now also uses the same file click handler */}
                {(fabData as any)?.slabsmith_data?.files &&
                  (fabData as any).slabsmith_data.files.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">Uploaded Files</h3>
                      <Documents
                        slabsmithData={(fabData as any)?.slabsmith_data}
                        onFileClick={handleFileClick}    // <-- fixed: now opens in same viewer
                      />
                    </div>
                  )}
              </CardContent>

              <div className="flex justify-end p-6 pt-0">
                {/* <Can action="create" on="Slab Smith"> */}
                  <Button
                    onClick={handleOpenSubmissionModal}
                    disabled={!canOpenSubmit}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    Submit SlabSmith Work
                  </Button>
                {/* </Can> */}
              </div>
            </Card>
          </>
        )}

        {/* Submission Modal – always outside the conditional block */}
        <SubmissionModal
          open={showSubmissionModal}
          onClose={(success?: boolean) => {
            setShowSubmissionModal(false);
            if (success) {
              handleEnd(new Date());
              onSubmitModal({});
            }
          }}
          drafting={slabSmithData}
          uploadedFiles={uploadedFileMetas.map((meta) => ({
            ...meta,
            file: pendingFiles.find((f) => f.name === meta.name),
          }))}
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

export default SlabSmithDetailsPage;