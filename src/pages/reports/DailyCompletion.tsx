// pages/reports/DailyCompletion.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetDailyCompletionQuery } from '@/store/api/report';
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

// ─── Types ──────────────────────────────────────────────────────────────────
interface DailyRow {
    date: string;
    [key: string]: any; // dynamic columns
}

interface SummaryTotals {
    template_sqft: number;
    draft_sqft: number;
    sct_sqft: number;
    final_programming_sqft: number;
    resurface_sqft: number;
    cut_sqft: number;
    fab_sqft: number;
    [key: string]: number;
}

interface SummaryAvg {
    template_sqft: number;
    draft_sqft: number;
    sct_sqft: number;
    final_programming_sqft: number;
    resurface_sqft: number;
    cut_sqft: number;
    fab_sqft: number;
    [key: string]: number;
}

interface ApiResponse {
    data: {
        period: { from_date: string; to_date: string };
        summary: {
            weekdays: number;
            totals: SummaryTotals;
            avg_per_weekday: SummaryAvg;
            row_count: number;
        };
        columns: string[];
        rows: DailyRow[];
    };
}

export function DailyCompletion() {
    // ─── Date range ───────────────────────────────────────────────────────────
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    // ─── Weekday override ────────────────────────────────────────────────────
    const [weekdays, setWeekdays] = useState<number | null>(null);

    // ─── Installer filter (client‑side) ──────────────────────────────────────
    const [installerFilter, setInstallerFilter] = useState<string>('all');

    // ─── Sorting & pagination ────────────────────────────────────────────────
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState<SortingState>([]);

    // ─── Build query params ──────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        const params: { from_date?: string; to_date?: string; weekdays?: number } = {};
        if (dateRange?.from) {
            params.from_date = format(dateRange.from, 'yyyy-MM-dd');
            params.to_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        if (weekdays !== null && weekdays !== undefined) {
            params.weekdays = weekdays;
        }
        return Object.keys(params).length ? params : undefined;
    }, [dateRange, weekdays]);

    const { data, isLoading } = useGetDailyCompletionQuery(queryParams);
    const apiData = data?.data as ApiResponse['data'] | undefined;
    const columnsFromApi = useMemo(() => apiData?.columns ?? [], [apiData]);
    const rawRows = useMemo(() => apiData?.rows ?? [], [apiData]);
    const summary = useMemo(() => apiData?.summary ?? null, [apiData]);

    // ─── Extract unique installers for filter ───────────────────────────────
    const installers = useMemo(() => {
        const installerSet = new Set<string>();
        rawRows.forEach(row => {
            const installer = row.installer || row.installer_name || row.assigned_to_name;
            if (installer) installerSet.add(String(installer));
        });
        return Array.from(installerSet).sort();
    }, [rawRows]);

    // ─── Client‑side filtering by installer ─────────────────────────────────
    const rows = useMemo(() => {
        if (installerFilter === 'all') return rawRows;
        return rawRows.filter(row => {
            const installer = row.installer || row.installer_name || row.assigned_to_name;
            return String(installer) === installerFilter;
        });
    }, [rawRows, installerFilter]);

    // ─── Dynamic columns with enhanced formatting ──────────────────────────
    const tableColumns = useMemo<ColumnDef<DailyRow>[]>(() => {
        if (!columnsFromApi.length) return [];

        // Define currency columns (GP, Revenue, etc.)
        const currencyColumns = new Set(['gross_profit', 'gp', 'revenue', 'total_revenue', 'profit']);

        return columnsFromApi.map(key => ({
            accessorKey: key,
            header: ({ column }) => <DataGridColumnHeader title={key.replace(/_/g, ' ').toUpperCase()} column={column} />,
            size: key === 'date' ? 140 : key === 'installer' || key === 'installer_name' ? 160 : 120,
            enableSorting: true,
            cell: ({ row }) => {
                let val = row.original[key];
                if (key === 'date' && val) {
                    try { val = format(new Date(val), 'MMM dd, yyyy'); } catch { }
                }
                if (typeof val === 'number') {
                    // Format currency for GP, revenue, etc.
                    if (currencyColumns.has(key)) {
                        return <span className="text-sm">${val.toFixed(2)}</span>;
                    }
                    val = val.toFixed(2);
                }
                if (val == null) return <span className="text-sm">-</span>;
                return <span className="text-sm">{val}</span>;
            },
        }));
    }, [columnsFromApi]);

    const table = useReactTable({
        columns: tableColumns,
        data: rows,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
        meta: {
            getRowAttributes: () => ({ className: 'bg-white hover:bg-gray-50/50' }),
        },
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading daily completion report...</div>;

    const getTitle = () => {
        if (dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        return 'Last 7 Days';
    };

    // ─── Weekday options ─────────────────────────────────────────────────────
    const weekdayOptions = [
        { value: null, label: 'All Days' },
        { value: 1, label: 'Monday' },
        { value: 2, label: 'Tuesday' },
        { value: 3, label: 'Wednesday' },
        { value: 4, label: 'Thursday' },
        { value: 5, label: 'Friday' },
        { value: 6, label: 'Saturday' },
        { value: 7, label: 'Sunday' },
    ];

    // ─── Render summary widgets ─────────────────────────────────────────────
    const renderSummaryWidgets = (title: string, data: any, isCurrency = false) => {
        if (!data) return null;
        const entries = Object.entries(data).filter(([key]) => key !== 'weekdays' && key !== 'row_count');
        if (!entries.length) return null;
        return (
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#4b545d]">{title}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {entries.map(([key, value]) => (
                        <Card key={key} className="p-3 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                            <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">
                                {key.replace(/_/g, ' ')}
                            </p>
                            <p className="text-lg font-semibold mt-1 text-[#4b545d]">
                                {isCurrency ? `$${value.toFixed(2)}` : value.toFixed(2)}
                            </p>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Completion Report</h1>
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

                    {/* Installer Filter (only show if installers exist) */}
                    {installers.length > 0 && (
                        <Select value={installerFilter} onValueChange={setInstallerFilter}>
                            <SelectTrigger className="w-[180px] h-[34px] border-[#e2e4ed]">
                                <SelectValue placeholder="Installer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Installers</SelectItem>
                                {installers.map(inst => (
                                    <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Weekday Override (commented out – can be uncommented if needed) */}
                    {/* <Select value={weekdays !== null ? String(weekdays) : 'all'} onValueChange={(v) => setWeekdays(v === 'all' ? null : Number(v))}>
                        <SelectTrigger className="w-[150px] h-[34px] border-[#e2e4ed]">
                            <SelectValue placeholder="Weekday" />
                        </SelectTrigger>
                        <SelectContent>
                            {weekdayOptions.map(opt => (
                                <SelectItem key={opt.value === null ? 'all' : String(opt.value)} value={opt.value === null ? 'all' : String(opt.value)}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select> */}

                    <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(table, 'daily-completion')}>
                        Export CSV
                    </Button>
                <BackButton/>
                </div>

            </div>

            {/* Summary Widgets */}
            {summary && (
                <div className="space-y-4">
                    {renderSummaryWidgets('Totals', summary.totals)}
                    {renderSummaryWidgets('Avg per Weekday', summary.avg_per_weekday)}
                </div>
            )}

            {/* Data Table */}
            <DataGrid table={table} recordCount={rows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">{getTitle()}</p>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
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
                                        {rows.length === 0 && (
                                            <tr>
                                                <td colSpan={tableColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
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