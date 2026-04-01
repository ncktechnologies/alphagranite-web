import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OperatorTimerComponent } from '../operator/components/TimerComponent';
import { 
    useGetTemplaterTimerStateQuery,
    useStartTemplaterTimerMutation,
    usePauseTemplaterTimerMutation,
    useResumeTemplaterTimerMutation,
    useStopTemplaterTimerMutation,
} from '@/store/api/jobTimers';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TemplaterTimerPage() {
    const { job_id } = useParams<{ job_id: string }>();
    const navigate = useNavigate();
    
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Fetch timer state
    const { data: timerState, refetch } = useGetTemplaterTimerStateQuery(
        { job_id: Number(job_id) },
        { skip: !job_id }
    );

    // Timer mutations
    const [startTimer] = useStartTemplaterTimerMutation();
    const [pauseTimer] = usePauseTemplaterTimerMutation();
    const [resumeTimer] = useResumeTemplaterTimerMutation();
    const [stopTimer] = useStopTemplaterTimerMutation();

    // Sync with server state
    useEffect(() => {
        if (timerState) {
            const session = timerState.session;
            if (session) {
                setElapsedTime(session.total_elapsed_seconds || 0);
                setIsRunning(session.status === 'running');
                setIsPaused(session.status === 'paused');
            }
        }
    }, [timerState]);

    // Handle timer actions
    const handleStart = async () => {
        try {
            await startTimer({ job_id: Number(job_id) }).unwrap();
            toast.success('Timer started successfully');
            refetch();
        } catch (error: any) {
            console.error('Failed to start timer:', error);
            toast.error(error?.data?.message || 'Failed to start timer');
        }
    };

    const handlePause = async () => {
        try {
            await pauseTimer({ job_id: Number(job_id) }).unwrap();
            toast.success('Timer paused successfully');
            refetch();
        } catch (error: any) {
            console.error('Failed to pause timer:', error);
            toast.error(error?.data?.message || 'Failed to pause timer');
        }
    };

    const handleResume = async () => {
        try {
            await resumeTimer({ job_id: Number(job_id) }).unwrap();
            toast.success('Timer resumed successfully');
            refetch();
        } catch (error: any) {
            console.error('Failed to resume timer:', error);
            toast.error(error?.data?.message || 'Failed to resume timer');
        }
    };

    const handleStop = async () => {
        if (!confirm('Are you sure you want to stop the timer? This will end the current session.')) {
            return;
        }

        try {
            await stopTimer({ job_id: Number(job_id) }).unwrap();
            toast.success('Timer stopped successfully');
            refetch();
        } catch (error: any) {
            console.error('Failed to stop timer:', error);
            toast.error(error?.data?.message || 'Failed to stop timer');
        }
    };

    const handleTimeUpdate = (time: number) => {
        setElapsedTime(time);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="h-8 w-8 p-0"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">
                                Templater Timer
                            </h1>
                            <p className="text-sm text-gray-500">
                                Job ID: {job_id}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    <OperatorTimerComponent
                        totalTime={elapsedTime}
                        isRunning={isRunning}
                        isPaused={isPaused}
                        onStart={handleStart}
                        onPause={handlePause}
                        onResume={handleResume}
                        onTimeUpdate={handleTimeUpdate}
                        disabled={!job_id}
                    />

                    {/* Info Card */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-blue-900 mb-2">
                            Timer Information
                        </h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Start the timer when you begin working on templating</li>
                            <li>• Pause the timer during breaks or interruptions</li>
                            <li>• Resume the timer when you continue work</li>
                            <li>• Stop the timer when the templating task is complete</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
