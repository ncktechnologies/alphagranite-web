// pages/reports/DailyInstallCompletion.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays, Search, X } from 'lucide-react';
import { useGetDailyInstallCompletionQuery } from '@/store/api/report';
import { useGetFabTypesQuery } from '@/store/api/job';
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
import { UpdateDailyInstallModal } from './component/DailyMonthlyInstall';
import { getFabIdLink, getJobNameLink, getJobNumberLink, renderLink } from '@/lib/reportLinks';
import { FabInfoCell } from '@/components/common/fabInfo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// ─── Currency columns ─────────────────────────────────────────────────────
export const CURRENCY_COLUMNS = new Set(['revenue', 'gp', 'gross_profit', 'cost_of_stone']);

export function DailyInstallCompletionReport() {
    const isSuperAdmin = useIsSuperAdmin();

    // ─── Date range ────────────────────────────────────────────────────────
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    // ─── Pagination & sorting for detail table ──────────────────────────
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sorting, setSorting] = useState<SortingState>([]);

    // ─── Search ─────────────────────────────────────────────────────────────
    const [searchType, setSearchType] = useState<'fab_id' | 'job_number' | 'job_name'>('fab_id');
    const [searchQuery, setSearchQuery] = useState('');

    // ─── Fab type filter (backend) ──────────────────────────────────────
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');

    // ─── Installer filter (client‑side) ─────────────────────────────────
    const [installerFilter, setInstallerFilter] = useState<string>('all');

    // ─── Modal ──────────────────────────────────────────────────────────
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    // ─── Fetch fab types ────────────────────────────────────────────────
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

    // ─── Build API params ──────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        const params: { start_date?: string; end_date?: string; fab_type?: string } = {};
        if (dateRange?.from) {
            params.start_date = format(dateRange.from, 'yyyy-MM-dd');
            params.end_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        if (fabTypeFilter && fabTypeFilter !== 'all') {
            params.fab_type = fabTypeFilter;
        }
        return Object.keys(params).length ? params : undefined;
    }, [dateRange, fabTypeFilter]);

    const { data, isLoading, refetch } = useGetDailyInstallCompletionQuery(queryParams);

    // ─── Extract data from new API structure ──────────────────────────────
    const entries = useMemo(() => data?.data?.entries ?? [], [data]);
    const dailyTotals = useMemo(() => data?.data?.daily_totals ?? [], [data]);
    const grandTotals = useMemo(() => data?.data?.grand_totals ?? null, [data]);

    // ─── Extract unique installers ───────────────────────────────────────
    const installers = useMemo(() => {
        const set = new Set<string>();
        entries.forEach(row => {
            const name = row.installer_name;
            if (name) set.add(String(name));
        });
        return Array.from(set).sort();
    }, [entries]);

    // ─── Client‑side filtering for entries ──────────────────────────────
    const filteredEntries = useMemo(() => {
        let result = entries;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(row => {
                if (searchType === 'fab_id') return String(row.fab_id).toLowerCase().includes(q);
                if (searchType === 'job_number') return String(row.job_number).toLowerCase().includes(q);
                if (searchType === 'job_name') return (row.job_name || '').toLowerCase().includes(q);
                return true;
            });
        }

        if (installerFilter !== 'all') {
            result = result.filter(row => row.installer_name === installerFilter);
        }

        return result;
    }, [entries, searchQuery, searchType, installerFilter]);

    // ─── Totals for detail table (from filtered entries) ────────────────
    const detailTotals = useMemo(() => {
        if (!filteredEntries.length) return null;
        return {
            sqft: filteredEntries.reduce((s, r) => s + (r.sqft || 0), 0),
            revenue: filteredEntries.reduce((s, r) => s + (r.revenue || 0), 0),
            cost_of_stone: filteredEntries.reduce((s, r) => s + (r.cost_of_stone || 0), 0),
            gp: filteredEntries.reduce((s, r) => s + (r.gp || 0), 0),
        };
    }, [filteredEntries]);

    // ─── Sliced data for current page ────────────────────────────────────
    const slicedEntries = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        const end = start + pagination.pageSize;
        return filteredEntries.slice(start, end);
    }, [filteredEntries, pagination.pageIndex, pagination.pageSize]);

    // ─── Prepend total row to detail table ──────────────────────────────
    const displayRows = useMemo(() => {
        if (!detailTotals) return slicedEntries;
        const totalRow: any = {
            install_date: 'TOTAL',
            fab_id: '',
            job_number: '',
            installer_name: '',
            job_name: '',
            sqft: detailTotals.sqft,
            revenue: detailTotals.revenue,
            gp: detailTotals.gp,
            _isTotalRow: true,
        };
        return [totalRow, ...slicedEntries];
    }, [detailTotals, slicedEntries]);

    // ─── Columns for detail table ─────────────────────────────────────────
    const detailColumns = useMemo<ColumnDef<any>[]>(() => {
        if (!displayRows.length) return [];

        // Get keys from the first non-total row, or fallback to entries[0]
        const regularRow = displayRows.find(row => !row._isTotalRow) || entries[0];
        if (!regularRow) return [];

        const keys = Object.keys(regularRow).filter(k => k !== '_isTotalRow');

        // Fields that should be hidden and shown only inside fab_info
        const compositeFabFields = [
            'job_name',
            'account_name',
            'stone_type_name',
            'stone_color_name',
            'edge_name',
            'stone_thickness_value',
            'input_area',
        ];

        // Fields that should be completely excluded from the table
        const excludeKeys = new Set(['installer_id']);

        // Priority order (these appear first)
        const priority = ['install_date', 'fab_type', 'fab_id', 'job_number', 'installer_name'];

        const orderedKeys: string[] = [];

        // 1. Priority keys (exclude any that are in excludeKeys)
        priority.forEach(key => {
            if (keys.includes(key) && !excludeKeys.has(key)) {
                orderedKeys.push(key);
            }
        });

        // 2. All remaining keys (excluding composite, priority, and excludeKeys)
        const remaining = keys.filter(key =>
            !priority.includes(key) &&
            !compositeFabFields.includes(key) &&
            !excludeKeys.has(key)
        );
        orderedKeys.push(...remaining);

        // Build data columns for all ordered keys
        const dataCols = orderedKeys.map(key => {
            const headerTitle = key.replace(/_/g, ' ').toUpperCase();
            const isCurrency = CURRENCY_COLUMNS.has(key) || key.includes('revenue') || key === 'gp';
            return {
                accessorKey: key,
                header: ({ column }) => <DataGridColumnHeader title={headerTitle} column={column} />,
                size: key === 'install_date' ? 120 : key === 'job_name' ? 200 : 130,
                enableSorting: true,
                cell: ({ row }) => {
                    if (row.original._isTotalRow) {
                        if (key === 'install_date') return <span className="font-semibold">TOTAL</span>;
                        if (key === 'sqft') return <span className="font-semibold">{row.original.sqft?.toFixed(2)}</span>;
                        if (key === 'revenue') return <span className="font-semibold">${row.original.revenue?.toFixed(2)}</span>;
                        if (key === 'gp') return <span className="font-semibold">${row.original.gp?.toFixed(2)}</span>;
                        if (key === 'cost_of_stone') return <span className="font-semibold">${row.original.cost_of_stone?.toFixed(2)}</span>;
                        if (typeof row.original[key] === 'number') {
                            return <span className="font-semibold">{row.original[key]?.toFixed(2)}</span>;
                        }
                        return null;
                    }
                    let val = row.original[key];
                    if (key === 'install_date' && val) {
                        try { val = format(new Date(val), 'MMM dd, yyyy'); } catch { }
                    }
                    if (typeof val === 'number') {
                        if (isCurrency) {
                            return <span className="text-sm">${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>;
                        }
                        val = val.toLocaleString();
                    }
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
                    return <span className="text-sm">{val}</span>;
                },
            };
        });

        // Insert fab_info after job_number
        const jobNumberIdx = dataCols.findIndex(col => col.accessorKey === 'job_number');
        const insertIdx = jobNumberIdx !== -1 ? jobNumberIdx + 1 : 1;

        const fabInfoCol: ColumnDef<any> = {
            id: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => {
                if (row.original._isTotalRow) return <span className="text-sm">—</span>;
                const compositeData: any = {};
                compositeFabFields.forEach(field => {
                    if (row.original[field] !== undefined) {
                        compositeData[field] = row.original[field];
                    }
                });
                return <FabInfoCell data={compositeData} />;
            },
            size: 400,
            enableSorting: false,
        };

        const actionCol: ColumnDef<any> = {
            id: 'actions',
            header: ({ column }) => <DataGridColumnHeader title="ACTION" column={column} />,
            cell: ({ row }) => {
                if (!isSuperAdmin) return null;
                if (row.original._isTotalRow) return null;
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

        // Final columns: action first, then data columns up to insertIdx, then fab_info, then rest
        const finalCols = [];
        finalCols.push(...dataCols.slice(0, insertIdx));
        finalCols.push(fabInfoCol);
        finalCols.push(...dataCols.slice(insertIdx));
        return finalCols;
    }, [displayRows, entries, isSuperAdmin]);

    // ─── Columns for Daily Totals table ──────────────────────────────────
    const dailyTotalColumns = useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: 'install_date',
            header: ({ column }) => <DataGridColumnHeader title="DATE" column={column} />,
            cell: ({ row }) => {
                const val = row.original.install_date;
                if (val) {
                    try { return format(new Date(val), 'MMM dd, yyyy'); } catch { }
                }
                return <span className="text-sm">-</span>;
            },
            size: 150,
            enableSorting: true,
        },
        {
            accessorKey: 'total_sqft',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL SQ FT" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.total_sqft?.toFixed(2)}</span>,
            size: 130,
            enableSorting: true,
        },
        {
            accessorKey: 'total_revenue',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL REVENUE" column={column} />,
            cell: ({ row }) => <span className="text-sm">${row.original.total_revenue?.toFixed(2)}</span>,
            size: 150,
            enableSorting: true,
        },
        
        {
            accessorKey: 'cost_of_stone',
            header: ({ column }) => <DataGridColumnHeader title="COST OF STONE" column={column} />,
            cell: ({ row }) => <span className="text-sm">${row.original.total_cost_of_stone?.toFixed(2)}</span>,
            size: 130,
            enableSorting: true,
        },
        {
            accessorKey: 'total_gp',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL GP" column={column} />,
            cell: ({ row }) => <span className="text-sm">${row.original.total_gp?.toFixed(2)}</span>,
            size: 130,
            enableSorting: true,
        },
        {
            accessorKey: 'entry_count',
            header: ({ column }) => <DataGridColumnHeader title="ENTRIES" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.entry_count}</span>,
            size: 100,
            enableSorting: true,
        },
    ], []);

    // ─── React Table for detail entries ──────────────────────────────────
    const detailTable = useReactTable({
        columns: detailColumns,
        data: displayRows,
        getRowId: (row) => row._isTotalRow ? 'total' : String(row.fab_id || row.install_date),
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
        pageCount: Math.ceil(filteredEntries.length / pagination.pageSize),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
        meta: {
            getRowAttributes: (row) => {
                if (row.original._isTotalRow) {
                    return { className: 'bg-[#f0f7e0] font-semibold [&>td]:border-0' };
                }
                const fabType = row.original.fab_type?.toLowerCase();
                const bgColor = getFabColor(fabType);
                if (bgColor !== 'transparent') {
                    return { style: { backgroundColor: bgColor } };
                }
                return {};
            },
        },
    });

    // ─── React Table for daily totals (no pagination) ──────────────────
    const dailyTotalTable = useReactTable({
        columns: dailyTotalColumns,
        data: dailyTotals,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading daily install completion report...</div>;

    const getTitle = () => {
        if (dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        return 'Last 7 Days';
    };

    return (
        <div className="flex flex-col gap-5 p-5">
            {/* ─── Top Bar: Title + Date Picker ──────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Install Completion</h1>
                <div className="flex items-center gap-2">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-[260px] justify-start text-left font-normal h-[34px]', !dateRange && 'text-muted-foreground')}>
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : format(dateRange.from, 'MMM dd, yyyy')) : 'Filter by Date Range'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start" side="top">
                            <Calendar mode="range" month={month} onMonthChange={setMonth} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                            <div className="flex justify-end gap-2 p-3 border-t">
                                <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); setIsDatePickerOpen(false); }}>Reset</Button>
                                <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    {dateRange && <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>Clear</Button>}
                <BackButton/>
                </div>

            </div>

            {/* ─── Summary Widgets (grandTotals) ──────────────────────────── */}
            {grandTotals && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total SQ FT</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{grandTotals.total_sqft.toFixed(2)}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total Revenue</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${grandTotals.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </Card>
                    
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total Cost of Stone</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${grandTotals.total_cost_of_stone?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total GP</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${grandTotals.total_gp?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">FABS</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{grandTotals.entry_count}</p>
                    </Card>

                </div>
            )}

            {/* ─── Daily Totals Table ───────────────────────────────────────── */}
            {dailyTotals.length > 0 && (
                <DataGrid table={dailyTotalTable} recordCount={dailyTotals.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                    <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                        <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                            <p className="text-base font-semibold text-[#4b545d]">Daily Totals</p>
                            <CardToolbar />
                        </CardHeader>
                        <CardTable>
                            <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[300px] [&>[data-radix-scroll-area-viewport]]:pb-4">
                                <div className="relative">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead className="sticky top-0 z-10 bg-white">
                                            {dailyTotalTable.getHeaderGroups().map(headerGroup => (
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
                                            {dailyTotalTable.getRowModel().rows.map(row => (
                                                <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                                                    {row.getVisibleCells().map(cell => (
                                                        <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0" style={{ width: cell.column.getSize() }}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {dailyTotals.length === 0 && (
                                                <tr>
                                                    <td colSpan={dailyTotalColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
                                                        No daily totals available.
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
                            <div className="text-sm text-[#7c8689]">Showing {dailyTotals.length} day(s)</div>
                        </CardFooter>
                    </Card>
                </DataGrid>
            )}

            {/* ─── Detail Entries Table with filters inside CardToolbar ────── */}
            <DataGrid table={detailTable} recordCount={filteredEntries.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">{getTitle()} – Fab Details</p>
                        <CardToolbar className="flex items-center gap-2 flex-wrap">
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

                            {/* Installer Filter */}
                            {installers.length > 0 && (
                                <Select value={installerFilter} onValueChange={setInstallerFilter}>
                                    <SelectTrigger className="w-[180px] h-[34px] border-[#e2e4ed]">
                                        <SelectValue placeholder="Installer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Installers</SelectItem>
                                        {installers.map(inst => (
                                            <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Search with type selector */}
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

                            <Button variant="outline" className="h-[34px]" onClick={() => exportTableToCSV(detailTable, 'daily-install-details')}>
                                Export CSV
                            </Button>
                        </CardToolbar>
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
                                        {filteredEntries.length === 0 && (
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

            {/* Edit Modal */}
            <UpdateDailyInstallModal
                open={updateModalOpen}
                onClose={() => {
                    setUpdateModalOpen(false);
                    setSelectedRow(null);
                }}
                fabId={selectedRow?.fab_id ?? 0}
                initialData={selectedRow ? {
                    revenue: selectedRow.revenue,
                    sqft: selectedRow.sqft,
                    installer_name: selectedRow.installer_name,
                } : undefined}
                onUpdateSuccess={() => refetch()}
            />
        </div>
    );
}