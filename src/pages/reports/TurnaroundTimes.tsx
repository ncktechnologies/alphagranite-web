// pages/reports/TurnaroundTimes.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetTurnaroundTimesQuery } from '@/store/api/report';
import { useGetFabTypesQuery } from '@/store/api/job';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { cn } from '@/lib/utils';
import { getFabIdLink, getJobNumberLink, renderLink } from '@/lib/reportLinks';

// Fab type color map
const fabTypeColorMap: Record<string, string> = {
    standard: '#9eeb47',
    'fab only': '#5bd1d7',
    'cust redo': '#f0bf4c',
    resurface: '#d094ea',
    'fast track': '#f59794',
    'ag redo': '#f5cc94',
};

const getFabColor = (fabType: string | undefined): string => {
    if (!fabType) return 'transparent';
    return fabTypeColorMap[fabType.toLowerCase()] || 'transparent';
};

const parseFabInfo = (info: string) => {
    if (!info) return { leftLine1: [], leftLine2: [], right: [] };
    const parts = info.split(' - ').filter(p => p.trim());
    return {
        leftLine1: parts.slice(0, 3),
        leftLine2: parts.slice(3, 6),
        right: parts.slice(6),
    };
};

export function TurnaroundTimesReport() {
    // ─── Date mode (monthly or custom range) ──────────────────────────────
    const [dateMode, setDateMode] = useState<'monthly' | 'custom'>('monthly');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // ─── Sorting & pagination ──────────────────────────────────────────────
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sorting, setSorting] = useState<SortingState>([]);

    // ─── Fab type filter ────────────────────────────────────────────────────
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const { data: fabTypesData } = useGetFabTypesQuery();
    const fabTypes = useMemo(() => {
        if (!fabTypesData) return [];
        let rawData: any[] = [];
        if (Array.isArray(fabTypesData)) rawData = fabTypesData;
        else if (typeof fabTypesData === 'object' && 'data' in fabTypesData) rawData = (fabTypesData as any).data || [];
        const extractName = (item: { name: string } | string) =>
            typeof item === 'string' ? item : (typeof item === 'object' && item !== null ? item.name || String(item) : String(item));
        return rawData.map(extractName).sort();
    }, [fabTypesData]);

    // ─── Build query params ──────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        const params: any = {};
        if (dateMode === 'custom' && dateRange?.from) {
            params.start_date = format(dateRange.from, 'yyyy-MM-dd');
            params.end_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        } else {
            params.year = year;
            params.month = month;
        }
        if (fabTypeFilter && fabTypeFilter !== 'all') {
            params.fab_type = fabTypeFilter;
        }
        return params;
    }, [dateMode, dateRange, year, month, fabTypeFilter]);

    const { data, isLoading } = useGetTurnaroundTimesQuery(queryParams);
    const rows = useMemo(() => data?.data?.rows ?? [], [data]);
    const summary = useMemo(() => data?.data?.summary ?? null, [data]);
    const stageAverages = useMemo(() => data?.data?.stage_averages ?? null, [data]);

    // ─── Columns with sorting ──────────────────────────────────────────────────
    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!rows.length) return [];
        const first = rows[0];
        return Object.keys(first).map(key => ({
            accessorKey: key,
            header: ({ column }) => <DataGridColumnHeader title={key.replace(/_/g, ' ').toUpperCase()} column={column} />,
            size: key === 'fab_info' ? 450 : 100,
            enableSorting: true, // enable sorting on all columns
            cell: ({ row }) => {
                let val = row.original[key];
                if (key === 'fab_id' && val) {
                    const link = getFabIdLink(Number(val));
                    return renderLink(link);
                }
                if (key === 'job_number' && val) {
                    const link = getJobNumberLink(String(val));
                    return renderLink(link);
                }
                if (key === 'fab_info' && typeof val === 'string') {
                    const { leftLine1, leftLine2, right } = parseFabInfo(val);
                    return (
                        <div className="flex gap-4 text-xs max-w-[500px]">
                            <div className="flex-1 min-w-0">
                                {leftLine1.length > 0 && (
                                    <div className="text-gray-600" title={leftLine1.join(' - ')}>
                                        {leftLine1.join(' - ')}
                                    </div>
                                )}
                                {leftLine2.length > 0 && (
                                    <div className="text-gray-600" title={leftLine2.join(' - ')}>
                                        {leftLine2.join(' - ')}
                                    </div>
                                )}
                                {leftLine1.length === 0 && leftLine2.length === 0 && (
                                    <div className="text-gray-400 italic">No details</div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                {right.length ? (
                                    <div className="text-gray-600" title={right.join(' - ')}>
                                        {right.join(' - ')}
                                    </div>
                                ) : (
                                    <div className="truncate text-gray-400 italic"></div>
                                )}
                            </div>
                        </div>
                    );
                }
                if (key.includes('date') && val) {
                    try {
                        val = format(new Date(val), 'MMM dd, yyyy');
                    } catch { /* keep original */ }
                }
                return <span className="text-sm">{val ?? '-'}</span>;
            },
        }));
    }, [rows]);

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
        meta: {
            getRowAttributes: (row) => {
                if (row.original.fab_type) {
                    const bgColor = getFabColor(row.original.fab_type);
                    if (bgColor !== 'transparent') {
                        return { style: { backgroundColor: bgColor } };
                    }
                }
                return {};
            },
        },
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading turnaround times report...</div>;

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const getTitle = () => {
        if (dateMode === 'custom' && dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        return `${monthName} ${year} – Turnaround Details`;
    };

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Turnaround Times</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Fab Type Filter */}
                    <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                        <SelectTrigger className="w-[150px] h-[34px] border-[#e2e4ed]">
                            <SelectValue placeholder="Fab Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {fabTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {/* Mode toggle: Monthly or Custom Range */}
                    <Select value={dateMode} onValueChange={(v) => setDateMode(v as 'monthly' | 'custom')}>
                        <SelectTrigger className="w-[120px] h-[34px] border-[#e2e4ed]">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {dateMode === 'monthly' ? (
                        <>
                            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                                <SelectTrigger className="w-[100px] h-[34px] border-[#e2e4ed]">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                                <SelectTrigger className="w-[130px] h-[34px] border-[#e2e4ed]">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <SelectItem key={m} value={String(m)}>
                                            {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </>
                    ) : (
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn('w-[260px] justify-start text-left font-normal h-[34px]', !dateRange && 'text-muted-foreground')}>
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : format(dateRange.from, 'MMM dd, yyyy')) : 'Select date range'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="range" month={new Date()} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                                <div className="flex justify-end gap-2 p-3 border-t">
                                    <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); setIsDatePickerOpen(false); }}>Reset</Button>
                                    <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}

                    <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(table, `turnaround-${year}-${month}`)}>
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Stage Averages Widgets */}
            {stageAverages && Object.keys(stageAverages).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Object.entries(stageAverages).map(([stage, days]) => days !== null && (
                        <Card key={stage} className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                            <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">
                                {stage.replace(/_/g, ' ')}
                            </p>
                            <p className="text-2xl font-semibold mt-2 text-[#4b545d]">
                                {typeof days === 'number' ? Math.floor(days) : days} days
                            </p>
                        </Card>
                    ))}
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
                                        {table.getRowModel().rows.map(row => {
                                            const rowAttrs = table.options.meta?.getRowAttributes?.(row) || {};
                                            return (
                                                <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50" {...rowAttrs}>
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
                                        {rows.length === 0 && (
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