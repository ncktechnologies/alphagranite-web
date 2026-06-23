// pages/reports/OwnerOverview.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetOwnerOverviewQuery } from '@/store/api/report';
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

// ─── Stage order (matches DASHBOARD_WIDGETS) ─────────────────────────────
const STAGE_ORDER = [
    'templating',
    'pre_draft_review',
    'resurface_scheduling',
    'drafting',
    'slab_smith_request',
    'slabsmith',
    'sales_ct',
    'revision',
    'cut_list',
    'final_programming',
    'cnc',
    'install_scheduling',
    'install_completion',
];

// ─── Custom display names for stages ─────────────────────────────────────
const STAGE_DISPLAY_MAP: Record<string, string> = {
    'cnc': 'CNC Programming',
    'pre_draft_review': 'Pre-Draft Review',
    'install_scheduling': 'Install To Schedule',
    'install_completion': 'Install Scheduled',
    'sales_ct': 'SCT'
};

// ─── Normalize stage name for matching ────────────────────────────────────
const normalizeStage = (stage: string): string => {
    return stage.toLowerCase().replace(/[\s-]+/g, '_').trim();
};

// ─── Formatting helpers ──────────────────────────────────────────────────────
export const formatStage = (stage: string) => {
    if (!stage) return stage;
    const normalized = normalizeStage(stage);
    // Use custom display name if available
    if (STAGE_DISPLAY_MAP[normalized]) {
        return STAGE_DISPLAY_MAP[normalized];
    }
    // Default: replace underscores, capitalize each word
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

interface StageRow {
    stage: string;
    count: number;
    _sortOrder: number; // hidden sort key
}

export function OwnerOverviewReport() {
    // ─── Date range state ──────────────────────────────────────────────────
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    // ─── Pagination & sorting ──────────────────────────────────────────────
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sorting, setSorting] = useState<SortingState>([]);

    // ─── Build query params ──────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        const params: { start_date?: string; end_date?: string } = {};
        if (dateRange?.from) {
            params.start_date = format(dateRange.from, 'yyyy-MM-dd');
            params.end_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        return Object.keys(params).length ? params : undefined;
    }, [dateRange]);

    const { data, isLoading } = useGetOwnerOverviewQuery(queryParams);

    const kpis = useMemo(() => data?.data?.kpis ?? null, [data]);
    const rawData: StageRow[] = useMemo(() => data?.data?.stage_breakdown ?? [], [data]);

    // ─── Sort stages by defined order and assign _sortOrder ──────────────
    const stageData = useMemo(() => {
        if (!rawData || !rawData.length) return [];
        const sorted = [...rawData].sort((a, b) => {
            const normA = normalizeStage(a.stage);
            const normB = normalizeStage(b.stage);
            const indexA = STAGE_ORDER.indexOf(normA);
            const indexB = STAGE_ORDER.indexOf(normB);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
        return sorted.map((item, index) => ({
            ...item,
            _sortOrder: index,
        }));
    }, [rawData]);

    // ─── Columns with custom sorting for stage (by workflow order) ────────
    const columns = useMemo<ColumnDef<StageRow>[]>(() => [
        {
            accessorKey: 'stage',
            header: ({ column }) => <DataGridColumnHeader title="STAGE" column={column} />,
            cell: ({ row }) => <span className="text-sm font-medium">{formatStage(row.original.stage)}</span>,
            size: 250,
            enableSorting: true,
            sortingFn: (rowA, rowB) => {
                // Sort by workflow order (hidden _sortOrder)
                const a = rowA.original._sortOrder;
                const b = rowB.original._sortOrder;
                return a - b;
            },
        },
        {
            accessorKey: 'count',
            header: ({ column }) => <DataGridColumnHeader title="COUNT" column={column} />,
            size: 100,
            enableSorting: true,
        },
    ], []);

    const table = useReactTable({
        columns,
        data: stageData,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading owner overview...</div>;

    const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    const getTitle = () => {
        if (dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        return 'All Time';
    };

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Stage Status</h1>
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
                    <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(table, 'owner-overview')}>Export CSV</Button>
                <BackButton/>
                </div>
            </div>

            {/* KPI Widgets */}
            {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Total Jobs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.total_jobs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Total Fabs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.total_fabs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Active Fabs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.active_fabs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Pending Installs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.pending_installs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Completed Installs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.completed_installs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Completion Rate</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.completion_rate_percent}%</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Total Revenue</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{formatCurrency(kpis.total_revenue)}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Gross Margin</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.gross_margin_percent}%</div>
                    </Card>
                </div>
            )}

            {/* Stage Breakdown Table */}
            <DataGrid table={table} recordCount={stageData.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">{getTitle()} – Stage Breakdown</p>
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
                                                    <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0" style={{ width: cell.column.getSize() }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
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