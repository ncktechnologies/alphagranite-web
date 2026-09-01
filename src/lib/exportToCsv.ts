import { Table } from "@tanstack/react-table";

type ValueFormatter<T> = (value: any, row: T) => string;

interface ExportOptions<T> {
  currentPageOnly?: boolean;
  formatters?: Record<string, ValueFormatter<T>>;
}

const defaultFormat = (value: any): string => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "";
  // Convert to string and replace non‑breaking spaces with regular spaces
  return String(value).replace(/\u00A0/g, ' ');
};

const extractHeaderTitle = (header: any, colId: string): string => {
  if (typeof header === "string") return header;
  if (header?.props?.title) return header.props.title;
  if (header?.toString?.().includes("title")) return header.props?.title ?? colId;
  return colId.toUpperCase();
};

export function exportTableToCSV<T extends Record<string, any>>(
  table: Table<T>,
  filename: string,
  options?: ExportOptions<T>
) {
  const { currentPageOnly = false, formatters = {} } = options || {};

  const rows = currentPageOnly
    ? table.getRowModel().rows
    : table.getFilteredRowModel().rows;

  if (!rows || rows.length === 0) {
    console.warn("No data available to export.");
    return;
  }

  const visibleColumns = table
    .getAllLeafColumns()
    .filter((col) => col.getIsVisible() && col.id !== "actions");

  const headers = visibleColumns.map((col) =>
    extractHeaderTitle(col.columnDef.header, col.id)
  );

  const csvRows = rows.map((row) => {
    return visibleColumns
      .map((col) => {
        const raw = row.getValue(col.id);
        const metaFormat = col.columnDef.meta?.format as ValueFormatter<T> | undefined;
        let formatted: string;
        if (metaFormat) {
          formatted = metaFormat(raw, row.original);
        } else if (formatters[col.id]) {
          formatted = formatters[col.id](raw, row.original);
        } else {
          formatted = defaultFormat(raw);
        }
        // Escape double quotes and wrap in quotes
        const escaped = String(formatted ?? "").replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",");
  });

  // ─── Add UTF‑8 BOM to fix Excel encoding ──────────────────────────────
  const BOM = "\uFEFF";
  const csvContent = BOM + [headers.join(","), ...csvRows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}