import { ReactNode } from 'react';
import { format } from 'date-fns';
import { Hand, Pause, Play, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/permission';

type SessionState = 'idle' | 'running' | 'paused' | 'ended';

const STATE: Record<SessionState, { label: string; pill: string; dot: string; chip: string; panel: string }> = {
  idle: {
    label: 'Ready to start',
    pill: 'bg-muted text-text ring-border',
    dot: 'bg-[#9AA1AD]',
    chip: 'bg-muted text-text-foreground',
    panel: 'from-muted/60 to-background border-border/80',
  },
  running: {
    label: 'In progress',
    pill: 'bg-primary-soft text-primary-accent ring-primary-light/50',
    dot: 'bg-primary',
    chip: 'bg-primary-soft text-primary-accent',
    panel: 'from-primary-soft/70 to-background border-primary-light/40',
  },
  paused: {
    label: 'Paused',
    pill: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700',
    panel: 'from-amber-50 to-background border-amber-200/80',
  },
  ended: {
    label: 'Completed',
    pill: 'bg-sky-50 text-sky-800 ring-sky-200',
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700',
    panel: 'from-sky-50/70 to-background border-sky-200/70',
  },
};

const isValid = (d?: Date | null): d is Date => !!d && !isNaN(d.getTime());

export function formatSessionDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const days = Math.floor(s / 86400);
  const rem = s % 86400;
  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem % 3600) / 60);
  const sec = rem % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${days > 0 ? `${days}d ` : ''}${h}:${pad(m)}:${pad(sec)}`;
}

function Moment({ label, date, emptyText }: { label: string; date?: Date | null; emptyText?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      {isValid(date) ? (
        <p className="mt-1 whitespace-nowrap">
          <span className="text-base font-semibold text-foreground tabular-nums">{format(date, 'h:mm a')}</span>
          <span className="ms-1.5 text-sm text-muted-foreground">{format(date, 'MMM d, yyyy')}</span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{emptyText ?? '—'}</p>
      )}
    </div>
  );
}

function Gate({ subject, children }: { subject?: string; children: ReactNode }) {
  return subject ? <Can action="create" on={subject}>{children}</Can> : <>{children}</>;
}

export interface SessionTimerPanelProps {
  /** e.g. "CNC session", "Drafting session" */
  title: string;
  /** Label for the start button, e.g. "Start CNC" */
  startLabel: string;
  /** Permission subject that gates Start / Resume (omit for no gate) */
  permissionSubject?: string;
  isActive: boolean;
  isPaused: boolean;
  hasEnded: boolean;
  isStarting?: boolean;
  isFabOnHold?: boolean;
  startTime?: Date | null;
  pausedTime?: Date | null;
  endTime?: Date | null;
  totalSeconds: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onOnHold: () => void;
}

/**
 * Compact session timer row used by the Drafting, Revision, CNC, SlabSmith and
 * Final Programming detail pages. Purely presentational — callers own the
 * session logic, modals and API calls.
 */
export function SessionTimerPanel({
  title,
  startLabel,
  permissionSubject,
  isActive,
  isPaused,
  hasEnded,
  isStarting = false,
  isFabOnHold = false,
  startTime,
  pausedTime,
  endTime,
  totalSeconds,
  onStart,
  onPause,
  onResume,
  onOnHold,
}: SessionTimerPanelProps) {
  const state: SessionState = hasEnded ? 'ended' : isPaused ? 'paused' : isActive ? 'running' : 'idle';
  const s = STATE[state];
  // Also shown while paused (the original hid it), so the accumulated time stays visible.
  const showTotal = ((isActive && !hasEnded) || hasEnded || isPaused) && totalSeconds > 0;

  const primaryBtn = 'h-11 min-w-36 rounded-xl text-[16px]';
  const pauseBtn = cn(primaryBtn, 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400');
  const holdBtn = cn(primaryBtn, 'min-w-0 border-orange-300 bg-background text-orange-700 hover:bg-orange-50 hover:border-orange-400');

  // Button branches mirror the original components exactly.
  let actions: ReactNode = null;
  if (isPaused && !hasEnded) {
    actions = (
      <Gate subject={permissionSubject}>
        <Button size="lg" onClick={onResume} className={primaryBtn}>
          <Play className="size-4! fill-current" /> Resume
        </Button>
      </Gate>
    );
  } else if (!isActive && !hasEnded && !isPaused) {
    actions = (
      <Gate subject={permissionSubject}>
        <Button size="lg" onClick={onStart} disabled={isStarting} className={primaryBtn}>
          <Play className="size-4! fill-current" />
          {isStarting ? 'Starting…' : startLabel}
        </Button>
      </Gate>
    );
  } else if (isActive && !hasEnded) {
    actions = (
      <>
        {!isPaused ? (
          <Button variant="outline" size="lg" onClick={onPause} className={pauseBtn}>
            <Pause className="size-4! fill-current text-amber-700" /> Pause
          </Button>
        ) : (
          <Button size="lg" onClick={onResume} className={primaryBtn}>
            <Play className="size-4! fill-current" /> Resume
          </Button>
        )}
        {!isFabOnHold && (
          <Button variant="outline" size="lg" onClick={onOnHold} className={holdBtn}>
            <Hand className="size-4!" /> On hold
          </Button>
        )}
      </>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border bg-gradient-to-br p-4 sm:p-5 transition-colors duration-300',
        s.panel,
      )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
        {/* Identity + status */}
        <div className="flex min-w-0 items-center gap-3 xl:w-60 xl:shrink-0">
          <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors', s.chip)}>
            <Timer className="size-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold leading-tight text-foreground">{title}</p>
            <span
              role="status"
              aria-live="polite"
              className={cn('mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset', s.pill)}
            >
              <span className="relative flex size-1.5">
                {state === 'running' && (
                  <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', s.dot)} />
                )}
                <span className={cn('relative inline-flex size-1.5 rounded-full', s.dot)} />
              </span>
              {s.label}
            </span>
          </div>
        </div>

        {/* Timeline + total */}
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-8 gap-y-4 xl:border-s xl:border-border/70 xl:ps-6">
          <Moment label="Started" date={startTime} emptyText="Not started yet" />
          {isPaused && !hasEnded && <Moment label="Paused at" date={pausedTime} />}
          {!isPaused && hasEnded && <Moment label="Ended" date={endTime} />}
          {showTotal && (
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Time spent</p>
              <p className="mt-0.5 whitespace-nowrap text-2xl font-semibold leading-tight tracking-tight text-foreground tabular-nums">
                {formatSessionDuration(totalSeconds)}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {actions && <div className="flex flex-wrap items-center gap-2 xl:justify-end">{actions}</div>}
      </div>
    </div>
  );
}
