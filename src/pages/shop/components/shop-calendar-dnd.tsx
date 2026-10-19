import React, { useCallback, useEffect, useRef, useState } from 'react';
import { parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useUpdateShopPlanMutation } from '@/store/api';
import type { ShopCutPlanUpdate } from '@/store/api/shopCutPlanning';
import { SHOP_DAY_START_HOUR } from '@/lib/shop-time';
import {
  type PlanPart,
  type ShopCalendarPlan,
  dragBlockReason,
  findClashes,
  hourOf,
  moveSegment,
  moveToDay,
  planEnd,
  resizeSegment,
  toApiDateTime,
} from '@/lib/shop-schedule';
import { type PendingChange, RescheduleDialog } from './shop-reschedule-dialog';

/**
 * Drag to reschedule / resize for the shop calendar.
 *
 * Drop targets are elements carrying `data-dnd-day="yyyy-MM-dd"` and
 * `data-dnd-axis`: "y" (time runs down from the element's top), "x" (time runs
 * across from its left edge) or "none" (a whole day, month view). Every drop
 * goes through a confirmation dialog before the plan is saved.
 */

export type CalendarLayout = 'columns' | 'timeline' | 'month';

/** A rendered calendar segment: one day's part of a plan, as built by the calendar. */
export interface CalendarSegment extends ShopCalendarPlan {
  _planId?: number | string;
  _hoursBefore?: number;
  _isLastPart?: boolean;
}

export interface DragPreview {
  kind: 'move' | 'resize';
  planId: number | string;
  start: Date;
  hours: number;
  /** Month view: the day cell under the pointer */
  dayKey?: string;
  adjusted?: boolean;
}

interface Session {
  kind: 'move' | 'resize';
  plan: ShopCalendarPlan;
  part: PlanPart;
  dayKey: string;
  grabOffsetH: number;
  startX: number;
  startY: number;
  active: boolean;
}

interface Options {
  layout: CalendarLayout;
  /** Day view: moves stay on the same day */
  lockDay: boolean;
  hourHeight: number;
  hourWidth: number;
  scrollRef: React.RefObject<HTMLElement | null>;
  plans: ShopCalendarPlan[];
  planMap: Record<number, ShopCalendarPlan>;
}

const DRAG_THRESHOLD_PX = 4;
const AUTOSCROLL_EDGE_PX = 48;
const AUTOSCROLL_MAX_STEP = 18;

const planIdOf = (seg: CalendarSegment) => seg._planId ?? seg.id;

function pointerHour(el: Element, clientX: number, clientY: number, o: Options) {
  const rect = el.getBoundingClientRect();
  return (el as HTMLElement).dataset.dndAxis === 'x'
    ? SHOP_DAY_START_HOUR + (clientX - rect.left) / o.hourWidth
    : SHOP_DAY_START_HOUR + (clientY - rect.top) / o.hourHeight;
}

function targetUnder(clientX: number, clientY: number): HTMLElement | null {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    const hit = (el as HTMLElement).closest?.('[data-dnd-day]');
    if (hit) return hit as HTMLElement;
  }
  return null;
}

const sameSlot = (a: { start: Date; hours: number }, b: { start: Date; hours: number }) =>
  a.start.getTime() === b.start.getTime() && Math.abs(a.hours - b.hours) < 1e-6;

function errorMessage(err: unknown) {
  const e = err as { data?: { message?: string }; message?: string } | undefined;
  return e?.data?.message || e?.message || 'Could not update the plan';
}

