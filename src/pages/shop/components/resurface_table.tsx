import React, { Fragment, useMemo, useState } from 'react';
import { flexRender } from '@tanstack/react-table';
import {
    ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    PaginationState,
    RowSelectionState,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardFooter,
    CardHeader,
    CardTable,
    CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, CalendarDays, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGetFabsInResurfacingQuery, useGetFabTypesQuery } from '@/store/api/job';
import ActionsCell from './action';
import { useNavigate } from 'react-router';
import { Link } from 'react-router';
import CreatePlanSheet from './createEvent';
import { useTableState } from '@/hooks/use-table-state';

export interface ShopPlanRow {
    fab_id: string;
    fab_type: string;
    job_no: string;
    job_name: string;
    job_id?: number;
    // Fields for structured fab info
    acct_name?: string;
    stone_type_name?: string;
    stone_color_name?: string;
    stone_thickness?: string;
    edge_name?: string;
    input_area?: string;
    pieces: number;
    total_sq_ft: number;
    wl_ln_ft: number;
    sl_ln_ft: number;
    edging_ln_ft: number;
    cnc_ln_ft: number;
    milter_ln_ft: number;
    total_cut_ln_ft: number;
    percent_complete: number;
    plan_id: number;
    workstation_name: string;
    operator_name: string;
    estimated_hours: number;
    scheduled_start_date: string;
    shop_est_completion_date?: string;
    estimated_completion_date?: string;
    plan_notes: string | null;
    date_group: string;
    shop_office_date_scheduled?: string;
}

interface ShopTableProps {
    path?: string;
    isSuperAdmin?: boolean;
    isLoading?: boolean;
}

