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
import { FabInfoCell } from '@/components/common/fabInfo';
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

// ─── Pivot helper ──────────────────────────────────────────────────────────
const pivotTurnaroundData = (rows: any[]) => {
    if (!rows.length) return { rows: [], stageKeys: [] };
    const sample = rows[0];
    const stageKeys = Object.keys(sample).filter(
        key => (key.endsWith('_days') || key.includes('days')) && key !== 'number_of_days' && typeof sample[key] === 'number'
    );
    const pivoted = stageKeys.map(key => {
        const values = rows
            .map(r => r[key])
            .filter((v): v is number => typeof v === 'number' && v !== null && !isNaN(v));
        if (!values.length) return null;
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        const count = values.length;
        return {
            metric: key.replace(/_days$/, '').replace(/_/g, ' ').toUpperCase(),
            total: sum,
            average: avg,
            max,
            min,
            count,
        };
    }).filter(Boolean);
    return { rows: pivoted, stageKeys };
};

export function TurnaroundTimesReport() {
    // ─── Date mode ──────────────────────────────────────────────────────────
    const [dateMode, setDateMode] = useState<'monthly' | 'custom'>('monthly');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // ─── Sorting & pagination ──────────────────────────────────────────────
    // Summary table
    const [summaryPagination, setSummaryPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [summarySorting, setSummarySorting] = useState<SortingState>([]);
    // Detail table
    const [detailPagination, setDetailPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [detailSorting, setDetailSorting] = useState<SortingState>([]);

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

    // ─── Query params ──────────────────────────────────────────────────────
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
    const rawRows = useMemo(() => data?.data?.rows ?? [], [data]);
    const stageAverages = useMemo(() => data?.data?.stage_averages ?? null, [data]);

    // ─── Pivot the data ────────────────────────────────────────────────────
    const { rows: pivotedRows } = useMemo(() => pivotTurnaroundData(rawRows), [rawRows]);

    // ─── Summary columns ────────────────────────────────────────────────────
    const summaryColumns = useMemo<ColumnDef<any>[]>(() => [
        {
            id: 'metric',
            accessorKey: 'metric',
            header: ({ column }) => <DataGridColumnHeader title="STAGE METRIC" column={column} />,
            cell: ({ row }) => <span className="text-sm font-medium">{row.original.metric}</span>,
            size: 200,
            enableSorting: true,
        },
        {
            accessorKey: 'total',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL DAYS" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.total.toFixed(1)}</span>,
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'average',
            header: ({ column }) => <DataGridColumnHeader title="AVG DAYS" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.average.toFixed(1)}</span>,
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'max',
            header: ({ column }) => <DataGridColumnHeader title="MAX DAYS" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.max.toFixed(1)}</span>,
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'min',
            header: ({ column }) => <DataGridColumnHeader title="MIN DAYS" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.min.toFixed(1)}</span>,
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'count',
            header: ({ column }) => <DataGridColumnHeader title="COUNT" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.count}</span>,
            size: 100,
            enableSorting: true,
        },
    ], []);

    const summaryTable = useReactTable({
        columns: summaryColumns,
        data: pivotedRows,
        state: { pagination: summaryPagination, sorting: summarySorting },
        onPaginationChange: setSummaryPagination,
        onSortingChange: setSummarySorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
    });

    // ─── Detail columns ────────────────────────────────────────────────────
    const detailColumns = useMemo<ColumnDef<any>[]>(() => {
        if (!rawRows.length) return [];
        const first = rawRows[0];
        const keys = Object.keys(first);
        const compositeFabFields = [
            'acct_name', 'account_name', 'job_name', 'input_area',
            'stone_type_name', 'stone_color_name', 'stone_thickness_value', 'edge_name'
        ];

        const dataCols = keys
            .filter(key => !compositeFabFields.includes(key))
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
                            try { val = format(new Date(val), 'MMM dd, yyyy'); } catch {}
                        }
                        if (typeof val === 'number') val = val.toLocaleString();
                        if (val == null) return <span className="text-sm">-</span>;

                        if (key === 'fab_id') {
                            const link = getFabIdLink(Number(val));
                            return renderLink(link);
                        }
                        if (key === 'job_number') {
                            const link = getJobNumberLink(String(val));
                            return renderLink(link);
                        }
                        if (key === 'job_name') {
                            const jobId = row.original.job_id;
                            if (jobId) {
                                const link = getJobNameLink(String(val), jobId);
                                if (link) return renderLink(link);
                            }
                            return <span className="text-sm">{val}</span>;
                        }
                        return <span className="text-sm">{val}</span>;
                    },
                };
            });

        const fabInfoCol: ColumnDef<any> = {
            id: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => <FabInfoCell data={row.original} />,
            size: 400,
            enableSorting: false,
        };

        const jobNumberIndex = dataCols.findIndex(col => col.accessorKey === 'job_number');
        const insertIndex = jobNumberIndex !== -1 ? jobNumberIndex + 1 : 1;
        const finalCols = [...dataCols.slice(0, insertIndex)];
        // finalCols.push(fabInfoCol);
        finalCols.push(...dataCols.slice(insertIndex));
        return finalCols;
    }, [rawRows]);

    const detailTable = useReactTable({
        columns: detailColumns,
        data: rawRows,
        state: { pagination: detailPagination, sorting: detailSorting },
        onPaginationChange: setDetailPagination,
        onSortingChange: setDetailSorting,
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

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading turnaround times report...</div>;

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const getTitle = () => {
        if (dateMode === 'custom' && dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        return `${monthName} ${year}`;
    };

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Turnaround Times</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                        <SelectTrigger className="w-[150px] h-[34px] border-[#e2e4ed]">
                            <SelectValue placeholder="Fab Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {fabTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                    </Select>

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
                                    {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
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

                    <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(detailTable, `turnaround-detail-${year}-${month}`)}>
                        Export CSV
                    </Button>
                <BackButton/>
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
                                {typeof days === 'number' ? days.toFixed(1) : days} days
                            </p>
                        </Card>
                    ))}
                </div>
            )}

            {/* Summary Table */}
            <DataGrid table={summaryTable} recordCount={pivotedRows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">Turnaround Summary – {getTitle()}</p>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {summaryTable.getHeaderGroups().map(headerGroup => (
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
                                        {summaryTable.getRowModel().rows.map(row => (
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
                                                <td colSpan={summaryColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
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

            {/* Detail Table */}
            <DataGrid table={detailTable} recordCount={rawRows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">Fab Details – {getTitle()}</p>
                        <CardToolbar />
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {detailTable.getHeaderGroups().map(headerGroup => (
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
                                        {detailTable.getRowModel().rows.map(row => {
                                            const rowAttrs = detailTable.options.meta?.getRowAttributes?.(row) || {};
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
                                        {rawRows.length === 0 && (
                                            <tr>
                                                <td colSpan={detailColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
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