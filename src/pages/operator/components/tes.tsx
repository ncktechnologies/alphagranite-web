import { useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Camera, Plus } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';

import { OperatorTimerComponent } from './components/TimerComponent';
import { SubmitWorkModal, type SubmitWorkData } from './components/SubmitWorkModal';
import { 
    useGetTimerStateQuery, 
    useManageTimerMutation,
    useGetTimerHistoryQuery,
    useGetCurrentOperatorTasksQuery
} from '@/store/api/operator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OperatorMediaUpload } from './components/OperatorMediaUpload';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { BackButton } from '@/components/common/BackButton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FileViewer } from '../jobs/roles/drafters/components';

export function OperatorTaskDetails() {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const taskId = jobId ? Number(jobId) : 0;  // This is actually task_id from URL
    
    const currentUser = useSelector((s: any) => s.user.user);
    const currentEmployeeId = currentUser?.employee_id || currentUser?.id;

    const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'stopped'>('idle');
    const [totalTime, setTotalTime] = useState(0);
    const [serverSynced, setServerSynced] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [workPercentage, setWorkPercentage] = useState(0);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [activeFile, setActiveFile] = useState<any | null>(null);

    // Get operator task data (includes workstation, estimated_hours, etc.)
    const { data: tasksData, isLoading: isTasksLoading } = 
        useGetCurrentOperatorTasksQuery(
            { view: 'day', reference_date: new Date().toISOString().split('T')[0] },
            { skip: !currentEmployeeId }
        );

    // Find current task from list
    const currentTask = tasksData 
        ? (Array.isArray(tasksData) ? tasksData : (tasksData as any)?.data || [])
            .find((task: any) => task.task_id === taskId || task.fab_id === taskId)
        : null;

    // Get timer state
    const { data: timerData, isLoading: isTimerLoading, refetch: refetchTimer } = 
        useGetTimerStateQuery(
            { job_id: currentTask?.job_id || 0 },
            { skip: !currentTask }
        );

    // Get timer history
    const { data: timerHistory } = useGetTimerHistoryQuery({ job_id: currentTask?.job_id || 0 }, { skip: !currentTask });

    // Timer mutation
    const [manageTimer] = useManageTimerMutation();

    // Sync timer state from server
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
                job_id: currentTask?.job_id || 0,
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
                job_id: currentTask?.job_id || 0,
                data: {
                    action: 'pause',
                    timestamp: new Date().toISOString(),
                    note: 'Timer paused'
                }
            }).unwrap();
            
            setTimerState('paused');
            setServerSynced(false);
            setShowSubmitModal(true); // Just open modal to record progress, timer stays paused
            await refetchTimer();
            toast.success('Timer paused');
        } catch (error: any) {
            console.error('Failed to pause timer:', error);
            toast.error(error?.data?.message || 'Failed to pause timer');
        }
    };

    const handleResume = async () => {
        try {
            await manageTimer({
                job_id: currentTask?.job_id || 0,
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
                job_id: currentTask?.job_id || 0,
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
            
            setTimeout(() => {
                navigate('/operator/dashboard');
            }, 2000);
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

    // Loading state
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

    // Error state
    // if (!currentTask && !timerData) {
    //     return (
    //         <Container className="border-t">
    //             <div className="flex items-center gap-2 text-red-600">
    //                 <ArrowLeft className="w-5 h-5" />
    //                 <p>Failed to load task details</p>
    //             </div>
    //         </Container>
    //     );
    // }

    // Full-screen file viewer (using your existing FileViewer component)
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
                                <span>FAB-{currentTask?.fab_id || 'N/A'}: {currentTask?.job_name || 'N/A'}</span>
                                {' - '}
                                <Badge variant={timerState === 'running' ? 'primary' : 'secondary'}>
                                    {timerState === 'running' ? 'In Progress' : timerState === 'paused' ? 'Paused' : 'Not Started'}
                                </Badge>
                            </div>
                        }
                        description={`Job #${currentTask?.job_number || currentTask?.fab_number || 'N/A'} • ${currentTask?.account_name || 'N/A'}`}
                    />
                    <ToolbarActions>
                        <BackButton fallbackUrl="/operator/dashboard" />
                    </ToolbarActions>
                </Toolbar>
            </Container>

            <div className="border-t grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN - Main Content */}
                <Container className="lg:col-span-8">
                    {/* Task Information Card */}
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
                            <div className="grid grid-cols-2 md:grid-cols-3 space-y-10">
                                <div>
                                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                                        FAB Number
                                    </p>
                                    <p className="font-semibold text-text text-base leading-[28px]">
                                        {currentTask?.fab_id || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                                        Job Name
                                    </p>
                                    <p className="font-semibold text-text text-base leading-[28px]">
                                        {currentTask?.job_name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                                        Account
                                    </p>
                                    <p className="font-semibold text-text text-base leading-[28px]">
                                        {currentTask?.account_name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                                        Workstation
                                    </p>
                                    <p className="font-semibold text-text text-base leading-[28px]">
                                        {currentTask?.workstation_name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                                        Stage
                                    </p>
                                    <p className="font-semibold text-text text-base leading-[28px]">
                                        {currentTask?.current_stage || currentTask?.planning_section_name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                                        Estimated Hours
                                    </p>
                                    <p className="font-semibold text-text text-base leading-[28px]">
                                        {currentTask?.estimated_hours || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timer Section */}
                    <Card className="my-4">
                        <CardHeader>
                            <CardHeading className="flex flex-col items-start py-4">
                                <CardTitle className="text-[#111827] leading-[32px] text-2xl font-bold">
                                    Time Tracking
                                </CardTitle>
                                <p className="text-sm text-[#4B5563]">Track your work time</p>
                            </CardHeading>
                        </CardHeader>
                        <CardContent>
                            <OperatorTimerComponent
                                totalTime={totalTime}
                                isRunning={timerState === 'running'}
                                isPaused={timerState === 'paused'}
                                estimatedHours={currentTask?.estimated_hours}
                                onStart={handleStart}
                                onPause={handlePause}
                                onResume={handleResume}
                                onSubmitAndEnd={() => setShowSubmitModal(true)}
                                onTimeUpdate={setTotalTime}
                            />
                        </CardContent>
                    </Card>

                    {/* QA Files - Using YOUR JobMediaUpload component */}
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
                                Upload QA files with stage and file type information. Files can only be uploaded when timer is paused or stopped.
                            </p>
                            
                            {/* Submit & End Session button - Only shows when paused/stopped */}
                            {(timerState === 'paused' || timerState === 'stopped') && (
                                <Button 
                                    onClick={() => setShowSubmitModal(true)}
                                    className="w-full mt-4 bg-red-600 hover:bg-red-700 h-16 text-lg gap-2"
                                >
                                    Submit & End Session
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </Container>

                {/* RIGHT COLUMN - Sidebar */}
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
                                        {timerHistory.slice(0, 10).map((entry, index) => (
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

            {/* Submit Work Modal */}
            <SubmitWorkModal
                open={showSubmitModal}
                onOpenChange={setShowSubmitModal}
                onSubmit={handleSubmitWork}
                currentWorkPercentage={workPercentage}
                estimatedHours={currentTask?.estimated_hours}
                actualHours={totalTime / 3600}
            />

            {/* Upload Dialog - Using OPERATOR-SPECIFIC MediaUpload component */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Upload QA Files for FAB-{currentTask?.fab_id || taskId}
                        </DialogTitle>
                    </DialogHeader>
                    <OperatorMediaUpload
                        jobId={currentTask?.job_id || 0}
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

// Helper for conditional styling
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
