import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Play, Pause, Square } from 'lucide-react';

interface TimeTrackingComponentProps {
  isDrafting: boolean;
  isPaused: boolean;
  totalTime: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onTimeUpdate: (time: number) => void;
}

export const TimeTrackingComponent = ({
  isDrafting,
  isPaused,
  totalTime,
  onStart,
  onPause,
  onResume,
  onEnd,
  onTimeUpdate
}: TimeTrackingComponentProps) => {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [pausedTime, setPausedTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [hasEnded, setHasEnded] = useState(false);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate elapsed time when drafting and not paused
  useEffect(() => {
    if (isDrafting && !isPaused && startTime && !hasEnded) {
      const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
      onTimeUpdate(elapsed);
    }
  }, [currentTime, isDrafting, isPaused, startTime, onTimeUpdate, hasEnded]);

  const formatTime = (date?: Date | null) => {
    if (!date) return '--';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ' | ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    const now = new Date();
    setStartTime(now);
    setPausedTime(null);
    setHasEnded(false);
    onStart();
  };

  const handlePause = () => {
    setPausedTime(new Date());
    onPause();
  };

  const handleResume = () => {
    setPausedTime(null);
    onResume();
  };

  const handleEnd = () => {
    setHasEnded(true);
    onEnd();
  };

  return (
    <div className='border-none'>
      <div className="flex items-center gap-6 justify-between">
        {/* Clock Icon */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center">
            <img src="/images/app/clock.svg" alt="" />
          </div>
        </div>

        {/* Time Display */}
        <div className="flex items-center gap-10 flex-1">
          {/* Start Time - Always show when started */}
          <div className=''>
            <span className="text-sm text-text-foreground">Start time & Date:</span>
            <p className="text-[16px] text-text font-semibold">
              {startTime ? formatTime(startTime) : '00 00 | 00 : 00'}
            </p>
          </div>

          {/* Paused Time - Only show when paused */}
          {isPaused && pausedTime && !hasEnded && (
            <div>
              <span className="text-sm text-text-foreground">Paused time & Date:</span>
              <p className="text-[16px] text-text font-semibold">{formatTime(pausedTime)}</p>
            </div>
          )}
           {!isPaused && pausedTime && hasEnded && (
            <div>
              <span className="text-sm text-text-foreground">End time & Date:</span>
              <p className="text-[16px] text-text font-semibold">{formatTime(pausedTime)}</p>
            </div>
          )}

          {/* Total Time - Only show when ended */}
          {hasEnded && totalTime > 0 && (
            <div className='bg-[#FF8D28] px-10 py-2 rounded-[6px] text-white text-[12px]'>
              <span className="text-sm font-medium text-[#EEEEEE] ">Total hour spent</span>
              <p className="text-base font-semibold">{formatDuration(totalTime)}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isDrafting && !hasEnded ? (
            <Button onClick={handleStart} className="">
              <Play className="w-4 h-4 mr-2" />
              Start drafting
            </Button>
          ) : isDrafting && !hasEnded ? (
            <>
              {!isPaused ? (
                <Button onClick={handlePause} variant="inverse" className='bg-[#4B545D] text-white'>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button onClick={handleResume} variant="inverse" className='bg-[#4B545D] text-white'>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              <Button onClick={handleEnd} variant="destructive" className='text-red-100'>
                <Square className="w-4 h-4 mr-2" />
                End
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};