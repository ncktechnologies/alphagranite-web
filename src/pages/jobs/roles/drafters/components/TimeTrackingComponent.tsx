import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Can } from '@/components/permission'; // Import Can component for permissions

interface TimeTrackingComponentProps {
  isDrafting: boolean;
  isPaused: boolean;
  totalTime: number;

  onStart: (startDate: Date) => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: (endDate: Date) => void;

  onTimeUpdate: (time: number) => void;
  hasEnded: boolean;
  pendingFilesCount?: number;
  uploadedFilesCount?: number;
}

export const TimeTrackingComponent = ({
  isDrafting,
  isPaused,
  totalTime,
  onStart,
  onPause,
  onResume,
  onEnd,
  onTimeUpdate,
  hasEnded,
  pendingFilesCount = 0,
  uploadedFilesCount = 0
}: TimeTrackingComponentProps) => {

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [pausedTime, setPausedTime] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0); // Track total paused time in seconds
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update elapsed time
  useEffect(() => {
    if (isDrafting && !isPaused && startTime && !hasEnded) {
      let elapsed = 0;
      if (startTime) {
        elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
        // Subtract total paused time
        elapsed = Math.max(0, elapsed - totalPausedTime);
      }
      onTimeUpdate(elapsed);
    }
  }, [currentTime, isDrafting, isPaused, startTime, onTimeUpdate, hasEnded, totalPausedTime]);


  // ---------- HANDLERS ----------
  const handleStart = () => {
    const now = new Date();
    setStartTime(now);
    setPausedTime(null);
    setTotalPausedTime(0); // Reset paused time when starting fresh

    onStart(now);   // 🔥 Emit timestamp upward
  };

  const handlePause = () => {
    const now = new Date();
    setPausedTime(now);
    onPause();
  };

  const handleResume = () => {
    if (startTime && pausedTime) {
      // Calculate paused duration and add to total paused time
      const pausedDuration = Math.floor((new Date().getTime() - pausedTime.getTime()) / 1000);
      setTotalPausedTime(prev => prev + pausedDuration);
    }
    setPausedTime(null);
    onResume();
  };

  const handleEnd = () => {
    const now = new Date();
    setEndTime(now);
    
    // If currently paused, add the final paused duration
    if (startTime && pausedTime) {
      const pausedDuration = Math.floor((now.getTime() - pausedTime.getTime()) / 1000);
      setTotalPausedTime(prev => prev + pausedDuration);
    }

    // Show toast if no files have been uploaded
    if ((pendingFilesCount + uploadedFilesCount) === 0) {
      toast.warning('No files have been uploaded. Please upload files before ending the session.');
    }

    onEnd(now);     // 🔥 Emit timestamp upward
  };


  // ---------- UI FORMATTING ----------
  const formatTime = (date?: Date | null) => {
    if (!date) return '--';
    return (
      date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }) +
      ' | ' +
      date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    );
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  // ---------- RENDER ----------
  return (
    <div className="border-none">
      <div className="flex items-center gap-6 justify-between">

        <div className="flex-shrink-0">
          <div className="flex items-center justify-center">
            <img src="/images/app/clock.svg" alt="" />
          </div>
        </div>

        <div className="flex items-center gap-10 flex-1">
          
          {/* START TIME */}
          <div>
            <span className="text-sm text-text-foreground">Start time & Date:</span>
            <p className="text-[16px] text-text font-semibold">
              {startTime ? formatTime(startTime) : '00 00 | 00 : 00'}
            </p>
          </div>

          {/* PAUSE */}
          {isPaused && pausedTime && !hasEnded && (
            <div>
              <span className="text-sm text-text-foreground">Paused time & Date:</span>
              <p className="text-[16px] text-text font-semibold">
                {formatTime(pausedTime)}
              </p>
            </div>
          )}

          {/* END TIME */}
          {!isPaused && endTime && hasEnded && (
            <div>
              <span className="text-sm text-text-foreground">End time & Date:</span>
              <p className="text-[16px] text-text font-semibold">{formatTime(endTime)}</p>
            </div>
          )}

          {/* LIVE DURATION WHILE DRAFTING */}
          {isDrafting && !hasEnded && totalTime > 0 && (
            <div className="bg-[#FF8D28] px-10 py-2 rounded-[6px] text-white text-[12px]">
              <span className="text-sm font-medium text-[#EEEEEE]">Total hour spent</span>
              <p className="text-base font-semibold">{formatDuration(totalTime)}</p>
            </div>
          )}

          {/* FINAL DURATION */}
          {hasEnded && totalTime > 0 && (
            <div className="bg-[#FF8D28] px-10 py-2 rounded-[6px] text-white text-[12px]">
              <span className="text-sm font-medium text-[#EEEEEE]">Total hour spent</span>
              <p className="text-base font-semibold">{formatDuration(totalTime)}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">

          {!isDrafting && !hasEnded ? (
            <Can action="create" on="Drafting">
              <Button onClick={handleStart}>
                <Play className="w-4 h-4 mr-2" />
                Start drafting
              </Button>
            </Can>
          ) : isDrafting && !hasEnded ? (
            <>
              {!isPaused ? (
                <Button onClick={handlePause} variant="inverse" className="bg-[#4B545D] text-white">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button onClick={handleResume} variant="inverse" className="bg-[#4B545D] text-white">
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              <Button
                onClick={handleEnd}
                variant="inverse"
                className="text-[#EF4444] border border-[#EF4444]"
                disabled={(pendingFilesCount + uploadedFilesCount) === 0}
                onMouseEnter={() => {
                  if ((pendingFilesCount + uploadedFilesCount) === 0) {
                    toast.warning('Please upload files before ending the session');
                  }
                }}
              >
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