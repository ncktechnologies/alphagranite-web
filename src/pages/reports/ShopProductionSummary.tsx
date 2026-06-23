// pages/reports/ShopProductionSummary.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays, Search, X } from 'lucide-react';
import { useGetShopProductionSummaryQuery } from '@/store/api/report';
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
import { getFabIdLink, getJobNumberLink, renderLink } from '@/lib/reportLinks';
import { FabInfoCell } from '@/components/common/fabInfo';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BackButton } from '@/components/common/BackButton';

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

export function ShopProductionSummary() {
    // ─── Date range ───────────────────────────────────────────────────────────
    // Default to today
    const today = new Date();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: today, to: today });
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>({ from: today, to: today });
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(today);

    // ─── Filters ──────────────────────────────────────────────────────────────
    const [statusId, setStatusId] = useState<number | null>(1); // default Active
    const [includeNonShopStages, setIncludeNonShopStages] = useState<boolean>(false);
    const [includeFabDetails, setIncludeFabDetails] = useState<boolean>(true);

    // ─── Pagination & sorting ────────────────────────────────────────────────
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sorting, setSorting] = useState<SortingState>([]);

    // ─── Build query params ──────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        const params: any = {};
        if (dateRange?.from) {
            params.start_date = format(dateRange.from, 'yyyy-MM-dd');
            params.end_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        if (statusId !== null && statusId !== undefined) {
            params.status_id = statusId;
        }
        params.include_non_shop_stages = true;
        params.include_fab_details = includeFabDetails;
        return params;
    }, [dateRange, statusId, includeNonShopStages, includeFabDetails]);

    const { data, isLoading } = useGetShopProductionSummaryQuery(queryParams);
    const summary = useMemo(() => data?.data?.summary ?? null, [data]);
    const stageCounts = useMemo(() => data?.data?.shop_current_stage_counts ?? [], [data]);
    const fabs = useMemo(() => data?.data?.fabs ?? [], [data]);

    // ─── Stage summary columns ──────────────────────────────────────────────
    const stageColumns = useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: 'shop_current_stage',
            header: ({ column }) => <DataGridColumnHeader title="SHOP CURRENT STAGE" column={column} />,
            cell: ({ row }) => <span className="text-sm font-medium">{row.original.shop_current_stage?.toUpperCase() || '-'}</span>,
            size: 150,
            enableSorting: true,
        },
        {
            accessorKey: 'fab_count',
            header: ({ column }) => <DataGridColumnHeader title="FAB COUNT" column={column} />,
            size: 100,
            enableSorting: true,
        },
        {
            accessorKey: 'total_sqft',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL SQFT" column={column} />,
            cell: ({ row }) => {
                const val = Number(row.original.total_sqft) || 0;
                return <span className="text-sm">{val.toFixed(2)}</span>;
            },
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'total_pieces',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL PIECES" column={column} />,
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'avg_work_percentage',
            header: ({ column }) => <DataGridColumnHeader title="AVG WORK %" column={column} />,
            cell: ({ row }) => {
                const val = Number(row.original.avg_work_percentage) || 0;
                return <span className="text-sm">{val.toFixed(2)}%</span>;
            },
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'completed_fab_count',
            header: ({ column }) => <DataGridColumnHeader title="COMPLETED" column={column} />,
            size: 100,
            enableSorting: true,
        },
        {
            accessorKey: 'in_progress_fab_count',
            header: ({ column }) => <DataGridColumnHeader title="IN PROGRESS" column={column} />,
            size: 120,
            enableSorting: true,
        },
    ], []);

    const stageTable = useReactTable({
        columns: stageColumns,
        data: stageCounts,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
    });

    // ─── Fab details columns ────────────────────────────────────────────────
    const fabColumns = useMemo<ColumnDef<any>[]>(() => {
        if (!fabs.length) return [];
        const first = fabs[0];
        const keys = Object.keys(first);
        const compositeFabFields = [
            'acct_name', 'account_name', 'job_name', 'input_area',
            'stone_type_name', 'stone_color_name', 'stone_thickness_value', 'edge_name'
        ];

        const actionCol: ColumnDef<any> = {
            id: 'actions',
            header: ({ column }) => <DataGridColumnHeader title="ACTION" column={column} />,
            cell: () => null,
            size: 60,
            enableSorting: false,
        };

        const dataCols = keys
            .filter(key => !compositeFabFields.includes(key) && key !== 'plans')
            .map(key => {
                let headerTitle = key.replace(/_/g, ' ').toUpperCase();
                return {
                    accessorKey: key,
                    header: ({ column }) => <DataGridColumnHeader title={headerTitle} column={column} />,
                    size: key === 'job_name' || key === 'fab_info' ? 250 : 130,
                    enableSorting: true,
                    cell: ({ row }) => {
                        let val = row.original[key];
                        if (key.includes('date') && val) {
                            try { val = format(new Date(val), 'MMM dd, yyyy'); } catch { }
                        }
                        if (typeof val === 'number') val = val.toLocaleString();
                        if (val == null) return <span className="text-sm">-</span>;

                        // if (key === 'fab_id') {
                        //     const link = getFabIdLink(Number(val));
                        //     return renderLink(link);
                        // }
                        // if (key === 'job_number') {
                        //     const link = getJobNumberLink(String(val));
                        //     return renderLink(link);
                        // }
                        // if (key === 'job_name') {
                        //     const jobId = row.original.job_id;
                        //     if (jobId) {
                        //         const link = getJobNameLink(String(val), jobId);
                        //         if (link) return renderLink(link);
                        //     }
                        //     return <span className="text-sm">{val}</span>;
                        // }
                        if (key === 'avg_work_percentage') {
                            const num = Number(val) || 0;
                            return <span className="text-sm">{num.toFixed(2)}%</span>;
                        }
                        if (key === 'plan_count') {
                            return <span className="text-sm">{val}</span>;
                        }
                        return <span className="text-sm">{val}</span>;
                    },
                };
            });

        // Add a column for plans summary (e.g., list of plan names with percentages)
        const plansCol: ColumnDef<any> = {
            id: 'plans',
            header: ({ column }) => <DataGridColumnHeader title="PLANS" column={column} />,
            cell: ({ row }) => {
                const plans = row.original.plans || [];
                if (!plans.length) return <span className="text-sm text-gray-400">—</span>;
                return (
                    <div className="text-xs flex flex-wrap gap-1">
                        {plans.slice(0, 3).map((p: any, idx: number) => (
                            <span key={idx} className="bg-gray-100 px-1.5 py-0.5 rounded">
                                {p.plan_name}: {p.work_percentage}%
                            </span>
                        ))}
                        {plans.length > 3 && <span className="text-gray-400">+{plans.length - 3} more</span>}
                    </div>
                );
            },
            size: 200,
            enableSorting: false,
        };

        const fabInfoCol: ColumnDef<any> = {
            id: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => <FabInfoCell data={row.original} />,
            size: 400,
            enableSorting: false,
        };

        const jobNumberIndex = dataCols.findIndex(col => col.accessorKey === 'job_number');
        const insertIndex = jobNumberIndex !== -1 ? jobNumberIndex + 1 : 1;
        const finalCols = [actionCol];
        finalCols.push(...dataCols.slice(0, insertIndex));
        finalCols.push(fabInfoCol);
        finalCols.push(plansCol);
        finalCols.push(...dataCols.slice(insertIndex));
        return finalCols;
    }, [fabs]);

    const fabTable = useReactTable({
        columns: fabColumns,
        data: fabs,
        state: { pagination: { ...pagination, pageIndex: 0, pageSize: 50 }, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
        meta: {
            getRowAttributes: (row) => {
                const fabType = row.original.fab_type?.toLowerCase();
                const bgColor = getFabColor(fabType);
                if (bgColor !== 'transparent') {
                    return { style: { backgroundColor: bgColor } };
                }
                return {};
            },
        },
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading shop production summary...</div>;

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
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Shop Production Summary</h1>
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

                    {/* <Select value={statusId !== null ? String(statusId) : 'all'} onValueChange={(v) => setStatusId(v === 'all' ? null : Number(v))}>
                        <SelectTrigger className="w-[150px] h-[34px] border-[#e2e4ed]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="1">Active</SelectItem>
                            <SelectItem value="2">Inactive</SelectItem>
                            <SelectItem value="3">Completed</SelectItem>
                        </SelectContent>
                    </Select> */}

                    <div className="flex items-center gap-4">
                        {/* <div className="flex items-center space-x-2">
                            <Checkbox
                                id="includeNonShopStages"
                                checked={includeNonShopStages}
                                onCheckedChange={(checked) => setIncludeNonShopStages(!!checked)}
                            />
                            <Label htmlFor="includeNonShopStages" className="text-sm text-[#4b545d]">Include Non-Shop Stages</Label>
                        </div> */}
                        {/* <div className="flex items-center space-x-2">
                            <Checkbox
                                id="includeFabDetails"
                                checked={includeFabDetails}
                                onCheckedChange={(checked) => setIncludeFabDetails(!!checked)}
                            />
                            <Label htmlFor="includeFabDetails" className="text-sm text-[#4b545d]">Include Fab Details</Label>
                        </div> */}
                    </div>

                    <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(fabTable, 'shop-production-summary')}>
                        Export CSV
                    </Button>
                <BackButton/>
                </div>
            </div>

            {/* Summary Widgets */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total Fabs</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_fabs}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total SQFT</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_sqft?.toFixed(2)}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total Pieces</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_pieces}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Completed Fabs</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.completed_fabs}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">In Progress</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.in_progress_fabs}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Unplanned</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.unplanned_fabs}</p>
                    </Card>
                </div>
            )}

            {/* Stage Summary Table */}
            {stageCounts.length > 0 && (
                <DataGrid table={stageTable} recordCount={stageCounts.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                    <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                        <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                            <p className="text-base font-semibold text-[#4b545d]">Stage Summary</p>
                            <CardToolbar />
                        </CardHeader>
                        <CardTable>
                            <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-280px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                                <div className="relative">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead className="sticky top-0 z-10 bg-white">
                                            {stageTable.getHeaderGroups().map(headerGroup => (
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
                                            {stageTable.getRowModel().rows.map(row => (
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
                                            {stageCounts.length === 0 && (
                                                <tr>
                                                    <td colSpan={stageColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
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
            )}

            {/* FAB Details Table */}
            {/* <DataGrid table={fabTable} recordCount={fabs.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">FAB Details – {getTitle()}</p>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-280px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {fabTable.getHeaderGroups().map(headerGroup => (
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
                                        {fabTable.getRowModel().rows.map(row => {
                                            const rowAttrs = fabTable.options.meta?.getRowAttributes?.(row) || {};
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
                                        {fabs.length === 0 && (
                                            <tr>
                                                <td colSpan={fabColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
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
            </DataGrid> */}
        </div>
    );
}