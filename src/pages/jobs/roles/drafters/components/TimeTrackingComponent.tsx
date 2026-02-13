import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Can } from '@/components/permission';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimeTrackingComponentProps {
  isDrafting: boolean;
  isPaused: boolean;
  totalTime: number;
  draftStart?: Date | null;
  draftEnd?: Date | null;
  sessionData?: any;            // server session data (contains UTC timestamps)
  isFabOnHold?: boolean;

  onStart: (startDate: Date) => void | Promise<void>;
  onPause: (data?: { note?: string; sqft_drafted?: string; work_percentage?: string }) => void | Promise<void>;
  onResume: (data?: { note?: string; sqft_drafted?: string }) => void | Promise<void>;
  onEnd: (endDate: Date) => void;
  onOnHold?: (data?: { note?: string; sqft_drafted?: string }) => void | Promise<void>;

  onTimeUpdate: (time: number) => void;
  hasEnded: boolean;
  pendingFilesCount?: number;
  uploadedFilesCount?: number;
}

// ---------------------------------------------------------------------
// Helper: parse server timestamp as UTC (no timezone = assume UTC)
// ---------------------------------------------------------------------
const parseUTCDate = (dateStr: string | undefined): Date | undefined => {
  if (!dateStr) return undefined;
  // Expected format: "YYYY-MM-DDTHH:MM:SS.ssssss" (without Z)
  const [datePart, timePart] = dateStr.split('T');
  if (!datePart || !timePart) return undefined;
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, min, s] = timePart.split(':').map(Number);
  // Ignore fractional seconds (just take the integer part)
  const seconds = Math.floor(s);
  return new Date(Date.UTC(y, m - 1, d, h, min, seconds));
};

