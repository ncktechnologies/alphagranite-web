import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { elapsedSecondsAt, formatElapsed, type PlanTimer, type PlanTimerAction, type PlanTimerStatus } from './planTimer';

const STATUS_STYLES: Record<PlanTimerStatus, { label: string; pill: string; dot: string }> = {
    idle: { label: 'Not started', pill: 'bg-muted text-muted-foreground ring-border', dot: 'bg-[#9AA1AD]' },
    running: { label: 'Running', pill: 'bg-green-50 text-green-700 ring-green-200', dot: 'bg-green-500' },
    paused: { label: 'Paused', pill: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
    stopped: { label: 'Stopped', pill: 'bg-muted text-muted-foreground ring-border', dot: 'bg-text-foreground' },
};

/** Live elapsed time: the server's snapshot plus the seconds since it arrived while running. */
function useElapsedSeconds(timer?: PlanTimer) {
    const base = timer?.elapsed_seconds ?? 0;
    const running = timer?.status === 'running';
    const [receivedAt, setReceivedAt] = useState(() => Date.now());
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = Date.now();
        setReceivedAt(t);
        setNow(t);
    }, [base, timer?.status]);

    useEffect(() => {
        if (!running) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [running]);

    return elapsedSecondsAt(timer, receivedAt, now);
}

interface PlanTimerControlProps {
    timer?: PlanTimer;
    canControl: boolean;
    busy?: boolean;
    disabledReason?: string;
    onAction: (action: PlanTimerAction) => void;
}

export function PlanTimerControl({ timer, canControl, busy = false, disabledReason, onAction }: PlanTimerControlProps) {
    const status: PlanTimerStatus = timer?.status ?? 'idle';
    const styles = STATUS_STYLES[status];
    const elapsed = useElapsedSeconds(timer);
    const disabled = busy || !!disabledReason;
    const buttonClass = 'h-7 px-2.5 gap-1 text-xs rounded-md';

    return (
        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span
                className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', styles.pill)}
                role="status"
            >
                <span className="relative flex size-2">
                    {status === 'running' && (
                        <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', styles.dot)} />
                    )}
                    <span className={cn('relative inline-flex size-2 rounded-full', styles.dot)} />
                </span>
                {styles.label}
                <span className="font-mono tabular-nums">{formatElapsed(elapsed)}</span>
            </span>

            {canControl && (
                <div className="flex items-center gap-1" title={disabledReason}>
                    {busy && <LoaderCircle className="size-4 animate-spin text-muted-foreground" />}
                    {status === 'idle' && (
                        <Button size="sm" variant="outline" className={buttonClass} disabled={disabled} onClick={() => onAction('start')}>
                            <Play className="size-3.5 fill-current text-green-600" /> Start
                        </Button>
                    )}
                    {status === 'running' && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                className={cn(buttonClass, 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100')}
                                disabled={disabled}
                                onClick={() => onAction('pause')}
                            >
                                <Pause className="size-3.5 fill-current" /> Pause
                            </Button>
                            <Button size="sm" variant="outline" className={buttonClass} disabled={disabled} onClick={() => onAction('stop')}>
                                <CheckCircle2 className="size-3.5 text-primary" /> Complete
                            </Button>
                        </>
                    )}
                    {status === 'paused' && (
                        <Button size="sm" variant="outline" className={buttonClass} disabled={disabled} onClick={() => onAction('resume')}>
                            <Play className="size-3.5 fill-current text-green-600" /> Resume
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
