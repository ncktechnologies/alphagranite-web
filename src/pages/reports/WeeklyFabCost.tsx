// pages/reports/WeeklyFabCost.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetWeeklyFabricationLaborCostQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { cn } from '@/lib/utils';

const $ = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const num = (v: number, d = 2) => v.toFixed(d);
const pct = (v: number) => num(v, 2) + '%';

// ─── Pivot transformation ───────────────────────────────────────────────────
const pivotWeeklyData = (weeklyData: any[]) => {
    if (!weeklyData.length) return { rows: [], weeks: [] };
    const weeks = weeklyData.map(w => format(new Date(w.week_ending), 'MMM dd'));
    const sample = weeklyData[0];
    // All numeric keys except week_ending
    const metricKeys = Object.keys(sample).filter(
        key => key !== 'week_ending' && typeof sample[key] === 'number'
    );
    // Metrics that should be averaged rather than summed for the total
    const avgMetrics = new Set([
        'average_sqft_per_day',
        'average_revenue_per_day',
        'cost_of_overtime_pct',
        'overtime_hours_pct',
        'shop_labor_per_hour',
        'shop_overhead_per_hour',
        'shop_labor_overhead_per_hour',
        'manpower_cost_per_hour',
        'sqft_per_labor_hour',
        'shop_productivity_sqft_per_hour',
        'labor_cost_per_sq_ft',
        'labor_cost_pct_per_dollar_sold',
        'shop_overhead_cost_per_sqft',
        'shop_total_cost_per_sqft',
        'gross_profit_per_sf_completed',
        'gross_profit_less_shop_total_cost_psf',
        'gross_revenue_per_sqft_fabricated',
        'total_head_count_inc_yard',
    ]);

    const rows = metricKeys.map(key => {
        const row: any = { metric: key };
        let sum = 0;
        weeklyData.forEach((w, idx) => {
            const val = w[key];
            row[`week_${idx}`] = val;
            if (typeof val === 'number') sum += val;
        });
        // Decide total: average for rates/percentages, sum for others
        if (avgMetrics.has(key)) {
            row.total = sum / weeklyData.length;
        } else {
            row.total = sum;
        }
        return row;
    });
    return { rows, weeks };
};