export const TimeTrackingComponent = ({
  isDrafting,
  isPaused,
  totalTime,
  draftStart,
  draftEnd,
  sessionData,
  isFabOnHold = false,
  onStart,
  onPause,
  onResume,
  onEnd,
  onOnHold,
  onTimeUpdate,
  hasEnded,
  pendingFilesCount = 0,
  uploadedFilesCount = 0
}: TimeTrackingComponentProps) => {

  // Internal state – always holds the correct UTC timestamps
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [pausedTime, setPausedTime] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isStarting, setIsStarting] = useState(false);

  // UI state for modals
  const [pauseNote, setPauseNote] = useState<string>('');
  const [pauseSqFt, setPauseSqFt] = useState<string>('');
  const [pauseWorkPercentage, setPauseWorkPercentage] = useState<string>('');
  const [resumeNote, setResumeNote] = useState<string>('');
  const [resumeSqFt, setResumeSqFt] = useState<string>('');
  const [onHoldNote, setOnHoldNote] = useState<string>('');
  const [onHoldSqFt, setOnHoldSqFt] = useState<string>('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showOnHoldModal, setShowOnHoldModal] = useState(false);

  // -----------------------------------------------------------------
  // 1. Sync with server timestamps (single source of truth)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (sessionData?.data) {
      const session = sessionData.data;

      // Start time – always parse as UTC
      if (session.current_session_start_time) {
        setStartTime(parseUTCDate(session.current_session_start_time) || null);
      } else if (draftStart) {
        setStartTime(draftStart);
      }

      // End time (if session ended)
      if (session.status === 'ended' && session.last_action_time) {
        setEndTime(parseUTCDate(session.last_action_time) || null);
      } else if (draftEnd) {
        setEndTime(draftEnd);
      }

      // Paused start time (if currently paused)
      if (session.status === 'paused' && session.current_pause_start_time) {
        setPausedTime(parseUTCDate(session.current_pause_start_time) || null);
      }
    } else if (draftStart) {
      // Fallback to props if no sessionData
      setStartTime(draftStart);
      if (draftEnd) {
        setEndTime(draftEnd);
      }
    }
  }, [sessionData, draftStart, draftEnd]);

  // -----------------------------------------------------------------
  // 2. Update current time every second (for live calculation)
  // -----------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // -----------------------------------------------------------------
  // 3. Compute elapsed time and notify parent
  // -----------------------------------------------------------------
  useEffect(() => {
    if (isDrafting && !isPaused && startTime && !hasEnded) {
      // Total seconds from start until now, minus paused time
      const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
      const adjusted = Math.max(0, elapsed - totalPausedTime);
      onTimeUpdate(adjusted);
    }
  }, [currentTime, isDrafting, isPaused, startTime, totalPausedTime, hasEnded, onTimeUpdate]);

  // ---------- HANDLERS ----------
  const handleStart = async () => {
    setIsStarting(true);
    const now = new Date();               // local time, but stored as a Date object (UTC timestamp)
    setStartTime(now);
    setPausedTime(null);
    setTotalPausedTime(0);

    try {
      await onStart(now);
    } finally {
      setIsStarting(false);
    }
  };

  const handlePause = () => {
    setShowPauseModal(true);
  };

  const confirmPause = async () => {
    if (!pauseWorkPercentage) {
      toast.error('Please select a work percentage before pausing');
      return;
    }

    const now = new Date();
    setPausedTime(now);
    try {
      await onPause({
        note: pauseNote,
        sqft_drafted: pauseSqFt,
        work_percentage: pauseWorkPercentage
      });
      setPauseNote('');
      setPauseSqFt('');
      setPauseWorkPercentage('');
      setShowPauseModal(false);
    } catch (error) {
      console.error('Failed to pause:', error);
      toast.error('Failed to pause drafting session');
    }
  };

  const cancelPause = () => {
    setPauseNote('');
    setPauseSqFt('');
    setPauseWorkPercentage('');
    setShowPauseModal(false);
  };

  const handleResume = () => {
    setShowResumeModal(true);
  };

  const confirmResume = async () => {
    if (startTime && pausedTime) {
      // Calculate how long we were paused and add to totalPausedTime
      const pausedDuration = Math.floor((new Date().getTime() - pausedTime.getTime()) / 1000);
      setTotalPausedTime(prev => prev + pausedDuration);
    }
    setPausedTime(null);
    try {
      await onResume({
        note: resumeNote,
        sqft_drafted: resumeSqFt
      });
      setResumeNote('');
      setResumeSqFt('');
      setShowResumeModal(false);
    } catch (error) {
      console.error('Failed to resume:', error);
      toast.error('Failed to resume drafting session');
    }
  };

  const cancelResume = () => {
    setResumeNote('');
    setResumeSqFt('');
    setShowResumeModal(false);
  };

  const handleOnHold = () => {
    setShowOnHoldModal(true);
  };

  const confirmOnHold = async () => {
    const now = new Date();
    setEndTime(now);

    if (startTime && pausedTime) {
      const pausedDuration = Math.floor((now.getTime() - pausedTime.getTime()) / 1000);
      setTotalPausedTime(prev => prev + pausedDuration);
    }

    if ((pendingFilesCount + uploadedFilesCount) === 0) {
      toast.info('No files have been uploaded. Session will be placed on hold.');
    }

    try {
      if (onOnHold) {
        await onOnHold({
          note: onHoldNote,
          sqft_drafted: onHoldSqFt
        });
      }
      setOnHoldNote('');
      setOnHoldSqFt('');
      setShowOnHoldModal(false);
    } catch (error) {
      console.error('Failed to put on hold:', error);
      toast.error('Failed to put drafting session on hold');
    }
  };

  const cancelOnHold = () => {
    setOnHoldNote('');
    setOnHoldSqFt('');
    setShowOnHoldModal(false);
  };

  const handleEnd = () => {
    const now = new Date();
    setEndTime(now);

    if (startTime && pausedTime) {
      const pausedDuration = Math.floor((now.getTime() - pausedTime.getTime()) / 1000);
      setTotalPausedTime(prev => prev + pausedDuration);
    }

    if ((pendingFilesCount + uploadedFilesCount) === 0) {
      toast.warning('No files have been uploaded. Please upload files before ending the session.');
    }

    onEnd(now);
  };

  // ---------- UI FORMATTING ----------
  const formatTime = (date?: Date | null) => {
    if (!date) return '--';
    const datePart = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${datePart} | ${timePart}`;
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

          {/* PAUSE (if paused) */}
          {isPaused && pausedTime && !hasEnded && (
            <div>
              <span className="text-sm text-text-foreground">Paused time & Date:</span>
              <p className="text-[16px] text-text font-semibold">
                {formatTime(pausedTime)}
              </p>
            </div>
          )}

          {/* END TIME (if ended) */}
          {!isPaused && endTime && hasEnded && (
            <div>
              <span className="text-sm text-text-foreground">End time & Date:</span>
              <p className="text-[16px] text-text font-semibold">{formatTime(endTime)}</p>
            </div>
          )}

          {/* LIVE / FINAL DURATION */}
          {((isDrafting && !hasEnded) || hasEnded) && totalTime > 0 && (
            <div className="bg-[#FF8D28] px-10 py-2 rounded-[6px] text-white text-[12px]">
              <span className="text-sm font-medium text-[#EEEEEE]">Total hour spent</span>
              <p className="text-base font-semibold">{formatDuration(totalTime)}</p>
            </div>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-2">

          {isPaused && !hasEnded ? (
            <Can action="update" on="Drafting">
              <Button onClick={handleResume} variant="inverse" className="bg-[#4B545D] text-white">
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            </Can>
          ) : !isDrafting && !hasEnded && !isPaused ? (
            <Can action="update" on="Drafting">
              <Button onClick={handleStart} disabled={isStarting}>
                <Play className="w-4 h-4 mr-2" />
                {isStarting ? 'Starting...' : 'Start drafting'}
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
              {!isFabOnHold && (
                <Button
                  onClick={handleOnHold}
                  variant="inverse"
                  className="text-[#FF8C00] border border-[#FF8C00]"
                >
                  <Square className="w-4 h-4 mr-2" />
                  On Hold
                </Button>
              )}
            </>
          ) : null}
        </div>

      </div>

      {/* MODALS (unchanged) */}
      <>
        <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pause Drafting Session</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label htmlFor="pause-sqft" className="block text-sm font-medium mb-2">
                Square Feet Drafted So Far
              </label>
              <Input
                id="pause-sqft"
                value={pauseSqFt}
                onChange={(e) => setPauseSqFt(e.target.value)}
                placeholder="Enter square feet drafted"
              />

              <label htmlFor="pause-work-percentage" className="block text-sm font-medium mt-4 mb-2">
                Work Percentage
              </label>
              <Select value={pauseWorkPercentage} onValueChange={setPauseWorkPercentage}>
                <SelectTrigger id="pause-work-percentage">
                  <SelectValue placeholder="Select work percentage" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="30">30%</SelectItem>
                  <SelectItem value="40">40%</SelectItem>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="60">60%</SelectItem>
                  <SelectItem value="70">70%</SelectItem>
                  <SelectItem value="80">80%</SelectItem>
                  <SelectItem value="90">90%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                </SelectContent>
              </Select>

              <label htmlFor="pause-note" className="block text-sm font-medium mt-4 mb-2">
                Notes (Optional)
              </label>
              <Textarea
                id="pause-note"
                value={pauseNote}
                onChange={(e) => setPauseNote(e.target.value)}
                placeholder="Add notes about why you're pausing..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelPause}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmPause}>
                Confirm Pause
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showResumeModal} onOpenChange={setShowResumeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Resume Drafting Session</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelResume}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmResume}>
                Confirm Resume
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showOnHoldModal} onOpenChange={setShowOnHoldModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Put Drafting Session On Hold</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label htmlFor="onhold-sqft" className="block text-sm font-medium mb-2">
                Total Square Feet Drafted So Far
              </label>
              <Input
                id="onhold-sqft"
                value={onHoldSqFt}
                onChange={(e) => setOnHoldSqFt(e.target.value)}
                placeholder="Enter total square feet drafted"
              />

              <label htmlFor="onhold-note" className="block text-sm font-medium mt-4 mb-2">
                Notes (Optional)
              </label>
              <Textarea
                id="onhold-note"
                value={onHoldNote}
                onChange={(e) => setOnHoldNote(e.target.value)}
                placeholder="Add notes about why you're putting on hold..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelOnHold}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmOnHold}>
                Confirm On Hold
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </div>
  );
};