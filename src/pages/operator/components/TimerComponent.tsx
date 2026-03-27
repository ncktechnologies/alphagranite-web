'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Square } from 'lucide-react';

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
        if (isPaused)  return 'text-[#f5cd4b]';
        return 'text-[#4b545d]';
    };

    return (
        <div
            className={`bg-white content-stretch flex flex-col items-center relative rounded-[16px] w-full ${className}`}
            data-name="Timer"
        >
            {/* Header */}
            <div className="relative shrink-0 w-full" data-name="item">
                <div aria-hidden="true" className="absolute border-[#f0f1f6] border-b border-solid inset-0 pointer-events-none" />
                <div className="flex flex-row items-center size-full">
                    <div className="flex items-center justify-between px-[24px] py-[16px] w-full">
                        <p className="font-['Proxima_Nova:Semibold',sans-serif] leading-[1.2] text-[#4b545d] text-[24px] tracking-[-0.48px] not-italic">
                            Total hours spent
                        </p>
                        {/* Status badge */}
                        <span className={`text-sm font-medium ${getStatusColor()}`}>
                            {getStatusText()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Timer and Controls */}
            <div className="content-stretch flex flex-col gap-[24px] items-center px-[24px] py-[32px] relative shrink-0 w-full">
                {/* Timer Display */}
                <div className="bg-[#f1f2f4] content-stretch flex flex-col gap-[16px] items-start p-[28px] relative rounded-[8px] shrink-0 w-full max-w-[500px]" data-name="Timer">
                    {/* Days Display */}
                    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full" data-name="item">
                        <div aria-hidden="true" className="absolute border-[#f0f1f6] border-b border-solid inset-0 pointer-events-none" />
                        <p className="font-['Proxima_Nova:Semibold',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#4b545d] text-[20px] tracking-[-0.4px] whitespace-nowrap">
                            {time.days} {time.days === 1 ? 'day' : 'days'}
                        </p>
                    </div>

                    {/* Time Display */}
                    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full">
                        <div className="content-stretch flex font-['Spline_Sans_Mono:SemiBold',sans-serif] font-semibold gap-[4px] items-center leading-[1.2] relative shrink-0 text-[40px] text-black tracking-[-0.8px] whitespace-nowrap w-full justify-center" data-name="countdown">
                            <p className="relative shrink-0">{time.hours.toString().padStart(1, '0')}</p>
                            <p className="relative shrink-0">:</p>
                            <p className="relative shrink-0">{time.minutes.toString().padStart(2, '0')}</p>
                            <p className="relative shrink-0">:</p>
                            <p className="relative shrink-0">{time.seconds.toString().padStart(2, '0')}</p>
                        </div>

                        {/* Labels */}
                        <div className="content-stretch flex gap-[12px] items-center justify-center relative shrink-0 w-full" data-name="item">
                            <div aria-hidden="true" className="absolute border-[#f0f1f6] border-b border-solid inset-0 pointer-events-none" />
                            <p className="font-['Proxima_Nova:Semibold',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#4b545d] text-[14px] tracking-[-0.28px] whitespace-nowrap">hrs</p>
                            <div className="relative shrink-0 size-[3px]">
                                <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3 3">
                                    <circle cx="1.5" cy="1.5" fill="#D9D9D9" r="1.5" />
                                </svg>
                            </div>
                            <p className="font-['Proxima_Nova:Semibold',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#4b545d] text-[14px] tracking-[-0.28px] whitespace-nowrap">min</p>
                            <div className="relative shrink-0 size-[3px]">
                                <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3 3">
                                    <circle cx="1.5" cy="1.5" fill="#D9D9D9" r="1.5" />
                                </svg>
                            </div>
                            <p className="font-['Proxima_Nova:Semibold',sans-serif] leading-[1.2] not-italic relative shrink-0 text-[#4b545d] text-[14px] tracking-[-0.28px] whitespace-nowrap">sec</p>
                        </div>
                    </div>
                </div>

                {/* Estimated hours progress bar */}
                {estimatedHours && (
                    <div className="w-full max-w-[500px] space-y-2">
                        <div className="flex justify-between text-sm text-[#4b545d]">
                            <span className="font-['Proxima_Nova:Semibold',sans-serif]">Estimated: {estimatedHours}h</span>
                            <span className="font-['Proxima_Nova:Semibold',sans-serif]">{(displayTime / 3600).toFixed(2)}h used</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                    timeUsedPercentage >= 90 ? 'bg-red-500' :
                                    timeUsedPercentage >= 70 ? 'bg-yellow-500' :
                                    'bg-[#7a9705]'
                                }`}
                                style={{ width: `${timeUsedPercentage}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Control Buttons */}
                <div className="content-stretch flex gap-[12px] items-center relative shrink-0 flex-wrap justify-center">
                    {/* Not started → Start */}
                    {!isRunning && !isPaused && (
                        <button
                            onClick={onStart}
                            disabled={disabled}
                            className="bg-[#7a9705] disabled:opacity-50 content-stretch flex gap-[8px] items-center justify-center px-[24px] py-[16px] relative rounded-[6px] shrink-0 cursor-pointer hover:bg-[#6a8505] transition-colors"
                        >
                            <Play className="relative shrink-0 size-[24px] text-white fill-white" />
                            <p className="font-['Proxima_Nova:Semibold',sans-serif] leading-[16px] not-italic relative shrink-0 text-white text-[16px] tracking-[-0.32px] whitespace-nowrap">Start</p>
                        </button>
                    )}

                    {/* Running → On Hold + Pause */}
                    {isRunning && !isPaused && (
                        <>
                            <button
                                onClick={onPause}
                                disabled={disabled}
                                className="disabled:opacity-50 content-stretch flex gap-[8px] items-center justify-center px-[24px] py-[16px] relative rounded-[6px] shrink-0 cursor-pointer hover:bg-[#fff5f5] transition-colors"
                            >
                                <div aria-hidden="true" className="absolute border border-[#ef4444] border-solid inset-0 pointer-events-none rounded-[6px]" />
                                <Square className="relative shrink-0 size-[24px] text-[#ef4444]" />
                                <p className="font-['Proxima_Nova:Semibold',sans-serif] leading-[16px] not-italic relative shrink-0 text-[#ef4444] text-[16px] tracking-[-0.32px] whitespace-nowrap">On Hold</p>
                            </button>
                            
                            <button
                                onClick={onPause}
                                disabled={disabled}
                                className="bg-[#f5cd4b] disabled:opacity-50 content-stretch flex gap-[8px] items-center justify-center px-[24px] py-[16px] relative rounded-[6px] shrink-0 cursor-pointer hover:bg-[#f0c520] transition-colors"
                            >
                                <Pause className="relative shrink-0 size-[24px] text-black fill-black" />
                                <p className="font-['Proxima_Nova:Semibold',sans-serif] leading-[16px] not-italic relative shrink-0 text-[16px] text-black tracking-[-0.32px] whitespace-nowrap">Pause</p>
                            </button>
                        </>
                    )}

                    {/* Paused → Resume */}
                    {isPaused && (
                        <button
                            onClick={onResume}
                            disabled={disabled}
                            className="bg-[#7a9705] disabled:opacity-50 content-stretch flex gap-[8px] items-center justify-center px-[24px] py-[16px] relative rounded-[6px] shrink-0 cursor-pointer hover:bg-[#6a8505] transition-colors"
                        >
                            <Play className="relative shrink-0 size-[24px] text-white fill-white" />
                            <p className="font-['Proxima_Nova:Semibold',sans-serif] leading-[16px] not-italic relative shrink-0 text-white text-[16px] tracking-[-0.32px] whitespace-nowrap">Resume</p>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}