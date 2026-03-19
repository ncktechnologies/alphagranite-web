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
  useDeleteFileFromSlabSmithMutation,
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
import { getFileStage } from '@/utils/file-labeling';
import { BackButton } from '@/components/common/BackButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
  const [deleteFileFromSlabSmith] = useDeleteFileFromSlabSmithMutation();
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
  const [fileDesign, setFileDesign] = useState<string>('');

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
      currentStage: 'slab_smith',
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

  const handleDeleteFile = async (fileId: number) => {
    if (!slabSmithData?.id) {
      toast.error('SlabSmith entry not found');
      return;
    }
    try {
      await deleteFileFromSlabSmith({ slabsmith_id: slabSmithData?.id, file_id: String(fileId) }).unwrap();
      toast.success('File deleted successfully');
      refetchFab();
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

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
  const shouldShowUploadSection = (isDrafting && !isPaused);
  const hasFiles = ((fabData as any)?.slabsmith_data?.files?.length > 0);
  const canOpenSubmit = hasFiles && !isPaused && isDrafting;

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

  // Prepare clickable links
  const jobNameLink = fabData?.job_details?.id ? `/job/details/${fabData.job_details.id}` : '#';
  const jobNumberLink = fabData?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fabData.job_details.job_number}`
    : '#';

  // Loading state
  if (isFabLoading || isDraftingLoading || isSlabSmithLoading) {
    return (
      <Container className='lg:mx-0 max-w-full'>
        <Toolbar className=''>
          <div className="flex items-center justify-between w-full">
            <div>
              <ToolbarHeading
                title={<Skeleton className="h-8 w-96" />}
                description={<Skeleton className="h-4 w-80 mt-1" />}
              />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </Toolbar>
        <div className="border-t grid grid-cols-1 lg:grid-cols-12 gap-3 items-start h-[calc(100vh-120px)] overflow-y-auto">
          <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px] sticky top-0 self-start">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:col-span-9">
            <Card className='my-4'>
              <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-96 w-full" /></CardContent>
            </Card>
          </div>
        </div>
      </Container>
    );
  }

  const statusInfo = getFabStatusInfo(fabData?.status_id);

  // Sidebar sections – long format Job Details
  const sidebarSections = [
    {
      title: 'Job Details',
      type: 'details',
      items: [
        { label: "Account Name", value: fabData?.account_name || '—' },
        {
          label: "Fab ID",
          value: (
            <Link to={`/sales/${fabData?.id}`} className="text-primary hover:underline">
              FAB-{fabData?.id}
            </Link>
          ),
        },
        { label: "Area", value: fabData?.input_area || '—' },
        {
          label: "Material",
          value: fabData?.stone_type_name
            ? `${fabData.stone_type_name} - ${fabData.stone_color_name || ''} - ${fabData.stone_thickness_value || ''}`
            : '—',
        },
        {
          label: "Fab Type",
          value: <span className="uppercase">{fabData?.fab_type || '—'}</span>,
        },
        { label: "Edge", value: fabData?.edge_name || '—' },
        { label: "Total s.f.", value: fabData?.total_sqft?.toString() || '—' },
        {
          label: "Scheduled Date",
          value: fabData?.templating_schedule_start_date
            ? new Date(fabData.templating_schedule_start_date).toLocaleDateString()
            : 'Not scheduled',
        },
        { label: "Assigned to", value: fabData?.draft_data?.drafter_name || 'Unassigned' },
        { label: "Sales Person", value: fabData?.sales_person_name || '—' },
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
  // RENDER – MAIN LAYOUT
  // -----------------------------------------------------------------
  return (
    <>
      {/* Top toolbar with clickable job name/number and description + status badge */}
      <Container className='lg:mx-0 max-w-full'>
        <Toolbar className=''>
          <div className="flex items-center justify-between w-full">
            <ToolbarHeading
              title={
                <div className="text-2xl font-bold">
                  <a href={jobNameLink} className="hover:underline">
                    {fabData?.job_details?.name || `Job ${fabData?.job_id}`}
                  </a>
                  {' - '}
                  <a href={jobNumberLink} className="hover:underline">
                    {fabData?.job_details?.job_number || fabData?.job_id}
                  </a>
                </div>
              }
              description="SlabSmith Details Page"
            />
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                {statusInfo.text}
              </span>
            </div>
          </div>
        </Toolbar>
      </Container>

      {/* Main grid with sticky sidebar and scrollable content */}
      <div className="border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0 items-start h-[calc(100vh-120px)] overflow-y-auto">
        {/* Sticky sidebar */}
        <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px] sticky top-0 self-start">
          <GraySidebar sections={sidebarSections as any} jobId={fabData?.job_id} />
        </div>

        {/* Main content */}
        <Container className="lg:col-span-9">
          {viewMode === 'file' && activeFile ? (
            // -------------------- FILE VIEWER MODE --------------------
            <div>
              <Card className="my-4">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-3">{activeFile.name}</CardTitle>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">File Size</p>
                          <p className="text-sm text-gray-900">{activeFile.formattedSize}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">File Type</p>
                          <p className="text-sm text-gray-900">{activeFile.type || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Stage</p>
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${activeFile.stage?.color || 'text-gray-700'} bg-gray-100`}>
                            {activeFile.stage?.label || activeFile.stage || 'Unknown'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Uploaded By</p>
                          <p className="text-sm text-gray-900">{activeFile.uploadedBy}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Upload Date & Time</p>
                          <p className="text-sm text-gray-900">
                            {activeFile.uploadedAt?.toLocaleDateString()} at {activeFile.uploadedAt?.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setViewMode('activity');
                        setActiveFile(null);
                      }}
                      className="ml-4"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
              <FileViewer
                file={activeFile}
                onClose={() => {
                  setActiveFile(null);
                  setViewMode('activity');
                }}
              />
            </div>
          ) : (
            // -------------------- ACTIVITY MODE --------------------
            <>
              {/* Removed the old header (FAB-... and status badges) because it's now in the toolbar */}

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

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Files</h3>

                    {/* File Design Input */}
                    {shouldShowUploadSection && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                          File Type *
                        </label>
                        <Select
                          value={fileDesign}
                          onValueChange={(value) => setFileDesign(value)}
                          disabled={!isDrafting}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select file type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Block Drawing">Block Drawing</SelectItem>
                            <SelectItem value="Layout">Layout</SelectItem>
                            <SelectItem value="SS Layout">SS Layout</SelectItem>
                            <SelectItem value="Shop Drawing">Shop Drawing</SelectItem>
                            <SelectItem value="Photo / Media">Photo / Media</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          File type is required before uploading files
                        </p>
                      </div>
                    )}

                    {shouldShowUploadSection ? (
                      <UploadDocuments
                        onFilesChange={handleFilesChange}
                        onFileClick={handleFileClick}
                        slabSmithId={slabSmithData?.id}
                        refetchFiles={refetchFab}
                        stage="slab_smith"
                        fileDesign={fileDesign}
                        onUploadComplete={() => setFileDesign('')}
                        disabled={!isDrafting}
                      />
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        {isPaused ? (
                          <p className="text-gray-500">Session is paused. Please resume to enable file uploads</p>
                        ) : (
                          <>
                            <p className="text-gray-500">Start the timer to enable file uploads</p>
                            <p className="text-sm text-gray-400 mt-2">
                              Files will appear here once uploaded
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Server‑uploaded files */}
                  {(fabData as any)?.slabsmith_data?.files &&
                    (fabData as any).slabsmith_data.files.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900">Uploaded Files from Slabsmith</h3>
                        <Documents
                          slabsmithData={(fabData as any)?.slabsmith_data}
                          onFileClick={handleFileClick}
                          onDeleteFile={(fileId: string) => handleDeleteFile(Number(fileId))}
                          draftingId={slabSmithData?.id}
                        />
                      </div>
                    )}
                </CardContent>

                <div className="flex justify-end p-6 pt-0 gap-2 items-center">
                  <BackButton fallbackUrl="/job/slab-smith" label="Cancel" />
                  <Button
                    onClick={handleOpenSubmissionModal}
                    disabled={!canOpenSubmit}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    Submit SlabSmith Work
                  </Button>
                </div>
              </Card>
            </>
          )}

          {/* Submission Modal */}
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
    </>
  );
}

export default SlabSmithDetailsPage;