'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Pause, Play, Timer } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TimerComponentProps {
    totalTime: number;
    isRunning: boolean;
    isPaused: boolean;
    estimatedHours?: number;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onTimeUpdate?: (time: number) => void;
    disabled?: boolean;
    className?: string;
    hideControls?: boolean;
    /** Optional "finish" action rendered alongside the timer controls (e.g. stop & submit). */
    finishAction?: {
        onClick: () => void;
        disabled?: boolean;
        label?: string;
    };
}

type TimerState = 'idle' | 'running' | 'paused' | 'stopped';

const STATE_STYLES: Record<TimerState, { pill: string; dot: string; chip: string; panel: string; bar: string }> = {
    idle: {
        pill: 'bg-muted text-text ring-border',
        dot: 'bg-[#9AA1AD]',
        chip: 'bg-muted text-text-foreground',
        panel: 'from-muted/80 to-muted/30',
        bar: 'bg-border',
    },
    running: {
        pill: 'bg-primary-soft text-primary-accent ring-primary-light/50',
        dot: 'bg-primary',
        chip: 'bg-primary-soft text-primary-accent',
        panel: 'from-primary-soft/90 to-primary-soft/20',
        bar: 'bg-primary',
    },
    paused: {
        pill: 'bg-amber-50 text-amber-800 ring-amber-200',
        dot: 'bg-amber-500',
        chip: 'bg-amber-50 text-amber-700',
        panel: 'from-amber-50 to-amber-50/20',
        bar: 'bg-amber-400',
    },
    stopped: {
        pill: 'bg-muted text-text ring-border',
        dot: 'bg-text-foreground',
        chip: 'bg-muted text-text-foreground',
        panel: 'from-muted/80 to-muted/30',
        bar: 'bg-text-foreground/40',
    },
};

function TimeUnit({ value, label }: { value: string; label: string }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <span className="text-[52px] sm:text-[76px] leading-none font-semibold tracking-[-0.03em] text-foreground tabular-nums">
                {value}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        </div>
    );
}

