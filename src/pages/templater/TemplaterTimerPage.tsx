import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OperatorTimerComponent } from '../operator/components/TimerComponent';
import {
    useGetTemplaterTimerStateQuery,
    useStartTemplaterTimerMutation,
    usePauseTemplaterTimerMutation,
    useResumeTemplaterTimerMutation,
    useStopTemplaterTimerMutation,
} from '@/store/api/jobTimers';
import { useGetJobByIdQuery } from '@/store/api/job';
import { PauseModal } from './PauseModal';
import { StopModal } from './StopModal';
import { TemplaterTimerHistory } from './TemplaterHistory';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { BackButton } from '@/components/common/BackButton';

export function TemplaterTimerPage() {
    const { job_id } = useParams<{ job_id: string }>();
    const navigate = useNavigate();

    const currentUser = useSelector((s: any) => s.user.user);
    const templater_id = currentUser?.id;

    // Fetch job details for header
    const { data: jobData } = useGetJobByIdQuery(Number(job_id), { skip: !job_id });

    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isStopped, setIsStopped] = useState(false);

    const [pauseModalOpen, setPauseModalOpen] = useState(false);
    const [stopModalOpen, setStopModalOpen] = useState(false);

    const shouldSkip = !job_id || !templater_id;
    const { data: timerState, refetch } = useGetTemplaterTimerStateQuery(
        { job_id: Number(job_id), templater_id: templater_id! },
        { 
            skip: shouldSkip,
            pollingInterval: isRunning ? 5000 : 0, // Poll every 5s when running
        }
    );

    const [startTimer] = useStartTemplaterTimerMutation();
    const [pauseTimer] = usePauseTemplaterTimerMutation();
    const [resumeTimer] = useResumeTemplaterTimerMutation();

    // Sync timer state from server
    useEffect(() => {
        if (timerState) {
            const session = timerState.session;
            if (session) {
                // Use total_actual_seconds for cumulative time across all sessions
                // This includes all work time from previous sessions + current session
                const totalSeconds = timerState.total_actual_seconds || session.total_work_seconds || 0;
                setElapsedTime(totalSeconds);
                setIsRunning(session.status === 'running');
                setIsPaused(session.status === 'paused');
                setIsStopped(session.status === 'stopped');
                
                
            } else {
                setIsStopped(false);
                setElapsedTime(0);
                setIsRunning(false);
                setIsPaused(false);
            }
        }
    }, [timerState]);

    // Note: OperatorTimerComponent has its own internal interval for smooth ticking
    // We don't need a separate interval here - the component handles it via onTimeUpdate

    const handleStart = async () => {
        if (!templater_id || !job_id) return;
        try {
            await startTimer({ job_id: Number(job_id), templater_id }).unwrap();
            localStorage.setItem('activeTemplaterJobId', job_id);
            toast.success('Timer started');
            refetch();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to start timer');
        }
    };

    const handlePause = () => setPauseModalOpen(true);
    const handleStopSubmit = () => setStopModalOpen(true);

    const handleResume = async () => {
        if (!templater_id) return;
        try {
            await resumeTimer({ job_id: Number(job_id), templater_id }).unwrap();
            toast.success('Timer resumed');
            refetch();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to resume timer');
        }
    };

    const handlePauseSuccess = () => refetch();
    const handleStopSuccess = () => refetch();

    // Prepare clickable links
    const jobNameLink = jobData?.id ? `/job/details/${jobData.id}` : '#';
    const jobNumberLink = jobData?.job_number
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${jobData.job_number}`
        : '#';

    if (shouldSkip) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-red-600">Missing information</h2>
                    <p className="text-gray-600">Unable to identify the job or templater.</p>
                    <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Sticky toolbar - matching details page layout */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
                <div className="px-3 sm:px-4 lg:px-6">
                    <Toolbar className="py-2 sm:py-3">
                        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                            <ToolbarHeading
                                title={
                                    <div className="text-base sm:text-lg lg:text-2xl font-bold leading-tight">
                                        <a href={jobNameLink} className="hover:underline"
                                            target="_blank"
                                            rel="noreferrer">
                                            {jobData?.name || `Job ${job_id}`}
                                        </a>
                                        <span className="mx-1 text-gray-400">·</span>
                                        <a
                                            href={jobNumberLink}
                                            className="hover:underline text-gray-600"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {jobData?.job_number || job_id}
                                        </a>
                                    </div>
                                }
                                description="Templater Timer"
                            />
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <BackButton />
                            </div>
                        </div>
                    </Toolbar>
                </div>
            </div>

            {/* Main content */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    {!isStopped ? (
                        <>
                            <OperatorTimerComponent
                                totalTime={elapsedTime}
                                isRunning={isRunning}
                                isPaused={isPaused}
                                onStart={handleStart}
                                onPause={handlePause}
                                onResume={handleResume}
                                onTimeUpdate={setElapsedTime}
                                disabled={!job_id || !templater_id}
                            />
                            <div className="mt-6 flex justify-center">
                                <Button
                                    onClick={handleStopSubmit}
                                    size="lg"
                                    disabled={!job_id || !templater_id}
                                >
                                    Submit
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-8 bg-white rounded-lg border shadow-sm">
                            <div className="text-lg font-semibold text-gray-700 mb-2">Session Ended</div>
                            <p className="text-gray-500">This timer session has been completed and cannot be restarted.</p>
                            <div className="mt-4 text-sm text-gray-400">
                                Total time worked: {Math.floor(elapsedTime / 3600)}h {Math.floor((elapsedTime % 3600) / 60)}m {elapsedTime % 60}s
                            </div>
                        </div>
                    )}
                    <TemplaterTimerHistory
                        jobId={Number(job_id)}
                        templaterId={templater_id!}
                    />
                </div>
            </div>

            <PauseModal
                open={pauseModalOpen}
                onClose={() => setPauseModalOpen(false)}
                jobId={Number(job_id)}
                templaterId={templater_id!}
                onPauseSuccess={handlePauseSuccess}
            />

            <StopModal
                open={stopModalOpen}
                onClose={() => setStopModalOpen(false)}
                jobId={Number(job_id)}
                templaterId={templater_id!}
                onStopSuccess={handleStopSuccess}
            />
        </div>
    );
}