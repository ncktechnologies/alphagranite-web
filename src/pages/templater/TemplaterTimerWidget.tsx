import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    useGetTemplaterTimerStateQuery,
    useStartTemplaterTimerMutation,
    usePauseTemplaterTimerMutation,
    useResumeTemplaterTimerMutation,
} from '@/store/api/jobTimers';
import { PauseModal } from './PauseModal';

export function TemplaterTimerWidget() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const currentUser = useSelector((s: any) => s.user.user);
    const templater_id = currentUser?.id;

    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [pauseModalOpen, setPauseModalOpen] = useState(false);

    // Try to get job_id from various sources
    // First check URL params, then check localStorage for active job
    const urlMatch = location.pathname.match(/\/jobs\/(\d+)\/templater/);
    const storedJobId = localStorage.getItem('activeTemplaterJobId');
    const job_id = urlMatch?.[1] || storedJobId;

    const shouldSkip = !job_id || !templater_id;
    
    const { data: timerState, refetch } = useGetTemplaterTimerStateQuery(
        { job_id: Number(job_id), templater_id: templater_id! },
        { 
            skip: shouldSkip,
            pollingInterval: isRunning ? 5000 : 0, // Only poll when running, not when paused/stopped
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
                const totalSeconds = timerState.total_actual_seconds || session.total_work_seconds || 0;
                setElapsedTime(totalSeconds);
                setIsRunning(session.status === 'running');
                setIsPaused(session.status === 'paused');
                
                // Store active job ID
                if (job_id) {
                    localStorage.setItem('activeTemplaterJobId', job_id);
                }
            }
        }
    }, [timerState, job_id]);

    // Local timer tick
    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (isRunning) {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isRunning]);

    const handleStart = async () => {
        if (!templater_id || !job_id) return;
        try {
            await startTimer({ job_id: Number(job_id), templater_id }).unwrap();
            toast.success('Timer started');
            refetch();
        } catch (error: any) {
            // toast.error(error?.data?.message || 'Failed to start timer');
        }
    };

    const handlePause = () => setPauseModalOpen(true);

    const handleResume = async () => {
        if (!templater_id || !job_id) return;
        try {
            await resumeTimer({ job_id: Number(job_id), templater_id }).unwrap();
            toast.success('Timer resumed');
            refetch();
        } catch (error: any) {
            // toast.error(error?.data?.message || 'Failed to resume timer');
        }
    };

    const handlePauseSuccess = () => refetch();

    const handleNavigateToTimer = () => {
        if (job_id) {
            navigate(`/jobs/${job_id}/templater/timer`);
        }
    };

    const handleClose = () => {
        // Don't stop timer, just hide widget
        // Timer will continue running in background
    };

    const formatTime = (seconds: number) => {
        const days = Math.floor(seconds / (24 * 3600));
        const remainingSeconds = seconds % (24 * 3600);
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const secs = remainingSeconds % 60;
        
        // Always return HH:MM:SS format (days shown separately)
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Don't render if no active session or user is not templater
    if (shouldSkip) {
        return null;
    }

    // Only show widget if there's a running or paused session
    if (!isRunning && !isPaused) {
        return null;
    }

    return (
        <>
            <div
                className={cn(
                    'flex h-10 items-center gap-1 rounded-full border ps-1 pe-1 shadow-xs transition-colors',
                    isPaused
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-primary-light/50 bg-primary-soft text-primary-accent',
                )}
            >
                <button
                    type="button"
                    onClick={handleNavigateToTimer}
                    className="flex h-8 items-center gap-2 rounded-full ps-2.5 pe-2 transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Open templating timer"
                >
                    <span className="relative flex size-2">
                        {isRunning && (
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                        )}
                        <span className={cn('relative inline-flex size-2 rounded-full', isPaused ? 'bg-amber-500' : 'bg-primary')} />
                    </span>
                    <span className="hidden sm:inline text-xs font-medium opacity-80">
                        {isPaused ? 'Templating paused' : 'Templating'}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                        {Math.floor(elapsedTime / (24 * 3600)) > 0 && (
                            <span className="me-1 text-xs">{Math.floor(elapsedTime / (24 * 3600))}d</span>
                        )}
                        {formatTime(elapsedTime)}
                    </span>
                </button>

                {isRunning && (
                    <Button
                        variant="ghost"
                        mode="icon"
                        shape="circle"
                        className="size-8 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                        onClick={handlePause}
                        title="Pause timer"
                        aria-label="Pause timer"
                    >
                        <Pause className="size-4 fill-current" />
                    </Button>
                )}

                {isPaused && (
                    <Button
                        variant="ghost"
                        mode="icon"
                        shape="circle"
                        className="size-8 text-primary hover:bg-primary-soft hover:text-primary-accent"
                        onClick={handleResume}
                        title="Resume timer"
                        aria-label="Resume timer"
                    >
                        <Play className="size-4 fill-current" />
                    </Button>
                )}
            </div>

            <PauseModal
                open={pauseModalOpen}
                onClose={() => setPauseModalOpen(false)}
                jobId={Number(job_id)}
                templaterId={templater_id!}
                onPauseSuccess={handlePauseSuccess}
            />
        </>
    );
}
