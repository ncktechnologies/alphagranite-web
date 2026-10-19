import { addDays, differenceInCalendarDays, format } from 'date-fns';
import {
  SHOP_BREAK_END_HOUR,
  SHOP_BREAK_START_HOUR,
  SHOP_DAY_END_HOUR,
  SHOP_DAY_START_HOUR,
  addWorkingHours,
  subtractWorkingHours,
} from './shop-time';

/**
 * Scheduling math for the shop calendar: how a plan's productive hours lay out
 * across days (skipping lunch and closed time), and where a plan lands when it
 * is dragged or resized. Pure functions so the calendar UI stays thin.
 */

/** Drag/resize granularity, in hours. */
export const SNAP_HOURS = 0.25;

export interface PlanPart {
  /** Wall-clock start of this visible segment */
  start: Date;
  /** Productive hours in this segment */
  hours: number;
  /** Productive hours of the plan that come before this segment */
  hoursBefore: number;
  isLast: boolean;
}

/** Minimal shape needed for clash checks */
export interface SchedulablePlan {
  id: number | string;
  workstation_id?: number | string | null;
  operator_id?: number | string | null;
  scheduled_start_date: string;
  estimated_hours: number | string;
  fab_id?: number | string;
  workstation_name?: string;
}

/** A plan row as the calendar receives it from the plans list endpoint. */
export interface ShopCalendarPlan extends SchedulablePlan {
  fab_id: number | string;
  fab_type?: string;
  planning_section_id?: number | string | null;
  notes?: string | null;
  sequence?: number | string | null;
  plan_name?: string;
  workstation_name?: string;
  has_pending_shop_revision?: boolean;
  work_percentage?: number | string | null;
}

/** Why a plan can't be dragged on the calendar, or null when it can. */
export function dragBlockReason(plan: Pick<ShopCalendarPlan, 'has_pending_shop_revision' | 'work_percentage'>): string | null {
  if (plan.has_pending_shop_revision) return 'Resolve the pending shop revision before rescheduling';
  if ((Number(plan.work_percentage) || 0) >= 100) return 'Completed plans can’t be rescheduled';
  return null;
}

export const hourOf = (d: Date) => d.getHours() + d.getMinutes() / 60;

