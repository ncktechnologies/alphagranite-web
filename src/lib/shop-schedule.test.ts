import { describe, expect, it } from 'vitest';
import {
  clampStartHour,
  moveSegment,
  moveToDay,
  productiveHoursBetween,
  resizeSegment,
  splitPlanIntoParts,
  toApiDateTime,
  type SchedulablePlan,
} from './shop-schedule';
import { addWorkingHours, subtractWorkingHours } from './shop-time';

const at = (s: string) => new Date(s); // local wall time (no zone suffix)
const fmt = (d: Date) => toApiDateTime(d).slice(0, 16);

describe('splitPlanIntoParts', () => {
  it('keeps minutes on the first segment', () => {
    const parts = splitPlanIntoParts(at('2026-09-01T09:30:00'), 1);
    expect(parts).toHaveLength(1);
    expect(fmt(parts[0].start)).toBe('2026-09-01T09:30');
  });

  it('splits around lunch and the end of the day', () => {
    const parts = splitPlanIntoParts(at('2026-09-01T10:00:00'), 7);
    expect(parts.map((p) => [fmt(p.start), p.hours, p.hoursBefore])).toEqual([
      ['2026-09-01T10:00', 2, 0],
      ['2026-09-01T13:00', 3, 2],
      ['2026-09-02T07:00', 2, 5],
    ]);
    expect(parts.map((p) => p.isLast)).toEqual([false, false, true]);
  });

  it('starts a lunch-time start after the break', () => {
    expect(fmt(splitPlanIntoParts(at('2026-09-01T12:15:00'), 1)[0].start)).toBe('2026-09-01T13:00');
  });
});

describe('subtractWorkingHours', () => {
  it('is the inverse of addWorkingHours across lunch and days', () => {
    const start = at('2026-09-01T10:30:00');
    for (const h of [0.5, 2, 4.75, 9, 13.25]) {
      expect(fmt(subtractWorkingHours(addWorkingHours(start, h), h))).toBe('2026-09-01T10:30');
    }
  });
});

describe('moveSegment', () => {
  it('snaps and clamps a first segment', () => {
    expect(fmt(moveSegment(at('2026-09-03T00:00:00'), 9.4, 0))).toBe('2026-09-03T09:30');
    expect(fmt(moveSegment(at('2026-09-03T00:00:00'), 12.4, 0))).toBe('2026-09-03T13:00');
    expect(fmt(moveSegment(at('2026-09-03T00:00:00'), 5, 0))).toBe('2026-09-03T07:00');
  });

  it('walks the plan start back when a later segment is dropped', () => {
    // Afternoon segment (2h before it) dropped at 14:00 → plan starts 11:00
    expect(fmt(moveSegment(at('2026-09-03T00:00:00'), 14, 2))).toBe('2026-09-03T11:00');
    // Next-day segment dropped at opening → plan starts the previous afternoon
    expect(fmt(moveSegment(at('2026-09-03T00:00:00'), 7, 2))).toBe('2026-09-02T14:00');
  });
});

describe('resizeSegment', () => {
  it('changes only the dragged segment and skips lunch', () => {
    const [morning] = splitPlanIntoParts(at('2026-09-01T09:00:00'), 3);
    expect(resizeSegment(morning, 3, 11)).toBe(2);
    expect(resizeSegment(morning, 3, 14)).toBe(4); // 9–12 + 13–14
    expect(resizeSegment(morning, 3, 8)).toBe(0.25); // never below one snap step
  });

  it('keeps the other segments of a multi-day plan', () => {
    const parts = splitPlanIntoParts(at('2026-09-01T13:00:00'), 5); // 13–16, next day 7–9
    expect(resizeSegment(parts[1], 5, 10.5)).toBe(6.5);
  });
});

describe('productiveHoursBetween / clampStartHour', () => {
  it('excludes lunch', () => {
    expect(productiveHoursBetween(11, 14)).toBe(2);
    expect(productiveHoursBetween(13, 15)).toBe(2);
  });
  it('never starts in lunch or after closing', () => {
    expect(clampStartHour(12.5)).toBe(13);
    expect(clampStartHour(17)).toBe(15.75);
  });
});

describe('moveToDay', () => {
  const plan: SchedulablePlan = {
    id: 1,
    workstation_id: 5,
    operator_id: 9,
    scheduled_start_date: '2026-09-01T09:00:00',
    estimated_hours: 2,
  };
  const from = at('2026-09-01T00:00:00');
  const to = at('2026-09-04T00:00:00');

  it('keeps the time of day when the slot is free', () => {
    const r = moveToDay(plan, from, to, []);
    expect(fmt(r.start)).toBe('2026-09-04T09:00');
    expect(r.adjusted).toBe(false);
  });

  it('ignores bookings on other workstations and operators', () => {
    const other = { id: 2, workstation_id: 6, operator_id: 3, scheduled_start_date: '2026-09-04T08:00:00', estimated_hours: 4 };
    expect(moveToDay(plan, from, to, [other]).adjusted).toBe(false);
  });

  it('moves to the end of the clashing booking', () => {
    const other = { id: 2, workstation_id: 5, operator_id: 3, scheduled_start_date: '2026-09-04T08:00:00', estimated_hours: 2 };
    const r = moveToDay(plan, from, to, [other]);
    expect(fmt(r.start)).toBe('2026-09-04T10:00');
    expect(r.adjusted).toBe(true);
  });

  it('falls back to an earlier free slot when later ones are taken', () => {
    const others = [
      { id: 2, workstation_id: 5, scheduled_start_date: '2026-09-04T09:00:00', estimated_hours: 6 }, // 9–16
    ];
    const r = moveToDay(plan, from, to, others);
    expect(fmt(r.start)).toBe('2026-09-04T07:00');
    expect(r.adjusted).toBe(true);
  });

  it('reports the clash when the day is full', () => {
    const others = [{ id: 2, operator_id: 9, scheduled_start_date: '2026-09-04T07:00:00', estimated_hours: 8 }];
    const r = moveToDay(plan, from, to, others);
    expect(fmt(r.start)).toBe('2026-09-04T09:00');
    expect(r.clashes).toHaveLength(1);
  });
});
