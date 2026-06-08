// reports/RedosReport.tsx
import { useMemo, useState } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getPaginationRowModel,
    PaginationState,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetReportRedosQuery } from '@/store/api/report';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { cn } from '@/lib/utils';

interface RedoItem {
    fab_id: number;
    fab_created_date: string;
    fab_type: string;
    job_number: string;
    fab_info: string;
    sqft: number;
    total_cost: number | null;
    reason: string | null;
    department_options: string[];
}

// ── Split fab_info into left (first 6 items in two lines) and right (rest) ──
const parseFabInfo = (info: string) => {
    if (!info) return { leftLine1: [], leftLine2: [], right: [] };
    const parts = info.split(' - ').filter(p => p.trim());
    const leftLine1 = parts.slice(0, 3);
    const leftLine2 = parts.slice(3, 6);
    const right = parts.slice(6);
    return { leftLine1, leftLine2, right };
};

// ── Client‑side date filtering ──────────────────────────────────────────────
const filterByDateRange = (items: RedoItem[], dateRange: DateRange | undefined): RedoItem[] => {
    if (!dateRange?.from) return items;
    const start = new Date(dateRange.from);
    start.setHours(0, 0, 0, 0);
    const end = dateRange.to ? new Date(dateRange.to) : new Date(start);
    end.setHours(23, 59, 59, 999);
    return items.filter(item => {
        if (!item.fab_created_date) return false;
        const itemDate = new Date(item.fab_created_date);
        return itemDate >= start && itemDate <= end;
    });
};

export function RedosReport() {
    const { data, isLoading } = useGetReportRedosQuery();
    const rawData = useMemo(() => data?.data || [], [data]);

    // ── State ────────────────────────────────────────────────────────────────
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState<Date>(new Date());

    // ── Apply date filter ────────────────────────────────────────────────────
    const filteredData = useMemo(() => {
        return filterByDateRange(rawData, dateRange);
    }, [rawData, dateRange]);

    // ── Columns (job number separate, fab info parsed) ──────────────────────
    const columns = useMemo<ColumnDef<RedoItem>[]>(() => [
        {
            accessorKey: 'fab_type',
            header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} />,
            cell: ({ row }) => <span className="uppercase text-sm">{row.original.fab_type}</span>,
            size: 120,
        },
        {
            accessorKey: 'fab_id',
            header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.fab_id}</span>,
            size: 80,
        },
        {
            accessorKey: 'job_number',
            header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.job_number}</span>,
            size: 100,
        },
        {
            id: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => {
                const { leftLine1, leftLine2, right } = parseFabInfo(row.original.fab_info);
                return (
                    <div className="flex gap-4 text-xs w-auto max-w-[500px]">
                        {/* Left side: two lines */}
                        <div className="flex-1 min-w-0">
                            {leftLine1.length > 0 && (
                                <div className=" text-gray-600" title={leftLine1.join(' - ')}>
                                    {leftLine1.join(' - ')}
                                </div>
                            )}
                            {leftLine2.length > 0 && (
                                <div className="truncate text-gray-600" title={leftLine2.join(' - ')}>
                                    {leftLine2.join(' - ')}
                                </div>
                            )}
                            {leftLine1.length === 0 && leftLine2.length === 0 && (
                                <div className="truncate text-gray-400 italic">No details</div>
                            )}
                        </div>
                        {/* Right side: remaining segments */}
                        <div className="flex-1 min-w-0">
                            {right.length > 0 ? (
                                <div className="truncate text-gray-600" title={right.join(' - ')}>
                                    {right.join(' - ')}
                                </div>
                            ) : (
                                <div className="truncate text-gray-400 italic"></div>
                            )}
                        </div>
                    </div>
                );
            },
            size: 450,
        },
        {
            accessorKey: 'sqft',
            header: ({ column }) => <DataGridColumnHeader title="SQFT" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.sqft.toFixed(2)}</span>,
            size: 100,
        },
        {
            accessorKey: 'total_cost',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL COST" column={column} />,
            cell: ({ row }) => {
                const cost = row.original.total_cost;
                return <span className="text-sm">{cost !== null ? `$${cost.toFixed(2)}` : '-'}</span>;
            },
            size: 120,
        },
        {
            accessorKey: 'reason',
            header: ({ column }) => <DataGridColumnHeader title="REASON" column={column} />,
            cell: ({ row }) => <span className="text-sm truncate max-w-[150px]">{row.original.reason || '-'}</span>,
            size: 150,
        },
    ], []);

    const table = useReactTable({
        columns,
        data: filteredData,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        meta: {
            getRowAttributes: (row) => ({
                'data-fab-type': row.original.fab_type?.toLowerCase(),
            }),
        },
    });

    if (isLoading) return <div className="p-4">Loading Redos Report...</div>;

    return (
        <div className="p-5">
            <DataGrid
                table={table}
                recordCount={filteredData.length}
                tableLayout={{
                    columnsPinnable: true,
                    columnsMovable: true,
                    columnsVisibility: true,
                    columnsResizable: true,
                    cellBorder: true,
                }}
            >
                <Card>
                    <CardHeader className="py-3.5 border-b flex flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {/* Date range picker – exactly like first ReportRenderer page */}
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-[260px] justify-start text-left font-normal bg-white border-[#e2e4ed] shadow-sm h-[34px]',
                                            !dateRange && 'text-muted-foreground'
                                        )}
                                    >
                                        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, 'MMM dd, yyyy')} -{' '}
                                                    {format(dateRange.to, 'MMM dd, yyyy')}
                                                </>
                                            ) : (
                                                format(dateRange.from, 'MMM dd, yyyy')
                                            )
                                        ) : (
                                            <span>Filter by Date Range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="range"
                                        month={month}
                                        onMonthChange={setMonth}
                                        selected={tempDateRange}
                                        onSelect={setTempDateRange}
                                        numberOfMonths={2}
                                    />
                                    <div className="flex items-center justify-end gap-2 border-t border-border p-3 bg-gray-50/50">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-[#e2e4ed]"
                                            onClick={() => {
                                                setTempDateRange(undefined);
                                                setDateRange(undefined);
                                                setIsDatePickerOpen(false);
                                            }}
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setDateRange(tempDateRange);
                                                setIsDatePickerOpen(false);
                                            }}
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            {dateRange && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 text-muted-foreground h-[34px]"
                                    onClick={() => {
                                        setDateRange(undefined);
                                        setTempDateRange(undefined);
                                    }}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        <CardToolbar>
                            <Button variant="outline" onClick={() => exportTableToCSV(table, 'redos-report')}>
                                Export CSV
                            </Button>
                        </CardToolbar>
                    </CardHeader>
                    <CardTable>
                        <DataGridTable />
                    </CardTable>
                    <CardFooter>
                        <DataGridPagination />
                    </CardFooter>
                </Card>
            </DataGrid>
        </div>
    );
}