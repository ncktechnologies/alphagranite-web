/**
 * Number formatting for reports and dashboard figures.
 *
 * Negative amounts are written with a leading minus sign (-$645,000), never
 * accounting brackets, and match the backend PDF formatter
 * (src/app/service/labor_cost_report_pdf.py:format_metric).
 */

/** Value formats the backend sends in a report's `metric_rows`. */
export type MetricFormat = 'currency' | 'percent' | 'number' | 'count' | 'days';

const isBlank = (value: unknown): boolean =>
  value === null || value === undefined || value === '' || Number.isNaN(Number(value));

const grouped = (value: number, decimals: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** "$1,234.56", "-$1,234.56", or "-" when there is no value. */
export function formatCurrency(value: unknown, decimals = 2): string {
  if (isBlank(value)) return '-';
  const number = Number(value);
  return `${number < 0 ? '-' : ''}$${grouped(Math.abs(number), decimals)}`;
}

/** Always shows the sign: "+$50,000", "-$645,000", "$0" for zero. */
export function formatSignedCurrency(value: unknown, decimals = 0): string {
  if (isBlank(value)) return '-';
  const number = Number(value);
  const sign = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${sign}$${grouped(Math.abs(number), decimals)}`;
}

/** Text color for a signed delta: red below zero, the regular (black) text color otherwise. */
export function deltaToneClass(value: unknown): string {
  return !isBlank(value) && Number(value) < 0 ? 'text-destructive' : 'text-foreground';
}

/** Formats one report value according to its metric format. */
export function formatMetric(value: unknown, format: MetricFormat | string): string {
  if (isBlank(value)) return '-';
  const number = Number(value);
  switch (format) {
    case 'currency':
      return formatCurrency(number);
    case 'percent':
      return `${grouped(number, 2)}%`;
    case 'count':
      return grouped(number, 1);
    case 'days':
      return grouped(number, 0);
    default:
      return grouped(number, 2);
  }
}
