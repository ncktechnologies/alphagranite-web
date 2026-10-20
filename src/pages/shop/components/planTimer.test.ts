import { describe, expect, it } from 'vitest';
import { elapsedSecondsAt, formatElapsed, getStageTimerStatus, type PlanTimer } from './planTimer';

const timer = (status: PlanTimer['status'], elapsed_seconds = 0): PlanTimer => ({ status, session_id: null, elapsed_seconds });

describe('formatElapsed', () => {
  it('shows hours past a day without wrapping', () => {
    expect(formatElapsed(0)).toBe('0:00:00');
    expect(formatElapsed(3725)).toBe('1:02:05');
    expect(formatElapsed(26 * 3600 + 59)).toBe('26:00:59');
  });
});

describe('elapsedSecondsAt', () => {
  it('counts up only while running', () => {
    expect(elapsedSecondsAt(timer('running', 100), 1_000, 6_500)).toBe(105);
    expect(elapsedSecondsAt(timer('paused', 100), 1_000, 6_500)).toBe(100);
    expect(elapsedSecondsAt(timer('stopped', 100), 1_000, 6_500)).toBe(100);
    expect(elapsedSecondsAt(undefined, 1_000, 6_500)).toBe(0);
  });

  it('never goes below the server value when clocks disagree', () => {
    expect(elapsedSecondsAt(timer('running', 100), 6_500, 1_000)).toBe(100);
  });
});

describe('getStageTimerStatus', () => {
  const plans = [
    { planning_section_id: 7, timer: timer('paused') },
    { planning_section_id: 7, timer: timer('running') },
    { planning_section_id: 9, timer: timer('paused') },
    { planning_section_id: 2, timer: timer('stopped', 50) },
    { planning_section_id: 1, timer: null },
  ];

  it('outlines running before paused, and ignores idle/stopped stages', () => {
    expect(getStageTimerStatus(plans, 7)).toBe('running');
    expect(getStageTimerStatus(plans, 9)).toBe('paused');
    expect(getStageTimerStatus(plans, 2)).toBeNull();
    expect(getStageTimerStatus(plans, 1)).toBeNull();
    expect(getStageTimerStatus(plans, 8)).toBeNull();
  });
});
