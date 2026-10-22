import { describe, expect, it } from 'vitest';
import { firstCutPlan } from './firstCutPlan';

const SAW = 7;
const WJ = 8;
const EDGING = 9;

describe('firstCutPlan', () => {
  it('uses the waterjet plan when there is no saw plan', () => {
    const plans = [
      { id: 1, planning_section_id: EDGING, sequence: 1, scheduled_start_date: '2026-10-12T07:00:00' },
      { id: 2, planning_section_id: WJ, sequence: 2, scheduled_start_date: '2026-10-13T07:00:00' },
    ];
    expect(firstCutPlan(plans)?.id).toBe(2);
  });

  it('picks whichever cut plan comes first in the sequence', () => {
    expect(firstCutPlan([
      { id: 1, planning_section_id: SAW, sequence: 3, scheduled_start_date: '2026-10-12T07:00:00' },
      { id: 2, planning_section_id: WJ, sequence: 1, scheduled_start_date: '2026-10-14T07:00:00' },
    ])?.id).toBe(2);
    expect(firstCutPlan([
      { id: 1, planning_section_id: SAW, sequence: 1, scheduled_start_date: '2026-08-03T07:00:00' },
      { id: 2, planning_section_id: WJ, sequence: 3, scheduled_start_date: '2026-08-03T09:00:00' },
    ])?.id).toBe(1);
  });

  it('breaks sequence ties by scheduled date, unscheduled last', () => {
    expect(firstCutPlan([
      { id: 1, planning_section_id: SAW, sequence: 1, scheduled_start_date: null },
      { id: 2, planning_section_id: WJ, sequence: 1, scheduled_start_date: '2026-10-14T07:00:00' },
    ])?.id).toBe(2);
  });

  it('returns undefined without cut plans', () => {
    expect(firstCutPlan([{ id: 1, planning_section_id: EDGING, sequence: 1 }])).toBeUndefined();
    expect(firstCutPlan([])).toBeUndefined();
  });

  it('does not reorder the input', () => {
    const plans = [
      { id: 1, planning_section_id: SAW, sequence: 2 },
      { id: 2, planning_section_id: WJ, sequence: 1 },
    ];
    firstCutPlan(plans);
    expect(plans.map((p) => p.id)).toEqual([1, 2]);
  });
});
