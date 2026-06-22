// pages/reports/ShopStatus.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetShopStatusReportQuery } from '@/store/api/report';
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

interface StageRow {
    stage: string;
    fab_count: number;
    avg_age_days: number;
    max_age_days: number;
    stalled_over_14_days: number;
}

export function ShopStatusReport() {
    // Date range state
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sorting, setSorting] = useState<SortingState>([]);

    // Build query params
    const queryParams = useMemo(() => {
        const params: { start_date?: string; end_date?: string } = {};
        if (dateRange?.from) {
            params.start_date = format(dateRange.from, 'yyyy-MM-dd');
            params.end_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        return Object.keys(params).length ? params : undefined;
    }, [dateRange]);

    const { data, isLoading } = useGetShopStatusReportQuery(queryParams);

    const stageData: StageRow[] = useMemo(() => data?.data?.stage_status ?? [], [data]);
    const period = useMemo(() => data?.data?.period ?? null, [data]);

    // Compute totals
    const totals = useMemo(() => {
        if (!stageData.length) return null;
        return {
            fab_count: stageData.reduce((sum, r) => sum + r.fab_count, 0),
            avg_age_days: stageData.reduce((sum, r) => sum + r.avg_age_days, 0) / stageData.length,
            max_age_days: Math.max(...stageData.map(r => r.max_age_days)),
            stalled_over_14_days: stageData.reduce((sum, r) => sum + r.stalled_over_14_days, 0),
        };
    }, [stageData]);

    // Slice stageData for current page
    const slicedData = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        const end = start + pagination.pageSize;
        return stageData.slice(start, end);
    }, [stageData, pagination.pageIndex, pagination.pageSize]);

    // Prepend total row to slicedData (visible on every page)
    const displayRows = useMemo(() => {
        if (!totals) return slicedData;
        const totalRow: any = {
            stage: 'TOTAL',
            fab_count: totals.fab_count,
            avg_age_days: totals.avg_age_days,
            max_age_days: totals.max_age_days,
            stalled_over_14_days: totals.stalled_over_14_days,
            _isTotalRow: true,
        };
        return [totalRow, ...slicedData];
    }, [totals, slicedData]);

    // Columns with sorting
    const columns = useMemo<ColumnDef<StageRow>[]>(() => [
        {
            accessorKey: 'stage',
            header: ({ column }) => <DataGridColumnHeader title="STAGE" column={column} />,
            size: 200,
            enableSorting: true,
        },
        {
            accessorKey: 'fab_count',
            header: ({ column }) => <DataGridColumnHeader title="FAB COUNT" column={column} />,
            size: 100,
            enableSorting: true,
        },
        {
            accessorKey: 'avg_age_days',
            header: ({ column }) => <DataGridColumnHeader title="AVG AGE (DAYS)" column={column} />,
            cell: ({ row }) => row.original.avg_age_days.toFixed(1),
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'max_age_days',
            header: ({ column }) => <DataGridColumnHeader title="MAX AGE (DAYS)" column={column} />,
            cell: ({ row }) => row.original.max_age_days.toFixed(1),
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'stalled_over_14_days',
            header: ({ column }) => <DataGridColumnHeader title="STALLED >14 DAYS" column={column} />,
            size: 130,
            enableSorting: true,
        },
    ], []);

    const table = useReactTable({
        columns,
        data: displayRows,
        getRowId: (row) => row.stage === 'TOTAL' ? 'total' : row.stage,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
        pageCount: Math.ceil(stageData.length / pagination.pageSize),
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

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading shop status report...</div>;

    const getTitle = () => {
        if (dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        return period && period.start_date && period.end_date
            ? `${format(new Date(period.start_date), 'MMM dd, yyyy')} – ${format(new Date(period.end_date), 'MMM dd, yyyy')}`
            : 'All dates';
    };

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">AG Completion Report</h1>
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
                    <Button variant="outline" size="sm" className="h-[34px]" onClick={() => exportTableToCSV(table, 'shop-status')}>
                        Export CSV
                    </Button>
                <BackButton/>
                </div>
            </div>

            <DataGrid table={table} recordCount={stageData.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">{getTitle()}</p>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-280px)] bg-white [&>[data-radix-scroll-area-viewport]]:pb-4">
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
                                        {stageData.length === 0 && (
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