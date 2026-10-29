import { Column, Row, Table } from "@tanstack/react-table";
import { toast } from "sonner";

type ValueFormatter<T> = (value: any, row: T) => string;

interface ExportOptions<T> {
  currentPageOnly?: boolean;
  formatters?: Record<string, ValueFormatter<T>>;
}

// UI-only columns that never belong in an export.
const SKIPPED_COLUMN_IDS = new Set(["actions", "select"]);

const defaultFormat = (value: any): string => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "";
  // Convert to string and replace non‑breaking spaces with regular spaces
  return String(value).replace(/ /g, ' ');
};

const escapeCell = (value: unknown): string =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

// Column headers are usually render functions like
// ({ column }) => <DataGridColumnHeader title="Fab ID" column={column} />,
// so call them and read the title off the returned element. Returns "" when
// the header has no readable title (e.g. a select-all checkbox).
const extractHeaderTitle = <T,>(column: Column<T, unknown>, table: Table<T>): string => {
  const header = column.columnDef.header;
  if (typeof header === "string") return header;
  if (typeof header === "function") {
    try {
      const element: any = (header as any)({ column, table, header: undefined });
      if (typeof element === "string" && element) return element;
      if (typeof element?.props?.title === "string" && element.props.title) return element.props.title;
      if (typeof element?.props?.children === "string" && element.props.children) return element.props.children;
    } catch {
      // Header needs real render context; fall back to the column id.
    }
  }
  return "";
};

// Expandable tables (e.g. shop status plans under a fab) keep children in subRows.
const flattenRows = <T,>(rows: Row<T>[]): Row<T>[] =>
  rows.flatMap((row) => [row, ...flattenRows(row.subRows ?? [])]);

export function downloadCSV(headers: string[], rows: unknown[][], filename: string) {
  // ─── Add UTF‑8 BOM to fix Excel encoding ──────────────────────────────
  const BOM = "\uFEFF";
  const csvContent =
    BOM + [headers.map(escapeCell).join(","), ...rows.map((row) => row.map(escapeCell).join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking synchronously can cancel the download in Safari/Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportTableToCSV<T extends Record<string, any>>(
  table: Table<T>,
  filename: string,
  options?: ExportOptions<T>
) {
  const { currentPageOnly = false, formatters = {} } = options || {};

  const rows = flattenRows(
    currentPageOnly ? table.getRowModel().rows : table.getFilteredRowModel().rows
  );

  if (!rows || rows.length === 0) {
    toast.warning("No data to export");
    return;
  }

  const visibleColumns = table
    .getAllLeafColumns()
    .filter((col) => col.getIsVisible() && !SKIPPED_COLUMN_IDS.has(col.id));

  const titles = visibleColumns.map((col) => extractHeaderTitle(col, table));

  const failedColumns = new Set<string>();
  const csvRows = rows.map((row) =>
    visibleColumns.map((col) => {
      let raw: unknown;
      try {
        raw = row.getValue(col.id);
        const metaFormat = col.columnDef.meta?.format as ValueFormatter<T> | undefined;
        if (metaFormat) return metaFormat(raw, row.original);
        if (formatters[col.id]) return formatters[col.id](raw, row.original);
        return defaultFormat(raw);
      } catch (error) {
        // One bad value must not abort the whole export; keep the raw value.
        if (!failedColumns.has(col.id)) console.warn(`CSV export: formatter for "${col.id}" failed`, error);
        failedColumns.add(col.id);
        return defaultFormat(raw);
      }
    })
  );

  // Drop untitled columns that export nothing (checkbox columns with other ids).
  const keep = visibleColumns.map((_, i) => titles[i] !== "" || csvRows.some((cells) => cells[i] !== ""));
  const headers = visibleColumns.map((col, i) => titles[i] || col.id.toUpperCase()).filter((_, i) => keep[i]);

  downloadCSV(headers, csvRows.map((cells) => cells.filter((_, i) => keep[i])), filename);
}
