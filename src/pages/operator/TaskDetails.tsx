import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Camera, CheckCircle2, Play, Pause, Square, AlertTriangle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';

import { OperatorTimerComponent } from './components/TimerComponent';
import { SubmitWorkModal, type SubmitWorkData } from './components/SubmitWorkModal';
import { OperatorTimerHistory } from './OperatorTimerHistory';
import {
    useGetCurrentOperatorTasksByIdQuery,
    useGetOperatorQaFilesQuery,
} from '@/store/api/operator';
import {
    useGetShopPlanTimerStateQuery as useShopPlanTimerState,
    useManageShopPlanTimerMutation as useShopPlanTimerAction,
    useGetShopPlanTimerHistoryQuery as useShopPlanTimerHistory,
} from '@/store/api/shopCutPlanning';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OperatorMediaUpload } from './components/OperatorMediaUpload';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { BackButton } from '@/components/common/BackButton';
import { FileViewer } from '../jobs/roles/drafters/components';
import { FileGallery, type FileSource, type UnifiedFile } from '@/pages/jobs/components/FileGallery';
import { WorkPercentageModal } from './components/WorkPercentageModal';
import { useIsSuperAdmin } from '@/hooks/use-permission';
import { Textarea } from '@/components/ui/textarea';
import { useCreateShopRevisionMutation } from '@/store/api/shopRevision';
import { useGetShopRevisionFabsQuery, useGetShopRevisionsByFabIdQuery } from '@/store/api/shopRevision';
import { SCTTimer } from '@/pages/jobs/roles/back-to-sales/components/SCTTimer';

// Helper for status display
const getStatusInfo = (statusId: number | undefined, t: any) => {
    if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: t('JOB.STATUS.ON_HOLD') };
    if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: t('JOB.STATUS.ACTIVE') };
    return { className: 'bg-gray-100 text-gray-800', text: t('JOB.STATUS.LOADING') };
};

