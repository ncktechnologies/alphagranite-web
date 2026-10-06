// pages/reports/WeeklyLaborCostReport.tsx
//
// Shared page for the weekly labor cost reports (Shop/Fabrication and the three
// Installer variants). Rows, labels, number formats and row styles all come from
// the backend's `metric_rows`, so this table and the PDF export always match.
import { ReactNode, useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { downloadPdf } from '@/lib/download-pdf';
import { formatCurrency, formatMetric, MetricFormat } from '@/lib/report-format';
import { reportRowClass } from '@/lib/report-row-styles';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/common/BackButton';

/** One row of the report as described by the backend. */
export interface MetricRow {
    key: string;
    label: string;
    format: MetricFormat;
    style: 'highlight' | 'bold' | null;
}

type MetricValues = Record<string, number | null | undefined>;

/** Shape of the weekly labor cost report responses (backend reports.py). */
export interface LaborCostReportData {
    title?: string;
    metric_rows?: MetricRow[];
    display?: { total_employee?: number | null; default_overhead_per_week?: number | null; overhead_source?: string } | null;
    monthly_report?: { weekly_breakdown?: (MetricValues & { week_ending: string })[]; totals?: MetricValues };
    /** Same shape as the weekly rows, one per month, plus the year's totals. */
    annual_report?: { year?: number; monthly_breakdown?: (MetricValues & { month: string })[]; totals?: MetricValues };
}

interface ReportQueryResult {
    data?: { data?: LaborCostReportData };
    /** Data for the current params only; undefined while another month loads (RTK Query). */
    currentData?: { data?: LaborCostReportData };
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
}

/** One table row: a metric with a value per period column (`col_<n>`) and the total. */
type TableRow = { metric: string; label: string; format: MetricFormat; style: MetricRow['style']; [periodOrTotal: string]: unknown };

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : '');

export interface WeeklyLaborCostReportProps {
    /** Shown until the backend title arrives. */
    title: string;
    /** Backend report path, e.g. /api/v1/reports/owner/weekly-installer-labor-cost (PDF is `${apiPath}/pdf`). */
    apiPath: string;
    useReportQuery: (params: { year: number; month: number }) => ReportQueryResult;
    /** File name prefix for CSV/PDF downloads. */
    filePrefix: string;
}

// JS parses "YYYY-MM-DD" as UTC midnight; read the date part as a local date instead.
const parseLocalDate = (value: string | null | undefined): Date | null => {
    const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

const MONTHS = Array.from({ length: 12 }, (_, index) => format(new Date(2000, index, 1), 'MMMM'));

/** Newest first: next year back to 2020 (imported history starts 2021), plus the selected year if outside that range. */
const reportYears = (currentYear: number, selectedYear: number): number[] => {
    const years = Array.from({ length: currentYear + 1 - 2020 + 1 }, (_, index) => currentYear + 1 - index);
    return years.includes(selectedYear) ? years : [selectedYear, ...years].sort((a, b) => b - a);
};

const OVERHEAD_SOURCE_LABELS: Record<string, string> = {
    performance_static_data: 'From Performance static data',
    default: 'Default (no static data for this year)',
    query: 'Set for this report',
};

/**
 * Metric rows (from the backend) as table rows, one column per period (week or
 * month) and a TOTAL column with the backend's recalculated period total.
 */
function usePivotTable(metricRows: MetricRow[], columnLabels: string[], columnValues: MetricValues[], totals: MetricValues) {
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 100 });
    const [sorting, setSorting] = useState<SortingState>([]);

    const rows = useMemo(
        () =>
            metricRows.map((metric) => {
                const row: TableRow = { metric: metric.key, label: metric.label, format: metric.format, style: metric.style };
                columnValues.forEach((values, idx) => {
                    row[`col_${idx}`] = values[metric.key];
                });
                row.total = totals[metric.key];
                return row;
            }),
        [metricRows, columnValues, totals],
    );

    const columns = useMemo<ColumnDef<TableRow>[]>(() => {
        const valueColumn = (id: string, header: string, size: number): ColumnDef<TableRow> => ({
            id,
            accessorKey: id,
            header: ({ column }) => <DataGridColumnHeader title={header} column={column} />,
            cell: ({ row }) => formatMetric(row.original[id], row.original.format),
            size,
            enableSorting: true,
            meta: { format: (_value: unknown, row: TableRow) => formatMetric(row[id], row.format) },
        });
        return [
            {
                id: 'metric',
                accessorKey: 'label',
                header: ({ column }) => <DataGridColumnHeader title="METRIC" column={column} />,
                cell: ({ row }) => row.original.label,
                size: 280,
                enableSorting: true,
                meta: { format: (_value: unknown, row: TableRow) => row.label },
            },
            ...columnLabels.map((label, idx) => valueColumn(`col_${idx}`, label, 120)),
            valueColumn('total', 'TOTAL', 160),
        ];
    }, [columnLabels]);

    const table = useReactTable({
        columns,
        data: rows,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
    });

    return { table, rows, columnCount: columns.length };
}

