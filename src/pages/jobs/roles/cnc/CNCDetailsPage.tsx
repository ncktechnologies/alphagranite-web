// CNCDetailsPage.tsx - Following exact DrafterDetailsPage pattern
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
    useGetCNCByFabIdQuery,
    useManageCNCSessionMutation,
    useGetCurrentCNCSessionQuery,
    useToggleFabOnHoldMutation,
    useCreateFabNoteMutation,
    useDeleteFileFromCNCDraftingMutation,
    useAddFilesToCNCDraftingMutation
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
import { stageConfig } from '@/utils/note-utils';

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

export function CNCDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const fabId = id ? Number(id) : 0;
    const navigate = useNavigate();

    const currentUser = useSelector((s: any) => s.user.user);
    const currentEmployeeId = currentUser?.employee_id || currentUser?.id;
    const isSuperAdmin = currentUser?.is_super_admin || false;

    // Load fab & CNC data
    const { data: fabData, isLoading: isFabLoading, refetch: refetchFab } = useGetFabByIdQuery(fabId, {
        skip: !fabId,
        refetchOnMountOrArgChange: true,
    });
    const { data: cncData, isLoading: isCNCLoading, refetch: refetchCNC } = useGetCNCByFabIdQuery(fabId, {
        skip: !fabId,
        refetchOnMountOrArgChange: true,
    });

    // Get current session state
    const { data: sessionData, isLoading: isSessionLoading, refetch: refetchSession } = useGetCurrentCNCSessionQuery(fabId, {
        skip: !fabId,
        refetchOnMountOrArgChange: true,
    });

    const [manageCNCSession] = useManageCNCSessionMutation();
    const [toggleFabOnHold] = useToggleFabOnHoldMutation();
    const [createFabNote] = useCreateFabNoteMutation();
    const [deleteCNCFile] = useDeleteFileFromCNCDraftingMutation();
    const [addFilesToCNC] = useAddFilesToCNCDraftingMutation();

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
    const [fileDesign, setFileDesign] = useState<string>('');

    // Initialize session state from server data
    useEffect(() => {
        if (sessionData && !isSessionLoading) {
            const session = sessionData?.data;
            if (session) {
                setSessionStatus(session.status || 'idle');

                if (session.total_time_spent) {
                    setTotalTime(session.total_time_spent);
                }

                if (session.current_session_start_time) {
                    setDraftStart(new Date(session.current_session_start_time));
                }

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

    const isDrafting = sessionStatus === 'drafting';
    const isPaused = sessionStatus === 'paused';
    const isOnHold = sessionStatus === 'on_hold';
    const hasEnded = sessionStatus === 'ended';

    useTabClosingWarning({
        isActive: isDrafting && !isPaused,
        warningMessage: '⚠️ ACTIVE CNC SESSION ⚠️\n\nYou have an active CNC session in progress. Closing this tab will pause your session and may result in lost work.\n\nPlease pause your session properly before leaving.',
        onBeforeUnload: async () => {
            // Auto-pause when user tries to close tab
            try {
                await manageCNCSession({
                    fab_id: fabId,
                    data: {
                        drafter_id: currentEmployeeId,
                        action: 'pause',
                        timestamp: formatTimestamp(new Date()),
                    },
                }).unwrap();
                setSessionStatus('paused');
            } catch (error) {
                console.error('Failed to auto-pause:', error);
            }
        },
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
    }, [existingFilesFromServer, currentUser]);

    const handleStart = async (startDate: Date) => {
        const hasDraftingAssignment = cncData?.id || fabData?.cnc_data?.id;
        if (!hasDraftingAssignment) {
            toast.error('Cannot start CNC session - no cnc operator found found');
            return;
        }

        // Authorization check: must be CNC drafter_id or super admin
        const assignedDrafterId = cncData?.drafter_id || fabData?.cnc_data?.drafter_id;
        if (!isSuperAdmin && currentEmployeeId !== assignedDrafterId) {
            toast.error('You are not authorized to start this CNC session. Only the assigned CNC operator or super admin can perform this action.');
            return;
        }

        try {
            await manageCNCSession({
                fab_id: fabId,
                data: {
                    drafter_id: currentEmployeeId,
                    action: 'start',
                    session_start_time: formatTimestamp(startDate),
                },
            }).unwrap();

            setSessionStatus('drafting');
            // setCNCStart(startDate);
            toast.success('CNC session started successfully');
            refetchSession();
        } catch (error) {
            console.error('Failed to start session:', error);
            // toast.error('Failed to start CNC session');
        }
    };

    const actionPastTense: Record<string, string> = {
        start: 'started',
        resume: 'resumed',
        pause: 'paused',
        on_hold: 'placed on hold',
        end: 'ended',
    };

    const updateSession = async (
        action: 'pause' | 'on_hold' | 'end',
        timestamp: Date,
        note?: string,
        sqftDrafted?: string,
        workPercentage?: string
    ) => {
        // Authorization check: must be CNC drafter_id or super admin
        const assignedDrafterId = cncData?.drafter_id || fabData?.cnc_data?.drafter_id;
        if (!isSuperAdmin && currentEmployeeId !== assignedDrafterId) {
            toast.error(`You are not authorized to ${action === 'pause' ? 'pause' : action === 'end' ? 'end' : 'update'} this CNC session. Only the assigned CNC operator or super admin can perform this action.`);
            return;
        }

        try {
            await manageCNCSession({
                fab_id: fabId,
                data: {
                    action,
                    drafter_id: currentEmployeeId,
                    timestamp: formatTimestamp(timestamp),
                    note,
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
            // toast.error(`Failed to ${action} session`);
            throw error;
        }
    };


    const handlePause = async (data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
        // Authorization check: must be CNC drafter_id or super admin
        const assignedDrafterId = cncData?.drafter_id || fabData?.cnc_data?.drafter_id;
        if (!isSuperAdmin && currentEmployeeId !== assignedDrafterId) {
            toast.error('You are not authorized to pause this CNC session. Only the assigned CNC operator or super admin can perform this action.');
            return;
        }

        try {
            await updateSession('pause', new Date(), data?.note, data?.sqft_drafted, data?.work_percentage_done);
        } catch (error) { }
    };

    const handleResume = async (data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
        // Authorization check: must be CNC drafter_id or super admin
        const assignedDrafterId = cncData?.drafter_id || fabData?.cnc_data?.drafter_id;
        if (!isSuperAdmin && currentEmployeeId !== assignedDrafterId) {
            toast.error('You are not authorized to resume this CNC session. Only the assigned CNC operator or super admin can perform this action.');
            return;
        }

        try {
            await manageCNCSession({
                fab_id: fabId,
                data: {
                    drafter_id: currentEmployeeId,
                    action: 'resume',
                    timestamp: formatTimestamp(new Date()),
                    note: data?.note,
                    sqft_drafted: data?.sqft_drafted,
                    work_percentage_done: data?.work_percentage_done
                }
            }).unwrap();

            // Update local state to reflect resumed session - timer will start automatically
            setSessionStatus('drafting');
            toast.success('CNC session resumed successfully');
            await refetchSession();
        } catch (error) {
            console.error('Failed to resume session:', error);
            // toast.error('Failed to resume CNC session');
        }
    };

    const handleEnd = async (endDate: Date, data?: { note?: string; sqft_drafted?: string; work_percentage_done?: string }) => {
        // Authorization check: must be CNC drafter_id or super admin
        const assignedDrafterId = cncData?.drafter_id || fabData?.cnc_data?.drafter_id;
        if (!isSuperAdmin && currentEmployeeId !== assignedDrafterId) {
            toast.error('You are not authorized to end this CNC session. Only the assigned CNC operator or super admin can perform this action.');
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
                await createFabNote({ fab_id: fabId, note: data.note, stage: 'drafting' }).unwrap();
            }
            toast.success(`FAB ${!currentHoldStatus ? 'placed on hold' : 'released from hold'} successfully`);
            await refetchFab();
            await refetchSession();
        } catch (error) {
            console.error('Failed to handle on hold:', error);
            // toast.error('Failed to update hold status');
        }
    };

    const handleFileClick = (file: any) => {
        const enhancedFile = {
            ...file,
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
        if (!window.confirm('Are you sure you want to delete this file?')) return;
        const draftingId = draftingData?.id || fabData?.draft_data?.id;
        if (!draftingId) return;
        try {
            await deleteDraftingFile({ drafting_id: draftingId, file_id: fileId }).unwrap();
            await refetchFab();
            //   await refetchDrafting();
            toast.success('File deleted successfully');
        } catch (error) {
            console.error('Failed to delete file:', error);
            toast.error('Failed to delete file');
        }
    };

    const refetchAllFiles = useCallback(async () => {
        try {
            await Promise.all([refetchFab(), refetchSession()]);
        } catch (error) {
            console.error('Failed to refetch files:', error);
        }
    }, [refetchFab, refetchSession]);

    const shouldShowUploadSection = (isDrafting || isPaused) || allFilesForDisplay.length > 0;
    const canOpenSubmit = isDrafting && totalTime > 0 && fabData?.cnc_data?.files.length > 0;

    const handleOpenSubmissionModal = async () => {
        setShowSubmissionModal(true);
    };

    const onSubmitModal = async () => {
        try {
            await refetchAllFiles();
            setShowSubmissionModal(false);
            setTotalTime(0);
            setDraftStart(null);
            setDraftEnd(null);
            setSessionStatus('idle');
            navigate('/job/draft');
        } catch (err) {
            console.error(err);
            // toast.error('Failed to finalize submission flow');
        }
    };

    const jobNameLink = fabData?.job_details?.id ? `/job/details/${fabData.job_details.id}` : '#';
    const jobNumberLink = fabData?.job_details?.job_number
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fabData.job_details.job_number}`
        : '#';

    // CNC-specific: use cncData instead of draftingData
    const cncId = fabData?.cnc_data?.id;

    const sidebarSections = fabData ? [
        {
            title: 'Job Details',
            type: 'details',
            items: [
                { label: 'Account Name', value: fabData.account_name || '—' },
                {
                    label: 'Fab ID',
                    value: (
                        <Link to={`/sales/${fabData.id}`} className="text-primary hover:underline">
                            {fabData.id}
                        </Link>
                    ),
                },
                { label: 'Area', value: fabData.input_area || '—' },
                {
                    label: 'Material',
                    value: fabData.stone_type_name
                        ? `${fabData.stone_type_name} - ${fabData.stone_color_name || ''} - ${fabData.stone_thickness_value || ''}`
                        : '—',
                },
                { label: 'Fab Type', value: <span className="uppercase">{fabData.fab_type || '—'}</span> },
                { label: 'Edge', value: fabData.edge_name || '—' },
                { label: 'Total s.f.', value: fabData.total_sqft?.toString() || '—' },
                {
                    label: 'Scheduled Date',
                    value: fabData.templating_schedule_start_date
                        ? new Date(fabData.templating_schedule_start_date).toLocaleDateString()
                        : 'Not scheduled',
                },
                { label: 'Drafter Assigned', value: fabData.cnc_data?.drafter_name || 'Unassigned' },
                { label: 'Sales Person', value: fabData.sales_person_name || '—' },
                { label: 'SlabSmith Needed', value: fabData.slab_smith_ag_needed || fabData.slab_smith_cust_needed ? 'Yes' : 'No' },
            ],
        },
        {
            title: 'Notes',
            type: 'notes',
            notes: Array.isArray(fabData.notes)
                ? fabData.notes.map((note: string, index: number) => ({
                    id: index,
                    avatar: 'N',
                    content: note,
                    author: '',
                    timestamp: '',
                }))
                : [],
        },
        {
            title: 'FAB Notes',
            type: 'notes',
            notes: getAllFabNotes(fabData?.fab_notes || []).map((note: any) => {
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
    ] : [];

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

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (isFabLoading || isCNCLoading || isSessionLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                {/* sticky toolbar skeleton */}
                <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
                    <Skeleton className="h-8 w-72 mb-1" />
                    <Skeleton className="h-4 w-48" />
                </div>

                <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                    {/* sidebar skeleton */}
                    <div className="w-full lg:w-[220px] xl:w-[260px] shrink-0 border-r">
                        <Skeleton className="h-full min-h-[300px] w-full" />
                    </div>
                    {/* content skeleton */}
                    <div className="flex-1 p-4 sm:p-6 space-y-4">
                        <Skeleton className="h-24 w-full rounded-xl" />
                        <Skeleton className="h-96 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    const statusInfo = getFabStatusInfo(fabData?.status_id);

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">

            {/* ── Sticky toolbar ──────────────────────────────────────────────────── */}
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
                                description="Drafting Details"
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


            <div className="flex flex-col lg:flex-row flex-1 min-h-0">

                {/* ── Gray sidebar ──────────────────────────────────────────────────── */}
                <aside
                    className={[
                        // Mobile: full width, normal flow
                        'w-full bg-white border-b',
                        // Desktop: fixed width, sticky, scrollable internally
                        'lg:w-[220px] xl:w-[260px] lg:shrink-0',
                        'lg:sticky lg:top-[50px]',               // ← adjust to toolbar height
                        'lg:self-start',
                        'lg:max-h-[calc(100vh-50px)]',           // ← same value
                        'lg:overflow-y-auto',
                        'lg:border-b-0 lg:border-r',
                    ].join(' ')}
                >
                    <GraySidebar
                        sections={sidebarSections as any}
                        jobId={fabData?.job_id}
                    />
                </aside>

                {/* ── Main content ──────────────────────────────────────────────────── */}
                <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-5 space-y-4">

                    {viewMode === 'file' && activeFile ? (
                        // ── File viewer ─────────────────────────────────────────────────
                        <div className="bg-white rounded-xl border overflow-hidden">
                            <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                                <div>
                                    <h3 className="font-semibold text-sm">{activeFile.name}</h3>
                                    <p className="text-xs text-gray-500">
                                        {formatBytes(activeFile.size)} · {activeFile.stage?.label || activeFile.stage}
                                    </p>
                                </div>
                                <Button
                                    variant="inverse"
                                    size="sm"
                                    onClick={() => { setViewMode('activity'); setActiveFile(null); }}
                                >
                                    <X className="w-10 h-10" />
                                </Button>
                            </div>
                            <FileViewer
                                file={activeFile}
                                onClose={() => { setActiveFile(null); setViewMode('activity'); }}
                            />
                        </div>
                    ) : (
                        <>
                            {/* ── Session status card ────────────────────────────────────── */}
                            <Card>
                                <CardHeader className="py-3 px-4 sm:px-5">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div>
                                            <CardTitle className="text-sm sm:text-base">CNC activity</CardTitle>
                                            <p className="text-xs text-gray-500 mt-0.5">Update your CNC activity here</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${{
                                                idle: 'bg-gray-100 text-gray-800',
                                                drafting: 'bg-green-100 text-green-800',
                                                paused: 'bg-yellow-100 text-yellow-800',
                                                on_hold: 'bg-orange-100 text-orange-800',
                                                ended: 'bg-blue-100 text-blue-800',
                                            }[sessionStatus] || 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {{
                                                    idle: 'Ready to Start',
                                                    drafting: 'CNC Active',
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

                            {/* ── Time tracking + files ──────────────────────────────────── */}
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

                                    {/* File upload section */}
                                    <div>
                                        {shouldShowUploadSection ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold text-sm">Uploaded files</h3>
                                                    {/* <Can action="create" on="Drafting"> */}
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
                                                    {/* </Can> */}
                                                </div>
                                                <Documents
                                                    onFileClick={handleFileClick}
                                                    draftingData={fabData?.draft_data}
                                                    slabsmithData={(fabData as any)?.slabsmith_data}
                                                    sctData={(fabData as any)?.sales_ct_data}
                                                    draftingId={fabData?.cnc_data?.id}
                                                    showDeleteButton={!hasEnded && !isOnHold}
                                                    cncData={fabData?.cnc_data}
                                                />
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                                                <p className="text-sm text-gray-500">Start the timer to enable file uploads</p>
                                                <p className="text-xs text-gray-400 mt-1">Files will appear here once uploaded</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Submit button */}
                                    {viewMode === 'activity' && (
                                        <div className="flex justify-end gap-2 pt-2">
                                            <BackButton fallbackUrl="/job/draft" label="Cancel" />
                                            {/* <Can action="create" on="CNC"> */}
                                            <Button
                                                onClick={handleOpenSubmissionModal}
                                                className="bg-green-600 hover:bg-green-700"
                                                disabled={!canOpenSubmit}
                                            >
                                                Submit CNC
                                            </Button>
                                            {/* </Can> */}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <SessionHistory fabId={fabId} />
                        </>
                    )}
                </main>
            </div>

            {/* ── Modals ────────────────────────────────────────────────────────────── */}
            {showSubmissionModal && (
                <SubmissionModal
                    open={showSubmissionModal}
                    onClose={() => setShowSubmissionModal(false)}
                    cnc={cncData}
                    uploadedFiles={filesForSubmission}
                    fabId={fabId}
                    userId={currentEmployeeId}
                    fabData={fabData}
                />
            )}

            <UniversalUploadModal
                open={showUploadModal}
                onOpenChange={setShowUploadModal}
                title="Upload CNC Files"
                entityId={cncId}
                uploadMutation={addFilesToCNC}
                disabled={!isDrafting && !isPaused}
                stages={[
                    { value: 'cnc', label: 'CNC' },
                ]}
                fileTypes={[
                    { value: 'block_drawing', label: 'Block Drawing' },
                    { value: 'layout', label: 'Layout' },
                    { value: 'ss_layout', label: 'SS Layout' },
                    { value: 'shop_drawing', label: 'Shop Drawing' },
                    { value: 'photo_media', label: 'Photo/Media' },
                    { value: 'CNC EST', label: 'CNC EST' },

                ]}
                additionalParams={{
                    cnc_id: cncId,
                    stage_name: 'cnc',
                }}
                onUploadComplete={() => {
                    toast.success('Files uploaded successfully');
                    refetchCNC();
                    refetchFab();
                    setShowUploadModal(false);
                }}
            />
        </div>
    );
}

export default CNCDetailsPage;