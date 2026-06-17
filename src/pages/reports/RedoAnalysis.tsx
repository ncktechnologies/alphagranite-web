// pages/reports/RedoAnalysis.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetRedoAnalysisQuery } from '@/store/api/report';
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
import { formatStage } from './OwnerOverview';
import { getJobNumberLink, renderLink } from '@/lib/reportLinks';

interface RedoStageRow {
    stage: string;
    redo_count: number;
}

interface AccountRow {
    account_name: string;
    redo_count: number;
    redo_revenue: number;
}

interface JobRow {
    job_number: string;
    job_name: string;
    redo_count: number;
}

export function RedoAnalysisReport() {
    // ─── Date range filter ────────────────────────────────────────────────────
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    // ─── Sorting & pagination for each table ────────────────────────────────
    const [stagePagination, setStagePagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [accountPagination, setAccountPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [jobPagination, setJobPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    const [stageSorting, setStageSorting] = useState<SortingState>([]);
    const [accountSorting, setAccountSorting] = useState<SortingState>([]);
    const [jobSorting, setJobSorting] = useState<SortingState>([]);

    // ─── Build query params ────────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        const params: { start_date?: string; end_date?: string } = {};
        if (dateRange?.from) {
            params.start_date = format(dateRange.from, 'yyyy-MM-dd');
            params.end_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        return Object.keys(params).length ? params : undefined;
    }, [dateRange]);

    const { data, isLoading } = useGetRedoAnalysisQuery(queryParams);

    const summary = useMemo(() => data?.data?.summary ?? null, [data]);
    const redoByStage: RedoStageRow[] = useMemo(() => data?.data?.redo_by_stage ?? [], [data]);
    const topAccounts: AccountRow[] = useMemo(() => data?.data?.top_accounts_with_redo ?? [], [data]);
    const topJobs: JobRow[] = useMemo(() => data?.data?.top_jobs_with_redo ?? [], [data]);

    // ─── Stage columns ─────────────────────────────────────────────────────────
    const stageColumns = useMemo<ColumnDef<RedoStageRow>[]>(() => [
        {
            accessorKey: 'stage',
            header: ({ column }) => <DataGridColumnHeader title="STAGE" column={column} />,
            cell: ({ row }) => <span className="text-sm font-medium">{formatStage(row.original.stage)}</span>,
            size: 250,
            enableSorting: true,
        },
        {
            accessorKey: 'redo_count',
            header: ({ column }) => <DataGridColumnHeader title="REDO COUNT" column={column} />,
            size: 120,
            enableSorting: true,
        },
    ], []);

    // ─── Account columns ──────────────────────────────────────────────────────
    const accountColumns = useMemo<ColumnDef<AccountRow>[]>(() => [
        {
            accessorKey: 'account_name',
            header: ({ column }) => <DataGridColumnHeader title="ACCOUNT" column={column} />,
            size: 250,
            enableSorting: true,
        },
        {
            accessorKey: 'redo_count',
            header: ({ column }) => <DataGridColumnHeader title="REDO COUNT" column={column} />,
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'redo_revenue',
            header: ({ column }) => <DataGridColumnHeader title="REDO REVENUE" column={column} />,
            cell: ({ row }) => `$${row.original.redo_revenue.toFixed(2)}`,
            size: 150,
            enableSorting: true,
        },
    ], []);

    // ─── Job columns ──────────────────────────────────────────────────────────
    const jobColumns = useMemo<ColumnDef<JobRow>[]>(() => [
        {
            accessorKey: 'job_number',
            header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
            cell: ({ row }) => {
                const jobNumber = row.original.job_number;
                const link = getJobNumberLink(jobNumber);
                return renderLink(link);
            },
            size: 100,
            enableSorting: true,
        },
        {
            accessorKey: 'job_name',
            header: ({ column }) => <DataGridColumnHeader title="JOB NAME" column={column} />,
            size: 250,
            enableSorting: true,
        },
        {
            accessorKey: 'redo_count',
            header: ({ column }) => <DataGridColumnHeader title="REDO COUNT" column={column} />,
            size: 120,
            enableSorting: true,
        },
    ], []);

    // ─── Tables ───────────────────────────────────────────────────────────────
    const stageTable = useReactTable({
        columns: stageColumns,
        data: redoByStage,
        state: { pagination: stagePagination, sorting: stageSorting },
        onPaginationChange: setStagePagination,
        onSortingChange: setStageSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
    });

    const accountTable = useReactTable({
        columns: accountColumns,
        data: topAccounts,
        state: { pagination: accountPagination, sorting: accountSorting },
        onPaginationChange: setAccountPagination,
        onSortingChange: setAccountSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
    });

    const jobTable = useReactTable({
        columns: jobColumns,
        data: topJobs,
        state: { pagination: jobPagination, sorting: jobSorting },
        onPaginationChange: setJobPagination,
        onSortingChange: setJobSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading redo analysis...</div>;

    // Helper to render a table inside a card
    const renderTable = (table: any, title: string, exportName: string) => (
        <DataGrid table={table} recordCount={table.getCoreRowModel().rows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
            <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                    <p className="text-base font-semibold text-[#4b545d]">{title}</p>
                    <CardToolbar>
                        <Button variant="outline" size="sm" className="h-[34px]" onClick={() => exportTableToCSV(table, exportName)}>Export CSV</Button>
                    </CardToolbar>
                </CardHeader>
                <CardTable>
                    <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
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
                            </tbody>
                        </table>
                        <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
                    </ScrollArea>
                </CardTable>
                <CardFooter className="bg-white border-t border-[#e2e4ed] px-4 py-2">
                    <DataGridPagination />
                </CardFooter>
            </Card>
        </DataGrid>
    );

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
                <h1 className="text-2xl font-semibold text-[#4b545d]">Redo Analysis</h1>
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
                </div>
            </div>

            {/* Summary Widgets */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Total Fabs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_fabs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Revised Fabs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.revised_fabs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Redo Rate</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.redo_rate_percent}%</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Revision Events</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.revision_events}</div>
                    </Card>
                </div>
            )}

            {/* Three Tables */}
            <div className="space-y-6">
                {renderTable(stageTable, 'Redo by Stage', 'redo-by-stage')}
                {renderTable(accountTable, 'Top Accounts with Redo', 'top-accounts-redo')}
                {renderTable(jobTable, 'Top Jobs with Redo', 'top-jobs-redo')}
            </div>
        </div>
    );
}