export function WeeklyFabricationCostReport() {
    // ─── Date filter ──────────────────────────────────────────────────────────
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sorting, setSorting] = useState<SortingState>([]);

   const queryParams = useMemo(() => {
    const params: any = {};
    if (dateRange?.from) {
        params.start_date = format(dateRange.from, 'yyyy-MM-dd');
        params.end_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        // Extract year and month from the selected start date
        params.year = dateRange.from.getFullYear();
        params.month = dateRange.from.getMonth() + 1;
    } else {
        const now = new Date();
        params.year = now.getFullYear();
        params.month = now.getMonth() + 1;
    }
    return params;
}, [dateRange]);

    const { data, isLoading, isError } = useGetWeeklyFabricationLaborCostQuery(queryParams);

    const display = data?.data?.display;
    const weeklyData: any[] = useMemo(() => data?.data?.monthly_report?.weekly_breakdown ?? [], [data]);
    const totals = useMemo(() => data?.data?.monthly_report?.totals ?? null, [data]);
    const annualSummary: any[] = useMemo(() => data?.data?.annual_monthly_summary ?? [], [data]);

    // ─── Pivot the weekly data ───────────────────────────────────────────────
    const { rows: pivotedRows, weeks } = useMemo(() => pivotWeeklyData(weeklyData), [weeklyData]);

    // ─── Dynamic columns for pivoted table ──────────────────────────────────
    const pivotedColumns = useMemo<ColumnDef<any>[]>(() => {
        const cols: ColumnDef<any>[] = [
            {
                id: 'metric',
                accessorKey: 'metric',
                header: ({ column }) => <DataGridColumnHeader title="METRIC" column={column} />,
                cell: ({ row }) => {
                    const key = row.original.metric;
                    const labels: Record<string, string> = {
                        number_of_days: 'Number of Days',
                        cut_sqft_saw: 'Cut Sq. Ft (saw)',
                        wj_sqft: 'WJ Sq. Ft.',
                        completed_sqft: 'Completed Sq. Ft',
                        average_sqft_per_day: 'Average Sq. Ft. per Day',
                        gross_revenue: 'Gross Revenue',
                        gross_profit: 'Gross Profit',
                        average_revenue_per_day: 'Average Revenue per Day',
                        total_head_count_inc_yard: 'Total Head Count (Inc yard)',
                        wages_basic_shop_yard: 'Wages Basic Shop & Yard',
                        overtime_shop_yard: 'Overtime Shop & Yard',
                        cost_of_overtime_pct: 'Cost Of Overtime as a % of Basic Wages',
                        total_labor_cost: 'Total Labor Cost',
                        regular_hours: 'Regular Hours',
                        overtime_hours: 'Overtime Hours',
                        overtime_hours_pct: 'Overtime Hours as % of Total Hours',
                        total_hours: 'Total Hours',
                        shop_labor_per_hour: 'Shop Labor Per hour',
                        shop_overhead_per_hour: 'Shop Overhead per hour',
                        shop_labor_overhead_per_hour: 'Shop labor & overhead per hour',
                        manpower_cost_per_hour: 'Manpower cost per hour',
                        sqft_per_labor_hour: 'Sq. Ft. Per Labor Hour',
                        shop_productivity_sqft_per_hour: 'Shop Productivity - Sq. Ft per Hour',
                        labor_cost_per_sq_ft: 'Labor Cost Per sq. Ft.',
                        labor_cost_pct_per_dollar_sold: 'Labor Cost as % per Dollar Sold',
                        shop_overhead_cost_per_sqft: 'Shop overhead cost per sq.ft fabricated',
                        shop_total_cost_per_sqft: 'Shop total cost per sq.ft fabricated',
                        gross_profit_per_sf_completed: 'Gross Profit per s.f. completed',
                        gross_profit_less_shop_total_cost_psf: 'Gross Profit less Shop total cost psf',
                        gross_revenue_per_sqft_fabricated: 'Gross Revenue per sq.ft fabricated',
                    };
                    return <span className="text-sm font-medium">{labels[key] || key.replace(/_/g, ' ').toUpperCase()}</span>;
                },
                size: 250,
                enableSorting: true,
            },
        ];

        // Add week columns
        weeks.forEach((weekLabel, idx) => {
            cols.push({
                id: `week_${idx}`,
                accessorKey: `week_${idx}`,
                header: ({ column }) => <DataGridColumnHeader title={weekLabel} column={column} />,
                cell: ({ row }) => {
                    const val = row.original[`week_${idx}`];
                    if (val === undefined || val === null) return <span className="text-sm">-</span>;
                    const key = row.original.metric;
                    if (['gross_revenue', 'gross_profit', 'average_revenue_per_day', 'total_labor_cost',
                        'wages_basic_shop_yard', 'overtime_shop_yard', 'shop_labor_per_hour',
                        'shop_overhead_per_hour', 'shop_labor_overhead_per_hour', 'manpower_cost_per_hour',
                        'labor_cost_per_sq_ft', 'shop_overhead_cost_per_sqft', 'shop_total_cost_per_sqft',
                        'gross_profit_per_sf_completed', 'gross_profit_less_shop_total_cost_psf',
                        'gross_revenue_per_sqft_fabricated'].includes(key)) {
                        return <span className="text-sm">{$(val)}</span>;
                    }
                    if (['cost_of_overtime_pct', 'overtime_hours_pct', 'labor_cost_pct_per_dollar_sold'].includes(key)) {
                        return <span className="text-sm">{pct(val)}</span>;
                    }
                    if (['total_head_count_inc_yard'].includes(key)) {
                        return <span className="text-sm">{num(val, 1)}</span>;
                    }
                    return <span className="text-sm">{num(val)}</span>;
                },
                size: 120,
                enableSorting: true,
            });
        });

        // Total column
        cols.push({
            id: 'total',
            accessorKey: 'total',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL" column={column} />,
            cell: ({ row }) => {
                const val = row.original.total;
                if (val === undefined || val === null) return <span className="text-sm">-</span>;
                const key = row.original.metric;
                if (['gross_revenue', 'gross_profit', 'average_revenue_per_day', 'total_labor_cost',
                    'wages_basic_shop_yard', 'overtime_shop_yard', 'shop_labor_per_hour',
                    'shop_overhead_per_hour', 'shop_labor_overhead_per_hour', 'manpower_cost_per_hour',
                    'labor_cost_per_sq_ft', 'shop_overhead_cost_per_sqft', 'shop_total_cost_per_sqft',
                    'gross_profit_per_sf_completed', 'gross_profit_less_shop_total_cost_psf',
                    'gross_revenue_per_sqft_fabricated'].includes(key)) {
                    return <span className="text-sm font-semibold">{$(val)}</span>;
                }
                if (['cost_of_overtime_pct', 'overtime_hours_pct', 'labor_cost_pct_per_dollar_sold'].includes(key)) {
                    return <span className="text-sm font-semibold">{pct(val)}</span>;
                }
                if (['total_head_count_inc_yard'].includes(key)) {
                    return <span className="text-sm font-semibold">{num(val, 1)}</span>;
                }
                return <span className="text-sm font-semibold">{num(val)}</span>;
            },
            size: 140,
            enableSorting: true,
        });

        return cols;
    }, [weeks]);

    const pivotedTable = useReactTable({
        columns: pivotedColumns,
        data: pivotedRows,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
        meta: {
            getRowAttributes: (row) => {
                // Highlight the total row (the "Metric" row is just a normal row; we want to highlight the "Month Total" row, but we have a separate totals row later)
                // We'll keep it simple: no special row, as we have a footer totals row in the table (the old totals row is not used now; we removed it).
                return {};
            },
        },
    });

    // ─── Annual Summary Table (unchanged, keep original) ────────────────────
    const annualColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'month', header: ({ column }) => <DataGridColumnHeader title="Month" column={column} />, size: 120, enableSorting: true },
        { accessorKey: 'number_of_weeks', header: ({ column }) => <DataGridColumnHeader title="Weeks" column={column} />, size: 80, enableSorting: true },
        { accessorKey: 'completed_sqft', header: ({ column }) => <DataGridColumnHeader title="Completed Sqft" column={column} />, cell: ({ row }) => num(row.original.completed_sqft), size: 130, enableSorting: true },
        { accessorKey: 'gross_revenue', header: ({ column }) => <DataGridColumnHeader title="Gross Revenue" column={column} />, cell: ({ row }) => $(row.original.gross_revenue), size: 130, enableSorting: true },
        { accessorKey: 'gross_profit', header: ({ column }) => <DataGridColumnHeader title="Gross Profit" column={column} />, cell: ({ row }) => $(row.original.gross_profit), size: 120, enableSorting: true },
        { accessorKey: 'total_labor_cost', header: ({ column }) => <DataGridColumnHeader title="Labor Cost" column={column} />, cell: ({ row }) => $(row.original.total_labor_cost), size: 120, enableSorting: true },
        { accessorKey: 'total_hours', header: ({ column }) => <DataGridColumnHeader title="Total Hours" column={column} />, cell: ({ row }) => num(row.original.total_hours), size: 110, enableSorting: true },
        { accessorKey: 'gross_profit_less_shop_total_cost_psf', header: ({ column }) => <DataGridColumnHeader title="GP less total cost $/Sqft" column={column} />, cell: ({ row }) => $(row.original.gross_profit_less_shop_total_cost_psf), size: 170, enableSorting: true },
    ], []);

    const [annualPagination, setAnnualPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [annualSorting, setAnnualSorting] = useState<SortingState>([]);
    const annualTable = useReactTable({
        columns: annualColumns,
        data: annualSummary,
        state: { pagination: annualPagination, sorting: annualSorting },
        onPaginationChange: setAnnualPagination,
        onSortingChange: setAnnualSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const getTitle = () => {
        if (dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        const now = new Date();
        return `${format(now, 'MMMM yyyy')}`;
    };

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading fabrication cost report...</div>;
    if (isError) return <div className="p-5 text-red-500">Error loading report.</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Weekly Fabrication Labor Cost</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-[260px] justify-start text-left font-normal h-[34px]', !dateRange && 'text-muted-foreground')}>
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : format(dateRange.from, 'MMM dd, yyyy')) : 'Filter by Date Range'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="range" month={month} onMonthChange={setMonth} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                            <div className="flex justify-end gap-2 p-3 border-t">
                                <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); setIsDatePickerOpen(false); }}>Reset</Button>
                                <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    {dateRange && <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>Clear</Button>}
                    <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(pivotedTable, `fabrication-cost-${getTitle()}`)}>
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Summary Widgets */}
            {display && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total Employee</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{display.total_employee}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Overhead Per Week</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${display.default_overhead_per_week?.toLocaleString()}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Period</p>
                        <p className="text-lg font-semibold mt-2 text-[#4b545d]">
                            {data?.data?.period?.start_date} – {data?.data?.period?.end_date}
                        </p>
                    </Card>
                    {totals && (
                        <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                            <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total Completed Sqft</p>
                            <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{num(totals.completed_sqft)}</p>
                        </Card>
                    )}
                </div>
            )}

            {/* Pivoted Weekly Breakdown Table */}
            <DataGrid table={pivotedTable} recordCount={pivotedRows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <CardTitle className="text-base font-semibold text-[#4b545d]">Weekly Breakdown – {getTitle()}</CardTitle>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {pivotedTable.getHeaderGroups().map(headerGroup => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map(header => (
                                                    <th
                                                        key={header.id}
                                                        className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50"
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
                                        {pivotedTable.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                                                {row.getVisibleCells().map(cell => (
                                                    <td
                                                        key={cell.id}
                                                        className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0"
                                                        style={{ width: cell.column.getSize() }}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {pivotedRows.length === 0 && (
                                            <tr>
                                                <td colSpan={pivotedColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
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
                    <CardFooter className="bg-white border-t border-[#e2e4ed] px-4 py-2">
                        <DataGridPagination />
                    </CardFooter>
                </Card>
            </DataGrid>

            {/* Annual Monthly Summary Table */}
            {annualSummary.length > 0 && (
                <DataGrid table={annualTable} recordCount={annualSummary.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                    <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                        <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                            <CardTitle className="text-base font-semibold text-[#4b545d]">Annual Monthly Summary – {new Date().getFullYear()}</CardTitle>
                            <CardToolbar />
                        </CardHeader>
                        <CardTable>
                            <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                                <div className="relative">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead className="sticky top-0 z-10 bg-white">
                                            {annualTable.getHeaderGroups().map(headerGroup => (
                                                <tr key={headerGroup.id}>
                                                    {headerGroup.headers.map(header => (
                                                        <th
                                                            key={header.id}
                                                            className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50"
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
                                            {annualTable.getRowModel().rows.map(row => (
                                                <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                                                    {row.getVisibleCells().map(cell => (
                                                        <td
                                                            key={cell.id}
                                                            className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0"
                                                            style={{ width: cell.column.getSize() }}
                                                        >
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {annualSummary.length === 0 && (
                                                <tr>
                                                    <td colSpan={annualColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">No annual summary data.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
                            </ScrollArea>
                        </CardTable>
                        <CardFooter className="bg-white border-t border-[#e2e4ed] px-4 py-2">
                            <DataGridPagination />
                        </CardFooter>
                    </Card>
                </DataGrid>
            )}
        </div>
    );
}