export function useShopCalendarDrag(options: Options) {
  const optsRef = useRef(options);
  optsRef.current = options;

  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const previewRef = useRef<DragPreview | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const detachRef = useRef<(() => void) | null>(null);

  const [updateShopPlan, { isLoading: isSaving }] = useUpdateShopPlanMutation();

  const commitPreview = useCallback((next: DragPreview | null) => {
    const prev = previewRef.current;
    if (prev && next && prev.kind === next.kind && prev.dayKey === next.dayKey && sameSlot(prev, next)) return;
    previewRef.current = next;
    setPreview(next);
  }, []);

  /** Recomputes the drop result for the current pointer position. */
  const compute = useCallback(() => {
    const s = sessionRef.current;
    if (!s?.active) return;
    const o = optsRef.current;
    const { x, y } = pointerRef.current;
    const totalHours = Number(s.plan.estimated_hours) || 0;
    const planId = s.plan.id;

    if (s.kind === 'resize') {
      const el = o.scrollRef.current?.querySelector(`[data-dnd-day="${s.dayKey}"]`);
      if (!el) return;
      const hours = resizeSegment(s.part, totalHours, pointerHour(el, x, y, o));
      commitPreview({ kind: 'resize', planId, start: new Date(s.plan.scheduled_start_date), hours });
      return;
    }

    if (o.layout === 'month') {
      const dayKey = targetUnder(x, y)?.dataset.dndDay;
      if (!dayKey) return;
      const r = moveToDay(s.plan, parseISO(s.dayKey), parseISO(dayKey), o.plans);
      commitPreview({ kind: 'move', planId, start: r.start, hours: totalHours, dayKey, adjusted: r.adjusted });
      return;
    }

    const el = o.lockDay
      ? o.scrollRef.current?.querySelector<HTMLElement>(`[data-dnd-day="${s.dayKey}"]`)
      : targetUnder(x, y);
    const dayKey = el?.dataset.dndDay;
    if (!el || !dayKey) return;
    const start = moveSegment(parseISO(dayKey), pointerHour(el, x, y, o) - s.grabOffsetH, s.part.hoursBefore);
    commitPreview({ kind: 'move', planId, start, hours: totalHours });
  }, [commitPreview]);

  const stopAutoScroll = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  // Scroll the calendar while dragging near its edges, then re-evaluate the drop target
  const autoScroll = useCallback(() => {
    const box = optsRef.current.scrollRef.current;
    if (!box || !sessionRef.current?.active) return;
    const r = box.getBoundingClientRect();
    const { x, y } = pointerRef.current;
    const step = (dist: number) =>
      dist < AUTOSCROLL_EDGE_PX ? Math.ceil(((AUTOSCROLL_EDGE_PX - dist) / AUTOSCROLL_EDGE_PX) * AUTOSCROLL_MAX_STEP) : 0;
    const dy = step(y - r.top) ? -step(y - r.top) : step(r.bottom - y);
    const dx = step(x - r.left) ? -step(x - r.left) : step(r.right - x);
    if (dx || dy) {
      box.scrollBy(dx, dy);
      compute();
    }
    rafRef.current = requestAnimationFrame(autoScroll);
  }, [compute]);

  const endSession = useCallback(() => {
    detachRef.current?.();
    detachRef.current = null;
    stopAutoScroll();
    sessionRef.current = null;
    delete document.body.dataset.calendarDragging;
  }, []);

  const cancelDrag = useCallback(() => {
    endSession();
    commitPreview(null);
  }, [endSession, commitPreview]);

  const finishDrag = useCallback(() => {
    const s = sessionRef.current;
    const p = previewRef.current;
    endSession();
    if (!s?.active) return;

    // The pointerup that ends a drag also produces a click: don't open the plan
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 300);

    const fromStart = new Date(s.plan.scheduled_start_date);
    const fromHours = Number(s.plan.estimated_hours) || 0;
    if (!p || sameSlot(p, { start: fromStart, hours: fromHours })) {
      commitPreview(null);
      return;
    }
    setPending({
      kind: s.kind,
      plan: s.plan,
      fromStart,
      fromHours,
      toStart: p.start,
      toHours: p.hours,
      adjusted: !!p.adjusted,
      clashes: findClashes(s.plan, p.start, p.hours, optsRef.current.plans),
    });
  }, [endSession, commitPreview]);

  const begin = useCallback(
    (kind: 'move' | 'resize', e: React.PointerEvent, seg: CalendarSegment, dayKey: string) => {
      // Touch keeps tap-to-open and scroll; dragging is for mouse / pen
      if (e.button !== 0 || e.pointerType === 'touch' || dragBlockReason(seg)) return;
      const o = optsRef.current;
      const plan = o.planMap[Number(planIdOf(seg))];
      if (!plan || sessionRef.current || pending) return;
      e.stopPropagation();
      e.preventDefault(); // no text selection while dragging

      const part: PlanPart = {
        start: new Date(seg.scheduled_start_date),
        hours: Number(seg.estimated_hours) || 0,
        hoursBefore: seg._hoursBefore ?? 0,
        isLast: !!seg._isLastPart,
      };
      const zone = (e.currentTarget as HTMLElement).closest('[data-dnd-day]');
      const grabOffsetH = zone && o.layout !== 'month' ? pointerHour(zone, e.clientX, e.clientY, o) - hourOf(part.start) : 0;

      sessionRef.current = { kind, plan, part, dayKey, grabOffsetH, startX: e.clientX, startY: e.clientY, active: false };
      pointerRef.current = { x: e.clientX, y: e.clientY };

      const onMove = (ev: PointerEvent) => {
        const s = sessionRef.current;
        if (!s) return;
        pointerRef.current = { x: ev.clientX, y: ev.clientY };
        if (!s.active) {
          if (Math.hypot(ev.clientX - s.startX, ev.clientY - s.startY) < DRAG_THRESHOLD_PX) return;
          s.active = true;
          // Drives the page-wide cursor while the pointer is away from the card (styles.css)
          document.body.dataset.calendarDragging =
            s.kind === 'move' ? 'move' : optsRef.current.layout === 'timeline' ? 'resize-x' : 'resize-y';
          rafRef.current = requestAnimationFrame(autoScroll);
        }
        compute();
      };
      const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') cancelDrag(); };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', cancelDrag);
      window.addEventListener('keydown', onKey);
      detachRef.current = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', cancelDrag);
        window.removeEventListener('keydown', onKey);
      };
    },
    [autoScroll, compute, finishDrag, cancelDrag, pending],
  );

  useEffect(() => () => endSession(), [endSession]);

  const startMove = useCallback(
    (e: React.PointerEvent, seg: CalendarSegment, dayKey: string) => begin('move', e, seg, dayKey),
    [begin],
  );
  const startResize = useCallback(
    (e: React.PointerEvent, seg: CalendarSegment, dayKey: string) => begin('resize', e, seg, dayKey),
    [begin],
  );

  /** True once for the click that follows a drag; callers skip their click handler. */
  const consumeClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const closeDialog = useCallback(() => {
    setPending(null);
    commitPreview(null);
  }, [commitPreview]);

  const confirm = useCallback(async () => {
    if (!pending) return;
    const { plan, toStart, toHours, kind } = pending;
    // Same stage payload the edit form sends (it also carries notes as text and the sequence)
    const stage = {
      workstation_id: Number(plan.workstation_id),
      planning_section_id: Number(plan.planning_section_id) || 0,
      operator_ids: plan.operator_id != null ? [Number(plan.operator_id)] : [],
      estimated_hours: toHours,
      scheduled_start: toApiDateTime(toStart),
      scheduled_end: toApiDateTime(planEnd(toStart, toHours)),
      notes: plan.notes || undefined,
      sequence: Number(plan.sequence) || 1,
    };
    try {
      await updateShopPlan({ plan_id: Number(plan.id), data: { stage } as unknown as ShopCutPlanUpdate }).unwrap();
      toast.success(kind === 'resize' ? `FAB #${plan.fab_id} duration updated` : `FAB #${plan.fab_id} rescheduled`);
      closeDialog();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [pending, updateShopPlan, closeDialog]);

  return {
    preview,
    /** Plan being dragged or awaiting confirmation (its cards are dimmed) */
    activePlanId: pending?.plan.id ?? preview?.planId ?? null,
    startMove,
    startResize,
    consumeClick,
    dialog: <RescheduleDialog change={pending} saving={isSaving} onConfirm={confirm} onCancel={closeDialog} />,
  };
}
