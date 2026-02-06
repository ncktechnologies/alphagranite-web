import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

// Helper function to format time in HH:MM:SS format
const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface TimeTrackingComponentProps {
  isDrafting: boolean;
  isPaused: boolean;
  totalTime: number;
  isRevision?: boolean; // Flag to indicate this is revision work
  originalDraftingId?: number; // ID of the original drafting session
  draftStart?: Date | null; // Add server session data
  draftEnd?: Date | null;
  sessionData?: any; // Add full session data for initialization

  onStart: (startDate: Date, is_revision?: boolean, original_drafting_id?: number) => void | Promise<void>;
  onPause: (data?: { note?: string }) => void | Promise<void>;
  onResume: (data?: { note?: string }) => void | Promise<void>;
  onEnd: (endDate: Date) => void | Promise<void>;

  onTimeUpdate: (time: number) => void;
  hasEnded: boolean;
  pendingFilesCount?: number;
  uploadedFilesCount?: number;
}

export const TimeTrackingComponent = ({
  isDrafting,
  isPaused,
  totalTime,
  isRevision = false,
  originalDraftingId,
  draftStart,
  draftEnd,
  sessionData,
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
  const [totalPausedTime, setTotalPausedTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isStarting, setIsStarting] = useState(false);
  
  // Pause/Resume notes state
  const [pauseNote, setPauseNote] = useState<string>('');
  const [resumeNote, setResumeNote] = useState<string>('');
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Initialize component state from server session data - ENHANCED TO PROPERLY HANDLE REVISION SESSIONS
  useEffect(() => {
    if (sessionData?.data) {
      const session = sessionData.data;
      
      // Check if this is a revision session
      const isRevisionSession = session.is_revision || session.original_drafting_id || 
                              (session.session_type && session.session_type.includes('revision'));

      if (isRevisionSession) {
        // Set start time from server data
        if (session.current_session_start_time) {
          const startTimeDate = new Date(session.current_session_start_time);
          setStartTime(startTimeDate);
        } else if (draftStart) {
          setStartTime(draftStart);
        }

        // Set end time if session is ended
        if (session.status === 'ended' && session.last_action_time) {
          const endTimeDate = new Date(session.last_action_time);
          setEndTime(endTimeDate);
        } else if (draftEnd) {
          setEndTime(draftEnd);
        }

        // Set paused time if session is paused
        if (session.status === 'paused' && session.current_pause_start_time) {
          const pausedTimeDate = new Date(session.current_pause_start_time);
          setPausedTime(pausedTimeDate);
        }
        
        // Set total time
        if (session.total_time_spent !== undefined) {
          onTimeUpdate(session.total_time_spent);
        }
      }
    } else if (draftStart) {
      // Fallback to prop data
      setStartTime(draftStart);
      if (draftEnd) {
        setEndTime(draftEnd);
      }
    }
  }, [sessionData, draftStart, draftEnd, onTimeUpdate]);

  // Debug effect to track state changes - REDUCED LOGGING TO MATCH DRAFTING PATTERN
  useEffect(() => {
    // Removed excessive logging to match drafting pattern
  }, [isDrafting, isPaused, totalTime, hasEnded, startTime, pausedTime, endTime]);

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

  const handleStart = async () => {
    setIsStarting(true);
    const now = new Date();
    setStartTime(now);
    setPausedTime(null);
    setTotalPausedTime(0); // Reset paused time when starting fresh

    try {
      await onStart(now, isRevision, originalDraftingId);
      setEndTime(null);
    } finally {
      setIsStarting(false);
    }
  };

  const handlePause = () => {
    setShowPauseModal(true);
  };

  const handleResume = () => {
    setShowResumeModal(true);
  };

  const cancelPause = () => {
    setPauseNote('');
    setShowPauseModal(false);
  };

  const confirmPause = async () => {
    const now = new Date();
    setPausedTime(now);
    try {
      await onPause({
        note: pauseNote
      });
      setPauseNote('');
      setShowPauseModal(false);
    } catch (error) {
      console.error('Failed to pause:', error);
      toast.error('Failed to pause revision session');
    }
  };

  const confirmResume = async () => {
    if (startTime && pausedTime) {
      // Calculate paused duration and add to total paused time
      const pausedDuration = Math.floor((new Date().getTime() - pausedTime.getTime()) / 1000);
      setTotalPausedTime(prev => prev + pausedDuration);
    }
    setPausedTime(null);
    try {
      await onResume({
        note: resumeNote
      });
      setResumeNote('');
      setShowResumeModal(false);
    } catch (error) {
      console.error('Failed to resume:', error);
      toast.error('Failed to resume revision session');
    }
  };

  // Updated to check if we should show the start button based on overall component state
  const showStartButton = !isDrafting && !hasEnded;
  const showPauseButton = isDrafting && !isPaused && !hasEnded;
  const showResumeButton = isDrafting && isPaused && !hasEnded;
  const showEndButton = isDrafting && !hasEnded; // Show end button when actively drafting or paused

  return (
    <div className="flex flex-col">
      {/* Time Display */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1">
          <div className="text-sm text-gray-500">Total Time</div>
          <div className="text-xl font-bold">
            {formatTime(totalTime)}
          </div>
        </div>
        {(startTime || draftStart) && (
          <div className="flex-1 text-right">
            <div className="text-sm text-gray-500">Start Time</div>
            <div className="text-sm">
              {(startTime || draftStart)?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
          </div>
        )}
        {isPaused && pausedTime && (
          <div className="flex-1 text-right">
            <div className="text-sm text-gray-500">Paused At</div>
            <div className="text-sm">
              {pausedTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {showStartButton && (
          <Button 
            type="button"
            onClick={handleStart} 
            disabled={isStarting}
            className="flex items-center gap-2"
          >
            {isStarting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start
              </>
            )}
          </Button>
        )}
        
        {showPauseButton && (
          <Button 
            type="button"
            variant="secondary" 
            onClick={handlePause}
            className="flex items-center gap-2"
          >
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        )}
        
        {showResumeButton && (
          <Button 
            type="button"
            variant="secondary" 
            onClick={handleResume}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Resume
          </Button>
        )}
        
        {showEndButton && (
          <Button 
            type="button"
            variant="destructive" 
            onClick={() => onEnd && onEnd(new Date())}
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            End
          </Button>
        )}
      </div>

      {/* Pause Modal */}
      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Session</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="pause-note" className="block text-sm font-medium mb-2">
              Pause Note (Optional)
            </label>
            <Textarea
              id="pause-note"
              value={pauseNote}
              onChange={(e) => setPauseNote(e.target.value)}
              placeholder="Enter a note about why you're pausing..."
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={cancelPause}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmPause}
            >
              Confirm Pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume Modal */}
      <Dialog open={showResumeModal} onOpenChange={setShowResumeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Session</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="resume-note" className="block text-sm font-medium mb-2">
              Resume Note (Optional)
            </label>
            <Textarea
              id="resume-note"
              value={resumeNote}
              onChange={(e) => setResumeNote(e.target.value)}
              placeholder="Enter a note about resuming..."
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowResumeModal(false);
                setResumeNote('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmResume}
            >
              Confirm Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};