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

export function WeeklyFabricationCostReport() {
    // Date state – support either date range or year/month
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sorting, setSorting] = useState<SortingState>([]);

    // Build query params: if dateRange is set, use start_date/end_date; else use current year/month
    const queryParams = useMemo(() => {
        if (dateRange?.from) {
            return {
                start_date: format(dateRange.from, 'yyyy-MM-dd'),
                end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
            };
        }
        const now = new Date();
        return {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
        };
    }, [dateRange]);

    const { data, isLoading, isError } = useGetWeeklyFabricationLaborCostQuery(queryParams);

    const display = data?.data?.display;
    const weeklyData: any[] = useMemo(() => data?.data?.monthly_report?.weekly_breakdown ?? [], [data]);
    const totals = useMemo(() => data?.data?.monthly_report?.totals ?? null, [data]);
    const annualSummary: any[] = useMemo(() => data?.data?.annual_monthly_summary ?? [], [data]);

    // Weekly columns (all available)
    const weeklyColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'week_ending', header: ({ column }) => <DataGridColumnHeader title="Week Ending" column={column} />, cell: ({ row }) => format(new Date(row.original.week_ending), 'MMM dd, yyyy'), size: 120, enableSorting: true },
        { accessorKey: 'number_of_days', header: ({ column }) => <DataGridColumnHeader title="Days" column={column} />, size: 70, enableSorting: true },
        { accessorKey: 'cut_sqft_saw', header: ({ column }) => <DataGridColumnHeader title="Cut Sqft (Saw)" column={column} />, cell: ({ row }) => num(row.original.cut_sqft_saw), size: 120, enableSorting: true },
        { accessorKey: 'wj_sqft', header: ({ column }) => <DataGridColumnHeader title="WJ Sqft" column={column} />, cell: ({ row }) => num(row.original.wj_sqft), size: 90, enableSorting: true },
        { accessorKey: 'completed_sqft', header: ({ column }) => <DataGridColumnHeader title="Completed Sqft" column={column} />, cell: ({ row }) => num(row.original.completed_sqft), size: 120, enableSorting: true },
        { accessorKey: 'average_sqft_per_day', header: ({ column }) => <DataGridColumnHeader title="Avg Sqft/Day" column={column} />, cell: ({ row }) => num(row.original.average_sqft_per_day), size: 110, enableSorting: true },
        { accessorKey: 'gross_revenue', header: ({ column }) => <DataGridColumnHeader title="Gross Revenue" column={column} />, cell: ({ row }) => $(row.original.gross_revenue), size: 130, enableSorting: true },
        { accessorKey: 'gross_profit', header: ({ column }) => <DataGridColumnHeader title="Gross Profit" column={column} />, cell: ({ row }) => $(row.original.gross_profit), size: 120, enableSorting: true },
        { accessorKey: 'average_revenue_per_day', header: ({ column }) => <DataGridColumnHeader title="Avg Revenue/Day" column={column} />, cell: ({ row }) => $(row.original.average_revenue_per_day), size: 130, enableSorting: true },
        { accessorKey: 'total_head_count_inc_yard', header: ({ column }) => <DataGridColumnHeader title="Head Count" column={column} />, size: 100, enableSorting: true },
        { accessorKey: 'wages_basic_shop_yard', header: ({ column }) => <DataGridColumnHeader title="Wages Basic" column={column} />, cell: ({ row }) => $(row.original.wages_basic_shop_yard), size: 120, enableSorting: true },
        { accessorKey: 'overtime_shop_yard', header: ({ column }) => <DataGridColumnHeader title="Overtime" column={column} />, cell: ({ row }) => $(row.original.overtime_shop_yard), size: 100, enableSorting: true },
        { accessorKey: 'cost_of_overtime_pct', header: ({ column }) => <DataGridColumnHeader title="Overtime %" column={column} />, cell: ({ row }) => num(row.original.cost_of_overtime_pct, 2) + '%', size: 100, enableSorting: true },
        { accessorKey: 'total_labor_cost', header: ({ column }) => <DataGridColumnHeader title="Total Labor Cost" column={column} />, cell: ({ row }) => $(row.original.total_labor_cost), size: 130, enableSorting: true },
        { accessorKey: 'regular_hours', header: ({ column }) => <DataGridColumnHeader title="Regular Hours" column={column} />, cell: ({ row }) => num(row.original.regular_hours), size: 110, enableSorting: true },
        { accessorKey: 'overtime_hours', header: ({ column }) => <DataGridColumnHeader title="Overtime Hours" column={column} />, cell: ({ row }) => num(row.original.overtime_hours), size: 110, enableSorting: true },
        { accessorKey: 'overtime_hours_pct', header: ({ column }) => <DataGridColumnHeader title="Overtime Hrs %" column={column} />, cell: ({ row }) => num(row.original.overtime_hours_pct, 2) + '%', size: 120, enableSorting: true },
        { accessorKey: 'total_hours', header: ({ column }) => <DataGridColumnHeader title="Total Hours" column={column} />, cell: ({ row }) => num(row.original.total_hours), size: 110, enableSorting: true },
        { accessorKey: 'shop_labor_per_hour', header: ({ column }) => <DataGridColumnHeader title="Labor $/Hour" column={column} />, cell: ({ row }) => $(row.original.shop_labor_per_hour), size: 120, enableSorting: true },
        { accessorKey: 'shop_overhead_per_hour', header: ({ column }) => <DataGridColumnHeader title="Overhead $/Hour" column={column} />, cell: ({ row }) => $(row.original.shop_overhead_per_hour), size: 140, enableSorting: true },
        { accessorKey: 'shop_labor_overhead_per_hour', header: ({ column }) => <DataGridColumnHeader title="Labor+Overhead $/Hour" column={column} />, cell: ({ row }) => $(row.original.shop_labor_overhead_per_hour), size: 160, enableSorting: true },
        { accessorKey: 'manpower_cost_per_hour', header: ({ column }) => <DataGridColumnHeader title="Cost per Installer/Hour" column={column} />, cell: ({ row }) => $(row.original.manpower_cost_per_hour), size: 150, enableSorting: true },
        { accessorKey: 'sqft_per_labor_hour', header: ({ column }) => <DataGridColumnHeader title="Sqft per Labor Hour" column={column} />, cell: ({ row }) => num(row.original.sqft_per_labor_hour, 2), size: 140, enableSorting: true },
        { accessorKey: 'shop_productivity_sqft_per_hour', header: ({ column }) => <DataGridColumnHeader title="Productivity Sqft/Hour" column={column} />, cell: ({ row }) => num(row.original.shop_productivity_sqft_per_hour, 2), size: 150, enableSorting: true },
        { accessorKey: 'labor_cost_per_sq_ft', header: ({ column }) => <DataGridColumnHeader title="Labor $/Sqft" column={column} />, cell: ({ row }) => $(row.original.labor_cost_per_sq_ft), size: 120, enableSorting: true },
        { accessorKey: 'labor_cost_pct_per_dollar_sold', header: ({ column }) => <DataGridColumnHeader title="Labor % of Revenue" column={column} />, cell: ({ row }) => num(row.original.labor_cost_pct_per_dollar_sold, 2) + '%', size: 140, enableSorting: true },
        { accessorKey: 'shop_overhead_cost_per_sqft', header: ({ column }) => <DataGridColumnHeader title="Overhead $/Sqft" column={column} />, cell: ({ row }) => $(row.original.shop_overhead_cost_per_sqft), size: 130, enableSorting: true },
        { accessorKey: 'shop_total_cost_per_sqft', header: ({ column }) => <DataGridColumnHeader title="Total Cost $/Sqft" column={column} />, cell: ({ row }) => $(row.original.shop_total_cost_per_sqft), size: 130, enableSorting: true },
        { accessorKey: 'gross_profit_per_sf_completed', header: ({ column }) => <DataGridColumnHeader title="GP $/Sqft" column={column} />, cell: ({ row }) => $(row.original.gross_profit_per_sf_completed), size: 110, enableSorting: true },
        { accessorKey: 'gross_profit_less_shop_total_cost_psf', header: ({ column }) => <DataGridColumnHeader title="GP less total cost $/Sqft" column={column} />, cell: ({ row }) => $(row.original.gross_profit_less_shop_total_cost_psf), size: 170, enableSorting: true },
        { accessorKey: 'gross_revenue_per_sqft_fabricated', header: ({ column }) => <DataGridColumnHeader title="Revenue $/Sqft" column={column} />, cell: ({ row }) => $(row.original.gross_revenue_per_sqft_fabricated), size: 130, enableSorting: true },
    ], []);

    // Annual Monthly Summary columns
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

    // Weekly table
    const weeklyTable = useReactTable({
        columns: weeklyColumns,
        data: weeklyData,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    // Annual table (separate pagination)
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

    // Build title from date range or fallback
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
            {/* Header with filters */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Weekly Fabrication Labor Cost</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Date range picker */}
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

                    <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(weeklyTable, `fabrication-cost-${getTitle()}`)}>
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

            {/* Weekly Breakdown Table */}
            <DataGrid table={weeklyTable} recordCount={weeklyData.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <CardTitle className="text-base font-semibold text-[#4b545d]">Weekly Breakdown – {getTitle()}</CardTitle>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4 ">

                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {weeklyTable.getHeaderGroups().map(headerGroup => (
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
                                        {/* Totals row */}
                                        {totals && (
                                            <tr className="bg-[#f0f7e0] font-semibold border-b border-[#e2e4ed]">
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">MONTH TOTAL</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{totals.number_of_days}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.cut_sqft_saw)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.wj_sqft)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.completed_sqft)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.average_sqft_per_day)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_revenue)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_profit)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.average_revenue_per_day)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{totals.total_head_count_inc_yard}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.wages_basic_shop_yard)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.overtime_shop_yard)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.cost_of_overtime_pct, 2)}%</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.total_labor_cost)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.regular_hours)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.overtime_hours)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.overtime_hours_pct, 2)}%</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.total_hours)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.shop_labor_per_hour)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.shop_overhead_per_hour)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.shop_labor_overhead_per_hour)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.manpower_cost_per_hour)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.sqft_per_labor_hour, 2)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.shop_productivity_sqft_per_hour, 2)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.labor_cost_per_sq_ft)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.labor_cost_pct_per_dollar_sold, 2)}%</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.shop_overhead_cost_per_sqft)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.shop_total_cost_per_sqft)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_profit_per_sf_completed)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_profit_less_shop_total_cost_psf)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_revenue_per_sqft_fabricated)}</td>
                                            </tr>
                                        )}
                                        {/* Data rows */}
                                        {weeklyTable.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0" style={{ width: cell.column.getSize() }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {weeklyData.length === 0 && (
                                            <tr>
                                                <td colSpan={weeklyColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">No data available.</td>
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
                            <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4 ">
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
                                                        <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0" style={{ width: cell.column.getSize() }}>
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