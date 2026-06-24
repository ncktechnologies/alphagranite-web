// pages/reports/RevisionReport.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetRevisionReportQuery } from '@/store/api/report';
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
import { getFabIdLink, getJobNumberLink, getJobNameLink, renderLink } from '@/lib/reportLinks';
import { BackButton } from '@/components/common/BackButton';
import { FabInfoCell } from '@/components/common/fabInfo';

// ─── Fab type color mapping ──────────────────────────────────────────────
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

// ─── Revision type display mapping ──────────────────────────────────────
const REVISION_TYPE_MAP: Record<string, string> = {
    'ag_redo': 'AG Redo',
    'shop': 'Shop',
    'sales': 'SCT',
};

// ─── Column definitions for Sales CT Revisions ─────────────────────────────
const SALES_COLUMNS = [
    { key: 'fab_type', label: 'FAB TYPE', isFabType: true },
    { key: 'fab_id', label: 'FAB ID', isLink: true, linkType: 'fab' },
    { key: 'job_number', label: 'JOB NO', isLink: true, linkType: 'jobNumber' },
    { key: 'fab_info', label: 'FAB INFO', isFabInfo: true },
    { key: 'revision_type_label', label: 'TYPE', isType: true },
    { key: 'revision_notes', label: 'NOTES' },
    { key: 'requested_by_name', label: 'REQUESTED BY' },
    // { key: 'assigned_to_name', label: 'ASSIGNED TO' },
    { key: 'created_at', label: 'CREATED AT', isDate: true },
];

// ─── Column definitions for Shop Revisions ────────────────────────────────
const SHOP_COLUMNS = [
    { key: 'fab_type', label: 'FAB TYPE', isFabType: true },
    { key: 'fab_id', label: 'FAB ID', isLink: false, linkType: 'fab' },
    { key: 'job_number', label: 'JOB NO', isLink: false, linkType: 'jobNumber' },
    { key: 'fab_info', label: 'FAB INFO', isFabInfo: true },
    { key: 'revision_type_label', label: 'TYPE', isType: true },
    { key: 'revision_notes', label: 'NOTES' },
    { key: 'revision_feedback', label: 'FEEDBACK' },
    { key: 'requested_by_name', label: 'REQUESTED BY' },
    // { key: 'assigned_to_name', label: 'ASSIGNED TO' },
    { key: 'created_at', label: 'CREATED AT', isDate: true },
    { key: 'revision_completed', label: 'COMPLETED', isBoolean: true },
    { key: 'completed_at', label: 'COMPLETED AT', isDate: true },
];

function buildColumns<T extends Record<string, any>>(
    data: T[],
    columnDefs: Array<{
        key: keyof T;
        label: string;
        isLink?: boolean;
        linkType?: 'fab' | 'jobNumber' | 'jobName';
        isDate?: boolean;
        isBoolean?: boolean;
        isType?: boolean;
        isFabInfo?: boolean;
        isFabType?: boolean;
    }>
): ColumnDef<T>[] {
    if (!data.length) return [];

    return columnDefs.map((def) => {
        const { key, label, isLink, linkType, isDate, isBoolean, isType, isFabInfo, isFabType } = def;

        if (isFabInfo) {
            return {
                accessorKey: key as string,
                header: ({ column }) => <DataGridColumnHeader title={label} column={column} />,
                size: 300,
                enableSorting: false,
                cell: ({ row }) => <FabInfoCell data={row.original} />,
            };
        }

        return {
            accessorKey: key as string,
            header: ({ column }) => <DataGridColumnHeader title={label} column={column} />,
            size: key === 'revision_notes' || key === 'revision_feedback' ? 250 : key === 'fab_type' ? 110 : 140,
            enableSorting: true,
            cell: ({ row }) => {
                const val = row.original[key];
                if (val == null) return <span className="text-sm">—</span>;

                if (isFabType && typeof val === 'string') {
                    return <span className="uppercase text-sm">{val}</span>;
                }

                if (isType && typeof val === 'string') {
                    const display = REVISION_TYPE_MAP[val] || val;
                    return <span className="text-sm">{display}</span>;
                }

                if (isLink && linkType === 'fab') {
                    const link = getFabIdLink(Number(val));
                    return renderLink(link);
                }
                if (isLink && linkType === 'jobNumber') {
                    const link = getJobNumberLink(String(val));
                    return renderLink(link);
                }
                if (isLink && linkType === 'jobName') {
                    const jobId = row.original.job_id;
                    if (jobId) {
                        const link = getJobNameLink(String(val), jobId);
                        if (link) return renderLink(link);
                    }
                    return <span className="text-sm">{val}</span>;
                }

                if (isDate && typeof val === 'string') {
                    try { return <span className="text-sm">{format(new Date(val), 'MMM dd, yyyy h:mm a')}</span>; } catch { }
                }

                if (isBoolean) {
                    return <span className="text-sm">{val ? 'Yes' : 'No'}</span>;
                }

                return <span className="text-sm">{val}</span>;
            },
        };
    });
}

