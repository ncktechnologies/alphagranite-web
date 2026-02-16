'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  useUpdateRevisionMutation
} from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { Can } from '@/components/permission';
import { useTabClosingWarning } from '@/hooks';
import { BackButton } from '@/components/common/BackButton';
import { getFileStage, EnhancedFileMetadata } from '@/utils/file-labeling';

// Add Dialog imports
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileViewer, UploadDocuments } from '../drafters/components';
import { SessionHistory } from '../drafters/components/SessionHistory';
import { RevisionForm } from './components';

// Helper function to format timestamp without 'Z'
const formatTimestamp = (date: Date) => {
  return date.toISOString().replace('Z', '');
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

// Helper function for formatting bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Get revision info from SCT data - FIXED to use sales_ct_data from fabData or separate query
const getRevisionInfo = (fabData: any, sctData: any) => {
  // First, try to get sales_ct_data from fabData
  const salesCTData = fabData?.sales_ct_data || sctData;

  if (!salesCTData) {
    return {
      revisionType: 'general',
      revisionReason: 'No revision reason provided',
      revisionCount: 0,
      salesCTId: null,
      salesCTData: null
    };
  }

  // Get revision type from sales CT data
  let revisionType = 'general';
  const revisionTypeFromSCT = salesCTData?.revision_type;

  if (revisionTypeFromSCT) {
    if (revisionTypeFromSCT.toLowerCase().includes('cad')) {
      revisionType = 'cad';
    } else if (revisionTypeFromSCT.toLowerCase().includes('client')) {
      revisionType = 'client';
    } else if (revisionTypeFromSCT.toLowerCase().includes('sales')) {
      revisionType = 'sales';
    } else if (revisionTypeFromSCT.toLowerCase().includes('template')) {
      revisionType = 'template';
    } else {
      revisionType = revisionTypeFromSCT.toLowerCase();
    }
  }

  // Get revision count from sales CT data
  const revisionCount = salesCTData?.current_revision_count || 0;

  // Get revision reason - look in fab notes first, then sct notes
  let revisionReason = 'No revision reason provided';
  const fabNotes = fabData?.fab_notes || [];

  // Look for revision note in fab notes
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
    salesCTData: salesCTData
  };
};

