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

  // Calculate elapsed time
  useEffect(() => {
    if (isDrafting && !isPaused && startTime) {
      const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
      onTimeUpdate(elapsed);
    }
  }, [currentTime, isDrafting, isPaused, startTime, onTimeUpdate]);

  const formatTime = (date: Date) => {
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
    setStartTime(new Date());
    onStart();
  };

  const handlePause = () => {
    setPausedTime(new Date());
    onPause();
  };

  const handleResume = () => {
    if (startTime && pausedTime) {
      // Adjust start time to account for paused duration
      const pausedDuration = pausedTime.getTime() - startTime.getTime() - (totalTime * 1000);
      setStartTime(new Date(Date.now() - totalTime * 1000 - pausedDuration));
    }
    setPausedTime(null);
    onResume();
  };

  const handleEnd = () => {
    setStartTime(null);
    setPausedTime(null);
    onEnd();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          {/* Clock Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>

          {/* Time Display */}
          <div className="flex-1 space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-500">Start time & Date:</span>
              <p className="text-sm text-gray-900">
                {startTime ? formatTime(startTime) : '5th Oct, 2025 | 09:34 PM'}
              </p>
            </div>
            {isPaused && pausedTime && (
              <div>
                <span className="text-sm font-medium text-gray-500">Paused time & Date:</span>
                <p className="text-sm text-gray-900">{formatTime(pausedTime)}</p>
              </div>
            )}
            {totalTime > 0 && (
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
                  <Button onClick={handlePause} variant="outline">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={handleResume} className="bg-green-600 hover:bg-green-700">
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
      </CardContent>
    </Card>
  );
};
