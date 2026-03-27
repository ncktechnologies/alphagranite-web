import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Camera, CheckCircle2, Play, Pause, Square } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';

import { OperatorTimerComponent } from './components/TimerComponent';
import { SubmitWorkModal, type SubmitWorkData } from './components/SubmitWorkModal';
import {
    useGetTimerStateQuery,
    useManageTimerMutation,
    useGetTimerHistoryQuery,
    useGetCurrentOperatorTasksByIdQuery,
    useGetOperatorQaFilesQuery,
} from '@/store/api/operator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OperatorMediaUpload } from './components/OperatorMediaUpload';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { BackButton } from '@/components/common/BackButton';
import { FileViewer } from '../jobs/roles/drafters/components';
import { FileGallery, type UnifiedFile } from '@/pages/jobs/components/FileGallery';
import { WorkPercentageModal } from './components/WorkPercentageModal';

// Helper function for status display
const getStatusInfo = (statusId: number | undefined) => {
    if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
    if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
    return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
};

export function OperatorTaskDetails() {
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
    const [activeFile, setActiveFile] = useState<UnifiedFile | null>(null);

    const { data: taskData, isLoading: isTasksLoading } =
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

    // Fetch QA files for this job and operator
    const { data: qaFilesData, isLoading: isQaLoading, refetch: refetchQaFiles } = useGetOperatorQaFilesQuery(
        { operator_id: operatorId, job_id: currentTask?.business_job?.id || 0 },
        { skip: !currentTask?.business_job?.id || !operatorId }
    );

    // Map QA files to UnifiedFile format for FileGallery
    const qaFiles: UnifiedFile[] = (qaFilesData?.data || []).map((file: any) => ({
        id: String(file.id),
        name: file.name || file.file_name,
        size: file.file_size || file.size || 0,
        type: file.file_type || file.mime_type || 'application/octet-stream',
        url: file.file_url || file.url,
        stage: 'QA',
        uploadedBy: file.uploaded_by_name || 'Operator',
        uploadedAt: file.created_at ? new Date(file.created_at) : undefined,
        _raw: file,
    }));

    useEffect(() => {
        if (currentTask?.work_percentage !== undefined) {
            setWorkPercentage(currentTask.work_percentage);
        }
    }, [currentTask]);

    const { data: timerData, isLoading: isTimerLoading, refetch: refetchTimer } =
        useGetTimerStateQuery(
            { job_id: currentTask?.business_job.id || 0, scheduled_start_date: scheduledStartDate ?? undefined },
            { skip: !currentTask }
        );

    const [manageTimer] = useManageTimerMutation();

    useEffect(() => {
        if (timerData) {
            setTimerState(timerData.session?.status || 'idle');
            setTotalTime(timerData.total_actual_seconds || 0);
            setServerSynced(true);
        }
    }, [timerData]);

    const handleStart = async () => {
        try {
            await manageTimer({
                job_id: currentTask?.business_job?.id || 0,
                data: {
                    action: 'start',
                    timestamp: new Date().toISOString(),
                    note: 'Timer started from operator dashboard'
                }
            }).unwrap();
            setTimerState('running');
            setServerSynced(false);
            await refetchTimer();
            toast.success('Timer started successfully');
        } catch (error: any) {
            console.error('Failed to start timer:', error);
            toast.error(error?.data?.message || 'Failed to start timer');
        }
    };

    const handlePause = async () => {
        try {
            await manageTimer({
                job_id: currentTask?.business_job?.id || 0,
                data: {
                    action: 'pause',
                    timestamp: new Date().toISOString(),
                    note: 'Timer paused'
                }
            }).unwrap();

            setTimerState('paused');
            setServerSynced(false);
            await refetchTimer();

            setShowWorkPercentageModal(true);
        } catch (error: any) {
            console.error('Failed to pause timer:', error);
            toast.error(error?.data?.message || 'Failed to pause timer');
        }
    };

    const handleWorkPercentageSaved = (percentage: number) => {
        setWorkPercentage(percentage);
        setShowWorkPercentageModal(false);
        toast.success('Timer paused');
    };

    const handleResume = async () => {
        try {
            await manageTimer({
                job_id: currentTask?.business_job?.id || 0,
                data: {
                    action: 'resume',
                    timestamp: new Date().toISOString(),
                    note: 'Timer resumed'
                }
            }).unwrap();
            setTimerState('running');
            setServerSynced(false);
            await refetchTimer();
            toast.success('Timer resumed');
        } catch (error: any) {
            console.error('Failed to resume timer:', error);
            toast.error(error?.data?.message || 'Failed to resume timer');
        }
    };

    const handleSubmitWork = async (data: SubmitWorkData) => {
        try {
            await manageTimer({
                job_id: currentTask?.business_job?.id || 0,
                data: {
                    action: 'stop',
                    timestamp: new Date().toISOString(),
                    note: `Work submitted - ${data.work_percentage}% complete. ${data.notes || ''}`,
                }
            }).unwrap();
            setTimerState('stopped');
            setServerSynced(false);
            await refetchTimer();
            toast.success('Work submitted successfully!');
            setTimeout(() => navigate('/operator/dashboard'), 2000);
        } catch (error: any) {
            console.error('Failed to submit work:', error);
            toast.error(error?.data?.message || 'Failed to submit work');
        }
    };

    const handleFileClick = (file: UnifiedFile) => {
        setActiveFile(file);
    };

    // Prepare data for toolbar
    const jobName = currentTask?.business_job?.name || `Job ${currentTask?.business_job?.id}`;
    const jobNumber = currentTask?.business_job?.job_number || currentTask?.fab_number;
    const jobNameLink = currentTask?.business_job?.id ? `/job/details/${currentTask.business_job.id}` : '#';
    const jobNumberLink = jobNumber
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${jobNumber}`
        : '#';
    const statusInfo = getStatusInfo(currentTask?.fab_status_id);

    // Task information fields
    const taskInfo = [
        { label: 'Account Name', value: currentTask?.account_name || '—' },
        { label: 'Job Name', value: currentTask?.job_name || '—' },
        {
            label: 'Fab ID',
            value: currentTask?.fab_id ? <Link to={`/sales/${currentTask.fab_id}`} className="text-primary hover:underline">FAB-{currentTask.fab_id}</Link> : '—',
        },
        { label: 'Fab Type', value: <span className="uppercase">{currentTask?.fab_type || '—'}</span> },
        { label: 'Area', value: currentTask?.area || '—' },
        { label: 'No. Of Pieces', value: currentTask?.piece_count || currentTask?.no_of_pieces || '—' },
        { label: 'Total Sq. ft.', value: currentTask?.total_sqft || '—' },
        { label: 'Stone Type', value: currentTask?.stone_type || '—' },
        { label: 'Stone Color', value: currentTask?.stone_color || '—' },
        { label: 'Stone Thickness', value: currentTask?.stone_thickness || '—' },
        { label: 'Edge', value: currentTask?.edge || '—' },
        { label: '% Complete', value: workPercentage ? `${workPercentage}%` : (currentTask?.work_percentage ? `${currentTask.work_percentage}%` : '—') },
        { label: 'Est. Job Comp Date', value: currentTask?.estimated_completion ? format(new Date(currentTask.estimated_completion), 'MMM d') : '—' },
        { label: 'Workstation', value: currentTask?.workstation_name || '—' },
        { label: 'Employee', value: currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name}`.trim() : currentUser?.email || '—' },
        { label: 'Run Time', value: formatTimeDisplay(totalTime) },
        {
            label: 'Est. Workstation Comp Date & Time',
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
                <div className="sticky top-0 z-20 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
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
            <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
                <div className="px-3 sm:px-4 lg:px-6">
                    <Toolbar className="py-2 sm:py-3">
                        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                            <ToolbarHeading
                                title={
                                    <div className="text-base sm:text-lg lg:text-2xl font-bold leading-tight">
                                        <a href={jobNameLink} className="hover:underline">
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
                                description="Operator Task Details"
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

            {/* Two‑column layout */}
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
                        onStart={() => { }} // dummy
                        onPause={() => { }} // dummy
                        onResume={() => { }} // dummy
                        onTimeUpdate={setTotalTime}
                        hideControls={true}
                    />

                    {/* QA Documentation – File Gallery */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold">QA Documentation</CardTitle>
                                <p className="text-sm text-muted-foreground">Uploaded photos and files</p>
                            </div>
                            <Button
                                onClick={() => setShowUploadDialog(true)}
                                variant="outline"
                                size="sm"
                            >
                                <Camera className="h-4 w-4 mr-2" /> Upload Files
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isQaLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            ) : (
                                <FileGallery
                                    sources={[{ kind: 'raw', data: qaFiles }]}
                                    onFileClick={handleFileClick}
                                    // defaultLayout="grid"
                                    emptyMessage="No QA files uploaded yet."
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right column (4 columns) – Timer Controls only */}
                <div className="lg:col-span-4">
                    <Card className="border-l shadow-sm">
                        <CardHeader className="border-b pb-4">
                            <CardTitle className="text-lg font-semibold">Timer Controls</CardTitle>
                            <p className="text-sm text-muted-foreground">Start, pause, or resume your work session</p>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {/* Start button (idle state) */}
                            {timerState === 'idle' && (
                                <Button
                                    onClick={handleStart}
                                    className="w-full gap-2 bg-[#7a9705] hover:bg-[#6a8505] text-white"
                                    size="lg"
                                >
                                    <Play className="h-5 w-5" /> Start Work
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
                                    >
                                        <Square className="h-5 w-5" /> On Hold
                                    </Button>
                                    <Button
                                        onClick={handlePause}
                                        className="w-full gap-2 bg-[#f5cd4b] hover:bg-[#f0c520] text-black"
                                        size="lg"
                                    >
                                        <Pause className="h-5 w-5" /> Pause
                                    </Button>
                                </>
                            )}

                            {/* Paused state button */}
                            {timerState === 'paused' && (
                                <Button
                                    onClick={handleResume}
                                    className="w-full gap-2 bg-[#7a9705] hover:bg-[#6a8505] text-white"
                                    size="lg"
                                >
                                    <Play className="h-5 w-5" /> Resume
                                </Button>
                            )}

                            {/* Submit button (always visible when timer is not idle) */}
                            {timerState !== 'idle' && (
                                <Button
                                    onClick={() => setShowSubmitModal(true)}
                                    className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white"
                                    size="lg"
                                >
                                    <CheckCircle2 className="h-5 w-5" /> Submit and End Session
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                    {/* QA Documentation Card (optional, could also be here or left column) */}
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">QA Documentation</CardTitle>
                            <p className="text-sm text-muted-foreground">Upload photos and files</p>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={() => setShowUploadDialog(true)} variant="outline" className="w-full">
                                <Camera className="h-4 w-4 mr-2" /> Upload QA Files
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
                taskId={currentTask?.task_id || taskId}
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
                jobId={currentTask?.business_job.id}
            />

            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Upload QA Files for FAB-{currentTask?.fab_id || taskId}
                        </DialogTitle>
                    </DialogHeader>
                    <OperatorMediaUpload
                        jobId={currentTask?.business_job.id || 0}
                        onUploadComplete={() => {
                            setShowUploadDialog(false);
                            refetchQaFiles();
                            toast.success('QA files uploaded successfully');
                        }}
                        onClose={() => setShowUploadDialog(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}