export function RevisionDetailsPage() {
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

  // Get SCT data for revision info
  const { data: sctData, isLoading: isSctLoading } = useGetSalesCTByFabIdQuery(fabId, {
    skip: !fabId,
    refetchOnMountOrArgChange: true,
  });

  // Get revisions data
  const { data: revisionsData, isLoading: isRevisionsLoading } = useGetRevisionsByFabIdQuery(fabId, {
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
  const [createRevision] = useCreateRevisionMutation();
  const [updateRevision] = useUpdateRevisionMutation();

  // Use draft_data from FAB response for displaying existing files
  const draftData = fabData?.draft_data;

  // Get revision info - FIXED: Now properly using sales CT data
  const revisionInfo = useMemo(() =>
    getRevisionInfo(fabData, sctData),
    [fabData, sctData]
  );

  // Debug: Log the revision info
  useEffect(() => {
    console.log('Revision Info:', revisionInfo);
    console.log('SCT Data:', sctData);
    console.log('FAB Data:', fabData);
    console.log('FAB sales_ct_data:', fabData?.sales_ct_data);
  }, [revisionInfo, sctData, fabData]);

  // Local UI state
  const [totalTime, setTotalTime] = useState<number>(0);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'drafting' | 'paused' | 'on_hold' | 'ended'>('idle');
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // Derived states from sessionStatus
  const isDrafting = sessionStatus === 'drafting';
  const isPaused = sessionStatus === 'paused';
  const isOnHold = sessionStatus === 'on_hold';
  const hasEnded = sessionStatus === 'ended';

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
          setDraftEnd(null);
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

  // Tab closing warning
  useTabClosingWarning({
    isActive: isDrafting && !isPaused,
    warningMessage: '⚠️ ACTIVE REVISION SESSION ⚠️\n\nYou have an active revision session in progress. Closing this tab will pause your session and may result in lost work.\n\nPlease pause your session properly before leaving.',
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

  // Extract existing files from draft_data
  const existingFilesFromServer = draftData?.files || [];

  // All files for display
  const allFilesForDisplay = useMemo(() => {
    const files = existingFilesFromServer.map((file: any) => ({
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
      uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
      uploadedBy: file.uploaded_by || currentUser?.name || 'Unknown',
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
      toast.error(error?.data?.message || `Failed to ${action} session`);
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
      toast.error(error?.data?.message || `Failed to ${action} session`);
      throw error;
    }
  };

  // Time tracking handlers
  const handleStart = async (startDate: Date, data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
    const hasDraftingAssignment = draftingData?.id || fabData?.draft_data?.id;

    if (!hasDraftingAssignment) {
      toast.error('Cannot start revision session - no drafting assignment found');
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
      const currentHoldStatus = fabData?.status_id === 0;
      await toggleFabOnHold({ fab_id: fabId, on_hold: !currentHoldStatus }).unwrap();

      // Create FAB note with revisions stage
      if (data?.note) {
        await createFabNote({
          fab_id: fabId,
          note: data.note,
          stage: 'revisions'
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
    const enhancedFile = {
      ...file,
      stage: getFileStage(file.name, { isRevision: true }),
      url: file.file_url || file.url || file.fileUrl,
      name: file.name || file.file_name,
      type: file.file_type || file.type || '',
      size: parseInt(file.file_size) || file.size || 0,
      formattedSize: formatBytes(parseInt(file.file_size) || file.size || 0),
      uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
      uploadedBy: file.uploaded_by || currentUser?.name || 'Unknown'
    };

    setActiveFile(enhancedFile);
    setViewMode('file');
  };

  const handleDeleteFile = async (fileId: number) => {
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
        file_id: String(fileId)
      }).unwrap();

      await refetchAllFiles();
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

  // Show upload section when timer is running, paused, OR when files have been uploaded
  const shouldShowUploadSection = (isDrafting || isPaused) || allFilesForDisplay.length > 0;

  // Determine if submission is allowed
  const canOpenSubmit = isDrafting && allFilesForDisplay.length > 0;

  // Handle revision submission
  const handleSubmitRevision = async (data: any) => {
    console.log('=== handleSubmitRevision called ===', data);

    if (!fabId || !currentEmployeeId) {
      console.log('Missing fabId or currentEmployeeId, returning early');
      toast.error("Missing required data");
      return;
    }

    if (isRevisionsLoading) {
      toast.error("Please wait, revisions data is still loading");
      return;
    }

    try {
      let revisionId;

      // Check revisionsData structure
      const revisionsArray = Array.isArray(revisionsData) ? revisionsData : (revisionsData as any)?.data || [];
      console.log('Fetched revisions:', revisionsArray);

      // Get the earliest revision if any exist
      const existingRevisions = Array.isArray(revisionsArray) ? revisionsArray : [];
      const hasExistingRevisions = existingRevisions.length > 0;

      if (hasExistingRevisions) {
        // Find the earliest revision (lowest ID)
        const earliestRevision = existingRevisions.reduce((earliest, current) =>
          current.id < earliest.id ? current : earliest,
          existingRevisions[0]
        );

        console.log('UPDATING EXISTING REVISION ID:', earliestRevision.id);

        // Prepare update data - USE THE ACTUAL REVISION TYPE FROM SCT DATA
        const updateData: any = {
          revision_type: revisionInfo.salesCTData?.revision_type || revisionInfo.revisionType,
          revision_notes: data.notes || revisionInfo.revisionReason || '',
          is_completed: data.complete || false
        };

        // Update the existing revision
        await updateRevision({
          revision_id: earliestRevision.id,
          data: updateData
        }).unwrap();

        revisionId = earliestRevision.id;
        console.log('Successfully updated revision');

      } else {
        // Only create if truly no revisions exist
        console.log('CREATING NEW REVISION - no existing revisions found');

        // Prepare creation data - USE THE ACTUAL REVISION TYPE FROM SCT DATA
        const createData: any = {
          fab_id: fabId,
          revision_type: revisionInfo.salesCTData?.revision_type || revisionInfo.revisionType,
          requested_by: currentEmployeeId,
          revision_notes: data.notes || revisionInfo.revisionReason || '',
          is_completed: data.complete || false,
          sales_ct_id: revisionInfo.salesCTId || null
        };

        const createResult = await createRevision(createData).unwrap();
        revisionId = createResult.id;
        console.log('Created new revision with ID:', revisionId);
      }

      // End the session when revision is marked complete
      if (data.complete) {
        await updateSession('end', new Date(), 'Revision completed and submitted');
      }

      // Create FAB note for the revision
      if (data.notes) {
        await createFabNote({
          fab_id: fabId,
          note: data.notes,
          stage: 'revisions'
        }).unwrap();
      }

      toast.success("Revision submitted successfully");
      setShowSubmissionModal(false);

      // Refresh data
      await refetchAllFiles();

      // Navigate back to revisions list
      navigate('/job/revision');

    } catch (error: any) {
      console.error('Failed to submit revision:', error);
      toast.error(error?.data?.message || "Failed to submit revision. Please try again.");
    }
  };

  if (isFabLoading || isDraftingLoading || isSctLoading || isRevisionsLoading) {
    return <div>Loading...</div>;
  }

  const sidebarSections = [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "Job Name", value: fabData?.job_details?.name || `Job ${fabData?.job_id}` },
        { label: "Job Number", value: fabData?.job_details?.job_number || String(fabData?.job_id) },
        { label: "Account Name", value: fabData?.account_name || "N/A" },
        { label: "Area", value: fabData?.input_area || "Loading..." },
        { label: "Material", value: `${fabData?.stone_type_name || ''} ${fabData?.stone_color_name || ''} - ${fabData?.stone_thickness_value || ''}` },
        { label: "FAB Type", value: fabData?.fab_type || "Loading..." },
        { label: "Sales Person", value: fabData?.sales_person_name || "N/A" },
        { label: "Assigned to", value: fabData?.draft_data?.drafter_name || 'Unassigned' },
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
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              REVISION #{revisionInfo.revisionCount}
            </span>
          </div>
          <p className='text-sm text-muted-foreground'>Update revision activity</p>
        </div>
      </Container>

      <div className=" border-t grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <div className="lg:col-span-3 w-full lg:w-[200px]  2xl:w-[286px]  ultra:w-[500px]" >
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
                      <CardTitle>Revision activity</CardTitle>
                      <p className="text-sm text-[#4B5563]">Update your revision activity here</p>
                    </div>
                    <div className="flex items-center gap-2">
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
                    isRevision={true}
                  />

                  <Separator className="my-6" />

                  {/* File Upload Section */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Revision Files</h3>

                    {shouldShowUploadSection ? (
                      <UploadDocuments
                        onFileClick={handleFileClick}
                        disabled={hasEnded || isOnHold || isPaused}
                        enhancedFiles={allFilesForDisplay}
                        draftingId={draftingData?.id || fabData?.draft_data?.id}
                        refetchFiles={refetchAllFiles}
                        isRevision={true}
                        stage="revision"
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

                  {/* Submit Button */}
                  {viewMode === 'activity' && (
                    <div className="flex justify-end gap-3 mt-6">
                      <BackButton fallbackUrl="/job/revisions" label='Cancel' />
                      <Button
                        onClick={() => setShowSubmissionModal(true)}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!canOpenSubmit}
                      >
                        Submit revision
                      </Button>
                    </div>
                  )}

                </CardContent>
              </Card>

              <SessionHistory fabId={fabId} />
            </>
          )}
        </Container>
      </div>

      {/* Dialog for Revision Submission */}
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
    </>
  );
}

export default RevisionDetailsPage;