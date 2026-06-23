// pages/reports/WeeklyInstallerCost.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { useGetWeeklyInstallerLaborCostQuery } from '@/store/api/report';
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
import { BackButton } from '@/components/common/BackButton';

const $ = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const num = (v: number, d = 2) => v.toFixed(d);
const pct = (v: number) => num(v, 2) + '%';

const pivotWeeklyData = (weeklyData: any[]) => {
    if (!weeklyData.length) return { rows: [], weeks: [] };
    const weeks = weeklyData.map(w => format(new Date(w.week_ending), 'MMM dd'));
    const sample = weeklyData[0];
    const metricKeys = Object.keys(sample).filter(
        key => key !== 'week_ending' && typeof sample[key] === 'number'
    );
    const avgMetrics = new Set([
        'average_sqft_per_day',
        'labor_cost_per_sq_ft',
        'labor_cost_pct_per_dollar_sold',
        'gross_revenue_per_sq_ft',
        'overhead_cost_per_sqft',
        'cost_to_install_per_sqft',
        'gross_profit_less_installer_total_cost_psf',
        'gross_profit_per_sf_installed',
        'installer_productivity_sqft_per_hour',
        'sqft_per_labor_hour',
        'hourly_labor_cost_for_all_installers',
        'hourly_overhead_cost_for_all_installers',
        'hourly_cost_of_all_installers_inc_overhead',
        'hourly_cost_per_installer_inc_overhead',
        'total_head_count',
        'average_revenue_per_day',
    ]);

    const rows = metricKeys.map(key => {
        const row: any = { metric: key };
        let sum = 0;
        weeklyData.forEach((w, idx) => {
            const val = w[key];
            row[`week_${idx}`] = val;
            if (typeof val === 'number') sum += val;
        });
        if (avgMetrics.has(key)) {
            row.total = sum / weeklyData.length;
        } else {
            row.total = sum;
        }
        return row;
    });
    return { rows, weeks };
};

