/** One choice in a table's date filter dropdown. */
export interface DateFilterOption {
  value: string;
  label: string;
}

/** Value of the "All Date" choice in every date filter. */
export const ALL_DATES = 'all';

/**
 * Date filter choices in display order: the selected choice first (when it is
 * not "All Date"), then "All Date", then the rest in their usual order.
 */
export function orderDateFilterOptions(options: DateFilterOption[], selected: string | null | undefined): DateFilterOption[] {
  const all = options.find((option) => option.value === ALL_DATES);
  const current = selected !== ALL_DATES ? options.find((option) => option.value === selected) : undefined;
  const rest = options.filter((option) => option !== all && option !== current);
  return [current, all, ...rest].filter((option): option is DateFilterOption => !!option);
}
