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
import { PauseModal } from './PauseModal';
import { StopModal } from './StopModal';
import { TemplaterTimerHistory } from './TemplaterHistory';

export function TemplaterTimerPage() {
    const { job_id } = useParams<{ job_id: string }>();
    const navigate = useNavigate();

    const currentUser = useSelector((s: any) => s.user.user);
    const templater_id = currentUser?.id;

    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isStopped, setIsStopped] = useState(false); // renamed for clarity

    const [pauseModalOpen, setPauseModalOpen] = useState(false);
    const [stopModalOpen, setStopModalOpen] = useState(false);

    const shouldSkip = !job_id || !templater_id;
    const { data: timerState, refetch } = useGetTemplaterTimerStateQuery(
        { job_id: Number(job_id), templater_id: templater_id! },
        { skip: shouldSkip }
    );

    const [startTimer] = useStartTemplaterTimerMutation();
    const [pauseTimer] = usePauseTemplaterTimerMutation();
    const [resumeTimer] = useResumeTemplaterTimerMutation();

    // Sync timer state from server
    useEffect(() => {
        if (timerState) {
            const session = timerState.session;
            if (session) {
                setElapsedTime(session.total_work_seconds || 0);
                setIsRunning(session.status === 'running');
                setIsPaused(session.status === 'paused');
                setIsStopped(session.status === 'stopped');
            } else {
                // No session (should not happen with current API, but fallback)
                setIsStopped(false);
                setElapsedTime(0);
                setIsRunning(false);
                setIsPaused(false);
            }
        }
    }, [timerState]);

    const handleStart = async () => {
        if (!templater_id) return;
        try {
            await startTimer({ job_id: Number(job_id), templater_id }).unwrap();
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
    const handleStopSuccess = () => refetch(); // stay on page, will show stopped state

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
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Templater Timer</h1>
                            <p className="text-sm text-gray-500">Job ID: {job_id}</p>
                        </div>
                    </div>
                </div>
            </div>

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