// pages/reports/MonthlyCutCompletion.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays, Search, X } from 'lucide-react';
import { useGetMonthlyCutCompletionQuery } from '@/store/api/report';
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
import { UpdateMonthlyCutModal } from './component/MonthlyCutModal';
import { getFabIdLink, getJobNameLink, getJobNumberLink, renderLink } from '@/lib/reportLinks';
import { FabInfoCell } from '@/components/common/fabInfo';
import { Input } from '@/components/ui/input';
import { useIsSuperAdmin } from '@/hooks/use-permission';
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

export function MonthlyCutCompletionReport() {
    const isSuperAdmin = useIsSuperAdmin();
    // -- State --
    const [dateMode, setDateMode] = useState<'monthly' | 'custom'>('monthly');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    // Client-side filters
    const [searchType, setSearchType] = useState<'fab_id' | 'job_number' | 'job_name'>('fab_id');
    const [searchQuery, setSearchQuery] = useState('');
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

    const { data, isLoading, refetch } = useGetMonthlyCutCompletionQuery(queryParams);
    const rawRows = useMemo(() => data?.data?.rows ?? [], [data]);
    const summary = useMemo(() => {
        const s = data?.data?.summary;
        if (s) {
            // Compute cost_of_stone_total and gross_profit if not provided by API
            const cost_of_stone_total = s.cost_of_stone_total ?? rawRows.reduce((sum: number, r: any) => sum + (r.cost_of_stone || 0), 0);
            const gross_profit = s.gross_profit ?? (s.revenue || 0) - cost_of_stone_total;
            return { ...s, cost_of_stone_total, gross_profit };
        }
        return null;
    }, [data, rawRows]);

    // Client-side filtering
    const rows = useMemo(() => {
        let filtered = rawRows;

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(row => {
                if (searchType === 'fab_id') return String(row.fab_id).toLowerCase().includes(q);
                if (searchType === 'job_number') return String(row.job_number).toLowerCase().includes(q);
                if (searchType === 'job_name') return (row.job_name || '').toLowerCase().includes(q);
                return true;
            });
        }

        // Fab type filter (if applied)
        if (fabTypeFilter && fabTypeFilter !== 'all') {
            filtered = filtered.filter(row => row.fab_type === fabTypeFilter);
        }

        return filtered;
    }, [rawRows, searchQuery, searchType, fabTypeFilter]);
    // Action column (Edit)
    const actionCol: ColumnDef<any> = {
        id: 'actions',
        header: ({ column }) => <DataGridColumnHeader title="ACTION" column={column} />,
        cell: ({ row }) => {
            if (!isSuperAdmin) return null;
            return (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        setSelectedRow(row.original);
                        setUpdateModalOpen(true);
                    }}
                >
                    Edit
                </Button>
            );
        },
        size: 80,
        enableSorting: false,
    };

    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!rows.length) return [];
        const first = rows[0];
        const keys = Object.keys(first);

        const compositeFabFields = [
            'acct_name', 'account_name', 'job_name', 'input_area',
            'stone_type_name', 'stone_color_name', 'stone_thickness_value', 'edge_name'
        ];
        const dataCols = keys
            .filter(key => !compositeFabFields.includes(key))
            .map(key => {
                let headerTitle = key.replace(/_/g, ' ').toUpperCase();
                if (key === 'pieces' || key === 'no_of_pieces') headerTitle = 'NO OF PIECES';
                return {
                    accessorKey: key,
                    header: ({ column }) => <DataGridColumnHeader title={headerTitle} column={column} />,
                    size: key === 'job_name' || key === 'fab_info' ? 250 : 130,
                    enableSorting: true,
                    cell: ({ row }) => {
                        let val = row.original[key];
                        if (key.includes('date') && val) val = format(new Date(val), 'MMM dd, yyyy');
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
        const finalCols = [];
        finalCols.push(...dataCols.slice(0, insertIndex));
        finalCols.push(fabInfoCol);
        finalCols.push(...dataCols.slice(insertIndex));
        return finalCols;
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

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading monthly cut completion report...</div>;

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const getTitle = () => {
        if (dateMode === 'custom' && dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        return `${monthName} ${year} – Cut Details`;
    };

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Monthly Cut Completion</h1>
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
                                <Calendar mode="range" month={new Date()} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                                <div className="flex justify-end gap-2 p-3 border-t">
                                    <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); setIsDatePickerOpen(false); }}>Reset</Button>
                                    <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}

                    {/* Additional Filters: Fab ID, Job Number, General Search */}
                    <div className="relative flex items-center">
                        <Select value={searchType} onValueChange={(v) => setSearchType(v as 'fab_id' | 'job_number' | 'job_name')}>
                            <SelectTrigger className="w-[140px] h-[34px] rounded-e-none border-r-0">
                                <SelectValue placeholder="Search by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fab_id">Fab ID</SelectItem>
                                <SelectItem value="job_number">Job Number</SelectItem>
                                <SelectItem value="job_name">Job Name</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="relative">
                            <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                            <Input
                                placeholder={`Search by ${searchType.replace('_', ' ')}`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="ps-9 w-[230px] h-[34px] rounded-s-none"
                            />
                            {searchQuery && (
                                <Button
                                    mode="icon"
                                    variant="ghost"
                                    className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X />
                                </Button>
                            )}
                        </div>
                    </div>


                    <BackButton />
                </div>

            </div>

            {/* Summary Widgets with Cost of Stone and Gross Profit */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">NO OF Pieces</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.pieces?.toLocaleString() ?? '0'}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQ FT</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sq_ft?.toFixed(2) ?? '0.00'}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Revenue</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${summary.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Cost of Stone</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${summary.cost_of_stone_total?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Gross Profit</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${summary.gross_profit?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Revenue / SQFT</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${summary.revenue_per_sq_ft?.toFixed(2) ?? '0.00'}</p>
                    </Card>
                </div>
            )}

            {/* Data Table */}
            <DataGrid table={table} recordCount={rows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">{getTitle()}</p>
                        <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(table, `monthly-cut-${year}-${month}`)}>
                            Export CSV
                        </Button>
                        {/* <CardToolbar /> */}
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-10px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
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

            {/* Edit Modal */}
            <UpdateMonthlyCutModal
                open={updateModalOpen}
                onClose={() => { setUpdateModalOpen(false); setSelectedRow(null); }}
                cutId={selectedRow?.fab_id ?? selectedRow?.cut_id ?? 0}
                initialData={selectedRow ? {
                    revenue: selectedRow.revenue,
                    cost_of_stone: selectedRow.cost_of_stone,
                    revenue_per_sq_ft: selectedRow.revenue_per_sq_ft,
                } : undefined}
                onUpdateSuccess={() => refetch()}
            />
        </div>
    );
}