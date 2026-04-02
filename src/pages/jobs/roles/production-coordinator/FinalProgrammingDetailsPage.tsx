import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // ← added useNavigate import
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { X, Plus } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { Documents } from '@/pages/shop/components/files';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { SubmissionModal } from './components/SubmissionModal';
import { UniversalUploadModal } from '@/components/universal-upload';
import { BackButton } from '@/components/common/BackButton';
import { Can } from '@/components/permission';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useGetFabByIdQuery,
  useGetFinalProgrammingSessionStatusQuery,
  useManageFinalProgrammingSessionMutation,
  useToggleFabOnHoldMutation,
  useCreateFabNoteMutation,
  useAddFilesToDraftingMutation,
  useCompleteFinalProgrammingMutation,
  useDeleteFileFromDraftingMutation
} from '@/store/api/job';

import { UploadedFileMeta } from '@/types/uploads';
import { FileWithPreview } from '@/hooks/use-file-upload';
import { getFileStage } from '@/utils/file-labeling';
import { FileViewer } from '../drafters/components';

// Helper functions
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getAllFabNotes = (fabNotes: any[]) => fabNotes || [];

const getFabStatusInfo = (statusId: number | undefined) => {
  if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
  if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
  return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
};

export function FinalProgrammingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? Number(id) : 0;
  const navigate = useNavigate(); // now defined

  const currentUser = useSelector((s: any) => s.user.user);
  const currentEmployeeId = currentUser?.employee_id || currentUser?.id;

  // API hooks
  const { data: fabData, isLoading: isFabLoading, refetch: refetchFab } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const { data: fpSessionData, isLoading: isFPLoading, refetch: refetchFPSession } = useGetFinalProgrammingSessionStatusQuery(fabId, { skip: !fabId });

  const [manageFinalProgrammingSession] = useManageFinalProgrammingSessionMutation();
  const [toggleFabOnHold] = useToggleFabOnHoldMutation();
  const [createFabNote] = useCreateFabNoteMutation();
  const [addFilesToFinalProgramming] = useAddFilesToDraftingMutation();
  const [completeFinalProgramming] = useCompleteFinalProgrammingMutation();
  const [deleteFileFromDraft] = useDeleteFileFromDraftingMutation();

  // Timer state
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // File state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFileMetas, setUploadedFileMetas] = useState<UploadedFileMeta[]>([]);
  const [fileDesign, setFileDesign] = useState<string>('');
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Sync session data
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

  // Helper: should show upload section (mirror draft details)
  const shouldShowUploadSection = (isDrafting && !isPaused) || (fabData?.draft_data?.files?.length > 0);

  // Helper: enhance file for viewer
  const enhanceFileForViewer = (file: any) => ({
    ...file,
    id: file.id,
    name: file.name || file.file_name,
    size: parseInt(file.file_size) || file.size || 0,
    type: file.file_type || file.type || '',
    url: file.file_url || file.url,
    file_url: file.file_url || file.url,
    stage_name: file.stage_name ?? file.stage,
    stage: getFileStage(file.name || file.file_name, {
      currentStage: 'final_programming',
      isDrafting: false,
    }),
    formattedSize: formatBytes(parseInt(file.file_size) || file.size || 0),
    uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
    file_design: file.file_design,
    uploaded_by_name: file.uploaded_by_name ?? file.uploader_name ?? file.uploaded_by ?? currentUser?.name ?? 'Unknown',
    uploadedBy: file.uploaded_by_name ?? file.uploader_name ?? file.uploaded_by ?? currentUser?.name ?? 'Unknown',
  });

  const handleFileClick = (file: any) => {
    setActiveFile(enhanceFileForViewer(file));
    setViewMode('file');
  };

  // Time tracking handlers
 const handleStart = useCallback(async (startTime: Date) => {
  // Read the latest fabData directly
  const hasDraftingAssignment = fabData?.draft_data?.id;
  console.log('Attempting to start session with drafting assignment:', hasDraftingAssignment);
  if (!hasDraftingAssignment) {
    toast.error('Cannot start final programming session - no drafting history found');
    return;
  }
  try {
    await manageFinalProgrammingSession({
      fab_id: fabId,
      data: { action: 'start', started_by: currentEmployeeId, timestamp: startTime.toISOString() }
    }).unwrap();
    await refetchFPSession();
    toast.success('Final programming session started');
    setIsDrafting(true);
    setIsPaused(false);
    setHasEnded(false);
    setDraftStart(startTime);
  } catch (error) {
    console.error('Failed to start session:', error);
    toast.error('Failed to start session');
  }
}, [fabData, fabId, currentEmployeeId, manageFinalProgrammingSession, refetchFPSession]);

  const handlePause = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    try {
      await manageFinalProgrammingSession({
        fab_id: fabId,
        data: { action: 'pause', note: data?.note, sqft_drafted: data?.sqft_drafted, timestamp: new Date().toISOString() }
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
        data: { action: 'resume', note: data?.note, sqft_drafted: data?.sqft_drafted, timestamp: new Date().toISOString() }
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
        data: { action: 'end', timestamp: endDate.toISOString() }
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
        await createFabNote({ fab_id: fabId, note: data.note, stage: 'final_programming' }).unwrap();
      }
      await manageFinalProgrammingSession({
        fab_id: fabId,
        data: { action: 'pause', note: data?.note ? `[On Hold] ${data.note}` : '[On Hold]', sqft_drafted: data?.sqft_drafted, timestamp: new Date().toISOString() }
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

  // File deletion
  const handleDeleteFile = async (fileId: number) => {
    if (!fabData?.draft_data?.id) {
      toast.error('Drafting entry not found');
      return;
    }
    try {
      await deleteFileFromDraft({ drafting_id: fabData.draft_data.id, file_id: String(fileId) }).unwrap();
      toast.success('File deleted successfully');
      refetchFab();
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  // Compute files for final programming
  const finalProgrammingFiles = useMemo(() => {
    if (!fabData?.draft_data?.files) return [];
    return fabData.draft_data.files.filter((file: any) => {
      const stageKey = file.stage_name ?? file.stage;
      return stageKey === 'final_programming' || stageKey === 'cut_list' || stageKey?.toLowerCase().includes('final_programming');
    });
  }, [fabData]);

  const hasFinalProgrammingFiles = finalProgrammingFiles.length > 0;
  const canOpenSubmit = hasFinalProgrammingFiles && !isPaused && isDrafting;

  const handleOpenSubmissionModal = async () => {
    setShowSubmissionModal(true);
  };

  // Loading skeleton (mirror draft details)
  if (isFabLoading || isFPLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
          <Skeleton className="h-8 w-72 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          <div className="w-full lg:w-[220px] xl:w-[260px] shrink-0 border-r">
            <Skeleton className="h-full min-h-[300px] w-full" />
          </div>
          <div className="flex-1 p-4 sm:p-6 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Sidebar sections
  const sidebarSections = [
    {
      title: 'Job Details',
      type: 'details',
      items: [
        { label: "Account Name", value: fabData?.account_name || '—' },
        {
          label: "Fab ID",
          value: <Link to={`/sales/${fabData?.id}`} className="text-primary hover:underline">{fabData?.id}</Link>,
        },
        { label: "Area", value: fabData?.input_area || '—' },
        {
          label: "Material",
          value: fabData?.stone_type_name
            ? `${fabData.stone_type_name} - ${fabData.stone_color_name || ''} - ${fabData.stone_thickness_value || ''}`
            : '—',
        },
        { label: "Fab Type", value: <span className="uppercase">{fabData?.fab_type || '—'}</span> },
        { label: "Edge", value: fabData?.edge_name || '—' },
        { label: "Total s.f.", value: fabData?.total_sqft?.toString() || '—' },
        {
          label: "Scheduled Date",
          value: fabData?.templating_schedule_start_date
            ? new Date(fabData.templating_schedule_start_date).toLocaleDateString()
            : 'Not scheduled',
        },
        { label: "Drafter Assigned", value: fabData?.draft_data?.drafter_name || 'Unassigned' },
        { label: "Sales Person", value: fabData?.sales_person_name || '—' },
        { label: "SlabSmith Needed", value: fabData?.slab_smith_ag_needed ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Notes',
      type: 'notes',
      notes: fabData?.notes?.map((note: string, index: number) => ({
        id: index,
        avatar: 'N',
        content: note,
        author: '',
        timestamp: '',
      })) || [],
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

  const jobNameLink = fabData?.job_details?.id ? `/job/details/${fabData.job_details.id}` : '#';
  const jobNumberLink = fabData?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fabData.job_details.job_number}`
    : '#';
  const statusInfo = getFabStatusInfo(fabData?.status_id);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="px-3 sm:px-4 lg:px-6">
          <Toolbar className="py-2 sm:py-3">
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <ToolbarHeading
                title={
                  <div className="text-base sm:text-lg lg:text-2xl font-bold leading-tight">
                    <a href={jobNameLink} className="hover:underline">
                      {fabData?.job_details?.name || `Job ${fabData?.job_id}`}
                    </a>
                    <span className="mx-1 text-gray-400">·</span>
                    <a
                      href={jobNumberLink}
                      className="hover:underline text-gray-600"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {fabData?.job_details?.job_number || fabData?.job_id}
                    </a>
                  </div>
                }
                description="Final Programming Details"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                  {statusInfo.text}
                </span>
                <BackButton />
              </div>
            </div>
          </Toolbar>
        </div>
      </div>

      {/* Main two‑column layout */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Sticky sidebar */}
        <aside
          className={[
            'w-full bg-white border-b',
            'lg:w-[220px] xl:w-[260px] lg:shrink-0',
            'lg:sticky lg:top-[50px]',
            'lg:self-start',
            'lg:max-h-[calc(100vh-50px)]',
            'lg:overflow-y-auto',
            'lg:border-b-0 lg:border-r',
          ].join(' ')}
        >
          <GraySidebar sections={sidebarSections as any} jobId={fabData?.job_id} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-5 space-y-4">
          {viewMode === 'file' && activeFile ? (
            // File viewer
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                <div>
                  <h3 className="font-semibold text-sm">{activeFile.name}</h3>
                  <p className="text-xs text-gray-500">
                    {activeFile.formattedSize} · {activeFile.stage?.label || activeFile.stage}
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
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <FileViewer
                file={activeFile}
                onClose={() => {
                  setViewMode('activity');
                  setActiveFile(null);
                }}
              />
            </div>
          ) : (
            // Activity mode
            <>
              <Card>
                <CardHeader className="py-3 px-4 sm:px-5 block">
                  <CardTitle className="text-sm sm:text-base">Final Programming Activity</CardTitle>
                  <CardDescription className="text-xs text-gray-500 mt-0.5">Update your final programming activity here</CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-5 space-y-5">
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
                    isFabOnHold={fabData?.status_id === 0}
                  />

                  <Separator />

                  {/* File section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Uploaded files</h3>
                      <Can action="create" on="FinalProgramming">
                        <Button
                          variant="dashed"
                          size="sm"
                          onClick={() => setShowUploadModal(true)}
                          disabled={!isDrafting || isPaused || hasEnded}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Files
                        </Button>
                      </Can>
                    </div>

                    {shouldShowUploadSection ? (
                      <Documents
                        onFileClick={handleFileClick}
                        draftingData={fabData?.draft_data}
                        draftingId={fabData?.draft_data?.id}
                        showDeleteButton={!hasEnded && !isPaused}
                      />
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-500">Start the timer to enable file uploads</p>
                        <p className="text-xs text-gray-400 mt-1">Files will appear here once uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* Submit button */}
                  <div className="flex justify-end gap-2 pt-2">
                    <BackButton fallbackUrl="/job/final-programming" label="Cancel" />
                    <Can action="create" on="Final Programming">
                      <Button
                        onClick={handleOpenSubmissionModal}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={!canOpenSubmit}
                      >
                        Submit Final Programming Work
                      </Button>
                    </Can>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>

      {/* Modals */}
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
        uploadedFiles={uploadedFileMetas.map((meta) => ({ ...meta, stage_name: 'final_programming' }))}
        fabId={fabId}
        userId={currentEmployeeId}
      />

      <UniversalUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        title="Upload Final Programming Files"
        entityId={fabData?.draft_data?.id}
        uploadMutation={addFilesToFinalProgramming}
        stages={[
          { value: 'cut_list', label: 'Cut List' },
          { value: 'final_programming', label: 'Final Programming' },
        ]}
        fileTypes={[
          { value: 'block_drawing', label: 'Block Drawing' },
          { value: 'layout', label: 'Layout' },
          { value: 'ss_layout', label: 'SS Layout' },
          { value: 'shop_drawing', label: 'Shop Drawing' },
          { value: 'photo_media', label: 'Photo / Media' },
        ]}
        additionalParams={{
          drafting_id: fabData?.draft_data?.id,
          stage_name: 'final_programming',
        }}
        onUploadComplete={() => {
          toast.success('Files uploaded successfully');
          refetchFab();
          setShowUploadModal(false);
          setFileDesign('');
        }}
      />
    </div>
  );
}

export default FinalProgrammingDetailsPage;