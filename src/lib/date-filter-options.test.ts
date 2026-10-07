import { describe, expect, it } from 'vitest';
import { orderDateFilterOptions } from './date-filter-options';

const OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'all', label: 'All Date' },
  { value: 'custom', label: 'Custom' },
];
const order = (selected: string | undefined) => orderDateFilterOptions(OPTIONS, selected).map((option) => option.value);

describe('orderDateFilterOptions', () => {
  it('puts All Date first when it is selected or nothing is', () => {
    expect(order('all')).toEqual(['all', 'today', 'this_week', 'last_week', 'custom']);
    expect(order(undefined)).toEqual(['all', 'today', 'this_week', 'last_week', 'custom']);
  });

  it('puts the selected option first, then All Date, then the rest in order', () => {
    expect(order('last_week')).toEqual(['last_week', 'all', 'today', 'this_week', 'custom']);
    expect(order('custom')).toEqual(['custom', 'all', 'today', 'this_week', 'last_week']);
  });

  it('ignores an unknown selection', () => {
    expect(order('next_year')).toEqual(['all', 'today', 'this_week', 'last_week', 'custom']);
  });
});
