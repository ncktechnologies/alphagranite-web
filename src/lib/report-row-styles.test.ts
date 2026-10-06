import { describe, expect, it } from 'vitest';
import { REPORT_ROW_STYLE_CLASSES, reportRowClass } from './report-row-styles';

describe('report row style map', () => {
  it('highlights with the contrast-safe info blue, white bold text', () => {
    const classes = reportRowClass('highlight').split(' ');
    expect(classes).toContain('bg-info-strong');
    expect(classes).toContain('text-white');
    expect(classes).toContain('dark:text-white');
    expect(classes).toContain('font-bold');
  });

  it('bold rows only change the font weight', () => {
    expect(reportRowClass('bold')).toBe('font-bold');
  });

  it('leaves unstyled and unknown rows alone', () => {
    expect(reportRowClass(null)).toBe('');
    expect(reportRowClass(undefined)).toBe('');
    expect(reportRowClass('something-else')).toBe('');
  });

  it('covers exactly the styles the backend sends', () => {
    // backend: src/app/service/labor_cost_report_rows.py HIGHLIGHT / BOLD
    expect(Object.keys(REPORT_ROW_STYLE_CLASSES).sort()).toEqual(['bold', 'highlight']);
  });
});