export function WeeklyInstallerCostReport() {
    // ─── Month/Year filter ────────────────────────────────────────────────
    const now = new Date();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(now.getFullYear(), now.getMonth(), 1));
    const [tempDate, setTempDate] = useState<Date | undefined>(selectedDate);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState<Date>(selectedDate || now);

    // ─── Pagination & sorting ──────────────────────────────────────────────
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 100 });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [annualPagination, setAnnualPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 100 });
    const [annualSorting, setAnnualSorting] = useState<SortingState>([]);

    // ─── Build query params ────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        const params: any = {};
        if (selectedDate) {
            params.year = selectedDate.getFullYear();
            params.month = selectedDate.getMonth() + 1;
            const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
            params.start_date = format(start, 'yyyy-MM-dd');
            params.end_date = format(end, 'yyyy-MM-dd');
        } else {
            const now = new Date();
            params.year = now.getFullYear();
            params.month = now.getMonth() + 1;
        }
        return params;
    }, [selectedDate]);

    const { data, isLoading, isError } = useGetWeeklyInstallerLaborCostQuery(queryParams);

    const weeklyData: any[] = useMemo(() => data?.data?.monthly_report?.weekly_breakdown ?? [], [data]);
    const totals = useMemo(() => data?.data?.monthly_report?.totals ?? null, [data]);
    const annualData: any[] = useMemo(() => data?.data?.annual_monthly_summary ?? [], [data]);
    const display = useMemo(() => data?.data?.display ?? null, [data]);

    const { rows: pivotedRows, weeks } = useMemo(() => pivotWeeklyData(weeklyData), [weeklyData]);

    const pivotedColumns = useMemo<ColumnDef<any>[]>(() => {
        const cols: ColumnDef<any>[] = [
            {
                id: 'metric',
                accessorKey: 'metric',
                header: ({ column }) => <DataGridColumnHeader title="METRIC" column={column} />,
                cell: ({ row }) => {
                    const key = row.original.metric;
                    const labels: Record<string, string> = {
                        number_of_days_per_week: 'Number of Days Per Week',
                        install_sqft_per_week: 'Install Sq. Ft per week',
                        completed_sqft_per_week: 'Completed Sq. Ft per week',
                        average_sqft_per_day: 'Average Sq. Ft. per Day',
                        gross_revenue: 'Gross Revenue',
                        gross_profit: 'Gross Profit',
                        average_revenue_per_day: 'Ave Revenue per Day',
                        total_head_count: 'Total Head Count',
                        wages_basic_installer: 'Wages Basic Installer',
                        overtime_installer: 'Overtime Installer',
                        cost_of_overtime_pct: '% Overtime',
                        total_labor_cost: 'Total Labor Cost',
                        regular_hours: 'Regular Hours',
                        overtime_hours: 'Overtime Hours',
                        overtime_hours_pct: '% Overtime Of Total Hours',
                        total_hours: 'Total Hours',
                        hourly_labor_cost_for_all_installers: 'Hourly Labor Cost for All Installers',
                        hourly_overhead_cost_for_all_installers: 'Hourly Overhead Cost for All Installers',
                        hourly_cost_of_all_installers_inc_overhead: 'Hourly Cost Of all Installers inc Overhead',
                        hourly_cost_per_installer_inc_overhead: 'Hourly Cost Per Installer inc Overhead',
                        sqft_per_labor_hour: 'Sq. Ft. Per Labor Hour',
                        installer_productivity_sqft_per_hour: 'Installer Productivity Sq.Ft per Hour',
                        labor_cost_per_sq_ft: 'Labor Cost Per sq Ft.',
                        labor_cost_pct_per_dollar_sold: 'Labor Cost as % per Dollar Sold',
                        overhead_cost_per_sqft: 'Overhead cost per sq.ft installed',
                        cost_to_install_per_sqft: 'Cost To Install Per Sq. ft.',
                        gross_profit_per_sf_installed: 'Gross Profit per s.f. Installed',
                        gross_profit_less_installer_total_cost_psf: 'Gross Profit less Installer total cost psf',
                        gross_revenue_per_sq_ft: 'Gross Revenue Per Sq. ft',
                    };
                    return <span className="text-sm font-medium">{labels[key] || key.replace(/_/g, ' ').toUpperCase()}</span>;
                },
                size: 280,
                enableSorting: true,
            },
        ];

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
                        'wages_basic_installer', 'overtime_installer', 'hourly_labor_cost_for_all_installers',
                        'hourly_overhead_cost_for_all_installers', 'hourly_cost_of_all_installers_inc_overhead',
                        'hourly_cost_per_installer_inc_overhead', 'labor_cost_per_sq_ft', 'overhead_cost_per_sqft',
                        'cost_to_install_per_sqft', 'gross_profit_per_sf_installed',
                        'gross_profit_less_installer_total_cost_psf', 'gross_revenue_per_sq_ft'].includes(key)) {
                        return <span className="text-sm">{$(val)}</span>;
                    }
                    if (['cost_of_overtime_pct', 'overtime_hours_pct', 'labor_cost_pct_per_dollar_sold'].includes(key)) {
                        return <span className="text-sm">{pct(val)}</span>;
                    }
                    if (['total_head_count'].includes(key)) {
                        return <span className="text-sm">{num(val, 1)}</span>;
                    }
                    return <span className="text-sm">{num(val)}</span>;
                },
                size: 120,
                enableSorting: true,
            });
        });

        cols.push({
            id: 'total',
            accessorKey: 'total',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL" column={column} />,
            cell: ({ row }) => {
                const val = row.original.total;
                if (val === undefined || val === null) return <span className="text-sm">-</span>;
                const key = row.original.metric;
                if (['gross_revenue', 'gross_profit', 'average_revenue_per_day', 'total_labor_cost',
                    'wages_basic_installer', 'overtime_installer', 'hourly_labor_cost_for_all_installers',
                    'hourly_overhead_cost_for_all_installers', 'hourly_cost_of_all_installers_inc_overhead',
                    'hourly_cost_per_installer_inc_overhead', 'labor_cost_per_sq_ft', 'overhead_cost_per_sqft',
                    'cost_to_install_per_sqft', 'gross_profit_per_sf_installed',
                    'gross_profit_less_installer_total_cost_psf', 'gross_revenue_per_sq_ft'].includes(key)) {
                    return <span className="text-sm font-semibold">{$(val)}</span>;
                }
                if (['cost_of_overtime_pct', 'overtime_hours_pct', 'labor_cost_pct_per_dollar_sold'].includes(key)) {
                    return <span className="text-sm font-semibold">{pct(val)}</span>;
                }
                if (['total_head_count'].includes(key)) {
                    return <span className="text-sm font-semibold">{num(val, 1)}</span>;
                }
                return <span className="text-sm font-semibold">{num(val)}</span>;
            },
            size: 160,
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
    });

    const annualColumns = useMemo<ColumnDef<any>[]>(() => [
        { accessorKey: 'month', header: ({ column }) => <DataGridColumnHeader title="MONTH" column={column} />, cell: ({ row }) => <span className="font-medium">{row.original.month}</span>, size: 120, enableSorting: true },
        { accessorKey: 'number_of_weeks', header: ({ column }) => <DataGridColumnHeader title="WEEKS" column={column} />, size: 80, enableSorting: true },
        { accessorKey: 'completed_sqft', header: ({ column }) => <DataGridColumnHeader title="SQFT" column={column} />, cell: ({ row }) => num(row.original.completed_sqft), size: 100, enableSorting: true },
        { accessorKey: 'gross_revenue', header: ({ column }) => <DataGridColumnHeader title="GROSS REVENUE" column={column} />, cell: ({ row }) => $(row.original.gross_revenue), size: 140, enableSorting: true },
        { accessorKey: 'gross_profit', header: ({ column }) => <DataGridColumnHeader title="GROSS PROFIT" column={column} />, cell: ({ row }) => $(row.original.gross_profit), size: 130, enableSorting: true },
        { accessorKey: 'total_labor_cost', header: ({ column }) => <DataGridColumnHeader title="LABOR COST" column={column} />, cell: ({ row }) => $(row.original.total_labor_cost), size: 120, enableSorting: true },
        { accessorKey: 'total_hours', header: ({ column }) => <DataGridColumnHeader title="TOTAL HRS" column={column} />, cell: ({ row }) => num(row.original.total_hours), size: 100, enableSorting: true },
        { accessorKey: 'gross_profit_less_installer_total_cost_psf', header: ({ column }) => <DataGridColumnHeader title="GP LESS COST/SQFT" column={column} />, cell: ({ row }) => { const v = row.original.gross_profit_less_installer_total_cost_psf; return <span className={v < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{$(v)}</span>; }, size: 160, enableSorting: true },
    ], []);

    const annualTable = useReactTable({
        columns: annualColumns,
        data: annualData,
        state: { pagination: annualPagination, sorting: annualSorting },
        onPaginationChange: setAnnualPagination,
        onSortingChange: setAnnualSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const getTitle = () => {
        if (selectedDate) {
            return format(selectedDate, 'MMMM yyyy');
        }
        return format(now, 'MMMM yyyy');
    };

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading installer cost report...</div>;
    if (isError) return <div className="p-5 text-red-500">Error loading report.</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Installer Labor Costs - Weekly</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* ─── Month/Year Picker ───────────────────────────── */}
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-[180px] justify-start text-left font-normal h-[34px]', !selectedDate && 'text-muted-foreground')}>
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, 'MMM yyyy') : 'Select Month'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                month={calendarMonth}
                                onMonthChange={setCalendarMonth}
                                selected={tempDate}
                                onSelect={setTempDate}
                                initialFocus
                            />
                            <div className="flex justify-end gap-2 p-3 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setTempDate(undefined);
                                        setSelectedDate(undefined);
                                        setIsDatePickerOpen(false);
                                    }}
                                >
                                    Reset
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        if (tempDate) {
                                            const firstOfMonth = new Date(tempDate.getFullYear(), tempDate.getMonth(), 1);
                                            setSelectedDate(firstOfMonth);
                                        } else {
                                            setSelectedDate(undefined);
                                        }
                                        setIsDatePickerOpen(false);
                                    }}
                                >
                                    Apply
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    {selectedDate && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)}>
                            Clear
                        </Button>
                    )}
                    <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(pivotedTable, `installer-cost-${getTitle()}`)}>
                        Export CSV
                    </Button>
                <BackButton/>  
                </div>
            </div>

            {display && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total Employees</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{display.total_employee}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Default Overhead / Week</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{$(display.default_overhead_per_week)}</p>
                    </Card>
                </div>
            )}

            <DataGrid table={pivotedTable} recordCount={pivotedRows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <CardTitle className="text-base font-semibold text-[#4b545d]">Weekly Breakdown – {getTitle()}</CardTitle>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-5px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
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

            <DataGrid table={annualTable} recordCount={annualData.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <CardTitle className="text-base font-semibold text-[#4b545d]">Annual Monthly Summary – {new Date().getFullYear()}</CardTitle>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-5px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
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
                                        {annualData.length === 0 && (
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
        </div>
    );
}