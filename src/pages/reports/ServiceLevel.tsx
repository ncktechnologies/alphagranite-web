// pages/reports/ServiceLevel.tsx
import { useMemo, useState, useEffect } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays, Search, X } from 'lucide-react';
import { useGetServiceLevelQuery } from '@/store/api/report';
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
import { Link } from 'react-router';
import { BackButton } from '@/components/common/BackButton';
import { FabInfoCell } from '@/components/common/fabInfo';
import { formatStage } from './OwnerReview';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// Helper for external job number link
const getJobNumberLink = (jobNumber: string) => {
    const encoded = encodeURIComponent(jobNumber);
    return `https://alphagraniteaustin.moraware.net/sys/search?search=${encoded}`;
};

const getFabIdLink = (fabId: number) => `/job/fab/${fabId}`;

// Types
interface StageHeatMapRow {
    stage: string;
    target_days: number;
    green: number;
    yellow: number;
    red: number;
    total_wip: number;
    avg_days: number;
    sla_breach_percent: number;
}

interface FabStatusRow {
    fab_type: string;
    fab_id: number;
    job_number: string;
    fab_info: string;
    current_stage: string;
    days_in_stage: number;
    risk_color: string;
    status: string;
    assigned_user?: string;
    priority_flag?: string;
    stage_target_days: number;
    revision_type?: string | null;
}

interface AgingBacklogRow {
    bucket: string;
    count: number;
}

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