/** Card with a metric × period table; rows take their style (highlight/bold) from the backend. */
function PivotTableCard({ title, pivot, className, toolbar }: {
    title: string;
    pivot: ReturnType<typeof usePivotTable>;
    className?: string;
    toolbar?: ReactNode;
}) {
    const { table, rows, columnCount } = pivot;
    return (
        <DataGrid table={table} recordCount={rows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
            <Card className={cn('border border-[#e2e4ed] dark:border-border rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden', className)}>
                <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] dark:border-border flex flex-row items-center justify-between bg-white dark:bg-card">
                    <CardTitle className="text-base font-semibold text-[#4b545d] dark:text-foreground">{title}</CardTitle>
                    <CardToolbar>{toolbar}</CardToolbar>
                </CardHeader>
                <CardTable>
                    <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-5px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                        <div className="relative">
                            <table className="w-full border-collapse table-fixed">
                                <thead className="sticky top-0 z-10 bg-white dark:bg-card">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <th
                                                    key={header.id}
                                                    className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] dark:text-muted-foreground border-b border-[#e2e4ed] dark:border-border bg-gray-50 dark:bg-muted"
                                                    style={{ width: header.getSize() }}
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {header.column.getCanResize() && (
                                                        <div
                                                            onDoubleClick={() => header.column.resetSize()}
                                                            onMouseDown={header.getResizeHandler()}
                                                            onTouchStart={header.getResizeHandler()}
                                                            className="absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -end-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-gray-300 before:-translate-x-px hover:before:bg-blue-500"
                                                        />
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.map((row) => (
                                        <tr key={row.id} className="border-b border-[#e2e4ed] dark:border-border hover:bg-gray-50/50 dark:hover:bg-muted/40" data-row-style={row.original.style ?? undefined}>
                                            {row.getVisibleCells().map((cell) => (
                                                <td
                                                    key={cell.id}
                                                    className={cn(
                                                        'px-3 py-2 text-sm text-[#4b545d] dark:text-foreground border-r border-[#e2e4ed] dark:border-border last:border-r-0',
                                                        cell.column.id === 'total' && 'font-semibold',
                                                        // Row style from the backend, applied across the whole row.
                                                        reportRowClass(row.original.style),
                                                    )}
                                                    style={{ width: cell.column.getSize() }}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={columnCount} className="px-4 py-8 text-center text-sm text-[#7c8689] dark:text-muted-foreground">
                                                No data available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
                    </ScrollArea>
                </CardTable>
                <CardFooter className="bg-white dark:bg-card border-t border-[#e2e4ed] dark:border-border px-4 py-2">
                    <DataGridPagination />
                </CardFooter>
            </Card>
        </DataGrid>
    );
}

export function WeeklyLaborCostReport({ title, apiPath, useReportQuery, filePrefix }: WeeklyLaborCostReportProps) {
    const now = useMemo(() => new Date(), []);
    // Reports are read month by month: pick a month and a year.
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const period = useMemo(() => new Date(year, month - 1, 1), [year, month]);
    const queryParams = useMemo(() => ({ year, month }), [year, month]);
    const { data, currentData, isLoading, isError, isFetching } = useReportQuery(queryParams);
    // After a month or year change `data` still holds the previous period until the new one
    // arrives; dim it and say what is loading so the numbers don't silently swap.
    const isLoadingPeriod = isFetching && currentData === undefined;
    const staleClass = cn('transition-opacity duration-200', isLoadingPeriod && 'opacity-50 pointer-events-none');

    const report = data?.data;
    const metricRows: MetricRow[] = useMemo(() => report?.metric_rows ?? [], [report]);
    const weeklyData = useMemo(() => report?.monthly_report?.weekly_breakdown ?? [], [report]);
    const monthTotals = useMemo(() => report?.monthly_report?.totals ?? {}, [report]);
    const annualMonths = useMemo(() => report?.annual_report?.monthly_breakdown ?? [], [report]);
    const annualTotals = useMemo(() => report?.annual_report?.totals ?? {}, [report]);
    const display = report?.display ?? null;
    const reportTitle: string = report?.title ?? title;
    const periodLabel = format(period, 'MMMM yyyy');

    const weekLabels = useMemo(
        () => weeklyData.map((week) => {
            const day = parseLocalDate(week.week_ending);
            return day ? format(day, 'MMM dd') : '-';
        }),
        [weeklyData],
    );
    const monthLabels = useMemo(() => annualMonths.map((row) => row.month.slice(0, 3).toUpperCase()), [annualMonths]);

    // Weekly breakdown for the month, and the same rows month by month for the year.
    // TOTAL columns are the backend's period totals (ratios recalculated from the sums, as in the PDF).
    const weeklyPivot = usePivotTable(metricRows, weekLabels, weeklyData, monthTotals);
    const annualPivot = usePivotTable(metricRows, monthLabels, annualMonths, annualTotals);

    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        try {
            await downloadPdf(`${apiPath}/pdf`, queryParams, `${filePrefix}-${format(period, 'yyyy-MM')}.pdf`);
            toast.success('PDF downloaded');
        } catch (error: unknown) {
            toast.error(`Could not export the PDF: ${errorMessage(error) || 'please try again.'}`);
        } finally {
            setIsExportingPdf(false);
        }
    };

    if (isLoading) return <div className="p-5 text-[#7c8689] dark:text-muted-foreground">Loading {title.toLowerCase()}...</div>;
    if (isError) return <div className="p-5 text-red-500">Error loading report.</div>;

    return (
        <div className="flex flex-col gap-5 p-5" aria-busy={isLoadingPeriod}>
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-semibold text-[#4b545d] dark:text-foreground">{reportTitle}</h1>
                    {isLoadingPeriod && (
                        <span role="status" className="flex items-center gap-1.5 text-sm text-[#7c8689] dark:text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading {periodLabel}…
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                        <SelectTrigger className="w-[140px] h-[34px]" aria-label="Month">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((name, index) => (
                                <SelectItem key={name} value={String(index + 1)}>
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                        <SelectTrigger className="w-[100px] h-[34px]" aria-label="Year">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {reportYears(now.getFullYear(), year).map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {!isCurrentMonth && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setMonth(now.getMonth() + 1);
                                setYear(now.getFullYear());
                            }}
                        >
                            This month
                        </Button>
                    )}
                    <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(weeklyPivot.table, `${filePrefix}-${periodLabel}`)} disabled={isLoadingPeriod}>
                        Export CSV
                    </Button>
                    <Button variant="outline" className="h-[34px]" onClick={handleExportPdf} disabled={isExportingPdf}>
                        {isExportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        {isExportingPdf ? 'Exporting…' : 'Export PDF'}
                    </Button>
                    <BackButton />
                </div>
            </div>

            {display && (
                <div className={cn('grid grid-cols-2 md:grid-cols-3 gap-4', staleClass)}>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] dark:border-border rounded-[12px] bg-white dark:bg-card">
                        <p className="text-xs text-[#7c8689] dark:text-muted-foreground font-medium uppercase tracking-wider">Total Employees</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d] dark:text-foreground">{display.total_employee ?? '-'}</p>
                    </Card>
                    {display.default_overhead_per_week != null && (
                        <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] dark:border-border rounded-[12px] bg-white dark:bg-card">
                            <p className="text-xs text-[#7c8689] dark:text-muted-foreground font-medium uppercase tracking-wider">Overhead / Week</p>
                            <p className="text-2xl font-semibold mt-2 text-[#4b545d] dark:text-foreground">{formatCurrency(display.default_overhead_per_week)}</p>
                            {display.overhead_source && (
                                <p className="text-xs text-[#7c8689] dark:text-muted-foreground mt-1">{OVERHEAD_SOURCE_LABELS[display.overhead_source] ?? display.overhead_source}</p>
                            )}
                        </Card>
                    )}
                </div>
            )}

            <PivotTableCard title={`Weekly Breakdown – ${periodLabel}`} pivot={weeklyPivot} className={staleClass} />

            <PivotTableCard
                title={`Annual Monthly Summary – ${year}`}
                pivot={annualPivot}
                className={staleClass}
                toolbar={
                    <Button variant="outline" size="sm" onClick={() => exportTableToCSV(annualPivot.table, `${filePrefix}-annual-${year}`)} disabled={isLoadingPeriod}>
                        Export CSV
                    </Button>
                }
            />
        </div>
    );
}
