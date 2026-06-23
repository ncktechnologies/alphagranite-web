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
import { Link } from 'react-router';
import { getJobNameLink, getJobNumberLink, renderLink } from '@/lib/reportLinks';

// ─── Types (based on API response) ──────────────────────────────────────────
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
    sqft_templated: number;      // from API
    sqft_not_templated: number;  // from API
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

    // Separate pagination for each table
    const [paginationTemplate, setPaginationTemplate] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sortingTemplate, setSortingTemplate] = useState<SortingState>([]);
    const [expandedTemplate, setExpandedTemplate] = useState<Record<string, boolean>>({});

    const [paginationInstall, setPaginationInstall] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sortingInstall, setSortingInstall] = useState<SortingState>([]);
    const [expandedInstall, setExpandedInstall] = useState<Record<string, boolean>>({});

    const [searchQuery, setSearchQuery] = useState('');
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [salesPersonId, setSalesPersonId] = useState<number | 'all'>('all');
    const [hasInitialized, setHasInitialized] = useState(false);

    // ─── Build query params ────────────────────────────────────────────────────
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

    // ─── Build separate hierarchical data for Template and Installation ──────
    const { templateData, installData } = useMemo(() => {
        if (!reportData?.groups) return { templateData: [], installData: [] };

        const buildActivityData = (activityType: 'Template' | 'Installation') => {
            const result: any[] = [];
            reportData.groups.forEach((group) => {
                const rows = group.rows.filter(r => r.activity_type === activityType);
                if (rows.length === 0) return;

                // Aggregated totals for this installer
                const totalHours = rows.reduce((s, r) => s + r.installer_hours, 0);
                const totalSqftTemplated = rows.reduce((s, r) => s + (r.sqft_templated || 0), 0);
                const totalSqftNotTemplated = rows.reduce((s, r) => s + (r.sqft_not_templated || 0), 0);
                const totalSqftInstalled = rows.reduce((s, r) => s + (r.sq_ft_installed || 0), 0);
                const totalSqftIncomplete = rows.reduce((s, r) => s + (r.sq_ft_incomplete || 0), 0);

                const installerRow = {
                    type: 'installer',
                    id: `installer-${group.installer}-${activityType}`,
                    installer: group.installer,
                    installer_id: group.installer_id,
                    total_hours: totalHours,
                    total_sqft_templated: totalSqftTemplated,
                    total_sqft_not_templated: totalSqftNotTemplated,
                    total_sqft_installed: totalSqftInstalled,
                    total_sqft_incomplete: totalSqftIncomplete,
                    subRows: rows.map(r => ({
                        ...r,
                        type: 'job',
                        id: `job-${r.fab_id}-${activityType}`,
                    })),
                };
                result.push(installerRow);
            });
            return result;
        };

        return {
            templateData: buildActivityData('Template'),
            installData: buildActivityData('Installation'),
        };
    }, [reportData]);

    // ─── Initial expand state: all rows expanded ─────────────────────────────
    useEffect(() => {
        if (!hasInitialized && (templateData.length > 0 || installData.length > 0)) {
            const initExpanded = (data: any[]) => {
                const state: Record<string, boolean> = {};
                data.forEach(installer => {
                    state[installer.id] = true;
                    installer.subRows?.forEach((job: any) => {
                        state[job.id] = true;
                    });
                });
                return state;
            };
            if (templateData.length > 0) setExpandedTemplate(initExpanded(templateData));
            if (installData.length > 0) setExpandedInstall(initExpanded(installData));
            setHasInitialized(true);
        }
    }, [templateData, installData, hasInitialized]);

    // ─── Column definitions ──────────────────────────────────────────────────
    // Shared columns for both tables
    const baseColumns = (activityType: 'Template' | 'Installation'): ColumnDef<any>[] => {
        const isTemplate = activityType === 'Template';
        const sqftLabel1 = isTemplate ? 'SQFT TEMPLATED' : 'SQFT INSTALLED';
        const sqftKey1 = isTemplate ? 'total_sqft_templated' : 'total_sqft_installed';
        const sqftLabel2 = isTemplate ? 'SQFT NOT TEMPLATED' : 'SQFT NOT INSTALLED';
        const sqftKey2 = isTemplate ? 'total_sqft_not_templated' : 'total_sqft_incomplete';

        return [
            {
                id: 'expander',
                header: () => null,
                cell: ({ row }) => {
                    if (row.original.type === 'installer') {
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
                        //   } else {
                        //     return <span className="ml-8 text-muted-foreground">{row.original.job_name}</span>;
                    }
                },
                size: 200,
                enableSorting: true,
            },
            {
                id: 'account_name',
                header: ({ column }) => <DataGridColumnHeader title="ACCOUNT" column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'installer') {
                        return <span className="text-muted-foreground">—</span>;
                    } else {
                        return <span>{row.original.account_name}</span>;
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
                    } else {
                        if (row.original.job_name) {
                            const jobId = row.original.job_id;
                            if (jobId) {
                                const link = getJobNameLink(String(row.original.job_name), jobId);
                                if (link) return renderLink(link);
                            }
                            return <span className="text-sm">{row.original.job_name}</span>;
                        }
                        
                    }
                },
                size: 250,
                enableSorting: true,
            },
            {
                id: "job_number",
                accessorKey: "job_number",
                header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
                cell: ({ row }) => {
                    const jobNumber = row.original.job_number;
                    if (!jobNumber) return <span className="text-sm">—</span>;
                    const link = getJobNumberLink(jobNumber);
                    return renderLink(link);
                },
                size: 100,
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
            {
                id: 'sqft_1',
                header: ({ column }) => <DataGridColumnHeader title={sqftLabel1} column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'installer') {
                        return <span>{row.original[sqftKey1]?.toFixed(0) ?? '0'}</span>;
                    } else {
                        const val = isTemplate ? row.original.sqft_templated : row.original.sq_ft_installed;
                        return <span>{val?.toFixed(0) ?? '0'}</span>;
                    }
                },
                size: 130,
                enableSorting: true,
            },
            {
                id: 'sqft_2',
                header: ({ column }) => <DataGridColumnHeader title={sqftLabel2} column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'installer') {
                        return <span>{row.original[sqftKey2]?.toFixed(0) ?? '0'}</span>;
                    } else {
                        const val = isTemplate ? row.original.sqft_not_templated : row.original.sq_ft_incomplete;
                        return <span>{val?.toFixed(0) ?? '0'}</span>;
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
        ];
    };

    const templateColumns = useMemo(() => baseColumns('Template'), []);
    const installColumns = useMemo(() => baseColumns('Installation'), []);

    // ─── Table instances ──────────────────────────────────────────────────────
    const templateTable = useReactTable({
        columns: templateColumns,
        data: templateData,
        getRowId: (row) => row.id,
        state: {
            pagination: paginationTemplate,
            sorting: sortingTemplate,
            expanded: expandedTemplate,
        },
        columnResizeMode: 'onEnd',
        enableColumnResizing: true,
        onSortingChange: setSortingTemplate,
        onPaginationChange: setPaginationTemplate,
        onExpandedChange: (updater) => {
            if (typeof updater === 'function') {
                setExpandedTemplate(updater(expandedTemplate));
            } else {
                setExpandedTemplate(updater);
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

    const installTable = useReactTable({
        columns: installColumns,
        data: installData,
        getRowId: (row) => row.id,
        state: {
            pagination: paginationInstall,
            sorting: sortingInstall,
            expanded: expandedInstall,
        },
        columnResizeMode: 'onEnd',
        enableColumnResizing: true,
        onSortingChange: setSortingInstall,
        onPaginationChange: setPaginationInstall,
        onExpandedChange: (updater) => {
            if (typeof updater === 'function') {
                setExpandedInstall(updater(expandedInstall));
            } else {
                setExpandedInstall(updater);
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

    // ─── Helper to render a table ────────────────────────────────────────────
    const renderTable = (
        table: any,
        title: string,
        dataLength: number,
        columns: ColumnDef<any>[],
        exportFileName: string
    ) => (
        <DataGrid
            table={table}
            recordCount={dataLength}
            tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}
        >
            <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                <CardHeader className="py-3.5 border-b border-[#e2e4ed]">
                    <CardHeading>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base font-semibold text-[#4b545d]">{title}</span>
                        </div>
                    </CardHeading>
                    <CardToolbar>
                        <Button variant="outline" onClick={() => exportTableToCSV(table, exportFileName)} className="h-[34px]">
                            Export CSV
                        </Button>
                    </CardToolbar>
                </CardHeader>

                <CardTable>
                    <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-10px)] bg-white [&>[data-radix-scroll-area-viewport]]:pb-4">
                        <div className="relative">
                            <table className="w-full border-collapse table-fixed">
                                <thead className="sticky top-0 z-10 bg-white">
                                    {table.getHeaderGroups().map((headerGroup: any) => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header: any) => (
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
                                    {table.getRowModel().rows.map((row: any) => {
                                        const rowAttrs = table.options.meta?.getRowAttributes?.(row) || {};
                                        return (
                                            <tr key={row.id} className={`border-b border-[#e2e4ed] ${rowAttrs.className || ''}`}>
                                                {row.getVisibleCells().map((cell: any) => (
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
                                    {dataLength === 0 && (
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
    );

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-5 p-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Installation And Template</h1>
                <div className="flex items-center gap-2">
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

            {/* Global Filters */}
            <div className="flex items-center gap-2 flex-wrap">
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
                <Select value={String(salesPersonId)} onValueChange={(v) => setSalesPersonId(v === 'all' ? 'all' : Number(v))}>
                    <SelectTrigger className="w-auto min-w-[150px] h-[34px]"><SelectValue placeholder="Sales Person" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sales Persons</SelectItem>
                        <SelectItem value="no_sales_person">No Sales Person</SelectItem>
                        {salesPersonOptions.map(sp => <SelectItem key={sp.id} value={String(sp.id)}>{sp.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards - split by activity */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Template Hours</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_hours_templated ?? '0:00'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQFT Templated</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sqft_templated?.toFixed(0) ?? '0'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQFT Not Templated </p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sqft_not_templated?.toFixed(0) ?? '0'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Install Hours</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_hours_installed ?? '0:00'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQFT Installed</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sqft_installed?.toFixed(0) ?? '0'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQFT Not Installed</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sqft_not_installed?.toFixed(0) ?? '0'}</p>
                    </div>
                </div>
            )}

            {/* Template Table */}
            {renderTable(
                templateTable,
                'Template Activities',
                templateData.length,
                templateColumns,
                'template-activities'
            )}

            {/* Installation Table */}
            {renderTable(
                installTable,
                'Installation Activities',
                installData.length,
                installColumns,
                'installation-activities'
            )}
        </div>
    );
}