export function OperatorTimerComponent({
    totalTime = 0,
    isRunning = false,
    isPaused = false,
    estimatedHours,
    onStart,
    onPause,
    onResume,
    onTimeUpdate,
    disabled = false,
    className = '',
    hideControls = false,
    finishAction,
}: TimerComponentProps) {
    const { t } = useTranslation();
    const [displayTime, setDisplayTime] = useState(totalTime);
    // Mirror of displayTime so the interval can compute the next value without
    // calling the parent from inside a state updater (which React warns about).
    const displayRef = useRef(totalTime);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

    const formatTime = (seconds: number) => {
        const days = Math.floor(seconds / (24 * 3600));
        const remainingSeconds = seconds % (24 * 3600);
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const secs = remainingSeconds % 60;
        return { days, hours, minutes, seconds: secs };
    };

    const timeUsedPercentage = estimatedHours
        ? Math.min((displayTime / (estimatedHours * 3600)) * 100, 100)
        : 0;

    useEffect(() => {
        if (isRunning && !isPaused) {
            const id = setInterval(() => {
                const next = displayRef.current + 1;
                displayRef.current = next;
                setDisplayTime(next);
                onTimeUpdate?.(next);
            }, 1000);
            setIntervalId(id);
        } else {
            if (intervalId) {
                clearInterval(intervalId);
                setIntervalId(null);
            }
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isRunning, isPaused, onTimeUpdate]);

    useEffect(() => {
        displayRef.current = totalTime;
        setDisplayTime(totalTime);
    }, [totalTime]);

    const time = formatTime(displayTime);
    const clock = `${time.hours}:${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`;

    const state: TimerState = isRunning ? 'running' : isPaused ? 'paused' : displayTime > 0 ? 'stopped' : 'idle';
    const styles = STATE_STYLES[state];
    const ticking = isRunning && !isPaused;

    const statusText = {
        running: t('TIMER.IN_PROGRESS'),
        paused: t('TIMER.PAUSED'),
        stopped: t('TIMER.STOPPED'),
        idle: t('TIMER.READY_TO_START'),
    }[state];

    const hintText = {
        running: t('TIMER.HINT_RUNNING'),
        paused: t('TIMER.HINT_PAUSED'),
        stopped: t('TIMER.HINT_STOPPED'),
        idle: t('TIMER.HINT_IDLE'),
    }[state];

    // Show the live time in the browser tab while the clock runs, so it's visible from other tabs.
    const originalTitle = useRef<string | null>(null);
    useEffect(() => {
        if (ticking) {
            if (originalTitle.current === null) originalTitle.current = document.title;
            const base = originalTitle.current;
            document.title = `▶ ${time.days > 0 ? `${time.days}d ` : ''}${clock} · ${base}`;
        } else if (originalTitle.current !== null) {
            document.title = originalTitle.current;
            originalTitle.current = null;
        }
    }, [ticking, clock, time.days]);
    useEffect(() => () => {
        if (originalTitle.current !== null) document.title = originalTitle.current;
    }, []);

    const usedHours = displayTime / 3600;
    const overEstimate = estimatedHours ? usedHours - estimatedHours : 0;

    const showFooter = !hideControls || !!finishAction;

    return (
        <div
            className={cn('relative w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card', className)}
            data-name="Timer"
        >
            {/* State accent */}
            <div className={cn('h-1 w-full transition-colors duration-300', styles.bar)} aria-hidden />

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors', styles.chip)}>
                        <Timer className="size-5" strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold leading-tight tracking-tight text-foreground">
                            {t('TIMER.TOTAL_HOURS_SPENT')}
                        </h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">{hintText}</p>
                    </div>
                </div>
                <span
                    className={cn(
                        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-colors',
                        styles.pill,
                    )}
                    role="status"
                    aria-live="polite"
                >
                    <span className="relative flex size-2">
                        {ticking && (
                            <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', styles.dot)} />
                        )}
                        <span className={cn('relative inline-flex size-2 rounded-full', styles.dot)} />
                    </span>
                    {statusText}
                </span>
            </div>

            {/* Clock */}
            <div className="px-5 pb-6 sm:px-6">
                <div
                    className={cn(
                        'flex flex-col items-center gap-4 rounded-xl bg-gradient-to-b px-4 py-8 sm:py-10 transition-colors duration-300',
                        styles.panel,
                    )}
                >
                    <div
                        className="flex items-start justify-center gap-2 sm:gap-4"
                        role="timer"
                        aria-label={`${time.days > 0 ? `${time.days} ${time.days === 1 ? t('TIMER.DAY') : t('TIMER.DAYS')} ` : ''}${time.hours} ${t('TIMER.HRS')} ${time.minutes} ${t('TIMER.MIN')} ${time.seconds} ${t('TIMER.SEC')}`}
                    >
                        {time.days > 0 && (
                            <>
                                <TimeUnit value={String(time.days)} label={time.days === 1 ? t('TIMER.DAY') : t('TIMER.DAYS')} />
                                <span className="text-[52px] sm:text-[76px] leading-none font-light text-foreground/25">·</span>
                            </>
                        )}
                        <TimeUnit value={String(time.hours).padStart(2, '0')} label={t('TIMER.HRS')} />
                        <span
                            className={cn(
                                'text-[52px] sm:text-[76px] leading-none font-light text-foreground/30 transition-opacity duration-300',
                                ticking && time.seconds % 2 === 1 && 'opacity-30',
                            )}
                            aria-hidden
                        >
                            :
                        </span>
                        <TimeUnit value={String(time.minutes).padStart(2, '0')} label={t('TIMER.MIN')} />
                        <span
                            className={cn(
                                'text-[52px] sm:text-[76px] leading-none font-light text-foreground/30 transition-opacity duration-300',
                                ticking && time.seconds % 2 === 1 && 'opacity-30',
                            )}
                            aria-hidden
                        >
                            :
                        </span>
                        <TimeUnit value={String(time.seconds).padStart(2, '0')} label={t('TIMER.SEC')} />
                    </div>

                    {/* Estimated hours progress */}
                    {!!estimatedHours && (
                        <div className="w-full max-w-md space-y-2 pt-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-text">
                                    {t('TIMER.ESTIMATED_HOURS', { hours: estimatedHours })}
                                </span>
                                <span
                                    className={cn(
                                        'font-semibold tabular-nums',
                                        overEstimate > 0 ? 'text-destructive' : 'text-foreground',
                                    )}
                                >
                                    {overEstimate > 0
                                        ? t('TIMER.OVER_ESTIMATE', { hours: overEstimate.toFixed(2) })
                                        : t('TIMER.HOURS_USED', { hours: usedHours.toFixed(2) })}
                                </span>
                            </div>
                            <div
                                className="h-2 w-full overflow-hidden rounded-full bg-background/80 ring-1 ring-inset ring-border/70"
                                role="meter"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(timeUsedPercentage)}
                                aria-label={t('TIMER.ESTIMATED_HOURS', { hours: estimatedHours })}
                            >
                                <div
                                    className={cn(
                                        'h-full rounded-full transition-all duration-500',
                                        timeUsedPercentage >= 90 ? 'bg-red-500' :
                                            timeUsedPercentage >= 70 ? 'bg-yellow-500' :
                                                'bg-primary',
                                    )}
                                    style={{ width: `${timeUsedPercentage}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            {showFooter && (
                <div className="flex flex-col gap-3 border-t border-border/80 bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-center sm:px-6">
                    {!hideControls && (
                        <>
                            {/* Not started → Start */}
                            {!isRunning && !isPaused && (
                                <Button
                                    size="lg"
                                    onClick={onStart}
                                    disabled={disabled}
                                    className="h-12 w-full sm:w-auto sm:min-w-44 rounded-xl text-[15px]"
                                >
                                    <Play className="size-5! fill-current" />
                                    {t('TIMER.START_BUTTON')}
                                </Button>
                            )}

                            {/* Running → Pause */}
                            {isRunning && !isPaused && (
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={onPause}
                                    disabled={disabled}
                                    className="h-12 w-full sm:w-auto sm:min-w-44 rounded-xl border-amber-300 bg-amber-50 text-[15px] text-amber-900 hover:bg-amber-100 hover:border-amber-400"
                                >
                                    <Pause className="size-5! fill-current text-amber-700" />
                                    {t('TIMER.PAUSE_BUTTON')}
                                </Button>
                            )}

                            {/* Paused → Resume */}
                            {isPaused && (
                                <Button
                                    size="lg"
                                    onClick={onResume}
                                    disabled={disabled}
                                    className="h-12 w-full sm:w-auto sm:min-w-44 rounded-xl text-[15px]"
                                >
                                    <Play className="size-5! fill-current" />
                                    {t('TIMER.RESUME_BUTTON')}
                                </Button>
                            )}
                        </>
                    )}

                    {finishAction && (
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={finishAction.onClick}
                            disabled={finishAction.disabled}
                            className="h-12 w-full sm:w-auto sm:min-w-44 rounded-xl text-[15px]"
                        >
                            <CheckCircle2 className="size-5! text-primary" />
                            {finishAction.label ?? t('TIMER.FINISH_SUBMIT')}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
