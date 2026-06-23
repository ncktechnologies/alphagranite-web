// pages/reports/InstallationTemplateReport.tsx
import { useEffect, useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getExpandedRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { useGetInstallationTemplateReportQuery } from '@/store/api/report';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter, CardHeading } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { BackButton } from '@/components/common/BackButton';

// ─── Types based on API response ────────────────────────────────────────────
interface ReportRow {
    installer: string;
    installer_id: number;
    installer_hours: number;
    activity_type: string;
    activity_date: string;
    fab_id: number;
    fab_type: string;
    job_number: string;
    job_name: string;
    account_name: string;
    activity_complete: boolean;
    duration: string;
    sq_ft_installed: number;
    sq_ft_incomplete: number;
    sqft_templated: number;      // ← from API
    sqft_not_templated: number;  // ← from API
    reason_if_not_complete: string | null;
    sales_person_id: number;
    sales_person_name: string;
}

interface Group {
    installer: string;
    installer_id: number;
    activity_label: string;
    job_count: number;
    rows: ReportRow[];
    installer_hours: number;
    installer_hours_display: string;
}

interface ReportData {
    title: string;
    period: { from_date: string | null; to_date: string | null };
    columns: string[];
    filters: { search: string | null; fab_type: string | null; sales_person_id: number | null };
    filter_options: { sales_person_options: { id: number; name: string }[]; fab_types: string[] };
    summary: {
        total_hours_templated: string;
        total_hours_installed: string;
        sqft_templated: number;
        sqft_not_templated: number;
        installs_sq_ft: number;
        incomplete_sq_ft: number;
        row_count: number;
        group_count: number;
    };
    groups: Group[];
    rows: ReportRow[];
}

