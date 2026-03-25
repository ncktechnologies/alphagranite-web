import { useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Camera, CheckCircle2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';

import { OperatorTimerComponent } from './components/TimerComponent';
import { SubmitWorkModal, type SubmitWorkData } from './components/SubmitWorkModal';
import {
    useGetTimerStateQuery,
    useManageTimerMutation,
    useGetTimerHistoryQuery,
    useGetCurrentOperatorTasksByIdQuery,
} from '@/store/api/operator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OperatorMediaUpload } from './components/OperatorMediaUpload';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { BackButton } from '@/components/common/BackButton';
import { Badge } from '@/components/ui/badge';
import { FileViewer } from '../jobs/roles/drafters/components';
import { cn } from '@/lib/utils';
import { WorkPercentageModal } from './components/WorkPercentageModal';

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
    const [activeFile, setActiveFile] = useState<any | null>(null);

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

    // Initialize workPercentage from the task data
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

    const { data: timerHistory } = useGetTimerHistoryQuery(
        { job_id: currentTask?.business_job?.id || 0 },
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

    const handleFileClick = (file: any) => {
        setActiveFile({
            ...file,
            url: file.url || file.file_url,
            name: file.name || file.file_name,
            type: file.type || 'application/octet-stream',
            size: file.size || 0,
        });
    };

    if (isTasksLoading || isTimerLoading) {
        return (
            <Container className="border-t">
                <div className="p-6 space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </Container>
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
            <Container className="lg:mx-0">
                <Toolbar>
                    <ToolbarHeading
                        title={
                            <div className="text-2xl font-bold">
                                <span>FAB-{currentTask?.fab_id || 'N/A'}: {currentTask?.job_name || 'N/A'}-{` #${currentTask?.job_number || currentTask?.fab_number || 'N/A'} `}</span>
                            </div>
                        }
                    />
                    <ToolbarActions>
                        <BackButton />
                    </ToolbarActions>
                </Toolbar>
            </Container>

            <div className="border-t grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <Container className="lg:col-span-8">
                    <Card className="my-4">
                        <CardHeader>
                            <CardHeading className="flex flex-col items-start py-4">
                                <CardTitle className="text-[#111827] leading-[32px] text-2xl font-bold">
                                    Task Information
                                </CardTitle>
                                <p className="text-sm text-[#4B5563]">Details for this operator task</p>
                            </CardHeading>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 space-y-10">
                                {[
                                    { label: 'Account', value: currentTask?.account_name },
                                    { label: 'Workstation', value: currentTask?.workstation_name },
                                    { label: 'Shop Activity', value: currentTask?.plan_name },
                                    { label: 'Estimated Hours', value: currentTask?.estimated_hours },
                                    {
                                        label: 'Scheduled Start',
                                        value: scheduledStartDate
                                            ? format(new Date(scheduledStartDate), 'MMM d, yyyy h:mm a')
                                            : currentTask?.scheduled_start_date
                                                ? format(new Date(currentTask.scheduled_start_date), 'MMM d, yyyy h:mm a')
                                                : null,
                                    },
                                    {
                                        label: 'Scheduled End',
                                        value: currentTask?.est_workstation_comp_date
                                            ? format(new Date(currentTask.est_workstation_comp_date), 'MMM d, yyyy h:mm a')
                                            : null,
                                    },
                                ].map((item, idx) => (
                                    <div key={idx}>
                                        <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                                            {item.label}
                                        </p>
                                        <p className="font-semibold text-text text-base leading-[28px]">
                                            {item.value || 'N/A'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="my-4">
                        <CardContent className="space-y-4">
                            <OperatorTimerComponent
                                totalTime={totalTime}
                                isRunning={timerState === 'running'}
                                isPaused={timerState === 'paused'}
                                estimatedHours={currentTask?.estimated_hours}
                                onStart={handleStart}
                                onPause={handlePause}
                                onResume={handleResume}
                                onTimeUpdate={setTotalTime}
                            />

                            {(timerState === 'paused' || timerState === 'stopped' || timerState === 'running') && (
                                <Button
                                    onClick={() => setShowSubmitModal(true)}
                                    className="w-full h-14 text-base gap-2 bg-red-600 hover:bg-red-700"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Submit and End Session
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="my-4">
                        <CardHeader>
                            <CardHeading className="flex flex-col items-start py-4">
                                <CardTitle className="text-[#111827] leading-[32px] text-2xl font-bold">
                                    QA Documentation
                                </CardTitle>
                                <p className="text-sm text-[#4B5563]">Photos and quality assurance files</p>
                            </CardHeading>
                            <div className="mt-4">
                                <Button onClick={() => setShowUploadDialog(true)}>
                                    <Camera className="h-4 w-4 mr-2" />
                                    Upload QA Files
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Upload QA files with stage and file type information.
                            </p>
                        </CardContent>
                    </Card>
                </Container>

                <div className="lg:col-span-4 w-full lg:w-[300px] xl:w-[350px]">
                    <div className="border-l">
                        <Card className="border-none py-6">
                            <CardHeader className="border-b pb-4 flex-col items-start">
                                <CardTitle className="font-semibold text-text">Timer History</CardTitle>
                                <p className="text-sm text-text-foreground">Recent timer actions</p>
                            </CardHeader>
                            <CardContent>
                                {timerHistory && timerHistory.length > 0 ? (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {timerHistory.slice(0, 10).map((entry: any, index: number) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        entry.action === 'start' ? 'bg-green-500' :
                                                            entry.action === 'pause' ? 'bg-yellow-500' :
                                                                entry.action === 'resume' ? 'bg-blue-500' :
                                                                    'bg-red-500'
                                                    )} />
                                                    <span className="text-sm font-medium capitalize">
                                                        {entry.action}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {new Date(entry.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500 text-sm">
                                        No timer history yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Work Percentage Modal */}
            <WorkPercentageModal
                open={showWorkPercentageModal}
                currentPercentage={workPercentage}
                onSave={handleWorkPercentageSaved}
                onClose={() => setShowWorkPercentageModal(false)}
                operatorId={operatorId}
                workstationId={workstationId}
                taskId={currentTask?.task_id || taskId}
            />

            {/* Submit Work Modal */}
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
                            toast.success('QA files uploaded successfully');
                        }}
                        onClose={() => setShowUploadDialog(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}