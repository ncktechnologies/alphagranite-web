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

interface TimeTrackingComponentProps {
  isDrafting: boolean;
  isPaused: boolean;
  totalTime: number;
  draftStart?: Date | null;
  draftEnd?: Date | null;
  sessionData?: any;
  isFabOnHold?: boolean;

  onStart: (startDate: Date) => void | Promise<void>;
  onPause: (data?: { note?: string; sqft_drafted?: string }) => void | Promise<void>;
  onResume: (data?: { note?: string; sqft_drafted?: string }) => void | Promise<void>;
  onEnd: (endDate: Date) => void;
  onOnHold?: (data?: { note?: string; sqft_drafted?: string }) => void | Promise<void>;

  onTimeUpdate: (time: number) => void;
  hasEnded: boolean;
  pendingFilesCount?: number;
  uploadedFilesCount?: number;
}

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

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [pausedTime, setPausedTime] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isStarting, setIsStarting] = useState(false);

  // Pause/Resume/OnHold notes state
  const [pauseNote, setPauseNote] = useState<string>('');
  const [pauseSqFt, setPauseSqFt] = useState<string>('');
  const [resumeNote, setResumeNote] = useState<string>('');
  const [resumeSqFt, setResumeSqFt] = useState<string>('');
  const [onHoldNote, setOnHoldNote] = useState<string>('');
  const [onHoldSqFt, setOnHoldSqFt] = useState<string>('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showOnHoldModal, setShowOnHoldModal] = useState(false);

  // Initialize component state from server session data
  useEffect(() => {
    if (sessionData?.data) {
      const session = sessionData.data;

      if (session.current_session_start_time) {
        setStartTime(new Date(session.current_session_start_time));
      } else if (draftStart) {
        setStartTime(draftStart);
      }

      if (session.status === 'ended' && session.last_action_time) {
        setEndTime(new Date(session.last_action_time));
      } else if (draftEnd) {
        setEndTime(draftEnd);
      }

      if (session.status === 'paused' && session.current_pause_start_time) {
        setPausedTime(new Date(session.current_pause_start_time));
      }
    } else if (draftStart) {
      setStartTime(draftStart);
      if (draftEnd) {
        setEndTime(draftEnd);
      }
    }
  }, [sessionData, draftStart, draftEnd]);

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
        elapsed = Math.max(0, elapsed - totalPausedTime);
      }
      onTimeUpdate(elapsed);
    }
  }, [currentTime, isDrafting, isPaused, startTime, onTimeUpdate, hasEnded, totalPausedTime]);

  // ---------- HANDLERS ----------
  const handleStart = async () => {
    setIsStarting(true);
    const now = new Date();
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
    const now = new Date();
    setPausedTime(now);
    try {
      await onPause({
        note: pauseNote,
        sqft_drafted: pauseSqFt
      });
      setPauseNote('');
      setPauseSqFt('');
      setShowPauseModal(false);
    } catch (error) {
      console.error('Failed to pause:', error);
      toast.error('Failed to pause session');
    }
  };

  const cancelPause = () => {
    setPauseNote('');
    setPauseSqFt('');
    setShowPauseModal(false);
  };

  const handleResume = () => {
    setShowResumeModal(true);
  };

  const confirmResume = async () => {
    if (startTime && pausedTime) {
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
      toast.error('Failed to resume session');
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
      toast.error('Failed to put session on hold');
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

          {/* LIVE DURATION */}
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
            <Can action="update" on="Slab Smith">
              <Button onClick={handleStart} disabled={isStarting}>
                <Play className="w-4 h-4 mr-2" />
                {isStarting ? 'Starting...' : 'Start Session'}
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
              <Button
                onClick={handleEnd}
                variant="inverse"
                className="text-[#EF4444] border border-[#EF4444]"
                disabled={(pendingFilesCount + uploadedFilesCount) === 0}
              >
                <Square className="w-4 h-4 mr-2" />
                End
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      <>
        {/* Pause Modal */}
        <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pause Session</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label htmlFor="pause-sqft" className="block text-sm font-medium mb-2">
                Square Feet Completed
              </label>
              <Input
                id="pause-sqft"
                value={pauseSqFt}
                onChange={(e) => setPauseSqFt(e.target.value)}
                placeholder="Enter sq ft"
              />
              <label htmlFor="pause-note" className="block text-sm font-medium mt-4 mb-2">
                Notes
              </label>
              <Textarea
                id="pause-note"
                value={pauseNote}
                onChange={(e) => setPauseNote(e.target.value)}
                placeholder="Pause notes..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelPause}>Cancel</Button>
              <Button type="button" onClick={confirmPause}>Confirm Pause</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resume Modal */}
        <Dialog open={showResumeModal} onOpenChange={setShowResumeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Resume Session</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelResume}>Cancel</Button>
              <Button type="button" onClick={confirmResume}>Confirm Resume</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* On Hold Modal */}
        <Dialog open={showOnHoldModal} onOpenChange={setShowOnHoldModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Put Session On Hold</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label htmlFor="onhold-sqft" className="block text-sm font-medium mb-2">
                Square Feet Completed
              </label>
              <Input
                id="onhold-sqft"
                value={onHoldSqFt}
                onChange={(e) => setOnHoldSqFt(e.target.value)}
                placeholder="Enter sq ft"
              />
              <label htmlFor="onhold-note" className="block text-sm font-medium mt-4 mb-2">
                Notes
              </label>
              <Textarea
                id="onhold-note"
                value={onHoldNote}
                onChange={(e) => setOnHoldNote(e.target.value)}
                placeholder="On Hold notes..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelOnHold}>Cancel</Button>
              <Button type="button" onClick={confirmOnHold}>Confirm On Hold</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </div>
  );
};