export function OperatorTaskDetails() {
    const isSuperAdmin = useIsSuperAdmin();
    const { t, translateStage, translateFileType, translateFileLabel } = useTranslation();
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const taskId = Number(searchParams.get('task_id')) || 0;
    const workstationId = Number(searchParams.get('workstation_id')) || 0;
    const scheduledStartDate = searchParams.get('scheduled_start_date');

    const currentUser = useSelector((s: any) => s.user.user);
    const operatorId = currentUser?.employee_id || currentUser?.id || 0;

    const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'stopped'>('idle');
    const [totalTime, setTotalTime] = useState(0);
    const [serverSynced, setServerSynced] = useState(false);

    const [showWorkPercentageModal, setShowWorkPercentageModal] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    const [workPercentage, setWorkPercentage] = useState(0);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [showRevisionDialog, setShowRevisionDialog] = useState(false);
    const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(null);
    const [revisionNote, setRevisionNote] = useState('');
    const [activeFile, setActiveFile] = useState<UnifiedFile | null>(null);

    const { data: taskData, isLoading: isTasksLoading, refetch: refetchTask } =
        useGetCurrentOperatorTasksByIdQuery(
            { id: taskId, operator_id: operatorId, workstation_id: workstationId },
            { skip: !taskId || !operatorId || !workstationId }
        );

    const currentTask: any = Array.isArray(taskData)
        ? taskData[0]
        : (taskData as any)?.data
            ? Array.isArray((taskData as any).data)
                ? (taskData as any).data[0]
                : (taskData as any).data
            : taskData ?? null;

    const currentFabId = Number(currentTask?.fab_id || 0);

    const [createShopRevision, { isLoading: isCreatingRevision }] = useCreateShopRevisionMutation();
    const { data: revisionFabsData } = useGetShopRevisionFabsQuery();
    const { data: fabRevisionsData, isLoading: isRevisionsLoading } = useGetShopRevisionsByFabIdQuery(currentFabId, {
        skip: !currentFabId,
    });

    const revisions: any[] = Array.isArray(fabRevisionsData) ? fabRevisionsData : [];
    const selectedRevision: any = revisions.find((rev: any) => rev.id === selectedRevisionId) || revisions[0] || null;

    useEffect(() => {
        if (!currentFabId) {
            setSelectedRevisionId(null);
            return;
        }

        if (revisions.length === 0) {
            setSelectedRevisionId(null);
            return;
        }

        const selectedExists = selectedRevisionId !== null && revisions.some((rev: any) => rev.id === selectedRevisionId);
        if (!selectedExists) {
            setSelectedRevisionId(revisions[0].id);
        }
    }, [currentFabId, revisions, selectedRevisionId]);

    const hasPendingShopRevision = (() => {
        if (!currentFabId) return false;

        const revisionFabs = Array.isArray(revisionFabsData) ? revisionFabsData : [];
        const fabFromSummary = revisionFabs.find((row: any) => Number(row.fab_id) === currentFabId);
        if (fabFromSummary?.has_pending_shop_revision !== undefined) {
            return Boolean(fabFromSummary.has_pending_shop_revision);
        }

        const revisions = Array.isArray(fabRevisionsData) ? fabRevisionsData : [];
        return revisions.some((rev: any) => !rev.revision_completed);
    })();

    // ─── plan_id is the correct ID for all shop timer API calls ───────────
    const planId: number = currentTask?.id || taskId;

    // Fetch QA files for this operator (uses fab_id as job_id param for the upload URL)
    const { data: qaFilesData, isLoading: isQaLoading, refetch: refetchQaFiles } = useGetOperatorQaFilesQuery(
        { operator_id: operatorId, job_id: currentTask?.fab_id || 0 },
        { skip: !currentTask?.fab_id || !operatorId }
    );

    // Map QA files to UnifiedFile format for FileGallery
    const qaFiles: UnifiedFile[] = (qaFilesData?.data || []).map((file: any) => ({
        id: String(file.id),
        name: file.name || file.file_name,
        size: file.file_size || file.size || 0,
        type: file.file_type || file.mime_type || 'application/octet-stream',
        url: file.file_url || file.url,
        stage: file.stage_name || file.stage,
        uploadedBy: file.uploaded_by_name || 'Operator',
        uploadedAt: file.created_at ? new Date(file.created_at) : undefined,
        _raw: file,
    }));

    // Fetch full FAB data to get all files
    const { data: fabResponse } = useGetFabByIdQuery(currentTask?.fab_id || 0, { skip: !currentTask?.fab_id });
    const fabData = (fabResponse as any)?.data ?? fabResponse;

    // Build file sources from actual API shape (following sales Details.tsx pattern)
    const fileSources: FileSource[] = (() => {
        if (!fabData) return [];
        const sources: FileSource[] = [];

        // Helper to convert API file array into UnifiedFile[]
        const toUnifiedFiles = (files: any[]): UnifiedFile[] =>
            (files ?? []).map((f): UnifiedFile => ({
                id: String(f.id),
                name: f.name || f.filename || `File_${f.id}`,
                size: parseInt(f.file_size) || f.size || 0,
                type: f.file_type || f.mime_type || 'application/octet-stream',
                url: f.file_url || f.url || '',
                stage_name: f.stage_name ?? f.stage,
                stage: f.stage_name ?? f.stage,
                file_design: f.file_design,
                uploaded_by_name: f.uploaded_by_name ?? f.uploader_name,
                uploadedBy: f.uploaded_by_name ?? f.uploader_name,
                uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
                _raw: f,
            }));

        // Drafting files (from draft_data.files)
        if (fabData.draft_data?.files?.length) {
            sources.push({ kind: 'raw', data: toUnifiedFiles(fabData.draft_data.files) });
        }
        // SlabSmith files
        if (fabData.slabsmith_data?.files?.length) {
            sources.push({ kind: 'raw', data: toUnifiedFiles(fabData.slabsmith_data.files) });
        }
        // Sales CT files
        if (fabData.sales_ct_data?.files?.length) {
            sources.push({ kind: 'raw', data: toUnifiedFiles(fabData.sales_ct_data.files) });
        }
        // CNC files (if you later add cnc_data)
        if (fabData.cnc_data?.files?.length) {
            sources.push({ kind: 'raw', data: toUnifiedFiles(fabData.cnc_data.files) });
        }
        // Top-level files
        if (fabData.files?.length) {
            sources.push({ kind: 'raw', data: toUnifiedFiles(fabData.files) });
        }
        if (qaFiles.length > 0) sources.push({ kind: 'raw', data: qaFiles });

        return sources;
    })();

    const totalFileCount = fileSources.reduce((sum, s) => sum + (s.kind === 'raw' ? s.data.length : 0), 0);

    useEffect(() => {
        if (currentTask?.work_percentage !== undefined) {
            setWorkPercentage(currentTask.work_percentage);
        }
    }, [currentTask]);

    // ─── Timer query — uses plan_id and workstation_id ────────────────────────────
    const { data: timerData, isLoading: isTimerLoading, refetch: refetchTimer } =
        useShopPlanTimerState(
            { plan_id: planId, workstation_id: workstationId, scheduled_start_date: scheduledStartDate ?? undefined },
            { skip: !planId }
        );

    const [manageTimer] = useShopPlanTimerAction();

    useEffect(() => {
        if (timerData) {
            setTimerState(timerData.session?.status || 'idle');
            setTotalTime(timerData.total_actual_seconds || 0);
            setServerSynced(true);
        }
    }, [timerData]);

    // Also update work percentage from timer data if available
    useEffect(() => {
        if (timerData?.work_percentage !== undefined) {
            setWorkPercentage(timerData.work_percentage);
        }
    }, [timerData]);

    // ─── Timer action helpers — all use plan_id ────────────────────────────────
    const handleStart = async () => {
        try {
            await manageTimer({
                plan_id: planId,
                data: {
                    action: 'start',
                    timestamp: new Date().toISOString(),
                    note: t('OPERATOR.TIMER.START_NOTE', 'Timer started from operator dashboard')
                }
            }).unwrap();
            setTimerState('running');
            setServerSynced(false);
            await refetchTimer();
            toast.success(t('OPERATOR.TIMER.START_SUCCESS', 'Timer started successfully'));
        } catch (error: any) {
            console.error('Failed to start timer:', error);
            // toast.error(error?.data?.message || t('OPERATOR.TIMER.START_FAILED', 'Failed to start timer'));
        }
    };

    const handlePause = async () => {
        // Show work percentage modal first, user will enter percentage and notes
        setShowWorkPercentageModal(true);
    };

    const handleWorkPercentageSaved = async (percentage: number, notes?: string) => {
        try {
            // Send pause action with work percentage and notes directly to timer API
            await manageTimer({
                plan_id: planId,
                data: {
                    action: 'pause',
                    timestamp: new Date().toISOString(),
                    work_percentage: percentage,
                    note: notes || t('OPERATOR.TIMER.PAUSE_NOTE', 'Timer paused')
                }
            }).unwrap();

            setWorkPercentage(percentage);
            setTimerState('paused');
            setServerSynced(false);
            await refetchTimer();

            // Refetch task data to update the UI
            refetchTask();

            setShowWorkPercentageModal(false);
            toast.success(t('OPERATOR.TIMER.PAUSED', 'Timer paused'));
        } catch (error: any) {
            console.error('Failed to pause timer:', error);
            toast.error(error?.data?.message || t('OPERATOR.TIMER.PAUSE_FAILED', 'Failed to pause timer'));
        }
    };

    const handleResume = async () => {
        try {
            await manageTimer({
                plan_id: planId,
                data: {
                    action: 'resume',
                    timestamp: new Date().toISOString(),
                    note: t('OPERATOR.TIMER.RESUME_NOTE', 'Timer resumed')
                }
            }).unwrap();
            setTimerState('running');
            setServerSynced(false);
            await refetchTimer();
            toast.success(t('OPERATOR.TIMER.RESUME_SUCCESS', 'Timer resumed'));
        } catch (error: any) {
            console.error('Failed to resume timer:', error);
            // toast.error(error?.data?.message || t('OPERATOR.TIMER.RESUME_FAILED', 'Failed to resume timer'));
        }
    };

    const handleSubmitWork = async (data: SubmitWorkData) => {
        try {
            await manageTimer({
                plan_id: planId,
                data: {
                    action: 'stop',
                    timestamp: new Date().toISOString(),
                    work_percentage: data.work_percentage,
                    note: data.notes || `${t('OPERATOR.SUBMIT_WORK_NOTE', 'Work submitted')} - ${data.work_percentage}% ${t('OPERATOR.COMPLETE', 'complete')}`,
                }
            }).unwrap();
            setTimerState('stopped');
            setServerSynced(false);
            await refetchTimer();
            // toast.success(t('OPERATOR.SUBMIT_WORK_SUCCESS', 'Work submitted successfully!'));
            setTimeout(() => navigate('/operator/dashboard'), 2000);
        } catch (error: any) {
            console.error('Failed to submit work:', error);
            // toast.error(error?.data?.message || t('OPERATOR.SUBMIT_WORK_FAILED', 'Failed to submit work'));
        }
    };

    const handleFileClick = (file: UnifiedFile) => {
        setActiveFile(file);
    };

    const handleCreateShopRevision = async () => {
        if (!currentTask?.fab_id || !operatorId) {
            toast.error('Missing FAB or operator information.');
            return;
        }
        if (!revisionNote.trim()) {
            toast.warning('Please enter a revision note.');
            return;
        }

        try {
            if (timerState === 'running') {
                await manageTimer({
                    plan_id: planId,
                    data: {
                        action: 'pause',
                        timestamp: new Date().toISOString(),
                        work_percentage: workPercentage,
                        note: 'Paused automatically before creating shop revision',
                    },
                }).unwrap();
                setTimerState('paused');
                setServerSynced(false);
            }

            await createShopRevision({
                fab_id: Number(currentTask.fab_id),
                revision_note: revisionNote.trim(),
                requested_by: Number(operatorId),
                assigned_to: null,
                revision_completed: false,
            }).unwrap();
            toast.success('Shop revision created successfully.');
            setRevisionNote('');
            setShowRevisionDialog(false);
            await refetchTimer();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to create shop revision.');
        }
    };

    // Prepare data for toolbar
    const jobName = currentTask?.business_job?.name || `Job ${currentTask?.business_job?.id}`;
    const jobNumber = currentTask?.business_job?.job_number || currentTask?.fab_number;
    const jobNameLink = currentTask?.business_job?.id ? `/job/details/${currentTask.business_job.id}` : '#';
    const jobNumberLink = jobNumber
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${jobNumber}`
        : '#';
    const statusInfo = getStatusInfo(currentTask?.fab_status_id, t);

    // Task information fields
    const taskInfo = [
        { label: t('LABEL.ACCOUNT_NAME'), value: currentTask?.account_name || '—' },
        { label: t('LABEL.JOB_NAME'), value: currentTask?.job_name || '—' },
        {
            label: t('JOB.FAB_ID'),
            value: currentTask?.fab_id ? <Link to={`/sales/${currentTask.fab_id}`} className="text-primary hover:underline" target="_blank" rel="noreferrer">{currentTask.fab_id}</Link> : '—',
        },
        { label: t('JOB.FAB_TYPE'), value: <span className="uppercase">{currentTask?.fab_type || '—'}</span> },
        { label: t('JOB.AREA'), value: currentTask?.area || '—' },
        { label: t('LABEL.NO_OF_PIECES'), value: currentTask?.piece_count || currentTask?.no_of_pieces || '—' },
        { label: t('LABEL.TOTAL_SQ_FT'), value: currentTask?.total_sqft || '—' },
        { label: t('LABEL.STONE_TYPE'), value: currentTask?.stone_type || '—' },
        { label: t('LABEL.STONE_COLOR'), value: currentTask?.stone_color || '—' },
        { label: t('LABEL.STONE_THICKNESS'), value: currentTask?.stone_thickness || '—' },
        { label: t('LABEL.EDGE'), value: currentTask?.edge || '—' },
        { label: t('LABEL.PERCENT_COMPLETE'), value: currentTask?.work_percentage ? `${currentTask.work_percentage}%` : '—' },
        { label: t('LABEL.EST_FAB_COMP_DATE'), value: fabData?.shop_est_completion_date ? format(new Date(fabData.shop_est_completion_date), 'MMM d') : '—' },
        { label: t('OPERATOR.WORKSTATION'), value: currentTask?.workstation_name || '—' },
        { label: t('LABEL.EMPLOYEE'), value: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name}`.trim() : currentUser?.email || '—' },
        { label: t('OPERATOR.RUN_TIME'), value: formatTimeDisplay(totalTime) },
        {
            label: t('OPERATOR.EST_WORKSTATION_COMP'),
            value: currentTask?.est_workstation_comp_date
                ? format(new Date(currentTask.est_workstation_comp_date), 'MMM d, h:mm a')
                : (currentTask?.scheduled_end_date ? format(new Date(currentTask.scheduled_end_date), 'MMM d, h:mm a') : '—')
        },
    ];

    function formatTimeDisplay(seconds: number): string {
        if (!seconds) return '00:00:00';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    if (isTasksLoading || isTimerLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
                    <Skeleton className="h-8 w-72 mb-1" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                    <Skeleton className="h-96 w-full rounded-xl" />
                    <Skeleton className="h-96 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (activeFile) {
        return (
            <div className="fixed inset-0 z-50 bg-white overflow-auto">
                <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
            </div>
        );
    }

    return (
        <>
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
                                            {jobName}
                                        </a>
                                        <span className="mx-1 text-gray-400">·</span>
                                        <a
                                            href={jobNumberLink}
                                            className="hover:underline text-gray-600"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {jobNumber}
                                        </a>
                                    </div>
                                }
                                description={currentTask?.plan_name || '—'}
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

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-3 sm:p-4 lg:p-5">
                {/* Left column (8 columns) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Task Information Card */}
                    <Card>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {taskInfo.map((item, idx) => (
                                    <div key={idx}>
                                        <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                                            {item.label}
                                        </p>
                                        <p className="font-semibold text-text text-base leading-[28px]">
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timer Display (without buttons) */}
                    <OperatorTimerComponent
                        totalTime={totalTime}
                        isRunning={timerState === 'running'}
                        isPaused={timerState === 'paused'}
                        estimatedHours={currentTask?.estimated_hours}
                        onStart={() => { }}
                        onPause={() => { }}
                        onResume={() => { }}
                        onTimeUpdate={setTotalTime}
                        hideControls={true}
                    />

                    {/* FAB Files Card - All files from all stages */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">
                                FAB Files
                                {totalFileCount > 0 && (
                                    <span className="ml-2 text-sm font-normal text-gray-400">
                                        ({totalFileCount})
                                    </span>
                                )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Drafting, SlabSmith, Sales CT, QA, and all other files for this fabrication
                            </p>
                        </CardHeader>
                        <CardContent>
                            {isQaLoading && fileSources.length === 0 ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            ) : (
                                <FileGallery
                                    sources={fileSources}
                                    onFileClick={handleFileClick}
                                    defaultLayout="card"
                                    emptyMessage="No files have been uploaded for this FAB yet."
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Timer History Card */}
                    <OperatorTimerHistory planId={planId} workstationId={workstationId} />

                    <Card>
                        <CardHeader>
                            <CardTitle>Shop Revision History</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isRevisionsLoading ? (
                                <p className="text-sm text-muted-foreground">Loading shop revision history...</p>
                            ) : revisions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No shop revisions exist for this FAB.</p>
                            ) : (
                                revisions.map((revision: any) => (
                                    <button
                                        key={revision.id}
                                        type="button"
                                        className={`w-full text-left border rounded-md p-3 transition ${selectedRevision?.id === revision.id ? 'border-green-600 bg-green-50/50' : 'border-border'} `}
                                        onClick={() => setSelectedRevisionId(revision.id)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-medium text-sm">Revision #{revision.id}</p>
                                            <span className={`text-xs ${revision.revision_completed ? 'text-green-700' : 'text-orange-700'}`}>
                                                {revision.revision_completed ? 'Completed' : 'Pending'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {revision.revision_note || 'No note provided.'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Requested by: {revision.requested_by_name || revision.requested_by || 'Unknown'}
                                        </p>
                                    </button>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right column (4 columns) – Timer Controls */}
                <div className="lg:col-span-4">
                    {/* Pending Revision Warning Banner (prominent) */}
                    {hasPendingShopRevision && (
                        <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 rounded-md flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-amber-800">
                                <p className="font-medium">Pending Shop Revision</p>
                                <p className="text-amber-700">
                                    Timer actions and creating a new revision are disabled until the current pending revision is marked as complete.
                                </p>
                            </div>
                        </div>
                    )}

                    <Card className="border-l shadow-sm">
                        <CardHeader className="border-b pb-4">
                            <CardTitle className="text-lg font-semibold">Timer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {/* Start button (idle state) */}
                            {timerState === 'idle' && (
                                <Button
                                    onClick={handleStart}
                                    className="w-full gap-2 bg-[#7a9705] hover:bg-[#6a8505] text-white"
                                    size="lg"
                                    disabled={hasPendingShopRevision}
                                >
                                    <Play className="h-5 w-5" /> {t('OPERATOR.START_WORK')}
                                </Button>
                            )}

                            {/* Running state buttons */}
                            {timerState === 'running' && (
                                <>
                                    <Button
                                        onClick={handlePause}
                                        variant="outline"
                                        className="w-full gap-2 border-[#ef4444] text-[#ef4444] hover:bg-red-50"
                                        size="lg"
                                        disabled={hasPendingShopRevision}
                                    >
                                        <Square className="h-5 w-5" /> {t('OPERATOR.ON_HOLD')}
                                    </Button>
                                    <Button
                                        onClick={handlePause}
                                        className="w-full gap-2 bg-[#f5cd4b] hover:bg-[#f0c520] text-black"
                                        size="lg"
                                        disabled={hasPendingShopRevision}
                                    >
                                        <Pause className="h-5 w-5" /> {t('OPERATOR.PAUSE')}
                                    </Button>
                                </>
                            )}

                            {/* Paused state button */}
                            {timerState === 'paused' && (
                                <Button
                                    onClick={handleResume}
                                    className="w-full gap-2 bg-[#7a9705] hover:bg-[#6a8505] text-white"
                                    size="lg"
                                    disabled={hasPendingShopRevision}
                                >
                                    <Play className="h-5 w-5" /> {t('OPERATOR.RESUME')}
                                </Button>
                            )}

                            {/* Submit button (always visible when timer is not idle) */}
                            {timerState !== 'idle' && (
                                <Button
                                    onClick={() => setShowSubmitModal(true)}
                                    className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white"
                                    size="lg"
                                    disabled={hasPendingShopRevision}
                                >
                                    <CheckCircle2 className="h-5 w-5" /> Complete
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="mt-6 border-l shadow-sm">
                        <CardHeader>
                            <CardTitle>Revision Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {!selectedRevision ? (
                                <p className="text-sm text-muted-foreground">Select a revision from the history list to view details.</p>
                            ) : (
                                <>
                                    <SCTTimer
                                        startTime={selectedRevision.created_at || null}
                                        endTime={selectedRevision.revision_completed ? selectedRevision.completed_at || null : null}
                                        text="Time in Shop Revision:"
                                    />
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">FAB ID</p>
                                        <p className="text-sm font-medium">{selectedRevision.fab_id || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Revision Note</p>
                                        <p className="text-sm">{selectedRevision.revision_note || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Requested By</p>
                                        <p className="text-sm">{selectedRevision.requested_by_name || selectedRevision.requested_by || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Created At</p>
                                        <p className="text-sm">{selectedRevision.created_at ? format(new Date(selectedRevision.created_at), 'MMM dd, yyyy h:mm a') : '—'}</p>
                                    </div>
                                    {selectedRevision.revision_completed && selectedRevision.completed_at && (
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Completed At</p>
                                            <p className="text-sm">{format(new Date(selectedRevision.completed_at), 'MMM dd, yyyy h:mm a')}</p>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Status</p>
                                        <p className="text-sm font-medium">
                                            {selectedRevision.revision_completed ? (
                                                <span className="text-green-700">Completed</span>
                                            ) : (
                                                <span className="text-orange-700">Pending</span>
                                            )}
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Extra QA card */}
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">{t('QA.SHOP_UPLOADS')}</CardTitle>
                            <p className="text-sm text-muted-foreground">{t('QA.DOCUMENTATION_DESCRIPTION')}</p>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => setShowRevisionDialog(true)}
                                variant="outline"
                                className="w-full gap-2 mb-3"
                                size="lg"
                                disabled={hasPendingShopRevision}
                                title={hasPendingShopRevision ? "Cannot create a new revision while a pending revision exists" : ""}
                            >
                                Create Shop Revision
                            </Button>
                            <Button
                                onClick={() => setShowUploadDialog(true)}
                                className="w-full gap-2 bg-[#7a9705] hover:bg-[#6a8505] text-white"
                                size="lg"
                                disabled={hasPendingShopRevision}
                                title={hasPendingShopRevision ? "Cannot upload files while a pending revision exists" : ""}
                            >
                                <Camera className="h-5 w-5" /> Upload Shop Files
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            <WorkPercentageModal
                open={showWorkPercentageModal}
                currentPercentage={workPercentage}
                onSave={handleWorkPercentageSaved}
                onClose={() => setShowWorkPercentageModal(false)}
                operatorId={operatorId}
                workstationId={workstationId}
                taskId={currentTask?.id || taskId}
            />

            <SubmitWorkModal
                open={showSubmitModal}
                onOpenChange={setShowSubmitModal}
                onSubmit={handleSubmitWork}
                currentWorkPercentage={workPercentage}
                estimatedHours={currentTask?.estimated_hours}
                actualHours={totalTime / 3600}
                taskId={currentTask?.task_id || taskId}
                operatorId={operatorId}
                workstationId={workstationId}
                fabId={currentTask?.fab_id}
                jobId={currentTask?.business_job?.id}
            />

            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t('UPLOAD.QA.TITLE')} {currentTask?.fab_id ? `FAB-${currentTask.fab_id}` : ''}
                        </DialogTitle>
                    </DialogHeader>
                    {/* OperatorMediaUpload — jobId prop receives fab_id per API spec */}
                    <OperatorMediaUpload
                        jobId={currentTask?.fab_id || 0}
                        onUploadComplete={() => {
                            setShowUploadDialog(false);
                            refetchQaFiles();
                            toast.success(t('UPLOAD.SUCCESS', 'Files uploaded successfully'));
                        }}
                        onClose={() => setShowUploadDialog(false)}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Create Shop Revision {currentTask?.fab_id ? `for FAB-${currentTask.fab_id}` : ''}
                        </DialogTitle>
                    </DialogHeader>
                    {hasPendingShopRevision && (
                        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                            ⚠️ A pending revision already exists. Please complete it before creating a new one.
                        </div>
                    )}
                    <div className="space-y-4">
                        <Textarea
                            value={revisionNote}
                            onChange={(e) => setRevisionNote(e.target.value)}
                            placeholder="Enter revision details for this FAB..."
                            className="min-h-[120px] resize-none"
                            disabled={hasPendingShopRevision}
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowRevisionDialog(false)}
                                disabled={isCreatingRevision}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateShopRevision}
                                disabled={isCreatingRevision || !revisionNote.trim() || hasPendingShopRevision}
                            >
                                {isCreatingRevision ? 'Creating...' : 'Create Revision'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}