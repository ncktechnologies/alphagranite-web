// FinalProgrammingDetailsPage.tsx
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
  useGetFinalProgrammingSessionStatusQuery,
  useManageFinalProgrammingSessionMutation,
  useToggleFabOnHoldMutation,
  useCreateFabNoteMutation,
  useAddFilesToFinalProgrammingMutation,
  useCompleteFinalProgrammingMutation
} from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
// import { FileViewer } from './components/FileViewer';
import { SubmissionModal } from './components/SubmissionModal';
import { useSelector } from 'react-redux';
import { UploadedFileMeta } from '@/types/uploads';
import { X } from 'lucide-react';
import { Can } from '@/components/permission';
import { UploadDocuments } from '../drafters/components';
import { Documents } from '@/pages/shop/components/files';
import { FileWithPreview } from '@/hooks/use-file-upload';
import { getFileStage } from '@/utils/file-labeling';
import { FileViewer } from '../slab-smith/components';


const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getAllFabNotes = (fabNotes: any[]) => fabNotes || [];

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
  const [manageFinalProgrammingSession] = useManageFinalProgrammingSessionMutation();
  const [toggleFabOnHold] = useToggleFabOnHoldMutation();
  const [createFabNote] = useCreateFabNoteMutation();
  const [addFilesToFinalProgramming] = useAddFilesToFinalProgrammingMutation();
  const [completeFinalProgramming] = useCompleteFinalProgrammingMutation();

  // Timer / Session State
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // File State
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFileMetas, setUploadedFileMetas] = useState<UploadedFileMeta[]>([]);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);

  // View State – unified file viewer
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // Sync with session API
  useEffect(() => {
    if (fpSessionData?.data) {
      const session = fpSessionData.data;
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
  }, [fpSessionData]);

  // Helper: Normalize any file object for FileViewer
  const enhanceFileForViewer = (file: any) => ({
    ...file,
    id: file.id,
    name: file.name || file.file_name,
    size: parseInt(file.file_size) || file.size || 0,
    type: file.file_type || file.type || '',
    url: file.file_url || file.url,
    file_url: file.file_url || file.url,
    stage: getFileStage(file.name || file.file_name, {
      currentStage: 'final_programming',
      isDrafting: false,
    }),
    formattedSize: formatBytes(parseInt(file.file_size) || file.size || 0),
    uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
    uploadedBy: file.uploaded_by || currentUser?.name || 'Unknown',
  });

  // File click handler – used by UploadDocuments AND Documents
  const handleFileClick = (file: any) => {
    const enhanced = enhanceFileForViewer(file);
    setActiveFile(enhanced);
    setViewMode('file');
  };

  // Handle time tracking events
  const handleStart = useCallback(async (startTime: Date) => {
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

        await refetchFPSession();
        toast.success('Final programming session started');
      } catch (error) {
        console.error('Failed to start final programming session:', error);
        toast.error('Failed to start final programming session');
        return;
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

      // Pause the session if it's running
      await manageFinalProgrammingSession({
        fab_id: fabId,
        data: {
          action: 'pause',
          note: data?.note ? `[On Hold] ${data.note}` : '[On Hold]',
          sqft_drafted: data?.sqft_drafted,
          timestamp: new Date().toISOString(),
        }
      }).unwrap();

      setIsPaused(true);

      await refetchFPSession();
      await refetchFab();
      toast.success('Job placed on hold');
    } catch (error) {
      console.error('Failed to place on hold:', error);
      toast.error('Failed to place on hold');
    }
  }, [fabId, toggleFabOnHold, createFabNote, manageFinalProgrammingSession, refetchFPSession, refetchFab]);

  // Local file selection (from UploadDocuments)
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

  // Determine if upload section should be visible – show when timer is running/paused or files exist
  const shouldShowUploadSection = (isDrafting || isPaused) || ((fabData as any)?.draft_data?.files?.length > 0);

  // Determine if submission is allowed – session must be ended (not active/paused) and files must exist
  const hasFiles = ((fabData as any)?.draft_data?.files?.length > 0);
  const canOpenSubmit =  hasFiles;

  const handleOpenSubmissionModal = async () => {
    try {
      setShowSubmissionModal(true);
    } catch (error) {
      console.error('Failed to prepare files for submission:', error);
    }
  };

  if (isFabLoading || isFPLoading) return <div>Loading...</div>;

  // Sidebar data
  const sidebarSections = [
    {
      title: 'Job Details',
      type: 'details',
      items: [
        { label: 'FAB ID', value: fabData?.id ? `FAB-${fabData.id}` : 'N/A' },
        { label: 'FAB Type', value: fabData?.fab_type || 'N/A' },
        { label: 'Job name', value: fabData?.job_details?.name || 'N/A' },
        { label: 'Job #', value: fabData?.job_details?.job_number || 'N/A' },
        { label: 'Area (s)', value: fabData?.input_area || 'N/A' },
        { label: 'Stone type', value: fabData?.stone_type_name || 'N/A' },
        { label: 'Stone color', value: fabData?.stone_color_name || 'N/A' },
        { label: 'Stone thickness', value: fabData?.stone_thickness_value || 'N/A' },
        { label: 'Edge', value: fabData?.edge_name || 'N/A' },
        { label: 'Total square ft', value: fabData?.total_sqft || 'N/A' },
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
          final_programming: { label: 'Final Programming', color: 'text-purple-700' },
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

  // -------------------- RENDER – MAIN LAYOUT (sidebar always visible) --------------------
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
                      FINAL PROGRAMMING
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fabData?.status_id === 0
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
                    <CardTitle>Final Programming Activity</CardTitle>
                    <p className="text-sm text-[#4B5563]">Update your final programming activity here</p>
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
                  sessionData={fpSessionData}
                  isFabOnHold={fabData?.on_hold}
                />

                <Separator className="my-3" />

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Files</h3>

                  {shouldShowUploadSection ? (
                    <UploadDocuments
                      onFilesChange={handleFilesChange}
                      onFileClick={handleFileClick}
                      draftingId={fabData?.draft_data?.id}
                      refetchFiles={refetchFab}
                      stage="final_programming"
                      disabled={!isDrafting && !isPaused}
                    />
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500">Start the timer to enable file uploads</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Files will appear here once uploaded
                      </p>
                    </div>
                  )}
                </div>

                {/* Display uploaded files from server */}
                {fabData?.draft_data?.files && fabData.draft_data.files.length > 0 && viewMode === 'activity' && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Uploaded Files</h3>
                    <Documents
                      draftingData={{
                        ...fabData.draft_data,
                        files: fabData.draft_data.files.filter((file: any) =>
                          file.stage === 'final_programming' ||
                          file.stage === 'cut_list' ||
                          (file.stage && file.stage.toLowerCase().includes('final_programming')) ||
                          (file.stage && file.stage.toLowerCase().includes('cut_list'))
                        ),
                        file_ids: ""
                      }}
                      onFileClick={handleFileClick}
                    />
                  </div>
                )}
              </CardContent>
              <div className="flex justify-end p-6 pt-0">
                <Can action="create" on="Final Programming">
                  <Button
                    onClick={handleOpenSubmissionModal}
                    disabled={!canOpenSubmit}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    Submit Final Programming Work
                  </Button>
                </Can>
              </div>
            </Card>

            <SubmissionModal
              open={showSubmissionModal}
              onClose={(success?: boolean) => {
                setShowSubmissionModal(false);
                if (success) {
                  handleEnd(new Date());
                  navigate('/job/final-programming');
                }
              }}
              drafting={fpSessionData?.data}
              uploadedFiles={uploadedFileMetas.map(meta => ({ ...meta }))}
              draftStart={draftStart}
              draftEnd={draftEnd}
              totalTime={totalTime}
              fabId={fabId}
              userId={currentEmployeeId}
              fabData={fabData}
            />
          </>
        )}
      </Container>
    </div>
  );
}

export default FinalProgrammingDetailsPage;
