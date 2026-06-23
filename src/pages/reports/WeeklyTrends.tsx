// pages/reports/WeeklyTrends.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetWeeklyTrendsQuery } from '@/store/api/report';
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
import { BackButton } from '@/components/common/BackButton';

interface TrendRow {
    week_start: string;
    sqft_template_installed: number;
    fabs_created: number;
    installs_completed: number;
    revenue: number;
    gross_profit: number;
    sqft_installed: number;
}

export function WeeklyTrendsReport() {
    // Date range state
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 100 });
    const [sorting, setSorting] = useState<SortingState>([]);

    // Build query params
    const queryParams = useMemo(() => {
        const params: { from_date?: string; to_date?: string } = {};
        if (dateRange?.from) {
            params.from_date = format(dateRange.from, 'yyyy-MM-dd');
            params.to_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        return Object.keys(params).length ? params : undefined;
    }, [dateRange]);

    const { data, isLoading } = useGetWeeklyTrendsQuery(queryParams);

    const trends: TrendRow[] = useMemo(() => data?.data?.weekly_trends ?? [], [data]);
    const weeks = useMemo(() => data?.data?.weeks ?? trends.length, [data]);

    // Compute totals
    const totals = useMemo(() => {
        if (!trends.length) return null;
        return {
            sqft_template_installed: trends.reduce((sum, r) => sum + (r.sqft_template_installed || 0), 0),
            fabs_created: trends.reduce((sum, r) => sum + r.fabs_created, 0),
            installs_completed: trends.reduce((sum, r) => sum + r.installs_completed, 0),
            revenue: trends.reduce((sum, r) => sum + r.revenue, 0),
            gross_profit: trends.reduce((sum, r) => sum + r.gross_profit, 0),
            sqft_installed: trends.reduce((sum, r) => sum + r.sqft_installed, 0),
        };
    }, [trends]);

    // Slice trends for current page
    const slicedTrends = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        const end = start + pagination.pageSize;
        return trends.slice(start, end);
    }, [trends, pagination.pageIndex, pagination.pageSize]);

    // Prepends total row to slicedTrends if totals exist (always visible)
    const displayRows = useMemo(() => {
        if (!totals) return slicedTrends;
        const totalRow: any = {
            week_start: 'TOTAL',
            sqft_template_installed: totals.sqft_template_installed,
            fabs_created: totals.fabs_created,
            installs_completed: totals.installs_completed,
            revenue: totals.revenue,
            gross_profit: totals.gross_profit,
            sqft_installed: totals.sqft_installed,
            _isTotalRow: true,
        };
        return [totalRow, ...slicedTrends];
    }, [totals, slicedTrends]);

    // ─── Columns with sorting ────────────────────────────────────────────────
    const columns = useMemo<ColumnDef<TrendRow>[]>(() => [
        {
            accessorKey: 'week_start',
            header: ({ column }) => <DataGridColumnHeader title="WEEK STARTING" column={column} />,
            cell: ({ row }) => {
                const val = row.original.week_start;
                if (!val || val === 'TOTAL') return '—';
                try {
                    return format(new Date(val), 'MMM dd, yyyy');
                } catch {
                    return val;
                }
            },
            size: 140,
            enableSorting: true,
        },
        {
            accessorKey: 'sqft_templated',
            header: ({ column }) => <DataGridColumnHeader title="SQFT TEMPLATED" column={column} />,
            cell: ({ row }) => row.original.sqft_template_installed?.toFixed(0) ?? '0',
            size: 150,
            enableSorting: true,
        },
        {
            accessorKey: 'sqft_installed',
            header: ({ column }) => <DataGridColumnHeader title="SQFT INSTALLED" column={column} />,
            cell: ({ row }) => row.original.sqft_installed.toFixed(0),
            size: 130,
            enableSorting: true,
        },
        {
            accessorKey: 'installs_completed',
            header: ({ column }) => <DataGridColumnHeader title="INSTALLS COMPLETED" column={column} />,
            size: 150,
            enableSorting: true,
        },
        {
            accessorKey: 'fabs_created',
            header: ({ column }) => <DataGridColumnHeader title="FABS CREATED" column={column} />,
            size: 120,
            enableSorting: true,
        },

        {
            accessorKey: 'revenue',
            header: ({ column }) => <DataGridColumnHeader title="REVENUE" column={column} />,
            cell: ({ row }) => `$${row.original.revenue.toFixed(2)}`,
            size: 130,
            enableSorting: true,
        },
        {
            accessorKey: 'gross_profit',
            header: ({ column }) => <DataGridColumnHeader title="GROSS PROFIT" column={column} />,
            cell: ({ row }) => `$${row.original.gross_profit.toFixed(2)}`,
            size: 130,
            enableSorting: true,
        },

    ], []);

    const table = useReactTable({
        columns,
        data: displayRows,
        getRowId: (row) => row.week_start === 'TOTAL' ? 'total' : `${row.week_start}-${row.fabs_created}`,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
        pageCount: Math.ceil(trends.length / pagination.pageSize),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
        meta: {
            getRowAttributes: (row) => {
                if (row.original._isTotalRow) {
                    return { className: 'bg-[#f0f7e0] font-semibold [&>td]:border-0' };
                }
                return {};
            },
        },
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading weekly trends...</div>;

    const getTitle = () => {
        if (dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        return `Last ${weeks} Weeks`;
    };

    return (
        <div className="flex flex-col gap-5 p-5">
            {/* Header with filters */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Install & Template Trends</h1>
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
                    <Button variant="outline" onClick={() => exportTableToCSV(table, 'weekly-trends')} className="h-[34px]">
                        Export CSV
                    </Button>
                    <BackButton/>
                </div>
            </div>

            {/* Data Table */}
            <DataGrid table={table} recordCount={trends.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">{getTitle()}</p>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-10px)] bg-white [&>[data-radix-scroll-area-viewport]]:pb-4">
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
                                        {table.getRowModel().rows.map(row => {
                                            const rowAttrs = table.options.meta?.getRowAttributes?.(row) || {};
                                            return (
                                                <tr
                                                    key={row.id}
                                                    className={`border-b border-[#e2e4ed] hover:bg-gray-50/50 ${rowAttrs.className || ''}`}
                                                    {...rowAttrs}
                                                >
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
                                            );
                                        })}
                                        {trends.length === 0 && (
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