'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}: TimerComponentProps) {
    const [displayTime, setDisplayTime] = useState(totalTime);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

    // Format time with days when needed
    const formatTime = (seconds: number) => {
        const days = Math.floor(seconds / (24 * 3600));
        const remainingSeconds = seconds % (24 * 3600);
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const secs = remainingSeconds % 60;
        return { days, hours, minutes, seconds: secs };
    };

    // Progress bar (from OperatorTimerComponent)
    const timeUsedPercentage = estimatedHours
        ? Math.min((displayTime / (estimatedHours * 3600)) * 100, 100)
        : 0;

    // Timer tick
    useEffect(() => {
        if (isRunning && !isPaused) {
            const id = setInterval(() => {
                setDisplayTime(prev => {
                    const newTime = prev + 1;
                    onTimeUpdate?.(newTime);
                    return newTime;
                });
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

    // Sync with server time
    useEffect(() => {
        setDisplayTime(totalTime);
    }, [totalTime]);

    const time = formatTime(displayTime);

    // Status helpers
    const getStatusText = () => {
        if (isRunning)       return 'In Progress';
        if (isPaused)        return 'Paused';
        if (displayTime > 0) return 'Stopped';
        return 'Ready to Start';
    };

    const getStatusColor = () => {
        if (isRunning) return 'text-[#7a9705]';
        if (isPaused)  return 'text-[#ffd12e]';
        return 'text-[#4b545d]';
    };

    return (
        <div
            className={cn(
                'bg-white flex flex-col items-center relative rounded-[16px] w-full',
                className
            )}
            data-name="Timer"
        >
            {/* Header */}
            <div className="relative shrink-0 w-full" data-name="item">
                <div aria-hidden="true" className="absolute border-[#f0f1f6] border-b border-solid inset-0 pointer-events-none" />
                <div className="flex flex-row items-center size-full">
                    <div className="flex items-center justify-between px-[24px] py-[16px] w-full">
                        <p className="font-semibold leading-[1.2] text-[#4b545d] text-[24px] tracking-[-0.48px]">
                            Total hours spent
                        </p>
                        {/* Status badge */}
                        <span className={cn('text-sm font-medium', getStatusColor())}>
                            {getStatusText()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Timer display + controls */}
            <div className="flex flex-col gap-[24px] items-center py-[32px] w-full">

                {/* Timer Display */}
                <div
                    className="bg-[#f1f2f4] flex flex-col items-start p-[28px] rounded-[8px] w-full max-w-[500px]"
                    data-name="Timer"
                >
                    <div
                        className="flex font-semibold gap-[4px] items-center leading-[1.2] text-[64px] text-black tracking-[-1.28px] whitespace-nowrap w-full justify-center"
                        style={{ fontFamily: "'Spline Sans Mono', monospace" }}
                        data-name="countdown"
                    >
                        {time.days > 0 ? (
                            <>
                                <p className="relative shrink-0">{time.days}d</p>
                                <p className="relative shrink-0">{time.hours.toString().padStart(2, '0')}</p>
                            </>
                        ) : (
                            <p className="relative shrink-0">{time.hours.toString().padStart(3, '0')}</p>
                        )}
                        <p className="relative shrink-0">:</p>
                        <p className="relative shrink-0">{time.minutes.toString().padStart(2, '0')}</p>
                        <p className="relative shrink-0">:</p>
                        <p className="relative shrink-0">{time.seconds.toString().padStart(2, '0')}</p>
                    </div>
                </div>

                {/* Estimated hours progress bar */}
                {estimatedHours && (
                    <div className="w-full max-w-[500px] space-y-2">
                        <div className="flex justify-between text-sm text-[#4b545d]">
                            <span>Estimated: {estimatedHours}h</span>
                            <span>{(displayTime / 3600).toFixed(2)}h used</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={cn(
                                    'h-2 rounded-full transition-all duration-500',
                                    timeUsedPercentage >= 90 ? 'bg-red-500' :
                                    timeUsedPercentage >= 70 ? 'bg-yellow-500' :
                                    'bg-[#7a9705]'
                                )}
                                style={{ width: `${timeUsedPercentage}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Control Buttons */}
                <div className="flex gap-[12px] items-center flex-wrap justify-center">

                    {/* Not started → Start */}
                    {!isRunning && !isPaused && (
                        <button
                            onClick={onStart}
                            disabled={disabled}
                            className="bg-[#7a9705] disabled:opacity-50 flex gap-[8px] h-[40px] items-center justify-center px-[16px] py-[3px] rounded-[6px] cursor-pointer hover:bg-[#6a8505] transition-colors"
                        >
                            <Play className="size-[24px] text-white fill-white" />
                            <p className="font-semibold leading-[16px] text-[16px] text-white tracking-[-0.32px] whitespace-nowrap">
                                Start
                            </p>
                        </button>
                    )}

                    {/* Running → Pause + On Hold */}
                    {isRunning && !isPaused && (
                        <>
                            <button
                                onClick={onPause}
                                disabled={disabled}
                                className="bg-[#ffd12e] disabled:opacity-50 flex gap-[8px] h-[40px] items-center justify-center px-[16px] py-[3px] rounded-[6px] cursor-pointer hover:bg-[#f0c520] transition-colors"
                            >
                                <Pause className="size-[24px] text-[#4b545d] fill-[#4b545d]" />
                                <p className="font-semibold leading-[16px] text-[16px] text-[#4b545d] tracking-[-0.32px] whitespace-nowrap">
                                    Pause
                                </p>
                            </button>

                            <button
                                onClick={onPause}
                                disabled={disabled}
                                className="border-2 border-[#d32f2f] bg-white disabled:opacity-50 flex gap-[8px] h-[40px] items-center justify-center px-[16px] py-[3px] rounded-[6px] cursor-pointer hover:bg-[#fff5f5] transition-colors"
                            >
                                <Circle className="size-[24px] text-[#d32f2f]" />
                                <p className="font-semibold leading-[16px] text-[16px] text-[#d32f2f] tracking-[-0.32px] whitespace-nowrap">
                                    On Hold
                                </p>
                            </button>
                        </>
                    )}

                    {/* Paused → Resume only */}
                    {isPaused && (
                        <button
                            onClick={onResume}
                            disabled={disabled}
                            className="bg-[#7a9705] disabled:opacity-50 flex gap-[8px] h-[40px] items-center justify-center px-[16px] py-[3px] rounded-[6px] cursor-pointer hover:bg-[#6a8505] transition-colors"
                        >
                            <Play className="size-[24px] text-white fill-white" />
                            <p className="font-semibold leading-[16px] text-[16px] text-white tracking-[-0.32px] whitespace-nowrap">
                                Resume
                            </p>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}