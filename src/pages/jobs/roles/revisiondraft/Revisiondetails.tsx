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
  useGetSalesCTByFabIdQuery,
  useGetRevisionsByFabIdQuery,
  useCreateRevisionMutation,
  useUpdateRevisionMutation,
  useAddFilesToDraftingMutation
} from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { useSelector } from 'react-redux';
import { X, Plus } from 'lucide-react';
import { Can } from '@/components/permission';
import { useTabClosingWarning } from '@/hooks';
import { BackButton } from '@/components/common/BackButton';
import { getFileStage, EnhancedFileMetadata } from '@/utils/file-labeling';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileViewer } from '../drafters/components';
import { SessionHistory } from '../drafters/components/SessionHistory';
import { RevisionForm } from './components';
import { Documents } from '@/pages/shop/components/files';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { UniversalUploadModal } from '@/components/universal-upload';
import { stageConfig } from '@/utils/note-utils';

// Helper functions
const formatTimestamp = (date: Date) => date.toISOString().replace('Z', '');
const getAllFabNotes = (fabNotes: any[]) => fabNotes || [];

const getFabStatusInfo = (statusId: number | undefined) => {
  if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
  if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
  return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Improved revision info extraction using both SCT and revisions data
const getRevisionInfo = (fabData: any, sctData: any, revisionsData: any) => {
  // First try to get from revisions table (most accurate)
  const revisionsArray = Array.isArray(revisionsData) ? revisionsData : (revisionsData as any)?.data || [];
  const latestRevision = revisionsArray.length > 0 ? revisionsArray[0] : null;

  if (latestRevision) {
    return {
      revisionType: latestRevision.revision_type || 'general',
      revisionReason: latestRevision.revision_notes || 'No revision reason provided',
      revisionCount: revisionsArray.length,
      salesCTId: latestRevision.sales_ct_id,
      salesCTData: latestRevision,
    };
  }

  // Fallback to SCT data if no revision exists
  const salesCTData = fabData?.sales_ct_data || sctData;
  if (!salesCTData) {
    return {
      revisionType: 'general',
      revisionReason: 'No revision reason provided',
      revisionCount: 0,
      salesCTId: null,
      salesCTData: null,
    };
  }

  let revisionType = 'general';
  const revisionTypeFromSCT = salesCTData?.revision_type;
  if (revisionTypeFromSCT) {
    if (revisionTypeFromSCT.toLowerCase().includes('cad')) revisionType = 'cad';
    else if (revisionTypeFromSCT.toLowerCase().includes('client')) revisionType = 'client';
    else if (revisionTypeFromSCT.toLowerCase().includes('sales')) revisionType = 'sales';
    else if (revisionTypeFromSCT.toLowerCase().includes('template')) revisionType = 'template';
    else revisionType = revisionTypeFromSCT.toLowerCase();
  }

  const revisionCount = salesCTData?.current_revision_count || 0;
  let revisionReason = 'No revision reason provided';

  const fabNotes = fabData?.fab_notes || [];
  const revisionNote = fabNotes.find((note: any) =>
    note.stage === 'sales_ct' ||
    note.note?.includes('[REVISION REQUEST]') ||
    note.note?.includes('revision')
  );

  if (salesCTData?.revision_reason) {
    revisionReason = salesCTData.revision_reason;
  } else if (revisionNote?.note) {
    revisionReason = revisionNote.note.replace('[REVISION REQUEST] ', '');
  } else if (salesCTData?.note) {
    revisionReason = salesCTData.note;
  } else if (salesCTData?.sales_ct_notes) {
    revisionReason = salesCTData.sales_ct_notes;
  }

  return {
    revisionType,
    revisionReason,
    revisionCount,
    salesCTId: salesCTData?.id,
    salesCTData,
  };
};

export function RevisionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? Number(id) : 0;
  const navigate = useNavigate();

  const currentUser = useSelector((s: any) => s.user.user);
  const currentEmployeeId = currentUser?.employee_id || currentUser?.id;
  const isSuperAdmin = currentUser?.is_super_admin || false;

  // API queries
  const { data: fabData, isLoading: isFabLoading, refetch: refetchFab } = useGetFabByIdQuery(fabId, {
    skip: !fabId,
    refetchOnMountOrArgChange: true,
  });
  const { data: draftingData, isLoading: isDraftingLoading, refetch: refetchDrafting } = useGetDraftingByFabIdQuery(fabId, {
    skip: !fabId,
    refetchOnMountOrArgChange: true,
  });
  const { data: sctData, isLoading: isSctLoading, refetch: refetchSct } = useGetSalesCTByFabIdQuery(fabId, {
    skip: !fabId,
    refetchOnMountOrArgChange: true,
  });
  const { data: revisionsData, isLoading: isRevisionsLoading, refetch: refetchRevisions } = useGetRevisionsByFabIdQuery(fabId, {
    skip: !fabId,
    refetchOnMountOrArgChange: true,
  });
  const { data: sessionData, isLoading: isSessionLoading, refetch: refetchSession } = useGetCurrentDraftingSessionQuery(fabId, {
    skip: !fabId,
    refetchOnMountOrArgChange: true,
  });

  const [manageDraftingSession] = useManageDraftingSessionMutation();
  const [toggleFabOnHold] = useToggleFabOnHoldMutation();
  const [createFabNote] = useCreateFabNoteMutation();
  const [deleteDraftingFile] = useDeleteFileFromDraftingMutation();
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();
  const [createRevision] = useCreateRevisionMutation();
  const [updateRevision] = useUpdateRevisionMutation();

  const draftData = fabData?.draft_data;
  const revisionInfo = useMemo(() =>
    getRevisionInfo(fabData, sctData, revisionsData),
    [fabData, sctData, revisionsData]
  );

  // Local state
  const [totalTime, setTotalTime] = useState<number>(0);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'drafting' | 'paused' | 'on_hold' | 'ended'>('idle');
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [fileDesign, setFileDesign] = useState<string>('');

  const isDrafting = sessionStatus === 'drafting';
  const isPaused = sessionStatus === 'paused';
  const isOnHold = sessionStatus === 'on_hold';
  const hasEnded = sessionStatus === 'ended';

  // Sync session data
  useEffect(() => {
    if (sessionData && !isSessionLoading) {
      const session = sessionData?.data;
      if (session) {
        setSessionStatus(session.status || 'idle');
        if (session.total_time_spent) setTotalTime(session.total_time_spent);
        if (session.current_session_start_time) setDraftStart(new Date(session.current_session_start_time));
        if (session.last_action_time && (session.status === 'ended' || session.status === 'on_hold')) {
          setDraftEnd(new Date(session.last_action_time));
        } else {
          setDraftEnd(null);
        }
      } else {
        setSessionStatus('idle');
        setTotalTime(0);
        setDraftStart(null);
        setDraftEnd(null);
      }
    }
  }, [sessionData, isSessionLoading]);

  useTabClosingWarning({
    isActive: isDrafting && !isPaused,
    warningMessage: '⚠️ ACTIVE REVISION SESSION ⚠️\n\nYou have an active revision session in progress. Closing this tab will pause your session and may result in lost work.\n\nPlease pause your session properly before leaving.',
    onBeforeUnload: async () => {
      if (isDrafting && fabId && currentEmployeeId) {
        try {
          await manageDraftingSession({
            fab_id: fabId,
            data: {
              action: 'pause',
              drafter_id: currentEmployeeId,
              timestamp: formatTimestamp(new Date()),
              note: 'Auto-paused due to tab closing',
              is_revision: true
            }
          }).unwrap();
        } catch (error) {
          console.error('Failed to auto-pause session:', error);
        }
      }
    }
  });

  const existingFilesFromServer = draftData?.files || [];
  const allFilesForDisplay = useMemo(() => {
    return existingFilesFromServer.map((file: any) => ({
      id: file.id,
      name: file.name || file.file_name,
      size: parseInt(file.file_size) || file.size || 0,
      type: file.file_type || file.type || '',
      url: file.file_url || file.url,
      file_url: file.file_url || file.url,
      stage: getFileStage(file.name || file.file_name, {
        currentStage: 'revisions',
        isRevision: true
      }),
      stage_name: file.stage_name ?? file.stage ?? getFileStage(file.name || file.file_name, {
        currentStage: 'revisions',
        isRevision: true
      }).stage,
      file_design: file.file_design,
      uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
      uploaded_by_name: file.uploaded_by_name ?? file.uploader_name ?? file.uploaded_by ?? currentUser?.name ?? 'Unknown',
      uploadedBy: file.uploaded_by_name ?? file.uploader_name ?? file.uploaded_by ?? currentUser?.name ?? 'Unknown',
      fromServer: true
    }));
  }, [existingFilesFromServer, currentUser]);

  // Session management functions (unchanged but ensure is_revision flag)
  const createOrStartSession = async (action: 'start' | 'resume', startDate: Date, note?: string, sqftDrafted?: string, workPercentage?: string) => {
    try {
      await manageDraftingSession({
        fab_id: fabId,
        data: {
          action,
          drafter_id: currentEmployeeId,
          timestamp: formatTimestamp(startDate),
          note,
          sqft_drafted: sqftDrafted,
          work_percentage_done: workPercentage,
          is_revision: true
        }
      }).unwrap();
      setSessionStatus('drafting');
      setDraftStart(startDate);
      setDraftEnd(null);
      await refetchSession();
      toast.success(`Revision session ${action === 'start' ? 'started' : 'resumed'} successfully`);
    } catch (error: any) {
      console.error(`Failed to ${action} session:`, error);
      // toast.error(error?.data?.message || `Failed to ${action} session`);
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
          action,
          drafter_id: currentEmployeeId,
          timestamp: formatTimestamp(timestamp),
          note,
          sqft_drafted: sqftDrafted,
          work_percentage_done: workPercentage,
          is_revision: true
        }
      }).unwrap();
      setSessionStatus(action === 'end' ? 'ended' : action === 'on_hold' ? 'on_hold' : 'paused');
      setDraftEnd(timestamp);
      await refetchSession();
      toast.success(`Session ${actionPastTense[action]} successfully`);
    } catch (error: any) {
      console.error(`Failed to ${action} session:`, error);
      // toast.error(error?.data?.message || `Failed to ${action} session`);
      throw error;
    }
  };

  const handleStart = async (startDate: Date, data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
    const hasDraftingAssignment = draftingData?.id || fabData?.draft_data?.id;
    if (!hasDraftingAssignment) {
      toast.error('Cannot start revision session - no drafting assignment found');
      return;
    }

    // Authorization check: must be drafter_id or super admin
    const assignedDrafterId = draftingData?.drafter_id || fabData?.draft_data?.drafter_id;
    if (!isSuperAdmin && currentEmployeeId !== assignedDrafterId) {
      toast.error('You are not authorized to start this revision session. Only the assigned drafter or super admin can perform this action.');
      return;
    }

    try {
      await createOrStartSession('start', startDate, data?.note, data?.sqft_drafted, data?.work_percentage_done);
    } catch (error) { }
  };

  const handlePause = async (data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
    // Authorization check: must be drafter_id or super admin
    const assignedDrafterId = draftingData?.drafter_id || fabData?.draft_data?.drafter_id;
    if (!isSuperAdmin && currentEmployeeId !== assignedDrafterId) {
      toast.error('You are not authorized to pause this revision session. Only the assigned drafter or super admin can perform this action.');
      return;
    }

    try {
      await updateSession('pause', new Date(), data?.note, data?.sqft_drafted, data?.work_percentage_done);
    } catch (error) { }
  };

  const handleResume = async (data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
    // Authorization check: must be drafter_id or super admin
    const assignedDrafterId = draftingData?.drafter_id || fabData?.draft_data?.drafter_id;
    if (!isSuperAdmin && currentEmployeeId !== assignedDrafterId) {
      toast.error('You are not authorized to resume this revision session. Only the assigned drafter or super admin can perform this action.');
      return;
    }

    try {
      await createOrStartSession('resume', new Date(), data?.note, data?.sqft_drafted, data?.work_percentage_done);
    } catch (error) { }
  };

  const handleEnd = async (endDate: Date, data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
    // Authorization check: must be drafter_id or super admin
    const assignedDrafterId = draftingData?.drafter_id || fabData?.draft_data?.drafter_id;
    if (!isSuperAdmin && currentEmployeeId !== assignedDrafterId) {
      toast.error('You are not authorized to end this revision session. Only the assigned drafter or super admin can perform this action.');
      return;
    }

    try {
      await updateSession('end', endDate, data?.note, data?.sqft_drafted, data?.work_percentage_done);
    } catch (error) { }
  };

  const handleOnHold = async (data?: { note?: string }) => {
    try {
      if (isDrafting) {
        await updateSession('pause', new Date(), 'Pausing session before placing on hold');
      }
      const currentHoldStatus = fabData?.status_id === 0;
      await toggleFabOnHold({ fab_id: fabId, on_hold: !currentHoldStatus }).unwrap();
      if (data?.note) {
        await createFabNote({ fab_id: fabId, note: data.note, stage: 'revisions' }).unwrap();
      }
      toast.success(`FAB ${!currentHoldStatus ? 'placed on hold' : 'released from hold'} successfully`);
      await refetchFab();
      await refetchSession();
    } catch (error) {
      console.error('Failed to handle on hold:', error);
      toast.error('Failed to update hold status');
    }
  };

  const handleFileClick = (file: any) => {
    const enhancedFile = {
      ...file,
      stage: getFileStage(file.name, { isRevision: true }),
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

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    const draftingId = draftingData?.id || fabData?.draft_data?.id;
    if (!draftingId) return;
    try {
      await deleteDraftingFile({ drafting_id: draftingId, file_id: String(fileId) }).unwrap();
      await refetchAllFiles();
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      // toast.error('Failed to delete file');
    }
  };

  const refetchAllFiles = useCallback(async () => {
    try {
      await Promise.all([refetchFab(), refetchDrafting(), refetchSession(), refetchSct(), refetchRevisions()]);
    } catch (error) {
      console.error('Failed to refetch files:', error);
    }
  }, [refetchFab, refetchDrafting, refetchSession, refetchSct, refetchRevisions]);

  const shouldShowUploadSection = (isDrafting || isPaused) || allFilesForDisplay.length > 0;
  const canOpenSubmit = isDrafting && allFilesForDisplay.length > 0;

  const handleSubmitRevision = async (data: any) => {

    if (!fabId || !currentEmployeeId) {
      toast.error("Missing required data");
      return;
    }
    if (isRevisionsLoading) {
      toast.error("Please wait, revisions data is still loading");
      return;
    }
    try {
      let revisionId;
      const revisionsArray = Array.isArray(revisionsData) ? revisionsData : (revisionsData as any)?.data || [];
      const existingRevisions = Array.isArray(revisionsArray) ? revisionsArray : [];
      const hasExistingRevisions = existingRevisions.length > 0;

      // If complete is true, create revision if needed, then call updateRevision to complete the stage
      if (data.complete) {
        let revisionIdToUpdate: number;

        if (hasExistingRevisions) {
          // Use existing revision
          const latestRevision = existingRevisions[existingRevisions.length - 1];
          revisionIdToUpdate = latestRevision.id;
        } else {
          // Create new revision first to get the ID
          const createData: any = {
            fab_id: fabId,
            revision_type: revisionInfo.salesCTData?.revision_type || revisionInfo.revisionType,
            requested_by: currentEmployeeId,
            revision_notes: data.notes || revisionInfo.revisionReason || '',
            is_completed: false,
            sales_ct_id: revisionInfo.salesCTId || null
          };
          const createResult = await createRevision(createData).unwrap();
          // console.log("[v0] createRevision response:", createResult);
          revisionIdToUpdate = createResult.data.id;
        }

        // Now call updateRevision with is_completed: true
        const updateData: any = {
          revision_type: revisionInfo.salesCTData?.revision_type || revisionInfo.revisionType,
          revision_notes: data.notes || revisionInfo.revisionReason || '',
          is_completed: true
        };
        const updateResult = await updateRevision({ revision_id: revisionIdToUpdate, data: updateData }).unwrap();
        // console.log("[v0] updateRevision response:", updateResult);
        revisionId = revisionIdToUpdate;
      } else if (hasExistingRevisions) {
        // If complete is false but there are existing revisions, update them
        // console.log("[v0] complete is FALSE but hasExistingRevisions is TRUE");
        const latestRevision = existingRevisions[existingRevisions.length - 1];
        const updateData: any = {
          revision_type: revisionInfo.salesCTData?.revision_type || revisionInfo.revisionType,
          revision_notes: data.notes || revisionInfo.revisionReason || '',
          is_completed: false
        };
        const updateResult = await updateRevision({ revision_id: latestRevision.id, data: updateData }).unwrap();
        // console.log("[v0] updateRevision response:", updateResult);
        revisionId = latestRevision.id;
      } else {
        // If complete is false and no existing revisions, create new
        // console.log("[v0] complete is FALSE and hasExistingRevisions is FALSE - creating new");
        const createData: any = {
          fab_id: fabId,
          revision_type: revisionInfo.salesCTData?.revision_type || revisionInfo.revisionType,
          requested_by: currentEmployeeId,
          revision_notes: data.notes || revisionInfo.revisionReason || '',
          is_completed: false,
          sales_ct_id: revisionInfo.salesCTId || null
        };
        // console.log("[v0] Sending createData to API:", createData);
        const createResult = await createRevision(createData).unwrap();
        //  console.log("[v0] createRevision response:", createResult);
        revisionId = createResult.id;
      }

      // End the session after successful submission
      await updateSession('end', new Date(), 'Revision completed and submitted');
      // Immediately set local state to ended to reflect in UI
      setSessionStatus('ended');
      setDraftEnd(new Date());

      if (data.notes) {
        await createFabNote({ fab_id: fabId, note: data.notes, stage: 'revisions' }).unwrap();
      }

      toast.success("Revision submitted successfully");
      setShowSubmissionModal(false);

      // Refetch all data to ensure UI consistency
      await refetchAllFiles();

      navigate('/job/revision');
    } catch (error: any) {
      console.error(error?.data?.message || "Failed to submit revision. Please try again.");

    }
  };

  // Prepare links
  const jobNameLink = fabData?.job_details?.id ? `/job/details/${fabData.job_details.id}` : '#';
  const jobNumberLink = fabData?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fabData.job_details.job_number}`
    : '#';

  // Loading skeleton (mirror draft details)
  if (isFabLoading || isDraftingLoading || isSctLoading || isRevisionsLoading) {
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

  const statusInfo = getFabStatusInfo(fabData?.status_id);

  // Sidebar sections
  const sidebarSections = [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "Account Name", value: fabData?.account_name || '—' },
        {
          label: "Fab ID",
          value: (
            <Link to={`/sales/${fabData?.id}`} className="text-primary hover:underline">
              {fabData?.id}
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
      title: "Revision Info",
      type: "custom",
      component: () => (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 mb-4">
          <h4 className="font-semibold text-yellow-800 mb-2">Revision Details</h4>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${revisionInfo.revisionType === 'cad' ? 'bg-blue-100 text-blue-800' :
              revisionInfo.revisionType === 'client' ? 'bg-green-100 text-green-800' :
                revisionInfo.revisionType === 'sales' ? 'bg-yellow-100 text-yellow-800' :
                  revisionInfo.revisionType === 'template' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
              }`}>
              {revisionInfo.revisionType.toUpperCase()}
            </span>
            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
              Revision #{revisionInfo.revisionCount}
            </span>
          </div>
          <p className="text-sm text-yellow-700">{revisionInfo.revisionReason}</p>
        </div>
      )
    },
    {
      title: "FAB Notes",
      type: "notes",
      notes: getAllFabNotes(fabData?.fab_notes || []).map(note => {
      
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
      })
    }
  ];

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
                description="Revision Details"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                  {statusInfo.text}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  REVISION #{revisionInfo.revisionCount}
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
                  onClick={() => { setViewMode('activity'); setActiveFile(null); }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <FileViewer
                file={activeFile}
                onClose={() => { setActiveFile(null); setViewMode('activity'); }}
              />
            </div>
          ) : (
            // Activity mode
            <>
              <Card>
                <CardHeader className="py-3 px-4 sm:px-5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="text-sm sm:text-base">Revision activity</CardTitle>
                      <p className="text-xs text-gray-500 mt-0.5">Update your revision activity here</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sessionStatus === 'idle' ? 'bg-gray-100 text-gray-800' :
                        sessionStatus === 'drafting' ? 'bg-green-100 text-green-800' :
                          sessionStatus === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            sessionStatus === 'on_hold' ? 'bg-orange-100 text-orange-800' :
                              sessionStatus === 'ended' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {sessionStatus === 'idle' ? 'Ready to Start' :
                          sessionStatus === 'drafting' ? 'Revision Active' :
                            sessionStatus === 'paused' ? 'Paused' :
                              sessionStatus === 'on_hold' ? 'On Hold' :
                                sessionStatus === 'ended' ? 'Completed' : 'Unknown'}
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
                <CardContent className="p-3 sm:p-4 lg:p-5 space-y-5">
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

                  <Separator />

                  {/* File section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Uploaded files</h3>
                      <Can action="create" on="Drafting">
                        <Button
                          variant="dashed"
                          size="sm"
                          onClick={() => setShowUploadModal(true)}
                          disabled={!isDrafting || isPaused || hasEnded || isOnHold}
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
                        slabsmithData={(fabData as any)?.slabsmith_data}
                        draftingId={draftingData?.id || fabData?.draft_data?.id}
                        showDeleteButton={!hasEnded && !isOnHold}
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
                    <BackButton fallbackUrl="/job/revision" label="Cancel" />
                    <Can action="create" on="Drafting">
                      <Button
                        onClick={() => setShowSubmissionModal(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!canOpenSubmit}
                      >
                        Submit revision
                      </Button>
                    </Can>
                  </div>
                </CardContent>
              </Card>

              <SessionHistory fabId={fabId} />
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <Dialog open={showSubmissionModal} onOpenChange={setShowSubmissionModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="border-b">
              <DialogTitle className="text-[15px] font-semibold py-2">
                Submit Revision
                <span className="ml-3 text-sm font-normal text-gray-500">
                  FAB ID: {fabId}
                </span>
                {revisionInfo.salesCTData?.revision_type && (
                  <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {revisionInfo.salesCTData.revision_type.toUpperCase()} Revision #{revisionInfo.revisionCount}
                  </span>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>
          <RevisionForm
            onSubmit={handleSubmitRevision}
            onClose={() => setShowSubmissionModal(false)}
            revisionReason={revisionInfo.revisionReason}
            draftingData={draftingData}
            isRevision={true}
            fabId={fabId}
            userId={currentEmployeeId}
            fabData={fabData}
            uploadedFilesCount={allFilesForDisplay.length}
          />
        </DialogContent>
      </Dialog>

      <UniversalUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        title="Upload Revision Files"
        entityId={draftingData?.id || fabData?.draft_data?.id}
        uploadMutation={addFilesToDrafting}
        stages={[
          { value: 'revision', label: 'Revision' },
        ]}
        fileTypes={[
          { value: 'block_drawing', label: 'Block Drawing' },
          { value: 'layout', label: 'Layout' },
          { value: 'ss_layout', label: 'SS Layout' },
          { value: 'shop_drawing', label: 'Shop Drawing' },
          { value: 'photo_media', label: 'Photo / Media' },
        ]}
        additionalParams={{
          drafting_id: draftingData?.id || fabData?.draft_data?.id,
          stage_name: 'revision',
        }}
        onUploadComplete={() => {
          toast.success('Files uploaded successfully');
          refetchAllFiles();
          setShowUploadModal(false);
          setFileDesign('');
        }}
      />
    </div>
  );
}

export default RevisionDetailsPage;
