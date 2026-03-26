// DrafterDetailsPageRefactor.tsx - FIXED DOUBLE SUBMIT VERSION
import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
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
  useManageDraftingSessionMutation,
  useGetCurrentDraftingSessionQuery,
  useToggleFabOnHoldMutation,
  useCreateFabNoteMutation,
  useDeleteFileFromDraftingMutation,
  useAddFilesToDraftingMutation
} from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { Documents } from '@/pages/shop/components/files';
import { FileViewer } from './components/FileViewer';
import { SubmissionModal } from './components/SubmissionModal';
import { SessionHistory } from './components/SessionHistory';
import { useSelector } from 'react-redux';
import { X, Plus } from 'lucide-react';
import { Can } from '@/components/permission';
import { useTabClosingWarning } from '@/hooks';
import { BackButton } from '@/components/common/BackButton';
import { getFileStage, EnhancedFileMetadata } from '@/utils/file-labeling';
import { formatBytes } from '@/hooks/use-file-upload';
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
import { UniversalUploadModal } from '@/components/universal-upload';

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
  const { data: fabData, isLoading: isFabLoading, refetch: refetchFab } = useGetFabByIdQuery(fabId, {
    skip: !fabId,
    refetchOnMountOrArgChange: true,
  });
  const { data: draftingData, isLoading: isDraftingLoading, refetch: refetchDrafting } = useGetDraftingByFabIdQuery(fabId, {
    skip: !fabId,
    refetchOnMountOrArgChange: true,
  });

  // Get current session state
  const { data: sessionData, isLoading: isSessionLoading, refetch: refetchSession } = useGetCurrentDraftingSessionQuery(fabId, {
    skip: !fabId,
    refetchOnMountOrArgChange: true,
  });

  const [manageDraftingSession] = useManageDraftingSessionMutation();
  const [toggleFabOnHold] = useToggleFabOnHoldMutation();
  const [createFabNote] = useCreateFabNoteMutation();
  const [deleteDraftingFile] = useDeleteFileFromDraftingMutation();
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();

  // Use draft_data from FAB response for displaying existing files
  const draftData = fabData?.draft_data;

  // Local UI state
  const [totalTime, setTotalTime] = useState<number>(0);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // Session status derived from sessionData
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'drafting' | 'paused' | 'on_hold' | 'ended'>('idle');

  // File state
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileDesign, setFileDesign] = useState<string>(''); // File design input

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

  // Extract existing files from draft_data
  const existingFilesFromServer = draftData?.files || [];

  // All files for display - only from server (UploadDocuments handles new uploads internally)
  const allFilesForDisplay = useMemo(() => {
    const files = existingFilesFromServer.map((file: any) => ({
      id: file.id,
      name: file.name || file.file_name,
      size: parseInt(file.file_size) || file.size || 0,
      type: file.file_type || file.type || '',
      url: file.file_url || file.url,
      file_url: file.file_url || file.url,
      stage: getFileStage(file.name || file.file_name, {
        currentStage: 'drafting',
        isDrafting: true
      }),
      stage_name: file.stage_name ?? file.stage ?? getFileStage(file.name || file.file_name, {
        currentStage: 'drafting',
        isDrafting: true
      }).stage,
      file_design: file.file_design,
      uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
      uploaded_by_name: file.uploaded_by_name ?? file.uploader_name ?? file.uploaded_by ?? currentUser?.name ?? 'Unknown',
      uploadedBy: file.uploaded_by_name ?? file.uploader_name ?? file.uploaded_by ?? currentUser?.name ?? 'Unknown',
      fromServer: true
    }));

    return files;
  }, [existingFilesFromServer, currentUser]);

  // Session management functions
  const createOrStartSession = async (action: 'start' | 'resume', startDate: Date, note?: string, sqftDrafted?: string, workPercentage?: string) => {
    try {
      await manageDraftingSession({
        fab_id: fabId,
        data: {
          action: action,
          drafter_id: currentEmployeeId,
          timestamp: formatTimestamp(startDate),
          note: note,
          sqft_drafted: sqftDrafted,
          work_percentage_done: workPercentage
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

  const actionPastTense: Record<string, string> = {
    start: "started",
    resume: "resumed",
    pause: "paused",
    on_hold: "placed on hold",
    end: "ended",
  };

  const updateSession = async (action: 'pause' | 'on_hold' | 'end', timestamp: Date, note?: string, sqftDrafted?: string, workPercentage?: string) => {
    try {
      await manageDraftingSession({
        fab_id: fabId,
        data: {
          action: action,
          drafter_id: currentEmployeeId,
          timestamp: formatTimestamp(timestamp),
          note: note,
          sqft_drafted: sqftDrafted,
          work_percentage_done: workPercentage
        }
      }).unwrap();

      setSessionStatus(action === 'end' ? 'ended' : action === 'on_hold' ? 'on_hold' : 'paused');
      setDraftEnd(timestamp);

      await refetchSession();
      toast.success(`Session ${actionPastTense[action]} successfully`);
    } catch (error) {
      console.error(`Failed to ${action} session:`, error);
      toast.error(`Failed to ${action} session`);
      throw error;
    }
  };

  // Time tracking handlers
  const handleStart = async (startDate: Date, data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
    // Check if drafting exists before starting - check both drafting query and FAB data
    const hasDraftingAssignment = draftingData?.id || fabData?.draft_data?.id;

    if (!hasDraftingAssignment) {
      toast.error('Cannot start drafting session - no drafting assignment found');
      return;
    }

    try {
      await createOrStartSession('start', startDate, data?.note, data?.sqft_drafted, data?.work_percentage_done);
    } catch (error) {
      // Error handled in createOrStartSession
    }
  };

  const handlePause = async (data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
    try {
      await updateSession('pause', new Date(), data?.note, data?.sqft_drafted, data?.work_percentage_done);
    } catch (error) {
      // Error handled in updateSession
    }
  };

  const handleResume = async (data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
    try {
      await createOrStartSession('resume', new Date(), data?.note, data?.sqft_drafted, data?.work_percentage_done);
    } catch (error) {
      // Error handled in createOrStartSession
    }
  };

  const handleEnd = async (endDate: Date, data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
    try {
      await updateSession('end', endDate, data?.note, data?.sqft_drafted, data?.work_percentage_done);
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

  // File handling functions
  const handleFileClick = (file: any) => {
    // Ensure we have all necessary properties for the file viewer
    const enhancedFile = {
      ...file,
      // stage: getFileStage(file.name, { isDrafting: true }),
      url: file.file_url || file.url || file.fileUrl,
      name: file.name || file.file_name,
      type: file.file_type || file.type || '',
      size: parseInt(file.file_size) || file.size || 0,
      formattedSize: formatBytes(parseInt(file.file_size) || file.size || 0),
      uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
      stage_name: file.stage_name ?? file.stage,
      file_design: file.file_design,
      uploaded_by_name: file.uploaded_by_name ?? file.uploader_name ?? file.uploaded_by ?? currentUser?.name ?? 'Unknown',
      uploadedBy: file.uploaded_by_name ?? file.uploader_name ?? file.uploaded_by ?? currentUser?.name ?? 'Unknown'
    };

    setActiveFile(enhancedFile);
    setViewMode('file');
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    const draftingId = draftingData?.id || fabData?.draft_data?.id;
    if (!draftingId) {
      return;
    }

    try {
      await deleteDraftingFile({
        drafting_id: draftingId,
        file_id: fileId
      }).unwrap();

      // Refresh data
      await refetchFab();
      await refetchDrafting();

      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  // Combined refetch function
  const refetchAllFiles = useCallback(async () => {
    try {
      await Promise.all([
        refetchFab(),
        refetchDrafting(),
        refetchSession()
      ]);
    } catch (error) {
      console.error('Failed to refetch files:', error);
    }
  }, [refetchFab, refetchDrafting, refetchSession]);

  // Show upload section when timer is running, paused, OR when files have been uploaded (to maintain visibility after ending)
  const shouldShowUploadSection = (isDrafting || isPaused) || allFilesForDisplay.length > 0;

  // Determine if submission is allowed
  const canOpenSubmit = isDrafting && totalTime > 0 && allFilesForDisplay.length > 0;

  // Open submission modal directly (file upload happens in modal)
  const handleOpenSubmissionModal = async () => {
    setShowSubmissionModal(true);
  };

  const onSubmitModal = async () => {
    try {
      await refetchAllFiles();

      setShowSubmissionModal(false);
      // Clear all local state after successful submission
      setTotalTime(0);
      setDraftStart(null);
      setDraftEnd(null);
      setSessionStatus('idle');

      navigate('/job/draft');
    } catch (err) {
      console.error(err);
      toast.error('Failed to finalize submission flow');
    }
  };

  // Prepare clickable links
  const jobNameLink = fabData?.job_details?.id ? `/job/details/${fabData.job_details.id}` : '#';
  const jobNumberLink = fabData?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fabData.job_details.job_number}`
    : '#';

  // Sidebar sections – now includes all required Job Details fields
  const sidebarSections = fabData ? [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "Account Name", value: fabData.account_name || '—' },
        {
          label: "Fab ID",
          value: (
            <Link to={`/sales/${fabData.id}`} className="text-primary hover:underline">
              FAB-{fabData.id}
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
        { label: "Assigned to", value: fabData.draft_data?.drafter_name || 'Unassigned' },
        { label: "Sales Person", value: fabData.sales_person_name || '—' },
        { label: "SlabSmith Needed", value: fabData.slab_smith_ag_needed ? 'Yes' : 'No' },
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
  ] : [];

  // Prepare enhanced file metadata for SubmissionModal
  const filesForSubmission: EnhancedFileMetadata[] = allFilesForDisplay.map(file => ({
    id: file.id!,
    name: file.name,
    size: file.size,
    type: file.type,
    url: file.url || file.file_url,
    stage: file.stage,
    uploadedAt: file.uploadedAt,
    uploadedBy: file.uploadedBy,
    file: null
  }));

  if (isFabLoading || isDraftingLoading || isSessionLoading) {
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
        <div className="border-t flex flex-col lg:flex-row gap-3 xl:gap-4 items-start max-w-full">
          <div className="w-full lg:w-[250px] xl:w-[286px] ultra:w-[500px] lg:flex-shrink-0">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:flex-1 min-w-0">
            <Container className='mx-0 max-w-full px-0'>
              <div className='max-w-6xl w-full mx-auto lg:mr-auto'>
                <Card className='my-4'>
                  <CardHeader className='flex flex-col items-start py-4'>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                  </CardHeader>
                </Card>
                <Card>
                  <CardContent>
                    <Skeleton className="h-96 w-full" />
                  </CardContent>
                </Card>
              </div>
            </Container>
          </div>
        </div>
      </Container>
    );
  }

  const statusInfo = getFabStatusInfo(fabData?.status_id);

  return (
    <>
      {/* 🔹 TOP TOOLBAR with clickable job name/number + description + status badge */}
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
                  <a href={jobNumberLink} className="hover:underline" target="_blank">
                    {fabData?.job_details?.job_number || fabData?.job_id}
                  </a>
                </div>
              }
              description="Drafting Details"
            />
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                {statusInfo.text}
              </span>
            </div>
          </div>
        </Toolbar>
      </Container>

      <div className="border-t grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <div className="lg:col-span-3 w-full lg:w-[200px] 2xl:w-[286px] ultra:w-[500px]">
          <GraySidebar
            sections={sidebarSections as any}
            jobId={fabData?.job_id}
          />
        </div>
        <Container className="lg:col-span-9 px-0 mx-0">
          {viewMode === 'file' && activeFile ? (
            <div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-t-lg">
                <div>
                  <h3 className="font-semibold">{activeFile.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatBytes(activeFile.size)} • {activeFile.stage?.label || activeFile.stage}
                  </p>
                </div>
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        {
                          idle: 'bg-gray-100 text-gray-800',
                          drafting: 'bg-green-100 text-green-800',
                          paused: 'bg-yellow-100 text-yellow-800',
                          on_hold: 'bg-orange-100 text-orange-800',
                          ended: 'bg-blue-100 text-blue-800',
                        }[sessionStatus] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {{
                          idle: 'Ready to Start',
                          drafting: 'Drafting Active',
                          paused: 'Paused',
                          on_hold: 'On Hold',
                          ended: 'Completed',
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
                    uploadedFilesCount={allFilesForDisplay.length}
                  />

                  <Separator className="my-6" />

                  {/* File Upload Section - Using Final Programming style UI */}
                  <div className="mb-6">

                    {/* File Design Input */}
                    {/* {shouldShowUploadSection && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-gray-700 block mb-2">
                          File Type *
                        </label>
                        <Select
                          value={fileDesign}
                          onValueChange={(value) => setFileDesign(value)}
                          disabled={hasEnded || isOnHold || isPaused}
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
                    )} */}

                    {shouldShowUploadSection ? (
                      <div className="space-y-4">
                        {/* Upload Button */}
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">Uploaded files</h3>
                          <Can action="create" on="Drafting">
                            <Button
                              variant="dashed"
                              size="sm"
                              onClick={() => setShowUploadModal(true)}
                              disabled={hasEnded || isOnHold || isPaused}
                              className="flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Files
                            </Button>
                          </Can>
                        </div>
                        
                        {/* File Display */}
                        <Documents
                          onFileClick={handleFileClick}
                          draftingData={fabData?.draft_data}
                          // onDeleteFile={handleDeleteFile}
                          draftingId={draftingData?.id || fabData?.draft_data?.id}
                          showDeleteButton={!hasEnded && !isOnHold}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500">Start the timer to enable file uploads</p>
                        <p className="text-sm text-gray-400 mt-2">
                          Files will appear here once uploaded
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  {viewMode === 'activity' && (
                    <div className="flex justify-end gap-3 mt-6">
                      <BackButton fallbackUrl="/job/draft" label="Cancel" />
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

              <SessionHistory fabId={fabId} />
            </>
          )}
        </Container>

        {showSubmissionModal && (
          <SubmissionModal
            open={showSubmissionModal}
            onClose={() => setShowSubmissionModal(false)}
            drafting={draftingData}
            uploadedFiles={filesForSubmission}
            fabId={fabId}
            userId={currentEmployeeId}
            fabData={fabData}
          />
        )}

        {/* Upload Modal */}
        <UniversalUploadModal
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
          title="Upload Drafting Files"
          entityId={draftingData?.id || fabData?.draft_data?.id}
          uploadMutation={addFilesToDrafting}
          stages={[
            { value: 'drafting', label: 'Drafting' },
            { value: 'pre_draft_review', label: 'Pre-Draft Review' },
            { value: 'revision', label: 'Revision' },
          ]}
          fileTypes={[
            { value: 'block_drawing', label: 'Block Drawing' },
            { value: 'layout', label: 'Layout' },
            { value: 'ss_layout', label: 'SS Layout' },
            { value: 'shop_drawing', label: 'Shop Drawing' },
          ]}
          additionalParams={{
            drafting_id: draftingData?.id || fabData?.draft_data?.id,
            stage_name: 'drafting',
          }}
          onUploadComplete={() => {
            toast.success('Files uploaded successfully');
            refetchFab();
            refetchDrafting();
            setShowUploadModal(false);
          }}
        />
      </div>
    </>
  );
}

export default DrafterDetailsPage;