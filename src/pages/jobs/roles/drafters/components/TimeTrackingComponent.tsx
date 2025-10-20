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

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate elapsed time when drafting and not paused
  useEffect(() => {
    if (isDrafting && !isPaused && startTime) {
      const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
      onTimeUpdate(elapsed);
    }
  }, [currentTime, isDrafting, isPaused, startTime, onTimeUpdate]);

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
    onEnd(); // This will trigger handleEndDrafting in DrafterPage
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
        <div className="flex gap-10 space-y-2 flex-1">
          {/* Start Time - Always show when started */}
          <div className=''>
            <span className="text-sm font-medium text-gray-500">Start time & Date:</span>
            <p className="text-sm text-gray-900">
              {startTime ? formatTime(startTime) : '--'}
            </p>
          </div>

          {/* Paused Time - Only show when paused */}
          {isPaused && pausedTime && (
            <div>
              <span className="text-sm font-medium text-gray-500">Paused time & Date:</span>
              <p className="text-sm text-gray-900">{formatTime(pausedTime)}</p>
            </div>
          )}

          {/* Total Time - Only show when not drafting (ended) */}
          {!isDrafting && totalTime > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-500">Total time:</span>
              <p className="text-sm text-gray-900 font-mono">{formatDuration(totalTime)}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isDrafting ? (
            <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700">
              <Play className="w-4 h-4 mr-2" />
              Start drafting
            </Button>
          ) : (
            <>
              {!isPaused ? (
                <Button onClick={handlePause} variant="inverse" className='bg-red-900'>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button onClick={handleResume} variant="ghost">
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              <Button onClick={handleEnd} variant="destructive">
                <Square className="w-4 h-4 mr-2" />
                End
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};