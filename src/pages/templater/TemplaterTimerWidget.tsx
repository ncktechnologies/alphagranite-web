import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Clock, Pause, Play, X } from 'lucide-react';
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
            toast.error(error?.data?.message || 'Failed to start timer');
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
            toast.error(error?.data?.message || 'Failed to resume timer');
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
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-3 py-2 shadow-sm">
                <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-medium">Templating</span>
                    <div className="flex items-baseline gap-1">
                        {Math.floor(elapsedTime / (24 * 3600)) > 0 && (
                            <span className="text-xs font-semibold text-blue-600">
                                {Math.floor(elapsedTime / (24 * 3600))}d
                            </span>
                        )}
                        <span className="text-sm font-mono font-bold text-blue-700">
                            {formatTime(elapsedTime)}
                        </span>
                    </div>
                </div>

                {isRunning && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                        onClick={handlePause}
                        title="Pause timer"
                    >
                        <Pause className="w-4 h-4" />
                    </Button>
                )}

                {isPaused && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={handleResume}
                        title="Resume timer"
                    >
                        <Play className="w-4 h-4" />
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                    onClick={handleNavigateToTimer}
                    title="View timer details"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                </Button>
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
