import { describe, expect, it } from 'vitest';
import { stageTimerFields, stageTimerStatus } from './stageTimerStatus';

describe('stageTimerStatus', () => {
  it('treats each stage running status as running', () => {
    expect(stageTimerStatus({ status: 'drafting' })).toBe('running'); // Drafting, Revisions, CNC
    expect(stageTimerStatus({ status: 'active' })).toBe('running');   // SlabSmith, Final Programming
    expect(stageTimerStatus({ status: ' Active ' })).toBe('running');
  });

  it('treats paused and on hold as paused', () => {
    expect(stageTimerStatus({ status: 'paused' })).toBe('paused');
    expect(stageTimerStatus({ status: 'on_hold' })).toBe('paused');
  });

  it('shows completed or missing sessions as not started', () => {
    expect(stageTimerStatus({ status: 'completed' })).toBe('not_started');
    expect(stageTimerStatus(null)).toBe('not_started');
    expect(stageTimerStatus(undefined)).toBe('not_started');
    expect(stageTimerStatus({ status: null })).toBe('not_started');
  });
});

describe('stageTimerFields', () => {
  it('only names the person while a timer is open', () => {
    expect(stageTimerFields({ status: 'active', user_name: 'Jane Doe' })).toEqual({ timer_status: 'running', timer_user: 'Jane Doe' });
    expect(stageTimerFields({ status: 'completed', user_name: 'Jane Doe' })).toEqual({ timer_status: 'not_started', timer_user: undefined });
  });
});
