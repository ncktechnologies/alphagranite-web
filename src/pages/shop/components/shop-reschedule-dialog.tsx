import { useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type ShopCalendarPlan, planEnd } from '@/lib/shop-schedule';

export interface PendingChange {
  kind: 'move' | 'resize';
  plan: ShopCalendarPlan;
  fromStart: Date;
  fromHours: number;
  toStart: Date;
  toHours: number;
  /** Month view moved the time of day to dodge a clash */
  adjusted: boolean;
  /** Bookings the new slot still overlaps */
  clashes: ShopCalendarPlan[];
}

const fmtHours = (h: number) => `${Math.round(h * 100) / 100} h`;

function SlotCard({ label, start, hours, highlight }: { label: string; start: Date; hours: number; highlight?: boolean }) {
  const end = planEnd(start, hours);
  return (
    <div
      className={cn(
        'min-w-0 flex-1 rounded-lg border px-3 py-2.5',
        highlight ? 'border-primary-light/70 bg-primary-soft/60' : 'border-border bg-muted/50',
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{format(start, 'EEE, MMM d')}</div>
      <div className="text-xs text-text-foreground tabular-nums">
        {format(start, 'h:mm a')} – {format(end, isSameDay(start, end) ? 'h:mm a' : 'EEE h:mm a')}
      </div>
      <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
        <Clock className="size-3" /> {fmtHours(hours)}
      </div>
    </div>
  );
}

/** Asks before a dragged / resized shop plan is saved. */
export function RescheduleDialog({
  change,
  saving,
  onConfirm,
  onCancel,
}: {
  change: PendingChange | null;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Keep the last change rendered while the dialog animates closed
  const lastRef = useRef<PendingChange | null>(null);
  if (change) lastRef.current = change;
  const c = change ?? lastRef.current;

  return (
    <AlertDialog open={!!change} onOpenChange={(open) => { if (!open && !saving) onCancel(); }}>
      <AlertDialogContent className="max-w-md">
        {c && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{c.kind === 'resize' ? 'Change plan duration?' : 'Reschedule plan?'}</AlertDialogTitle>
              <AlertDialogDescription>
                FAB #{c.plan.fab_id}
                {c.plan.plan_name ? ` · ${c.plan.plan_name}` : ''}
                {c.plan.workstation_name ? ` · ${c.plan.workstation_name}` : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex items-stretch gap-2">
              <SlotCard label="Current" start={c.fromStart} hours={c.fromHours} />
              <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground" />
              <SlotCard label="New" start={c.toStart} hours={c.toHours} highlight />
            </div>

            {c.adjusted && (
              <p className="flex gap-2 rounded-lg bg-info/10 px-3 py-2 text-xs text-foreground">
                <Clock className="mt-0.5 size-3.5 shrink-0 text-info" />
                The original time clashes with another booking for this workstation or operator that day, so the start
                moved to {format(c.toStart, 'h:mm a')}.
              </p>
            )}
            {c.clashes.length > 0 && (
              <div className="flex gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-foreground">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <div>
                  Overlaps {c.clashes.length === 1 ? 'another plan' : `${c.clashes.length} plans`} on the same
                  workstation or operator:
                  <ul className="mt-1 space-y-0.5 text-text-foreground">
                    {c.clashes.slice(0, 3).map((o) => (
                      <li key={o.id} className="tabular-nums">
                        FAB #{o.fab_id}
                        {o.workstation_name ? ` · ${o.workstation_name}` : ''} ·{' '}
                        {format(new Date(o.scheduled_start_date), 'EEE h:mm a')}
                      </li>
                    ))}
                    {c.clashes.length > 3 && <li>and {c.clashes.length - 3} more</li>}
                  </ul>
                </div>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <Button onClick={onConfirm} disabled={saving}>
                {saving ? 'Saving…' : c.kind === 'resize' ? 'Update duration' : 'Move plan'}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
