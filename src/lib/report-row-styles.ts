/**
 * Row styles for the weekly labor cost reports.
 *
 * Which rows get which style is decided by the backend (each report row in
 * `metric_rows` carries a `style` keyed to the metric, see
 * backend src/app/service/labor_cost_report_rows.py); this map turns a style
 * into classes applied to every cell of the row, label and values alike.
 * The PDF export uses the same colors (#0369A1 background, white bold text).
 */

export type ReportRowStyle = 'highlight' | 'bold';

export const REPORT_ROW_STYLE_CLASSES: Record<ReportRowStyle, string> = {
  // --color-info-strong with white bold text: 5.93:1 contrast, readable in light and dark mode.
  highlight: 'bg-info-strong text-white dark:text-white font-bold',
  bold: 'font-bold',
};

/** Classes for every cell in a row with the given style ('' for unstyled rows). */
export function reportRowClass(style: string | null | undefined): string {
  return style && style in REPORT_ROW_STYLE_CLASSES
    ? REPORT_ROW_STYLE_CLASSES[style as ReportRowStyle]
    : '';
}