// ─── Component ──────────────────────────────────────────────────────────────
export function InstallationTemplateReport() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [salesPersonId, setSalesPersonId] = useState<number | 'all'>('all');
    const [hasInitialized, setHasInitialized] = useState(false);

    // Build query params for API
    const queryParams = useMemo(() => {
        const params: { from_date?: string; to_date?: string; search?: string; fab_type?: string; sales_person_id?: number } = {};
        if (dateRange?.from) {
            params.from_date = format(dateRange.from, 'yyyy-MM-dd');
            params.to_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (fabTypeFilter !== 'all') params.fab_type = fabTypeFilter;
        if (salesPersonId !== 'all') params.sales_person_id = salesPersonId;
        return Object.keys(params).length ? params : undefined;
    }, [dateRange, searchQuery, fabTypeFilter, salesPersonId]);

    const { data, isLoading } = useGetInstallationTemplateReportQuery(queryParams);
    const reportData = data?.data as ReportData | undefined;

    const fabTypes = useMemo(() => reportData?.filter_options?.fab_types ?? [], [reportData]);
    const salesPersonOptions = useMemo(() => reportData?.filter_options?.sales_person_options ?? [], [reportData]);
    const summary = reportData?.summary;

    // ─── Build hierarchical data: Installer → Activity Type → Jobs ──────────
    const tableData = useMemo(() => {
        if (!reportData?.groups) return [];

        const result: any[] = [];
        reportData.groups.forEach((group) => {
            const templateRows = group.rows.filter(r => r.activity_type === 'Template');
            const installationRows = group.rows.filter(r => r.activity_type === 'Installation');

            // Build activity rows
            const activityRows: any[] = [];
            if (templateRows.length > 0) {
                activityRows.push({
                    type: 'activity',
                    id: `activity-${group.installer}-template`,
                    installer: group.installer,
                    activity_label: 'Template',
                    total_hours: templateRows.reduce((s, r) => s + r.installer_hours, 0),
                    total_sqft_installed: templateRows.reduce((s, r) => s + r.sq_ft_installed, 0),
                    total_sqft_incomplete: templateRows.reduce((s, r) => s + r.sq_ft_incomplete, 0),
                    total_sqft_templated: templateRows.reduce((s, r) => s + (r.sqft_templated || 0), 0),
                    total_sqft_not_templated: templateRows.reduce((s, r) => s + (r.sqft_not_templated || 0), 0),
                    subRows: templateRows.map(r => ({
                        ...r,
                        type: 'job',
                        id: `job-${r.fab_id}-${r.activity_type}`,
                    })),
                });
            }
            if (installationRows.length > 0) {
                activityRows.push({
                    type: 'activity',
                    id: `activity-${group.installer}-installation`,
                    installer: group.installer,
                    activity_label: 'Installation',
                    total_hours: installationRows.reduce((s, r) => s + r.installer_hours, 0),
                    total_sqft_installed: installationRows.reduce((s, r) => s + r.sq_ft_installed, 0),
                    total_sqft_incomplete: installationRows.reduce((s, r) => s + r.sq_ft_incomplete, 0),
                    total_sqft_templated: installationRows.reduce((s, r) => s + (r.sqft_templated || 0), 0),
                    total_sqft_not_templated: installationRows.reduce((s, r) => s + (r.sqft_not_templated || 0), 0),
                    subRows: installationRows.map(r => ({
                        ...r,
                        type: 'job',
                        id: `job-${r.fab_id}-${r.activity_type}`,
                    })),
                });
            }

            if (activityRows.length > 0) {
                // Compute totals for installer row
                const totalSqftTemplated = activityRows.reduce((s, a) => s + a.total_sqft_templated, 0);
                const totalSqftNotTemplated = activityRows.reduce((s, a) => s + a.total_sqft_not_templated, 0);

                result.push({
                    type: 'installer',
                    id: `installer-${group.installer}`,
                    installer: group.installer,
                    installer_id: group.installer_id,
                    total_hours: group.installer_hours,
                    total_sqft_installed: activityRows.reduce((s, a) => s + a.total_sqft_installed, 0),
                    total_sqft_incomplete: activityRows.reduce((s, a) => s + a.total_sqft_incomplete, 0),
                    total_sqft_templated: totalSqftTemplated,
                    total_sqft_not_templated: totalSqftNotTemplated,
                    subRows: activityRows,
                });
            }
        });
        return result;
    }, [reportData]);

    // ─── Initial expanded state: all installer & activity rows expanded ─────
    useEffect(() => {
        if (!hasInitialized && tableData.length > 0) {
            const initialState: Record<string, boolean> = {};
            tableData.forEach(installer => {
                initialState[installer.id] = true;
                installer.subRows?.forEach((activity: any) => {
                    initialState[activity.id] = true;
                });
            });
            setExpanded(initialState);
            setHasInitialized(true);
        }
    }, [tableData, hasInitialized]);

    // ─── Column definitions ──────────────────────────────────────────────────
    const columns = useMemo<ColumnDef<any>[]>(() => [
        {
            id: 'expander',
            header: () => null,
            cell: ({ row }) => {
                if (row.original.type === 'activity') {
                    return (
                        <button onClick={row.getToggleExpandedHandler()} className="p-1 hover:bg-gray-100 rounded">
                            {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    );
                }
                return null;
            },
            size: 40,
            enableSorting: false,
        },
        {
            id: 'installer',
            header: ({ column }) => <DataGridColumnHeader title="EMPLOYEE" column={column} />,
            cell: ({ row }) => {
                if (row.original.type === 'installer') {
                    return <span className="font-medium">{row.original.installer}</span>;
                } else if (row.original.type === 'activity') {
                    return <span className="ml-4 font-medium text-muted-foreground">{row.original.activity_label}</span>;
                } else {
                    return <span className="ml-8 text-muted-foreground">{row.original.job_name}</span>;
                }
            },
            size: 200,
            enableSorting: true,
        },
        {
            id: 'job_name',
            header: ({ column }) => <DataGridColumnHeader title="JOB NAME" column={column} />,
            cell: ({ row }) => {
                if (row.original.type === 'installer') {
                    return <span className="text-muted-foreground">—</span>;
                } else if (row.original.type === 'activity') {
                    return <span className="text-muted-foreground">{row.original.activity_label}</span>;
                } else {
                    return <span>{row.original.job_name}</span>;
                }
            },
            size: 250,
            enableSorting: true,
        },
        {
            id: 'account_name',
            header: ({ column }) => <DataGridColumnHeader title="ACCOUNT" column={column} />,
            cell: ({ row }) => {
                if (row.original.type === 'installer') {
                    return <span className="text-muted-foreground">—</span>;
                } else if (row.original.type === 'activity') {
                    return <span className="text-muted-foreground">—</span>;
                } else {
                    return <span>{row.original.account_name}</span>;
                }
            },
            size: 200,
            enableSorting: true,
        },
        {
            id: 'activity_complete',
            header: ({ column }) => <DataGridColumnHeader title="ACTIVITY COMPLETE" column={column} />,
            cell: ({ row }) => {
                if (row.original.type === 'job') {
                    return <span>{row.original.activity_complete ? 'Yes' : 'No'}</span>;
                }
                return null;
            },
            size: 130,
            enableSorting: true,
        },
        {
            id: 'duration',
            header: ({ column }) => <DataGridColumnHeader title="DURATION" column={column} />,
            cell: ({ row }) => {
                if (row.original.type === 'job') {
                    return <span className="whitespace-pre-wrap">{row.original.duration || '—'}</span>;
                }
                return null;
            },
            size: 120,
            enableSorting: true,
        },
        // ─── SQFT TEMPLATED ─────────────────────────────────────────────────
        {
            id: 'sqft_templated',
            header: ({ column }) => <DataGridColumnHeader title="SQFT TEMPLATED" column={column} />,
            cell: ({ row }) => {
                if (row.original.type === 'installer') {
                    return <span>{row.original.total_sqft_templated?.toFixed(0) ?? '0'}</span>;
                } else if (row.original.type === 'activity') {
                    return <span>{row.original.total_sqft_templated?.toFixed(0) ?? '0'}</span>;
                } else {
                    return <span>{row.original.sqft_templated?.toFixed(0) ?? '0'}</span>;
                }
            },
            size: 130,
            enableSorting: true,
        },
        // ─── SQFT NOT TEMPLATED ─────────────────────────────────────────────
        {
            id: 'sqft_not_templated',
            header: ({ column }) => <DataGridColumnHeader title="SQFT NOT TEMPLATED" column={column} />,
            cell: ({ row }) => {
                if (row.original.type === 'installer') {
                    return <span>{row.original.total_sqft_not_templated?.toFixed(0) ?? '0'}</span>;
                } else if (row.original.type === 'activity') {
                    return <span>{row.original.total_sqft_not_templated?.toFixed(0) ?? '0'}</span>;
                } else {
                    return <span>{row.original.sqft_not_templated?.toFixed(0) ?? '0'}</span>;
                }
            },
            size: 140,
            enableSorting: true,
        },
        {
            id: 'sqft_installed',
            header: ({ column }) => <DataGridColumnHeader title="SQ FT COMPLETED" column={column} />,
            cell: ({ row }) => {
                if (row.original.type === 'installer') {
                    return <span>{row.original.total_sqft_installed?.toFixed(0) ?? '0'}</span>;
                } else if (row.original.type === 'activity') {
                    return <span>{row.original.total_sqft_installed?.toFixed(0) ?? '0'}</span>;
                } else {
                    return <span>{row.original.sq_ft_installed?.toFixed(0) ?? '0'}</span>;
                }
            },
            size: 130,
            enableSorting: true,
        },
        {
            id: 'sqft_incomplete',
            header: ({ column }) => <DataGridColumnHeader title="SQ FT NOT COMPLETED" column={column} />,
            cell: ({ row }) => {
                if (row.original.type === 'installer') {
                    return <span>{row.original.total_sqft_incomplete?.toFixed(0) ?? '0'}</span>;
                } else if (row.original.type === 'activity') {
                    return <span>{row.original.total_sqft_incomplete?.toFixed(0) ?? '0'}</span>;
                } else {
                    return <span>{row.original.sq_ft_incomplete?.toFixed(0) ?? '0'}</span>;
                }
            },
            size: 140,
            enableSorting: true,
        },
        {
            id: 'reason',
            header: ({ column }) => <DataGridColumnHeader title="REASON (IF NOT COMPLETE)" column={column} />,
            cell: ({ row }) => {
                if (row.original.type === 'job') {
                    return <span>{row.original.reason_if_not_complete || '—'}</span>;
                }
                return null;
            },
            size: 200,
            enableSorting: true,
        },
    ], []);

    const table = useReactTable({
        columns,
        data: tableData,
        getRowId: (row) => row.id,
        state: {
            pagination,
            sorting,
            expanded,
        },
        columnResizeMode: 'onEnd',
        enableColumnResizing: true,
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        onExpandedChange: (updater) => {
            if (typeof updater === 'function') {
                setExpanded(updater(expanded));
            } else {
                setExpanded(updater);
            }
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSubRows: (row) => row.subRows || [],
        enableExpanding: true,
        meta: {
            getRowAttributes: (row) => {
                if (row.original.type === 'installer') {
                    return { className: 'bg-[#f6ffe7] hover:bg-[#edffd4] transition-colors' };
                }
                return { className: 'bg-white hover:bg-gray-50/50' };
            },
        },
    });

    const getTitle = () => {
        if (dateRange?.from) {
            return dateRange.to
                ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                : format(dateRange.from, 'MMM dd, yyyy');
        }
        return 'All dates';
    };

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading report...</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Installation And Template</h1>
                <div className='flex items-center gap-2'>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-[170px] h-[34px] justify-start text-left', !dateRange && 'text-muted-foreground')}>
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : format(dateRange.from, 'MMM dd, yyyy')) : 'Filter by Date'}
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
                    <BackButton />
                </div>
            </div>

            {/* Summary Cards */}
           {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Template Hours</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_hours_templated ?? '0:00'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Install Hours</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_hours_installed ?? '0:00'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Templated SQFT</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sqft_templated?.toFixed(0) ?? '0'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">NOT Templated SQFT</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sqft_not_templated?.toFixed(0) ?? '0'}</p>
                    </div>
                     <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Installs Completed sq ft</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.installs_sq_ft?.toFixed(0) ?? '0'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Installs Not Completed sq ft</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.incomplete_sq_ft?.toFixed(0) ?? '0'}</p>
                    </div>
                </div>
            )}

            <DataGrid table={table} recordCount={tableData.length}
                tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}
            >
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3.5 border-b border-[#e2e4ed]">
                        <CardHeading>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                {/* Search */}
                                <div className="relative flex items-center">
                                    <div className="relative">
                                        <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            placeholder="Search by job name"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="ps-9 w-[230px] h-[34px]"
                                        />
                                        {searchQuery && (
                                            <Button mode="icon" variant="ghost" className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                                    <SelectTrigger className="w-auto min-w-[150px] h-[34px]"><SelectValue placeholder="Fab Type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {fabTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeading>
                        <CardToolbar>
                            <Select value={String(salesPersonId)} onValueChange={(v) => setSalesPersonId(v === 'all' ? 'all' : Number(v))}>
                                <SelectTrigger className="w-auto min-w-[150px] h-[34px]"><SelectValue placeholder="Sales Person" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sales Persons</SelectItem>
                                    <SelectItem value="no_sales_person">No Sales Person</SelectItem>
                                    {salesPersonOptions.map(sp => <SelectItem key={sp.id} value={String(sp.id)}>{sp.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={() => exportTableToCSV(table, 'installation-template')} className="h-[34px]">
                                Export CSV
                            </Button>
                        </CardToolbar>
                    </CardHeader>

                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] bg-white [&>[data-radix-scroll-area-viewport]]:pb-4">
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
                                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                                                <tr key={row.id} className={`border-b border-[#e2e4ed] ${rowAttrs.className || ''}`}>
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
                                        {tableData.length === 0 && (
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