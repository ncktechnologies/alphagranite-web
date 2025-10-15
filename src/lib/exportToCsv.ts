import { Table } from "@tanstack/react-table";

/**
 * Exports TanStack table data to CSV.
 *
 * @param table - TanStack table instance
 * @param filename - Desired CSV file name (without extension)
 */
const extractHeaderTitle = (header: any, colId: string): string => {
  if (typeof header === "string") return header;
  if (header?.props?.title) return header.props.title;
  if (header?.toString?.().includes("title")) return header.props?.title ?? colId;
  return colId.toUpperCase();
};

export function exportTableToCSV<T extends Record<string, any>>(
  table: Table<T>,
  filename: string
) {
  const allRows = table.getPrePaginationRowModel().rows; // ✅ all rows, not just visible
  if (!allRows || allRows.length === 0) {
    console.warn("No data available to export.");
    return;
  }

  // Extract columns with headers
  const visibleColumns = table
    .getAllLeafColumns()
    .filter((col) => col.columnDef.header && col.id !== "actions");

  const headers = visibleColumns.map((col) =>
    extractHeaderTitle(col.columnDef.header, col.id)
  );

  // Generate CSV rows
  const rows = allRows.map((row) =>
    visibleColumns
      .map((col) => {
        const value = row.getValue(col.id);
        return `"${String(value ?? "").replace(/"/g, '""')}"`
      })
      .join(",")
  );

  // Combine into one CSV string
  const csvContent = [headers.join(","), ...rows].join("\n");

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
