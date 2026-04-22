// SlabSmithDetailsPage.tsx - REFACTORED TO MATCH DRAFT DETAILS LAYOUT
import React, { useCallback, useState, useEffect, useMemo } from 'react';
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
  useDeleteFileFromSlabSmithMutation,
  useManageSlabSmithSessionMutation,
  useGetSlabSmithSessionStatusQuery,
  useToggleFabOnHoldMutation,
  useCreateFabNoteMutation,
} from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { Documents } from '@/pages/shop/components/files';
import { SubmissionModal } from './components/SubmissionModal';
import { useSelector } from 'react-redux';
import { X, Plus } from 'lucide-react';
import { Can } from '@/components/permission';
import { getFileStage } from '@/utils/file-labeling';
import { BackButton } from '@/components/common/BackButton';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { UniversalUploadModal } from '@/components/universal-upload';
import { FileViewer } from '../drafters/components';
import { stageConfig } from '@/utils/note-utils';

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

export function SlabSmithDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? Number(id) : 0;
  const navigate = useNavigate();

  const currentUser = useSelector((s: any) => s.user.user);
  const currentEmployeeId = currentUser?.employee_id || currentUser?.id;
  const isSuperAdmin = currentUser?.is_super_admin || false;

  // Queries
  const { data: fabData, isLoading: isFabLoading, refetch: refetchFab } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const { data: draftingData, isLoading: isDraftingLoading, refetch: refetchDrafting } = useGetDraftingByFabIdQuery(fabId, { skip: !fabId });
  const { data: slabSmithData, isLoading: isSlabSmithLoading, refetch: refetchSlabSmith } = useGetSlabSmithByFabIdQuery(fabId, { skip: !fabId });
  const { data: ssSessionData, isLoading: isSSLoading, refetch: refetchSSSession } = useGetSlabSmithSessionStatusQuery(fabId, { skip: !fabId });

  // Mutations
  const [createSlabSmith] = useCreateSlabSmithMutation();
  const [addFilesToSlabSmith] = useAddFilesToSlabSmithMutation();
  const [deleteFileFromSlabSmith] = useDeleteFileFromSlabSmithMutation();
  const [manageSlabSmithSession] = useManageSlabSmithSessionMutation();
  const [toggleFabOnHold] = useToggleFabOnHoldMutation();
  const [createFabNote] = useCreateFabNoteMutation();

  // Timer state
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // File state
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileDesign, setFileDesign] = useState<string>('');

  // Sync session data
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

  // Helper: enhance file for viewer
  const enhanceFileForViewer = (file: any) => ({
    ...file,
    id: file.id,
    name: file.name || file.file_name,
    size: parseInt(file.file_size) || file.size || 0,
    type: file.file_type || file.type || '',
    url: file.file_url || file.url,
    file_url: file.file_url || file.url,
    stage: getFileStage(file.name || file.file_name, {
      currentStage: 'slab_smith',
      isDrafting: true,
    }),
    stage_name: file.stage_name ?? file.stage ?? 'slab_smith',
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
  const handleStart = useCallback(async (startDate: Date) => {
    if (fabId) {
      // Authorization check: must be drafter_id (slab_smith) or super admin
      const assignedSlabSmithId = slabSmithData?.drafter_id || (fabData as any)?.slabsmith_data?.drafter_id;
      if (!isSuperAdmin && currentEmployeeId !== assignedSlabSmithId) {
        toast.error('You are not authorized to start this SlabSmith session. Only the assigned SlabSmith or super admin can perform this action.');
        return;
      }

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
        // toast.error('Failed to start session');
        return;
      }
    }

    setIsDrafting(true);
    setIsPaused(false);
    setHasEnded(false);
    setDraftStart(startDate);
  }, [fabId, currentEmployeeId, isSuperAdmin, manageSlabSmithSession, refetchSSSession, slabSmithData?.id, slabSmithData?.drafter_id, (fabData as any)?.slabsmith_data?.drafter_id, createSlabSmith, refetchSlabSmith, fabData?.total_sqft]);

  const handlePause = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    // Authorization check: must be drafter_id (slab_smith) or super admin
    const assignedSlabSmithId = slabSmithData?.drafter_id || (fabData as any)?.slabsmith_data?.drafter_id;
    if (!isSuperAdmin && currentEmployeeId !== assignedSlabSmithId) {
      toast.error('You are not authorized to pause this SlabSmith session. Only the assigned SlabSmith or super admin can perform this action.');
      return;
    }

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
  }, [fabId, currentEmployeeId, isSuperAdmin, manageSlabSmithSession, refetchSSSession, slabSmithData?.drafter_id, (fabData as any)?.slabsmith_data?.drafter_id]);

  const handleResume = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    // Authorization check: must be drafter_id (slab_smith) or super admin
    const assignedSlabSmithId = slabSmithData?.drafter_id || (fabData as any)?.slabsmith_data?.drafter_id;
    if (!isSuperAdmin && currentEmployeeId !== assignedSlabSmithId) {
      toast.error('You are not authorized to resume this SlabSmith session. Only the assigned SlabSmith or super admin can perform this action.');
      return;
    }

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
      // toast.error('Failed to resume');
    }
  }, [fabId, currentEmployeeId, isSuperAdmin, manageSlabSmithSession, refetchSSSession, slabSmithData?.drafter_id, (fabData as any)?.slabsmith_data?.drafter_id]);

  const handleOnHold = useCallback(async (data?: { note?: string; sqft_drafted?: string }) => {
    // Authorization check: must be drafter_id (slab_smith) or super admin
    const assignedSlabSmithId = slabSmithData?.drafter_id || (fabData as any)?.slabsmith_data?.drafter_id;
    if (!isSuperAdmin && currentEmployeeId !== assignedSlabSmithId) {
      toast.error('You are not authorized to place this SlabSmith job on hold. Only the assigned SlabSmith or super admin can perform this action.');
      return;
    }

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
      // toast.error('Failed to place on hold');
    }
  }, [fabId, currentEmployeeId, isSuperAdmin, toggleFabOnHold, createFabNote, manageSlabSmithSession, refetchSSSession, slabSmithData?.drafter_id, (fabData as any)?.slabsmith_data?.drafter_id]);

  const handleEnd = useCallback(async (endDate: Date) => {
    // Authorization check: must be drafter_id (slab_smith) or super admin
    const assignedSlabSmithId = slabSmithData?.drafter_id || (fabData as any)?.slabsmith_data?.drafter_id;
    if (!isSuperAdmin && currentEmployeeId !== assignedSlabSmithId) {
      toast.error('You are not authorized to end this SlabSmith session. Only the assigned SlabSmith or super admin can perform this action.');
      return;
    }

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
      // toast.error('Failed to end session');
    }
  }, [fabId, currentEmployeeId, isSuperAdmin, manageSlabSmithSession, refetchSSSession, slabSmithData?.drafter_id, (fabData as any)?.slabsmith_data?.drafter_id]);

  const handleDeleteFile = async (fileId: number) => {
    if (!slabSmithData?.id) {
      toast.error('SlabSmith entry not found');
      return;
    }
    try {
      await deleteFileFromSlabSmith({ slabsmith_id: slabSmithData.id, file_id: String(fileId) }).unwrap();
      toast.success('File deleted successfully');
      refetchFab();
    } catch (error) {
      console.error('Failed to delete file:', error);
      // toast.error('Failed to delete file');
    }
  };

  const refetchAllFiles = useCallback(async () => {
    try {
      await Promise.all([refetchFab(), refetchDrafting(), refetchSlabSmith(), refetchSSSession()]);
    } catch (error) {
      console.error('Failed to refetch files:', error);
    }
  }, [refetchFab, refetchDrafting, refetchSlabSmith, refetchSSSession]);

  const shouldShowUploadSection = (isDrafting && !isPaused) || ((fabData as any)?.slabsmith_data?.files?.length > 0);
  const canOpenSubmit = (fabData as any)?.slabsmith_data?.files?.length > 0 && !isPaused && isDrafting;

  const handleOpenSubmissionModal = async () => {
    setShowSubmissionModal(true);
  };

  const onSubmitModal = async (payload: any) => {
    try {
      await refetchAllFiles();
      setShowSubmissionModal(false);
      navigate('/job/slab-smith');
    } catch (err) {
      console.error(err);
      toast.error('Failed to finalize submission flow');
    }
  };

  // Prepare sidebar sections
  const sidebarSections = useMemo(() => {
    if (!fabData) return [];

    return [
      {
        title: 'Job Details',
        type: 'details',
        items: [
          { label: "Account Name", value: fabData.account_name || '—' },
          {
            label: "Fab ID",
            value: (
              <Link to={`/sales/${fabData.id}`} className="text-primary hover:underline">
                {fabData.id}
              </Link>
            ),
          },
          { label: "Area", value: fabData.input_area || '—' },
          {
            label: "Material",
            value: fabData.stone_type_name
              ? `${fabData.stone_type_name} - ${fabData.stone_color_name || ''} - ${fabData.stone_thickness_value || ''}`
              : '—',
          },
          { label: "Fab Type", value: <span className="uppercase">{fabData.fab_type || '—'}</span> },
          { label: "Edge", value: fabData.edge_name || '—' },
          { label: "Total s.f.", value: fabData.total_sqft?.toString() || '—' },
          {
            label: "Scheduled Date",
            value: fabData.templating_schedule_start_date
              ? new Date(fabData.templating_schedule_start_date).toLocaleDateString()
              : 'Not scheduled',
          },
          { label: "Drafter Assigned", value: (fabData as any)?.slabsmith_data?.drafter_name || 'Unassigned' },
          { label: "Sales Person", value: fabData.sales_person_name || '—' },
          // { label: "SlabSmith Needed", value: fabData.slab_smith_ag_needed || fabData.slab_smith_cust_needed ? 'Yes' : 'No' },
          {
            label: 'SlabSmith Needed',
            value: (() => {
              const custNeeded = fabData.slab_smith_cust_needed;
              const agNeeded = fabData.slab_smith_ag_needed;

              if (custNeeded === false && agNeeded === false) return 'Not Needed';

              const types = [];
              if (custNeeded === true) types.push('Cust');
              if (agNeeded === true) types.push('AG');

              return types.join(' & ') || 'Unknown';
            })()
          },
        ],
      },
      {
        title: 'FAB Notes',
        type: 'notes',
        notes: getAllFabNotes(fabData.fab_notes || []).map((note: any) => {

          const stage = note.stage || 'general';
          const config = stageConfig[stage] || stageConfig.general;
          return {
            id: note.id,
            avatar: note.created_by_name?.charAt(0).toUpperCase() || 'U',
            content: note?.note || '',
            author: note.created_by_name || 'Unknown',
            timestamp: note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date',
            category: config.label,
            categoryColor: config.color,
          };
        }),
      },
    ];
  }, [fabData]);

  // Prepare links
  const jobNameLink = fabData?.job_details?.id ? `/job/details/${fabData.job_details.id}` : '#';
  const jobNumberLink = fabData?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fabData.job_details.job_number}`
    : '#';
  const statusInfo = getFabStatusInfo(fabData?.status_id);

  // Loading skeleton
  if (isFabLoading || isDraftingLoading || isSlabSmithLoading || isSSLoading) {
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
                    <a href={jobNameLink} className="hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
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
                description="SlabSmith Details"
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
                <CardHeader className="py-3 px-4 sm:px-5">
                  <CardTitle className="text-sm sm:text-base">SlabSmith activity</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">Update your SlabSmith activity here</p>
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
                    sessionData={ssSessionData}
                    isFabOnHold={fabData?.status_id === 0}
                  />

                  <Separator />

                  {/* File section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Uploaded files</h3>
                      {/* <Can action="create" on="SlabSmith"> */}
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
                      {/* </Can> */}
                    </div>

                    {shouldShowUploadSection ? (
                      <Documents
                        onFileClick={handleFileClick}
                        slabsmithData={(fabData as any)?.slabsmith_data}
                        draftingId={slabSmithData?.id}
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
                    <BackButton fallbackUrl="/job/slab-smith" label="Cancel" />
                    <Button
                      onClick={handleOpenSubmissionModal}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!canOpenSubmit}
                    >
                      Submit SlabSmith Work
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <UniversalUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        title="Upload SlabSmith Files"
        entityId={slabSmithData?.id}
        uploadMutation={addFilesToSlabSmith}
        stages={[{ value: 'slab_smith', label: 'SlabSmith' }]}
        fileTypes={[
          { value: 'block_drawing', label: 'Block Drawing' },
          { value: 'layout', label: 'Layout' },
          { value: 'ss_layout', label: 'SS Layout' },
          { value: 'shop_drawing', label: 'Shop Drawing' },
          { value: 'photo_media', label: 'Photo / Media' },
        ]}
        additionalParams={{
          slabsmith_id: slabSmithData?.id,
          stage_name: 'slab_smith',
        }}
        onUploadComplete={() => {
          toast.success('Files uploaded successfully');
          refetchAllFiles();
          setShowUploadModal(false);
          setFileDesign('');
        }}
      />

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
        uploadedFiles={[]} // Already handled via server
        draftStart={draftStart}
        draftEnd={draftEnd}
        fabId={fabId}
        userId={currentEmployeeId}
        fabData={fabData}
        slabSmithId={slabSmithData?.id}
      />
    </div>
  );
}

export default SlabSmithDetailsPage;