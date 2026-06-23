// pages/reports/InstallPerformance.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format, parseISO, isValid } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetInstallPerformanceQuery } from '@/store/api/report';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackButton } from '@/components/common/BackButton';

const fmtDate = (s: string | null) => {
    if (!s) return '-';
    try { const d = parseISO(s); return isValid(d) ? format(d, 'MMM dd, yyyy') : '-'; } catch { return '-'; }
};

interface InstallerRow {
    installer_id: number;
    installer_name: string;
    completed_installs: number;
    sqft_installed: number;
    work_hours: number;
    pause_hours: number;
    sqft_per_hour: number;
    hourly_rate: number;
    labor_cost: number;
    labor_cost_per_sqft: number;
    first_completion_at: string | null;
    last_completion_at: string | null;
}

export function InstallPerformance() {
    // Date range state
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    // Installer filter
    const [selectedInstallerId, setSelectedInstallerId] = useState<string>('all');

    // Pagination and sorting
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState<SortingState>([]);

    // Fetch employees for dropdown
    const { data: employeesData } = useGetEmployeesQuery();
    const installerOptions = useMemo(() => {
        if (!employeesData) return [];
        let rawData: any[] = [];
        if (Array.isArray(employeesData)) rawData = employeesData;
        else if (typeof employeesData === 'object' && 'data' in employeesData) rawData = (employeesData as any).data || [];
        // Optionally filter by role if you have a role field like 'installer'
        return rawData.map((emp: any) => ({
            id: emp.id,
            name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || String(emp),
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [employeesData]);

    // Build query params
    const queryParams = useMemo(() => {
        const params: { start_date?: string; end_date?: string; installer_id?: number } = {};
        if (dateRange?.from) {
            params.start_date = format(dateRange.from, 'yyyy-MM-dd');
            params.end_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        if (selectedInstallerId !== 'all') {
            params.installer_id = Number(selectedInstallerId);
        }
        return Object.keys(params).length ? params : undefined;
    }, [dateRange, selectedInstallerId]);

    const { data, isLoading, isError, isFetching, refetch } = useGetInstallPerformanceQuery(queryParams);

    const summary = useMemo(() => data?.data?.summary ?? null, [data]);
    const tableData: InstallerRow[] = useMemo(() => data?.data?.installer_breakdown ?? [], [data]);

    // ─── Columns with sorting ────────────────────────────────────────────────
    const columns = useMemo<ColumnDef<InstallerRow>[]>(() => [
        {
            accessorKey: 'installer_name',
            header: ({ column }) => <DataGridColumnHeader title="INSTALLER" column={column} />,
            cell: ({ row }) => <span className="font-medium text-sm">{row.original.installer_name}</span>,
            size: 200,
            enableSorting: true,
        },
        {
            accessorKey: 'completed_installs',
            header: ({ column }) => <DataGridColumnHeader title="COMPLETED" column={column} />,
            cell: ({ row }) => (
                <span className="inline-flex items-center justify-center rounded-full bg-[#eef0f6] text-[#4b545d] text-sm font-semibold px-3 py-0.5">
                    {row.original.completed_installs}
                </span>
            ),
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'sqft_installed',
            header: ({ column }) => <DataGridColumnHeader title="SQFT INSTALLED" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.sqft_installed.toFixed(1)}</span>,
            size: 130,
            enableSorting: true,
        },
        {
            accessorKey: 'work_hours',
            header: ({ column }) => <DataGridColumnHeader title="WORK HRS" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.work_hours.toFixed(2)}</span>,
            size: 110,
            enableSorting: true,
        },
        {
            accessorKey: 'pause_hours',
            header: ({ column }) => <DataGridColumnHeader title="PAUSE HRS" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.pause_hours.toFixed(2)}</span>,
            size: 110,
            enableSorting: true,
        },
        {
            accessorKey: 'sqft_per_hour',
            header: ({ column }) => <DataGridColumnHeader title="SQFT/HR" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.sqft_per_hour.toFixed(2)}</span>,
            size: 100,
            enableSorting: true,
        },
        // {
        //     accessorKey: 'labor_cost',
        //     header: ({ column }) => <DataGridColumnHeader title="LABOR COST" column={column} />,
        //     cell: ({ row }) => <span className="text-sm">${row.original.labor_cost.toFixed(2)}</span>,
        //     size: 120,
        //     enableSorting: true,
        // },
        // {
        //     accessorKey: 'labor_cost_per_sqft',
        //     header: ({ column }) => <DataGridColumnHeader title="COST/SQFT" column={column} />,
        //     cell: ({ row }) => <span className="text-sm">${row.original.labor_cost_per_sqft.toFixed(2)}</span>,
        //     size: 110,
        //     enableSorting: true,
        // },
        // {
        //     accessorKey: 'first_completion_at',
        //     header: ({ column }) => <DataGridColumnHeader title="FIRST COMPLETION" column={column} />,
        //     cell: ({ row }) => <span className="text-sm text-[#7c8689]">{fmtDate(row.original.first_completion_at)}</span>,
        //     size: 150,
        //     enableSorting: true,
        // },
        // {
        //     accessorKey: 'last_completion_at',
        //     header: ({ column }) => <DataGridColumnHeader title="LAST COMPLETION" column={column} />,
        //     cell: ({ row }) => <span className="text-sm text-[#7c8689]">{fmtDate(row.original.last_completion_at)}</span>,
        //     size: 150,
        //     enableSorting: true,
        // },
    ], []);

    const table = useReactTable({
        columns,
        data: tableData,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading install performance report...</div>;
    if (isError) return <div className="p-5 text-red-500">Error loading report.</div>;

    const getTitle = () => {
        if (dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        return 'All dates';
    };

    return (
        <div className="flex flex-col gap-5 p-5">
            {/* Header with filters */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Install Performance</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Date Range Picker */}
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

                    {/* Installer Filter */}
                    <Select value={selectedInstallerId} onValueChange={setSelectedInstallerId}>
                        <SelectTrigger className="w-[180px] h-[34px] border-[#e2e4ed]">
                            <SelectValue placeholder="Installer" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Installers</SelectItem>
                            {installerOptions.map(inst => (
                                <SelectItem key={inst.id} value={String(inst.id)}>{inst.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={() => exportTableToCSV(table, 'install-performance')} className="h-[34px]">
                        Export CSV
                    </Button>
                <BackButton/>
                </div>

            </div>

            {/* Summary Widgets */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Total SQFT Installed', value: summary.total_sqft_installed.toFixed(1) },
                        { label: 'Installer Count', value: summary.installer_count },
                        { label: 'Total Work Hours', value: summary.total_work_hours.toFixed(2) },
                        { label: 'Total Labor Cost', value: `$${summary.total_labor_cost.toFixed(2)}` },
                        { label: 'Labor Cost/SQFT', value: `$${summary.portfolio_labor_cost_per_sqft.toFixed(2)}` },
                        { label: 'SQFT/Hour', value: summary.portfolio_sqft_per_hour.toFixed(2) },
                    ].map(kpi => (
                        <Card key={kpi.label} className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                            <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider leading-tight">{kpi.label}</p>
                            <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpi.value}</p>
                        </Card>
                    ))}
                </div>
            )}

            {/* Data Table */}
            <DataGrid table={table} recordCount={tableData.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">{getTitle()}</p>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] bg-white [&>[data-radix-scroll-area-viewport]]:pb-4">
                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {table.getHeaderGroups().map(headerGroup => (
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
                                        {table.getRowModel().rows.map(row => (
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
                                        {tableData.length === 0 && (
                                            <tr>
                                                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
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
        </div>
    );
}