export function ServiceLevelReport() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());
    const [stagePagination, setStagePagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [fabPagination, setFabPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [backlogPagination, setBacklogPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    // ─── Filter states ──────────────────────────────────────────────────────
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [stageFilter, setStageFilter] = useState<string>('all');
    const [riskFilter, setRiskFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const queryParams = useMemo(() => {
        if (!dateRange?.from) return undefined;
        return {
            start_date: format(dateRange.from, 'yyyy-MM-dd'),
            end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
        };
    }, [dateRange]);

    const { data, isLoading } = useGetServiceLevelQuery(queryParams);
    const apiData = data?.data;

    const widgets = apiData?.widgets;
    const summary = apiData?.summary;
    const stageHeatMap: StageHeatMapRow[] = useMemo(() => apiData?.stage_bottleneck_heat_map ?? [], [apiData]);
    const fabStatusRows: FabStatusRow[] = useMemo(() => apiData?.fab_status_rows ?? [], [apiData]);
    const agingBacklog: AgingBacklogRow[] = useMemo(() => apiData?.aging_backlog ?? [], [apiData]);

    // ─── Extract filter options ────────────────────────────────────────────
    const fabTypeOptions = useMemo(() => {
        const types = new Set<string>();
        fabStatusRows.forEach(row => {
            if (row.fab_type) types.add(row.fab_type);
        });
        return Array.from(types).sort();
    }, [fabStatusRows]);

    const stageOptions = useMemo(() => {
        const stages = new Set<string>();
        fabStatusRows.forEach(row => {
            if (row.current_stage) stages.add(row.current_stage);
        });
        return Array.from(stages).sort();
    }, [fabStatusRows]);

    const riskOptions = useMemo(() => {
        const risks = new Set<string>();
        fabStatusRows.forEach(row => {
            if (row.risk_color) risks.add(row.risk_color);
        });
        return Array.from(risks).sort();
    }, [fabStatusRows]);

    // ─── Apply filters and search ──────────────────────────────────────────
    const filteredFabRows = useMemo(() => {
        return fabStatusRows.filter(row => {
            const matchFabType = fabTypeFilter === 'all' || row.fab_type === fabTypeFilter;
            const matchStage = stageFilter === 'all' || row.current_stage === stageFilter;
            const matchRisk = riskFilter === 'all' || row.risk_color === riskFilter;
            // Search: match fab_id or job_number (case-insensitive)
            const searchTerm = searchQuery.trim().toLowerCase();
            let matchSearch = true;
            if (searchTerm) {
                const fabIdMatch = String(row.fab_id).toLowerCase().includes(searchTerm);
                const jobNumberMatch = (row.job_number || '').toLowerCase().includes(searchTerm);
                matchSearch = fabIdMatch || jobNumberMatch;
            }
            return matchFabType && matchStage && matchRisk && matchSearch;
        });
    }, [fabStatusRows, fabTypeFilter, stageFilter, riskFilter, searchQuery]);

    // Reset pagination when filters or search change
    useEffect(() => {
        setFabPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [filteredFabRows]);

    // ─── Clear all filters and search ──────────────────────────────────────
    const clearAll = () => {
        setFabTypeFilter('all');
        setStageFilter('all');
        setRiskFilter('all');
        setSearchQuery('');
    };

    // ─── Stage heat map columns (target_days removed) ──────────────────────
    const stageColumns = useMemo<ColumnDef<StageHeatMapRow>[]>(() => [
        { accessorKey: 'stage', header: ({ column }) => <DataGridColumnHeader title="STAGE" column={column} />, size: 180 },
        { accessorKey: 'total_wip', header: ({ column }) => <DataGridColumnHeader title="TOTAL WIP" column={column} />, size: 100 },
        { accessorKey: 'green', header: ({ column }) => <DataGridColumnHeader title="GREEN" column={column} />, size: 80 },
        { accessorKey: 'yellow', header: ({ column }) => <DataGridColumnHeader title="YELLOW" column={column} />, size: 80 },
        { accessorKey: 'red', header: ({ column }) => <DataGridColumnHeader title="RED" column={column} />, size: 80 },
        { accessorKey: 'avg_days', header: ({ column }) => <DataGridColumnHeader title="AVG DAYS" column={column} />, size: 100, cell: ({ row }) => row.original.avg_days.toFixed(1) },
        { accessorKey: 'sla_breach_percent', header: ({ column }) => <DataGridColumnHeader title="SLA BREACH %" column={column} />, size: 120, cell: ({ row }) => `${row.original.sla_breach_percent.toFixed(1)}%` },
    ], []);

    // ─── Fab status columns ─────────────────────────────────────────────────
    const fabColumns = useMemo<ColumnDef<FabStatusRow>[]>(() => [
        {
            accessorKey: 'fab_type',
            header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} />,
            size: 100,
            cell: ({ row }) => <span className="uppercase text-sm">{row.original.fab_type}</span>,
        },
        {
            accessorKey: 'fab_id',
            header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
            size: 80,
            // cell: ({ row }) => {
            //     const fabId = row.original.fab_id;
            //     const link = getFabIdLink(fabId);
            //     return <Link to={link} className="text-blue-600 hover:text-blue-800 hover:underline text-sm">{fabId}</Link>;
            // }
        },
        {
            accessorKey: 'job_number',
            header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
            size: 100,
            // cell: ({ row }) => {
            //     const jobNumber = row.original.job_number;
            //     const link = getJobNumberLink(jobNumber);
            //     return <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-sm">{jobNumber}</a>;
            // }
        },
        {
            accessorKey: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            size: 350,
            cell: ({ row }) => <FabInfoCell data={row.original} />,
        },
        {
            accessorKey: 'current_stage',
            header: ({ column }) => <DataGridColumnHeader title="STAGE" column={column} />,
            size: 150,
            cell: ({ row }) => <span className="text-sm font-medium">{formatStage(row.original.current_stage)}</span>,
        },
        {
            accessorKey: 'days_in_stage',
            header: ({ column }) => <DataGridColumnHeader title="DAYS IN STAGE" column={column} />,
            size: 120,
            cell: ({ row }) => row.original.days_in_stage,
        },
        {
            accessorKey: 'assigned_user',
            header: ({ column }) => <DataGridColumnHeader title="ASSIGNED USER" column={column} />,
            size: 150,
            cell: ({ row }) => row.original.assigned_user || '-',
        },
        {
            accessorKey: 'status',
            header: ({ column }) => <DataGridColumnHeader title="STATUS" column={column} />,
            size: 120,
        },
        {
            accessorKey: 'risk_color',
            header: ({ column }) => <DataGridColumnHeader title="RISK" column={column} />,
            size: 80,
            cell: ({ row }) => {
                const color = row.original.risk_color;
                const colorClass = color === 'red' ? 'text-red-600 font-semibold' : color === 'yellow' ? 'text-yellow-600 font-semibold' : 'text-green-600 font-semibold';
                return <span className={colorClass}>{color.toUpperCase()}</span>;
            },
        },
    ], []);

    // ─── Backlog columns ────────────────────────────────────────────────────
    const backlogColumns = useMemo<ColumnDef<AgingBacklogRow>[]>(() => [
        { accessorKey: 'bucket', header: ({ column }) => <DataGridColumnHeader title="BUCKET" column={column} />, size: 150 },
        { accessorKey: 'count', header: ({ column }) => <DataGridColumnHeader title="COUNT" column={column} />, size: 100 },
    ], []);

    // ─── Tables ─────────────────────────────────────────────────────────────
    const stageTable = useReactTable({
        columns: stageColumns,
        data: stageHeatMap,
        state: { pagination: stagePagination },
        onPaginationChange: setStagePagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const fabTable = useReactTable({
        columns: fabColumns,
        data: filteredFabRows,
        state: { pagination: fabPagination },
        onPaginationChange: setFabPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
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

    const backlogTable = useReactTable({
        columns: backlogColumns,
        data: agingBacklog,
        state: { pagination: backlogPagination },
        onPaginationChange: setBacklogPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (isLoading) return <div className="p-5">Loading service level report...</div>;

    // ─── Helper to render a table with DataGrid wrapper ────────────────────
    const renderTable = (table: any, title: string, exportName: string) => (
        <DataGrid table={table} recordCount={table.getCoreRowModel().rows.length} tableLayout={{ columnsResizable: true, cellBorder: true }}>
            <Card className="border border-[#e2e4ed] rounded-[12px] overflow-hidden">
                <CardHeader className="py-3 px-5 border-b flex justify-between items-center bg-white">
                    <p className="font-semibold">{title}</p>
                    <CardToolbar>
                        <Button variant="outline" size="sm" onClick={() => exportTableToCSV(table, exportName)}>Export CSV</Button>
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
                                                <th key={header.id} className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50" style={{ width: header.getSize() }}>
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
                <CardFooter className="bg-white border-t px-4 py-2">
                    <DataGridPagination />
                </CardFooter>
            </Card>
        </DataGrid>
    );

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Service Level</h1>
                <div className="flex items-center gap-2">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[260px] justify-start text-left font-normal h-[34px]">
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
                    <BackButton />
                </div>
            </div>

            {/* Widgets */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4"><div className="text-sm">Completed</div><div className="text-xl font-semibold">{summary.total_completed}</div></Card>
                    <Card className="p-4"><div className="text-sm">On-Time %</div><div className="text-xl font-semibold">{summary.on_time_percent?.toFixed(1)}%</div></Card>
                    <Card className="p-4"><div className="text-sm">Open Backlog</div><div className="text-xl font-semibold">{summary.open_backlog_count}</div></Card>
                    <Card className="p-4"><div className="text-sm">SLA Breach Count</div><div className="text-xl font-semibold text-red-600">{summary.sla_breach_count}</div></Card>
                </div>
            )}

            {widgets && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4"><div className="text-sm text-[#7c8689]">Total Active FABs</div><div className="text-2xl font-semibold">{widgets.total_active_fab_ids}</div></Card>
                    <Card className="p-4"><div className="text-sm text-[#7c8689]">On Track (Green)</div><div className="text-2xl font-semibold text-green-600">{widgets.on_track_green}</div></Card>
                    <Card className="p-4"><div className="text-sm text-[#7c8689]">At Risk (Yellow)</div><div className="text-2xl font-semibold text-yellow-600">{widgets.at_risk_yellow}</div></Card>
                    <Card className="p-4"><div className="text-sm text-[#7c8689]">Overdue (Red)</div><div className="text-2xl font-semibold text-red-600">{widgets.overdue_red}</div></Card>
                    <Card className="p-4"><div className="text-sm text-[#7c8689]">Avg Cycle Time</div><div className="text-2xl font-semibold">{widgets.avg_cycle_time_days?.toFixed(1)} days</div></Card>
                    {widgets.oldest_open_job && (
                        <Card className="p-4"><div className="text-sm text-[#7c8689]">Oldest Open Job</div><div className="text-lg font-semibold">FAB Id{widgets.oldest_open_job.fab_id}</div><div className="text-xs">{formatStage(widgets.oldest_open_job.current_stage)} – {widgets.oldest_open_job.age_days} days</div></Card>
                    )}
                </div>
            )}

            {/* Stage Heat Map and Backlog Tables */}
            {stageHeatMap.length > 0 && renderTable(stageTable, 'Stage Bottleneck Heat Map', 'service-level-stages')}
            {agingBacklog.length > 0 && renderTable(backlogTable, 'Aging Backlog', 'service-level-aging')}

            {/* ─── Fab Status Details with Filters and Search ──────────────── */}
            {fabStatusRows.length > 0 && (
                <DataGrid table={fabTable} recordCount={filteredFabRows.length} tableLayout={{ columnsResizable: true, cellBorder: true }}>
                    <Card className="border border-[#e2e4ed] rounded-[12px] overflow-hidden">
                        <CardHeader className="py-3 px-5 border-b flex flex-wrap items-center gap-2 bg-white">
                            <p className="font-semibold mr-2">Fab Status Details</p>
                            <CardToolbar>
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Fab Type Filter */}
                                <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                                    <SelectTrigger className="w-[140px] h-[34px] border-[#e2e4ed]">
                                        <SelectValue placeholder="Fab Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {fabTypeOptions.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Stage Filter */}
                                <Select value={stageFilter} onValueChange={setStageFilter}>
                                    <SelectTrigger className="w-[140px] h-[34px] border-[#e2e4ed]">
                                        <SelectValue placeholder="Stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Stages</SelectItem>
                                        {stageOptions.map(stage => (
                                            <SelectItem key={stage} value={stage}>{formatStage(stage)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Risk Filter */}
                                <Select value={riskFilter} onValueChange={setRiskFilter}>
                                    <SelectTrigger className="w-[120px] h-[34px] border-[#e2e4ed]">
                                        <SelectValue placeholder="Risk" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Risks</SelectItem>
                                        {riskOptions.map(risk => (
                                            <SelectItem key={risk} value={risk}>{risk.toUpperCase()}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* ─── Search Input ────────────────────────────────────────────── */}
                                <div className="relative">
                                    <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        placeholder="Search by Job No"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="ps-9 w-[220px] h-[34px]"
                                    />
                                    {searchQuery && (
                                        <Button
                                            mode="icon"
                                            variant="ghost"
                                            className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => setSearchQuery('')}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Clear All */}
                                {(fabTypeFilter !== 'all' || stageFilter !== 'all' || riskFilter !== 'all' || searchQuery) && (
                                    <Button variant="ghost" size="sm" onClick={clearAll} className="h-[34px]">
                                        Clear All
                                    </Button>
                                )}
                            </div>
                            <div className="ml-auto">
                                <Button variant="outline" size="sm" onClick={() => exportTableToCSV(fabTable, 'service-level-fabs')} className="h-[34px]">
                                    Export CSV
                                </Button>
                            </div>
                            </CardToolbar>
                        </CardHeader>
                        <CardTable>
                            <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                                <div className="relative">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead className="sticky top-0 z-10 bg-white">
                                            {fabTable.getHeaderGroups().map(headerGroup => (
                                                <tr key={headerGroup.id}>
                                                    {headerGroup.headers.map(header => (
                                                        <th key={header.id} className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50" style={{ width: header.getSize() }}>
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
                                                            <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0" style={{ width: cell.column.getSize() }}>
                                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                            {filteredFabRows.length === 0 && (
                                                <tr>
                                                    <td colSpan={fabColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
                                                        No data matches the current filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
                            </ScrollArea>
                        </CardTable>
                        <CardFooter className="bg-white border-t px-4 py-2">
                            <DataGridPagination />
                        </CardFooter>
                    </Card>
                </DataGrid>
            )}
        </div>
    );
}