export function atHour(day: Date, hour: number): Date {
  const d = new Date(day);
  const minutes = Math.round(hour * 60);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export const snapHour = (hour: number, step = SNAP_HOURS) => Math.round(hour / step) * step;

/** Format the API expects for scheduled_start / scheduled_end (local wall time, no zone). */
export const toApiDateTime = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm:ss");

export const planEnd = (start: Date, hours: number) => addWorkingHours(start, hours);

/** Splits a plan into per-day segments around lunch and the end of the shop day. */
export function splitPlanIntoParts(start: Date, totalHours: number): PlanPart[] {
  const parts: PlanPart[] = [];
  let remaining = Math.max(0, totalHours);
  let day = new Date(start);
  let hour = hourOf(start);
  let before = 0;

  if (hour >= SHOP_BREAK_START_HOUR && hour < SHOP_BREAK_END_HOUR) hour = SHOP_BREAK_END_HOUR;
  if (hour < SHOP_DAY_START_HOUR) hour = SHOP_DAY_START_HOUR;

  // Guard against bad data looping forever (e.g. NaN hours)
  for (let guard = 0; remaining > 1e-9 && guard < 2000; guard++) {
    if (hour >= SHOP_DAY_END_HOUR) {
      day = addDays(day, 1);
      hour = SHOP_DAY_START_HOUR;
      continue;
    }
    const boundary = hour < SHOP_BREAK_START_HOUR ? SHOP_BREAK_START_HOUR : SHOP_DAY_END_HOUR;
    const hours = Math.min(remaining, boundary - hour);
    parts.push({ start: atHour(day, hour), hours, hoursBefore: before, isLast: false });
    remaining -= hours;
    before += hours;
    hour += hours;
    if (hour >= SHOP_BREAK_START_HOUR && hour < SHOP_BREAK_END_HOUR) hour = SHOP_BREAK_END_HOUR;
  }
  if (parts.length) parts[parts.length - 1].isLast = true;
  return parts;
}

/** Productive hours between two hours of the same day (lunch excluded). */
export function productiveHoursBetween(startHour: number, endHour: number): number {
  if (endHour <= startHour) return 0;
  const lunch = Math.max(0, Math.min(endHour, SHOP_BREAK_END_HOUR) - Math.max(startHour, SHOP_BREAK_START_HOUR));
  return endHour - startHour - lunch;
}

/** Keeps a dropped start inside the working day (never in lunch or after closing). */
export function clampStartHour(hour: number): number {
  let h = Math.min(Math.max(hour, SHOP_DAY_START_HOUR), SHOP_DAY_END_HOUR - SNAP_HOURS);
  if (h >= SHOP_BREAK_START_HOUR && h < SHOP_BREAK_END_HOUR) h = SHOP_BREAK_END_HOUR;
  return h;
}

/**
 * New plan start when one of its segments is dropped at `day`/`segmentStartHour`.
 * Earlier segments keep their productive length, so the plan start is walked back
 * over working time from the dropped segment.
 */
export function moveSegment(day: Date, segmentStartHour: number, hoursBefore: number): Date {
  const segmentStart = atHour(day, clampStartHour(snapHour(segmentStartHour)));
  return hoursBefore > 0 ? subtractWorkingHours(segmentStart, hoursBefore) : segmentStart;
}

/**
 * New total hours when a segment's end edge is dragged to `endHour` (same day).
 * Only that segment's length changes; the rest of the plan keeps its hours.
 */
export function resizeSegment(part: PlanPart, totalHours: number, endHour: number): number {
  const startHour = hourOf(part.start);
  const end = Math.min(Math.max(snapHour(endHour), startHour + SNAP_HOURS), SHOP_DAY_END_HOUR);
  const segmentHours = Math.max(SNAP_HOURS, productiveHoursBetween(startHour, end));
  const next = totalHours - part.hours + segmentHours;
  return Math.round(next * 100) / 100;
}

const sameResource = (a: SchedulablePlan, b: SchedulablePlan) =>
  (a.workstation_id != null && String(a.workstation_id) === String(b.workstation_id)) ||
  (a.operator_id != null && String(a.operator_id) === String(b.operator_id));

/** Other plans on the same workstation or operator that overlap the given slot. */
export function findClashes<T extends SchedulablePlan>(
  plan: SchedulablePlan,
  start: Date,
  hours: number,
  others: T[],
): T[] {
  const s = start.getTime();
  const e = planEnd(start, hours).getTime();
  return others.filter((o) => {
    if (String(o.id) === String(plan.id) || !sameResource(plan, o)) return false;
    const os = new Date(o.scheduled_start_date);
    const oe = planEnd(os, Number(o.estimated_hours) || 0);
    return os.getTime() < e && s < oe.getTime();
  });
}

export interface MonthMoveResult {
  start: Date;
  /** Time of day changed to avoid a clash */
  adjusted: boolean;
  /** Clashes that remain (no free slot on the target day) */
  clashes: SchedulablePlan[];
}

/**
 * Month view drop: keep the plan's time of day on the target date. If that slot
 * clashes, try the end of each clashing booking that day (later times first, then
 * earlier ones from opening); if nothing fits, keep the original time and report it.
 */
export function moveToDay(
  plan: SchedulablePlan,
  fromDay: Date,
  toDay: Date,
  others: SchedulablePlan[],
): MonthMoveResult {
  const originalStart = new Date(plan.scheduled_start_date);
  const hours = Number(plan.estimated_hours) || 0;
  const desired = addDays(originalStart, differenceInCalendarDays(toDay, fromDay));
  const desiredClashes = findClashes(plan, desired, hours, others);
  if (!desiredClashes.length) return { start: desired, adjusted: false, clashes: [] };

  const targetDay = desired;
  const desiredHour = hourOf(desired);
  const candidates = new Set<number>([SHOP_DAY_START_HOUR, SHOP_BREAK_END_HOUR]);
  others.forEach((o) => {
    if (!sameResource(plan, o)) return;
    const end = planEnd(new Date(o.scheduled_start_date), Number(o.estimated_hours) || 0);
    if (differenceInCalendarDays(end, targetDay) === 0) candidates.add(hourOf(end));
  });
  const ordered = [...candidates]
    .map((h) => clampStartHour(snapHour(h)))
    .filter((h) => h < SHOP_DAY_END_HOUR)
    .sort((a, b) => {
      const aLater = a >= desiredHour;
      const bLater = b >= desiredHour;
      return aLater === bLater ? a - b : aLater ? -1 : 1;
    });

  for (const h of ordered) {
    const start = atHour(targetDay, h);
    if (!findClashes(plan, start, hours, others).length) return { start, adjusted: true, clashes: [] };
  }
  return { start: desired, adjusted: false, clashes: desiredClashes };
}
