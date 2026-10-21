import { describe, expect, it } from 'vitest';
import { JOB_STATUS_OPTIONS, jobStatusLabel } from './jobStatus';

describe('jobStatusLabel', () => {
  it('maps the Manage Jobs status ids', () => {
    expect(jobStatusLabel(0)).toBe('Inactive');
    expect(jobStatusLabel(1)).toBe('Active');
    expect(jobStatusLabel(3)).toBe('Completed');
  });

  it('falls back for unknown or missing ids', () => {
    expect(jobStatusLabel(2)).toBe('N/A');
    expect(jobStatusLabel(undefined)).toBe('N/A');
    expect(jobStatusLabel(null)).toBe('N/A');
  });

  it('offers exactly Active, Inactive and Completed', () => {
    expect(JOB_STATUS_OPTIONS.map((o) => [o.value, o.label])).toEqual([[1, 'Active'], [0, 'Inactive'], [3, 'Completed']]);
  });
});