export function RevisionReport() {
    // ─── Date mode ──────────────────────────────────────────────────────────
    const [dateMode, setDateMode] = useState<'monthly' | 'custom'>('monthly');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // ─── Pagination & sorting ──────────────────────────────────────────────
    const [salesPagination, setSalesPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [shopPagination, setShopPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [salesSorting, setSalesSorting] = useState<SortingState>([]);
    const [shopSorting, setShopSorting] = useState<SortingState>([]);

    // ─── SCT Filters ──────────────────────────────────────────────────────
    const [sctFabTypeFilter, setSctFabTypeFilter] = useState<string>('all');
    const [sctRevisionTypeFilter, setSctRevisionTypeFilter] = useState<string>('all');

    // ─── Shop Filters ──────────────────────────────────────────────────────
    const [shopFabTypeFilter, setShopFabTypeFilter] = useState<string>('all');

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
        return params;
    }, [dateMode, dateRange, year, month]);

    const { data, isLoading, isError } = useGetRevisionReportQuery(queryParams);

    // ─── Extract data ──────────────────────────────────────────────────────
    const summary = useMemo(() => data?.data?.summary ?? null, [data]);
    const salesRevisions = useMemo(() => data?.data?.sales_ct_revisions ?? [], [data]);
    const shopRevisions = useMemo(() => data?.data?.shop_revisions ?? [], [data]);

    // ─── Extract filter options ────────────────────────────────────────────
    const sctFabTypes = useMemo(() => {
        const types = new Set<string>();
        salesRevisions.forEach(row => { if (row.fab_type) types.add(row.fab_type); });
        return Array.from(types).sort();
    }, [salesRevisions]);

    const sctRevisionTypes = useMemo(() => {
        const types = new Set<string>();
        salesRevisions.forEach(row => {
            if (row.revision_type_label) {
                const display = REVISION_TYPE_MAP[row.revision_type_label] || row.revision_type_label;
                types.add(display);
            }
        });
        return Array.from(types).sort();
    }, [salesRevisions]);

    const shopFabTypes = useMemo(() => {
        const types = new Set<string>();
        shopRevisions.forEach(row => { if (row.fab_type) types.add(row.fab_type); });
        return Array.from(types).sort();
    }, [shopRevisions]);

    // ─── Apply filters ──────────────────────────────────────────────────────
    const filteredSalesRevisions = useMemo(() => {
        return salesRevisions.filter(row => {
            const matchFab = sctFabTypeFilter === 'all' || row.fab_type === sctFabTypeFilter;
            const matchRevType = sctRevisionTypeFilter === 'all' ||
                (row.revision_type_label && REVISION_TYPE_MAP[row.revision_type_label] === sctRevisionTypeFilter) ||
                row.revision_type_label === sctRevisionTypeFilter;
            return matchFab && matchRevType;
        });
    }, [salesRevisions, sctFabTypeFilter, sctRevisionTypeFilter]);

    const filteredShopRevisions = useMemo(() => {
        return shopRevisions.filter(row => {
            return shopFabTypeFilter === 'all' || row.fab_type === shopFabTypeFilter;
        });
    }, [shopRevisions, shopFabTypeFilter]);

    // Reset pagination when filters change
    useMemo(() => {
        setSalesPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [filteredSalesRevisions]);

    useMemo(() => {
        setShopPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [filteredShopRevisions]);

    // ─── Build columns ─────────────────────────────────────────────────────
    const salesColumns = useMemo(() => buildColumns(filteredSalesRevisions, SALES_COLUMNS), [filteredSalesRevisions]);
    const shopColumns = useMemo(() => buildColumns(filteredShopRevisions, SHOP_COLUMNS), [filteredShopRevisions]);

    // ─── Helper for row background colors ──────────────────────────────────
    const getRowAttributes = (row: any) => {
        const fabType = row.original.fab_type;
        const bgColor = getFabColor(fabType);
        if (bgColor !== 'transparent') {
            return { style: { backgroundColor: bgColor } };
        }
        return {};
    };

    // ─── Tables ─────────────────────────────────────────────────────────────
    const salesTable = useReactTable({
        columns: salesColumns,
        data: filteredSalesRevisions,
        state: { pagination: salesPagination, sorting: salesSorting },
        onPaginationChange: setSalesPagination,
        onSortingChange: setSalesSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
        meta: { getRowAttributes },
    });

    const shopTable = useReactTable({
        columns: shopColumns,
        data: filteredShopRevisions,
        state: { pagination: shopPagination, sorting: shopSorting },
        onPaginationChange: setShopPagination,
        onSortingChange: setShopSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
        meta: { getRowAttributes },
    });

    // ─── Render helper ─────────────────────────────────────────────────────
    const renderTable = (
        table: any,
        title: string,
        exportName: string,
        filterComponent?: React.ReactNode
    ) => (
        <DataGrid table={table} recordCount={table.getCoreRowModel().rows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
            <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-base font-semibold text-[#4b545d]">{title}</p>
                        {filterComponent && filterComponent}
                    </div>
                    <CardToolbar>
                        <Button variant="outline" size="sm" className="h-[34px]" onClick={() => exportTableToCSV(table, exportName)}>Export CSV</Button>
                    </CardToolbar>
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
                                                    <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0" style={{ width: cell.column.getSize() }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
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
    );

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading revision report...</div>;
    if (isError) return <div className="p-5 text-red-500">Error loading report.</div>;

    const getTitle = () => {
        if (dateMode === 'custom' && dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
        return `${monthName} ${year}`;
    };

    // ─── Filter Components ──────────────────────────────────────────────────
    const sctFilters = (
        <>
            <Select value={sctFabTypeFilter} onValueChange={setSctFabTypeFilter}>
                <SelectTrigger className="min-w-[130px] w-auto h-[34px] border-[#e2e4ed]">
                    <SelectValue placeholder="Fab Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Fab Types</SelectItem>
                    {sctFabTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={sctRevisionTypeFilter} onValueChange={setSctRevisionTypeFilter}>
                <SelectTrigger className="min-w-[130px] w-auto h-[34px] border-[#e2e4ed]">
                    <SelectValue placeholder="Revision Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Revision Types</SelectItem>
                    {sctRevisionTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    );

    const shopFilters = (
        <Select value={shopFabTypeFilter} onValueChange={setShopFabTypeFilter}>
            <SelectTrigger className="min-w-[130px] w-auto h-[34px] border-[#e2e4ed]">
                <SelectValue placeholder="Fab Type" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Fab Types</SelectItem>
                {shopFabTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    return (
        <div className="flex flex-col gap-5 p-5">
            {/* ─── Top Bar ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Revision Analysis</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* <Select value={dateMode} onValueChange={(v) => setDateMode(v as 'monthly' | 'custom')}>
                        <SelectTrigger className="w-[120px] h-[34px] border-[#e2e4ed]">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select> */}

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
                                <Calendar
                                    mode="range"
                                    month={month}
                                    onMonthChange={setMonth}
                                    selected={tempDateRange}
                                    onSelect={setTempDateRange}
                                    numberOfMonths={2}
                                />
                                <div className="flex justify-end gap-2 p-3 border-t">
                                    <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); setIsDatePickerOpen(false); }}>Reset</Button>
                                    <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    <BackButton />
                </div>
            </div>

            {/* ─── Summary Widgets ────────────────────────────────────────────── */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SCT Revisions</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sales_ct_revision_count}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Shop Revisions</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.shop_revision_count}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Active Fabs with SCT Revisions</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.active_fabs_with_sales_ct_revisions}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Active Fabs with Shop Revisions</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.active_fabs_with_shop_revisions}</p>
                    </Card>
                </div>
            )}

            {/* ─── Tables ──────────────────────────────────────────────────────── */}
            <div className="space-y-6">
                {filteredSalesRevisions.length > 0 && renderTable(
                    salesTable,
                    `SCT Revisions – ${getTitle()}`,
                    'sales-ct-revisions',
                    sctFilters
                )}
                {filteredShopRevisions.length > 0 && renderTable(
                    shopTable,
                    `Shop Revisions – ${getTitle()}`,
                    'shop-revisions',
                    shopFilters
                )}
                {filteredSalesRevisions.length === 0 && filteredShopRevisions.length === 0 && (
                    <div className="text-center py-8 text-[#7c8689]">No revisions found for the selected period.</div>
                )}
            </div>
        </div>
    );
}