const ShopTable: React.FC<ShopTableProps> = ({ isLoading: externalLoading }) => {
    // Use persistent table state with localStorage
    const tableState = useTableState({
        tableId: 'shop-resurfacing-table',
        defaultPagination: { pageIndex: 0, pageSize: 25 },
        defaultDateFilter: 'all',
        persistState: true,
    });

    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchTypes, setSearchTypes] = useState<'fab_id' | 'job_number' | 'job_name'>('fab_id');
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [salesPersonFilter, setSalesPersonFilter] = useState<string>('all');
    const [planSheetOpen, setPlanSheetOpen] = useState(false);
    const [selectedFabForSheet, setSelectedFabForSheet] = useState<string>('');
    const [selectedDateForSheet, setSelectedDateForSheet] = useState<Date | null>(null);
    const [selectedEventForSheet, setSelectedEventForSheet] = useState<any | null>(null);
    const navigate = useNavigate();

    // Extract state from tableState hook
    const {
        pagination,
        setPagination,
        searchQuery,
        setSearchQuery,
        dateRange,
        setDateRange,
        fabTypeFilter,
        setFabTypeFilter,
        searchType,
    } = tableState;

    const handleViewCalendar = (fabId: string, date?: string) => {
        const url = `/shop/calendar?fabId=${fabId}`;
        if (date) {
            navigate(`${url}&date=${format(new Date(date), 'yyyy-MM-dd')}`);
        } else {
            navigate(url);
        }
    };
    const handleAutoSchedule = (fabId: string) => navigate(`/shop/auto-schedule?fabId=${fabId}`);
    const handleCreatePlan = (fabId: string) => {
        setSelectedFabForSheet(fabId);
        setSelectedDateForSheet(null);
        setSelectedEventForSheet(null);
        setPlanSheetOpen(true);
    };

    const queryParams = useMemo(() => ({
        current_stage: '',
        skip: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        ...(searchQuery && { search: searchQuery }),
        ...(fabTypeFilter !== 'all' && { fab_type: fabTypeFilter }),
        ...(searchType && { type: searchTypes }),
    }), [searchQuery, fabTypeFilter, pagination]);

    const { data: fabsData, isLoading: isApiLoading, refetch } = useGetFabsInResurfacingQuery(queryParams);
    const { data: fabTypesData } = useGetFabTypesQuery();

    const fabTypes = useMemo(() => {
        if (!fabTypesData) {
            return [];
        }

        // Handle both possible response formats
        let rawData: any[] = [];
        if (Array.isArray(fabTypesData)) {
            rawData = fabTypesData;
        } else if (typeof fabTypesData === 'object' && 'data' in fabTypesData) {
            rawData = (fabTypesData as any).data || [];
        }

        // Extract names from FabType objects
        const extractName = (item: { name: string } | string) => {
            if (typeof item === 'string') {
                return item;
            }
            if (typeof item === 'object' && item !== null) {
                return item.name || String(item);
            }
            return String(item);
        };

        return rawData.map(extractName);
    }, [fabTypesData]);

    const fabs = useMemo(() => {
        if (!fabsData) return [];
        const nested = fabsData?.data;
        if (Array.isArray(nested)) return nested;
        return [];
    }, [fabsData]);

    const totalRecords = fabsData?.total || 0;

    const planRows: ShopPlanRow[] = useMemo(() => {
        const rows: ShopPlanRow[] = [];
        fabs.forEach((fab: any) => {
            const plans = fab.plans || [];
            const cutPlans = plans.filter((plan: any) => plan.planning_section_id === 5);

            // Base row with fields from the main fab object
            const baseRow = {
                fab_id: String(fab.id),
                fab_type: fab.fab_type || 'N/A',
                job_no: fab.job_number || 'N/A',
                job_name: fab.job_name || 'N/A',
                job_id: fab.job_id,
                // Additional fields for structured fab info
                acct_name: fab.account_name || fab.acct_name || '',
                stone_type_name: fab.stone_type_name || '',
                stone_color_name: fab.stone_color_name || '',
                stone_thickness: fab.stone_thickness_value || '',
                edge_name: fab.edge_name || '',
                input_area: fab.input_area || '',
                pieces: fab.no_of_pieces || 0,
                total_sq_ft: fab.total_sqft || 0,
                wl_ln_ft: fab.wj_linft || 0,
                sl_ln_ft: fab.saw_cut_lnft || 0,
                edging_ln_ft: fab.edging_linft || 0,
                cnc_ln_ft: fab.cnc_linft || 0,
                milter_ln_ft: fab.miter_linft || 0,
                total_cut_ln_ft: (fab.wj_linft || 0) + (fab.saw_cut_lnft || 0),
                percent_complete: 0,
                shop_office_date_scheduled: fab.shop_date_schedule
                    ? format(new Date(fab.shop_date_schedule), 'MM/dd/yyyy')
                    : undefined,
                shop_est_completion_date: fab.shop_est_completion_date
                    ? format(new Date(fab.shop_est_completion_date), 'MM/dd/yyyy')
                    : fab.estimated_completion_date
                    ? format(new Date(fab.estimated_completion_date), 'MM/dd/yyyy')
                    : undefined,

            };

            if (cutPlans.length > 0) {
                cutPlans.forEach((plan: any) => {
                    const scheduledDate = plan.scheduled_start_date || plan.scheduled_start || null;
                    const isValidDate = scheduledDate && typeof scheduledDate === 'string' && scheduledDate.trim().length > 0;
                    const dateGroup = isValidDate ? scheduledDate.split('T')[0] : 'unscheduled';

                    rows.push({
                        ...baseRow,
                        plan_id: plan.id,
                        workstation_name: plan.workstation_name || '-',
                        operator_name: plan.operator_name || '-',
                        estimated_hours: plan.estimated_hours || 0,
                        scheduled_start_date: isValidDate ? scheduledDate : undefined,
                        plan_notes: plan.notes,
                        date_group: dateGroup,
                    });
                });
            } else {
                rows.push({
                    ...baseRow,
                    plan_id: 0,
                    workstation_name: '-',
                    operator_name: '-',
                    estimated_hours: 0,
                    scheduled_start_date: undefined,
                    plan_notes: null,
                    date_group: 'unscheduled',
                });
            }
        });
        return rows;
    }, [fabs]);

    const filteredRows = useMemo(() => {
        let result = planRows;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.job_no.toLowerCase().includes(q) ||
                r.fab_id.toLowerCase().includes(q) ||
                r.acct_name?.toLowerCase().includes(q) ||
                r.job_name?.toLowerCase().includes(q) ||
                r.workstation_name.toLowerCase().includes(q) ||
                r.operator_name.toLowerCase().includes(q)
            );
        }
        if (fabTypeFilter !== 'all') {
            result = result.filter(r => r.fab_type.toLowerCase() === fabTypeFilter.toLowerCase());
        }
        if (dateRange?.from && dateRange?.to) {
            const start = startOfDay(dateRange.from);
            const end = startOfDay(dateRange.to);
            end.setHours(23, 59, 59, 999);
            result = result.filter(r => {
                if (!r.scheduled_start_date) return false;
                const d = new Date(r.scheduled_start_date);
                return d >= start && d <= end;
            });
        }
        return result;
    }, [planRows, searchQuery, fabTypeFilter, dateRange]);

    const overallTotals = useMemo(() => {
        const seen = new Set<string>();
        let pieces = 0, sqft = 0, totalCut = 0, wl = 0, sl = 0, edging = 0, cnc = 0, milter = 0;
        filteredRows.forEach(r => {
            if (!seen.has(r.fab_id)) {
                seen.add(r.fab_id);
                pieces += r.pieces;
                sqft += r.total_sq_ft;
                totalCut += r.total_cut_ln_ft;
                wl += r.wl_ln_ft;
                sl += r.sl_ln_ft;
                edging += r.edging_ln_ft;
                cnc += r.cnc_ln_ft;
                milter += r.milter_ln_ft;
            }
        });
        return { pieces, sqft, totalCut, wl, sl, edging, cnc, milter };
    }, [filteredRows]);

    const handleFabIdClick = (fabId: string) => navigate("/sales/" + fabId);

    // Helper to generate structured fab info (same as JobTable)
    const generateFabInfo = (row: ShopPlanRow) => {
        const jobInfo = [];
        const materialInfo = [];
        const stoneInfo = [];

        if (row.acct_name) jobInfo.push(row.acct_name);
        if (row.job_name) jobInfo.push(row.job_name);
        if (row.input_area) materialInfo.push(`Area: ${row.input_area}`);
        if (row.stone_type_name) stoneInfo.push(row.stone_type_name);
        if (row.stone_color_name) stoneInfo.push(row.stone_color_name);
        if (row.stone_thickness) stoneInfo.push(row.stone_thickness);
        if (row.edge_name) materialInfo.push(row.edge_name);

        return { jobInfo, materialInfo, stoneInfo };
    };

    const columns = useMemo<ColumnDef<ShopPlanRow>[]>(() => [
        {
            id: 'actions',
            cell: ({ row }) => (
                <ActionsCell
                    row={row}
                    onViewCalendar={() => handleViewCalendar(row.original.fab_id, row.original.scheduled_start_date)}
                    onCreatePlan={() => handleCreatePlan(row.original.fab_id)}
                    onAutoSchedule={() => handleAutoSchedule(row.original.fab_id)}
                />
            ),
            enableSorting: false,
            size: 50,
        },
        {
            id: 'shop_est_completion_date',
            accessorFn: r => r.shop_est_completion_date,
            header: ({ column }) => <DataGridColumnHeader title="SHOP EST COMPLETION DATE" column={column} />,
            cell: ({ row }) => (
                <span className="text-sm text-text">
                    {row.original.shop_est_completion_date ? format(new Date(row.original.shop_est_completion_date), 'MM/dd/yyyy') : '-'}
                </span>
            ),
            enableSorting: true,
            size: 150,
        },
        {
            id: 'shop_cut_date_scheduled',
            accessorFn: r => r.scheduled_start_date,
            header: ({ column }) => <DataGridColumnHeader title="SHOP CUT DATE SCHEDULED" column={column} />,
            cell: ({ row }) => (
                <span className="text-sm text-text">
                    {row.original.scheduled_start_date ? format(new Date(row.original.scheduled_start_date), 'MM/dd/yyyy') : '-'}
                </span>
            ),
            enableSorting: true,
            size: 150,
        },
        {
            id: 'shop_office_date_scheduled',
            accessorFn: r => r.shop_office_date_scheduled,
            header: ({ column }) => <DataGridColumnHeader title="OFFICE CUT DATE SCHEDULED" column={column} />,
            cell: ({ row }) => (
                <span className="text-sm text-text">{row.original.shop_office_date_scheduled || '-'}</span>
            ),
            enableSorting: true,
            size: 150,
        },
        {
            id: 'fab_type',
            accessorFn: r => r.fab_type,
            header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text whitespace-nowrap">{row.original.fab_type}</span>,
            enableSorting: true,
            size: 130,
        },
        {
            id: 'fab_id',
            accessorFn: r => r.fab_id,
            header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
            cell: ({ row }) => (
                <button onClick={() => handleFabIdClick(row.original.fab_id)} className="text-sm hover:underline cursor-pointer">
                    {row.original.fab_id}
                </button>
            ),
            enableSorting: true,
            size: 100,
        },
        {
            id: 'job_no',
            accessorFn: r => r.job_no,
            header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
            cell: ({ row }) => (
                row.original.job_id ? (
                    <Link
                        to={`/job/details/${row.original.job_id}`}
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        {row.original.job_no}
                    </Link>
                ) : (
                    <span className="text-sm text-text">{row.original.job_no}</span>
                )
            ),
            enableSorting: true,
            size: 100,
        },
        {
            id: 'fab_info',
            accessorFn: r => `${r.acct_name} ${r.job_name} ${r.stone_type_name}`,
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => {
                const { jobInfo, materialInfo, stoneInfo } = generateFabInfo(row.original);
                return (
                    <div className="flex gap-4 text-xs max-w-[400px]">
                        {jobInfo.length > 0 && (
                            <div className="flex-1 min-w-0">
                                <div className="truncate text-gray-600" title={jobInfo.join(' - ')}>
                                    {jobInfo.join(' - ')}
                                </div>
                                {stoneInfo.length > 0 && (
                                    <div className="truncate text-gray-600" title={stoneInfo.join(' - ')}>
                                        {stoneInfo.join(' - ')}
                                    </div>
                                )}
                            </div>
                        )}
                        {materialInfo.length > 0 && (
                            <div className="flex-1 min-w-0">
                                {materialInfo.map((info, idx) => (
                                    <div key={idx} className="truncate text-gray-600">
                                        {info}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            },
            enableSorting: false,
            size: 400,
        },
        {
            id: 'pieces',
            accessorFn: r => r.pieces,
            header: ({ column }) => <DataGridColumnHeader title="NO. OF PIECES" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.pieces}</span>,
            enableSorting: true,
        },
        {
            id: 'total_sq_ft',
            accessorFn: r => r.total_sq_ft,
            header: ({ column }) => <DataGridColumnHeader title="TOTAL SQ FT" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.total_sq_ft.toFixed(2)}</span>,
            enableSorting: true,
        },
        {
            id: 'wl_ln_ft',
            accessorFn: r => r.wl_ln_ft,
            header: ({ column }) => <DataGridColumnHeader title="WJ:LN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.wl_ln_ft.toFixed(2)}</span>,
            enableSorting: true,
        },
        {
            id: 'sl_ln_ft',
            accessorFn: r => r.sl_ln_ft,
            header: ({ column }) => <DataGridColumnHeader title="SAW:LN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.sl_ln_ft.toFixed(2)}</span>,
            enableSorting: true,
        },
        {
            id: 'edging_ln_ft',
            accessorFn: r => r.edging_ln_ft,
            header: ({ column }) => <DataGridColumnHeader title="EDGING:LN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.edging_ln_ft.toFixed(2)}</span>,
            enableSorting: true,
        },
        {
            id: 'cnc_ln_ft',
            accessorFn: r => r.cnc_ln_ft,
            header: ({ column }) => <DataGridColumnHeader title="CNC:LN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.cnc_ln_ft.toFixed(2)}</span>,
            enableSorting: true,
        },
        {
            id: 'milter_ln_ft',
            accessorFn: r => r.milter_ln_ft,
            header: ({ column }) => <DataGridColumnHeader title="MITER:LN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.milter_ln_ft.toFixed(2)}</span>,
            enableSorting: true,
        },
        {
            id: 'total_cut_ln_ft',
            accessorFn: r => r.total_cut_ln_ft,
            header: ({ column }) => <DataGridColumnHeader title="TOTAL CUT LN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.total_cut_ln_ft.toFixed(2)}</span>,
            enableSorting: true,
        },
        {
            id: 'notes',
            accessorFn: r => r.plan_notes,
            header: ({ column }) => <DataGridColumnHeader title="NOTES" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.plan_notes || '-'}</span>,
            enableSorting: true,
            size: 300,
        },
    ], []);

    const table = useReactTable({
        columns,
        data: filteredRows,
        pageCount: Math.ceil(totalRecords / pagination.pageSize),
        getRowId: row => `${row.fab_id}_${row.plan_id}`,
        state: { pagination, sorting, rowSelection },
        columnResizeMode: 'onEnd',
        enableColumnResizing: true,
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
    });

    return (
        <>
            <DataGrid
                table={table}
                recordCount={totalRecords}
                isLoading={isApiLoading || externalLoading}
                groupByDate={false}
                tableLayout={{
                    columnsPinnable: true,
                    columnsMovable: true,
                    columnsVisibility: true,
                    columnsResizable: true,
                    cellBorder: true,
                }}
            >
                <Card>
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2 py-3 border-b">
                        <div className="flex flex-wrap items-center gap-3">
                            <Select value={searchTypes} onValueChange={(value: 'fab_id' | 'job_number' | 'job_name') => setSearchTypes(value)}>
                                <SelectTrigger className="w-[140px] h-[34px]">
                                    <SelectValue placeholder="Search by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fab_id">FAB ID</SelectItem>
                                    <SelectItem value="job_number">Job Number</SelectItem>
                                    <SelectItem value="job_name">Job Name</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder={`Search by ${searchTypes.replace('_', ' ')}`}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="ps-9 w-[280px] h-[34px]"
                                    disabled={isApiLoading || externalLoading}
                                />
                                {searchQuery && (
                                    <Button mode="icon" variant="ghost" className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
                                        <X />
                                    </Button>
                                )}
                            </div>

                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn('w-[200px] h-[34px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
                                        disabled={isApiLoading || externalLoading}
                                    >
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to
                                                ? <>{format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}</>
                                                : format(dateRange.from, 'MMM dd, yyyy')
                                        ) : <span>Pick dates</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from || new Date()}
                                        selected={tempDateRange}
                                        onSelect={setTempDateRange}
                                        numberOfMonths={2}
                                    />
                                    <div className="flex items-center justify-end gap-1.5 border-t border-border p-3">
                                        <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); }}>Reset</Button>
                                        <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Select value={fabTypeFilter} onValueChange={setFabTypeFilter} disabled={isApiLoading || externalLoading}>
                                <SelectTrigger className="w-auto h-[34px]">
                                    <SelectValue placeholder="FAB type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {fabTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <CardToolbar>
                            <Button variant="outline" onClick={() => exportTableToCSV(table, 'shop-cut-planning')} disabled={isApiLoading || externalLoading}>
                                Export CSV
                            </Button>
                        </CardToolbar>
                    </CardHeader>

                    <CardTable>
                        <ScrollArea className="h-[calc(100vh-280px)]">
                            <div className="relative">
                                {(isApiLoading || externalLoading) ? (
                                    <div className="flex items-center justify-center h-64">
                                        <p>Loading...</p>
                                    </div>
                                ) : (
                                    <table className="w-full border-collapse table-fixed">
                                        <thead className="sticky top-0 z-10 bg-white">
                                            {table.getHeaderGroups().map(headerGroup => (
                                                <tr key={headerGroup.id}>
                                                    {headerGroup.headers.map(header => (
                                                        <th
                                                            key={header.id}
                                                            className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200 bg-gray-50 break-words whitespace-normal relative"
                                                            style={{ 
                                                                width: header.getSize(),
                                                                minWidth: header.getSize(),
                                                                maxWidth: header.getSize()
                                                            }}
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
                                            {filteredRows.length > 0 && (
                                                <tr className="bg-muted/30 font-medium border-b-2 border-border">
                                                    {table.getVisibleFlatColumns().map(column => {
                                                        const colId = column.id;
                                                        const cls = "px-4 py-2 text-sm font-semibold border-r border-border";
                                                        if (colId === 'pieces') return <td key={colId} className={cls}>{overallTotals.pieces}</td>;
                                                        if (colId === 'total_sq_ft') return <td key={colId} className={cls}>{overallTotals.sqft.toFixed(2)}</td>;
                                                        if (colId === 'wl_ln_ft') return <td key={colId} className={cls}>{overallTotals.wl.toFixed(2)}</td>;
                                                        if (colId === 'sl_ln_ft') return <td key={colId} className={cls}>{overallTotals.sl.toFixed(2)}</td>;
                                                        if (colId === 'edging_ln_ft') return <td key={colId} className={cls}>{overallTotals.edging.toFixed(2)}</td>;
                                                        if (colId === 'cnc_ln_ft') return <td key={colId} className={cls}>{overallTotals.cnc.toFixed(2)}</td>;
                                                        if (colId === 'milter_ln_ft') return <td key={colId} className={cls}>{overallTotals.milter.toFixed(2)}</td>;
                                                        if (colId === 'total_cut_ln_ft') return <td key={colId} className={cls}>{overallTotals.totalCut.toFixed(2)}</td>;
                                                        return <td key={colId} className="px-4 py-2 text-sm border-r border-border"></td>;
                                                    })}
                                                </tr>
                                            )}

                                            {table.getRowModel().rows.map(row => (
                                                <tr key={row.id} className="border-b border-border" data-fab-type={row.original.fab_type.toLowerCase()}>
                                                    {row.getVisibleCells().map(cell => {
                                                        const isLongText = cell.column.id === 'fab_info' || cell.column.id === 'notes';
                                                        return (
                                                            <td
                                                                key={cell.id}
                                                                className={`px-4 py-2 text-sm border-r border-border last:border-r-0 ${isLongText ? 'whitespace-normal break-words min-w-[200px]' : 'break-words'}`}
                                                            >
                                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}

                                            {filteredRows.length === 0 && (
                                                <tr>
                                                    <td colSpan={table.getVisibleFlatColumns().length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                                        No cut plans found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardTable>
                    <CardFooter>
                        <DataGridPagination />
                    </CardFooter>
                </Card>
            </DataGrid>

            <CreatePlanSheet
                open={planSheetOpen}
                onOpenChange={setPlanSheetOpen}
                selectedDate={selectedDateForSheet}
                selectedTimeSlot={null}
                selectedEvent={selectedEventForSheet}
                prefillFabId={selectedFabForSheet}
                onEventCreated={() => { refetch(); }}
            />
        </>
    );
};

export { ShopTable };