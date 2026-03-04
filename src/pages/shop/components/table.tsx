import React, { useMemo, useState } from 'react';
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
import { useGetFabsQuery } from '@/store/api/job';
import ActionsCell from './action';
import { useNavigate } from 'react-router';

export interface ShopPlanRow {
    fab_id: string;
    fab_type: string;
    job_no: string;
    job_name: string;
    fab_info: string;
    pieces: number;
    total_sq_ft: number;
    total_cut_ln_ft: number;
    saw_cut_ln_ft: number;
    water_jet_ln_ft: number;
    percent_complete: number;
    // Cut plan fields
    plan_id: number;
    workstation_name: string;
    operator_name: string;
    estimated_hours: number;
    scheduled_start_date: string;
    plan_notes: string | null;
    date_group: string;
    shop_office_date_scheduled?: string;
}

interface ShopTableProps {
    path?: string;
    isSuperAdmin?: boolean;
    isLoading?: boolean;
}

const salesPersons: string[] = ['Mike Rodriguez', 'Sarah Johnson', 'Bruno Pires', 'Maria Garcia'];

const ShopTable: React.FC<ShopTableProps> = ({ isLoading: externalLoading }) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 25,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [salesPersonFilter, setSalesPersonFilter] = useState<string>('all');
    const navigate = useNavigate();

    const handleViewCalendar = (fabId: string) => navigate(`/shop/calendar?fabId=${fabId}`);
    const handleCreatePlan = (fabId: string) => navigate(`/shop/create-plan?fabId=${fabId}`);

    const queryParams = useMemo(() => ({
        current_stage: 'cut_list',
        skip: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        ...(searchQuery && { search: searchQuery }),
        ...(fabTypeFilter !== 'all' && { fab_type: fabTypeFilter }),
    }), [searchQuery, fabTypeFilter, pagination]);

    const { data: fabsData, isLoading: isApiLoading } = useGetFabsQuery(queryParams);

    // Extract fabs array from the nested response
    const fabs = useMemo(() => {
        if (!fabsData) return [];
        // Assuming response structure: { data: { data: [...], total, ... } }
        const nested = fabsData?.data;
        if (Array.isArray(nested)) return nested;
        return [];
    }, [fabsData]);

    const totalRecords = fabsData?.total || 0;

    // Flatten into plan rows – only cut plans (planning_section_id === 7)
  // Flatten into plan rows – include cut plans AND FABs without cut plans
const planRows: ShopPlanRow[] = useMemo(() => {
    const rows: ShopPlanRow[] = [];
    fabs.forEach((fab: any) => {
        const plans = fab.plans || [];
        // Filter for cut planning section (id = 7)
        const cutPlans = plans.filter((plan: any) => plan.planning_section_id === 7);

        if (cutPlans.length > 0) {
            // FAB has cut plans – one row per cut plan
            cutPlans.forEach((plan: any) => {
                const scheduledDate = plan.scheduled_start_date;
                const dateGroup = scheduledDate ? scheduledDate.split('T')[0] : 'unscheduled';
                rows.push({
                    fab_id: String(fab.id),
                    fab_type: fab.fab_type || 'N/A',
                    job_no: fab.job_details?.job_number || 'N/A',
                    job_name: fab.job_details?.name || 'N/A',
                    fab_info: `${fab.job_details?.name || ''} - ${fab.stone_type_name || ''} - ${fab.stone_color_name || ''}`.trim(),
                    pieces: fab.no_of_pieces || 0,
                    total_sq_ft: fab.total_sqft || 0,
                    total_cut_ln_ft: fab.total_cut_ln_ft || 0,
                    saw_cut_ln_ft: fab.cnc_linft || 0,
                    water_jet_ln_ft: fab.wj_linft || 0,
                    percent_complete: fab.percent_complete || 0,
                    plan_id: plan.id,
                    workstation_name: plan.workstation_name || '-',
                    operator_name: plan.operator_name || '-',
                    estimated_hours: plan.estimated_hours || 0,
                    scheduled_start_date: plan.scheduled_start_date,
                    plan_notes: plan.notes,
                    date_group: dateGroup,
                    shop_office_date_scheduled: fab.shop_date_schedule
                        ? format(new Date(fab.shop_date_schedule), 'MM/dd/yyyy')
                        : undefined,
                });
            });
        } else {
            // FAB has NO cut plans – display one row with empty plan fields
            rows.push({
                fab_id: String(fab.id),
                fab_type: fab.fab_type || 'N/A',
                job_no: fab.job_details?.job_number || 'N/A',
                job_name: fab.job_details?.name || 'N/A',
                fab_info: `${fab.job_details?.name || ''} - ${fab.stone_type_name || ''} - ${fab.stone_color_name || ''}`.trim(),
                pieces: fab.no_of_pieces || 0,
                total_sq_ft: fab.total_sqft || 0,
                total_cut_ln_ft: fab.total_cut_ln_ft || 0,
                saw_cut_ln_ft: fab.cnc_linft || 0,
                water_jet_ln_ft: fab.wj_linft || 0,
                percent_complete: fab.percent_complete || 0,
                plan_id: 0, // placeholder, no actual plan
                workstation_name: '-',
                operator_name: '-',
                estimated_hours: 0,
                scheduled_start_date: undefined, // no date – will be grouped as 'unscheduled'
                plan_notes: null,
                date_group: 'unscheduled',
                shop_office_date_scheduled: fab.shop_date_schedule
                        ? format(new Date(fab.shop_date_schedule), 'MM/dd/yyyy')
                        : undefined,
            });
        }
    });
    return rows;
}, [fabs]);

    // Filtering (client‑side after server filtering)
    const filteredRows = useMemo(() => {
        let result = planRows;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.job_no.toLowerCase().includes(q) ||
                r.fab_id.toLowerCase().includes(q) ||
                r.fab_info.toLowerCase().includes(q) ||
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

    // Group by date (using the cut plan's scheduled_start_date)
    const groupedRows = useMemo(() => {
        const groups: Record<string, { rows: ShopPlanRow[]; dateDisplay: string }> = {};
        filteredRows.forEach(r => {
            const key = r.date_group;
            const display = key !== 'unscheduled'
                ? format(new Date(r.scheduled_start_date), 'EEEE, MMMM d, yyyy')
                : 'Unscheduled';
            if (!groups[key]) groups[key] = { rows: [], dateDisplay: display };
            groups[key].rows.push(r);
        });
        return groups;
    }, [filteredRows]);

    // Totals (deduplicate FABs – each FAB counted once)
    const overallTotals = useMemo(() => {
        const seen = new Set<string>();
        let pieces = 0, sqft = 0, totalCut = 0, sawCut = 0, waterJet = 0;
        filteredRows.forEach(r => {
            if (!seen.has(r.fab_id)) {
                seen.add(r.fab_id);
                pieces += r.pieces;
                sqft += r.total_sq_ft;
                totalCut += r.total_cut_ln_ft;
                sawCut += r.saw_cut_ln_ft;
                waterJet += r.water_jet_ln_ft;
            }
        });
        return { pieces, sqft, totalCut, sawCut, waterJet };
    }, [filteredRows]);

    const handleFabIdClick = (fabId: string) => console.log('PDF for', fabId);

    const columns = useMemo<ColumnDef<ShopPlanRow>[]>(() => [
         {
            id: 'actions',
            header: () => <span className="text-sm text-text">ACTIONS</span>,
            cell: ({ row }) => (
                <ActionsCell
                    row={row}
                    onViewCalendar={() => handleViewCalendar(row.original.fab_id)}
                    onCreatePlan={() => handleCreatePlan(row.original.fab_id)}
                />
            ),
            enableSorting: false,
            size: 50,
        },
        {
            id: 'month',
            accessorFn: r => r.scheduled_start_date,
            header: ({ column }) => <DataGridColumnHeader title="MONTH" column={column} />,
            cell: ({ row }) => {
                const date = row.original.scheduled_start_date;
                return <span className="text-sm text-text font-medium">{date ? format(new Date(date), 'MMM yyyy') : '-'}</span>;
            },
            enableSorting: true,
            size: 200,
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
            accessorFn: (row) => row.shop_office_date_scheduled,
            header: ({ column }) => (
                <DataGridColumnHeader title="OFFICE CUT DATE SCHEDULED" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-text">
                    {row.original.shop_office_date_scheduled || '-'}
                </span>
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
            size: 100,
        },
        {
            id: 'fab_id',
            accessorFn: r => r.fab_id,
            header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
            cell: ({ row }) => (
                <button
                    onClick={() => handleFabIdClick(row.original.fab_id)}
                    className="text-sm  hover:underline cursor-pointer"
                >
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
            cell: ({ row }) => <span className="text-sm text-text">{row.original.job_no}</span>,
            enableSorting: true,
            size: 100,
        },
        {
            id: 'fab_info',
            accessorFn: r => r.fab_info,
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.fab_info}</span>,
            enableSorting: true,
            size: 500,
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
            cell: ({ row }) => <span className="text-sm text-text">{row.original.total_sq_ft}</span>,
            enableSorting: true,
        },
        {
            id: 'percent_complete',
            accessorFn: r => r.percent_complete,
            header: ({ column }) => <DataGridColumnHeader title="% COMPLETE" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.percent_complete.toFixed(2)}%</span>,
            enableSorting: true,
        },
        {
            id: 'total_cut_ln_ft',
            accessorFn: r => r.total_cut_ln_ft,
            header: ({ column }) => <DataGridColumnHeader title="TOTAL CUT LN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.total_cut_ln_ft || '-'}</span>,
            enableSorting: true,
        },
        {
            id: 'saw_cut_ln_ft',
            accessorFn: r => r.saw_cut_ln_ft,
            header: ({ column }) => <DataGridColumnHeader title="SAW CUT LN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.saw_cut_ln_ft || '-'}</span>,
            enableSorting: true,
        },
        {
            id: 'water_jet_ln_ft',
            accessorFn: r => r.water_jet_ln_ft,
            header: ({ column }) => <DataGridColumnHeader title="WATER JET LN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.water_jet_ln_ft || '-'}</span>,
            enableSorting: true,
        },
        {
            id: 'workstation',
            accessorFn: r => r.workstation_name,
            header: ({ column }) => <DataGridColumnHeader title="WORKSTATION" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.workstation_name}</span>,
            enableSorting: true,
            size: 150,
        },
        {
            id: 'operator',
            accessorFn: r => r.operator_name,
            header: ({ column }) => <DataGridColumnHeader title="OPERATOR" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.operator_name}</span>,
            enableSorting: true,
            size: 150,
        },
        {
            id: 'hours_scheduled',
            accessorFn: r => r.estimated_hours,
            header: ({ column }) => <DataGridColumnHeader title="HOURS SCHEDULED" column={column} />,
            cell: ({ row }) => <span className="text-sm text-text">{row.original.estimated_hours.toFixed(1)}</span>,
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

    const flatData = useMemo(() => Object.values(groupedRows).flatMap(g => g.rows), [groupedRows]);

    const table = useReactTable({
        columns,
        data: flatData,
        pageCount: Math.ceil(totalRecords / pagination.pageSize),
        getRowId: row => `${row.fab_id}_${row.plan_id}`,
        state: { pagination, sorting, rowSelection },
        columnResizeMode: 'onChange',
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
        <DataGrid
            table={table}
            recordCount={totalRecords}
            isLoading={isApiLoading || externalLoading}
            groupByDate={false}
            tableLayout={{
                columnsPinnable: true,
                columnsMovable: true,
                columnsVisibility: true,
                cellBorder: true,
            }}
        >
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2 py-3 border-b">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                            <Input
                                placeholder="Search by job, Fab ID, workstation..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="ps-9 w-[280px] h-[34px]"
                                disabled={isApiLoading || externalLoading}
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

                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-[200px] h-[34px] justify-start text-left font-normal',
                                        !dateRange && 'text-muted-foreground'
                                    )}
                                    disabled={isApiLoading || externalLoading}
                                >
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                                            </>
                                        ) : (
                                            format(dateRange.from, 'MMM dd, yyyy')
                                        )
                                    ) : (
                                        <span>Pick dates</span>
                                    )}
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
                            <SelectTrigger className="w-[120px] h-[34px]">
                                <SelectValue placeholder="FAB type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="ag redo">AG Redo</SelectItem>
                                <SelectItem value="fab only">FAB only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <CardToolbar>
                        <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter} disabled={isApiLoading || externalLoading}>
                            <SelectTrigger className="w-[205px] h-[34px]">
                                <SelectValue placeholder="Select sales person" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sales Persons</SelectItem>
                                {salesPersons.map(person => (
                                    <SelectItem key={person} value={person}>{person}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => exportTableToCSV(table, 'shop-cut-planning')} disabled={isApiLoading || externalLoading}>
                            Export CSV
                        </Button>
                    </CardToolbar>
                </CardHeader>

                <CardTable>
                    <ScrollArea>
                        <div className="relative">
                            {(isApiLoading || externalLoading) ? (
                                <div className="flex items-center justify-center h-64">
                                    <p>Loading...</p>
                                </div>
                            ) : (
                                <table className="w-full border-collapse">
                                    <thead>
                                        {table.getHeaderGroups().map(headerGroup => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map(header => (
                                                    <th
                                                        key={header.id}
                                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground border-b border-border bg-muted/50 break-words whitespace-normal"
                                                        style={{ width: header.getSize() }}
                                                    >
                                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody>
                                        {/* Totals Row – "Total" only in month column */}
                                        {filteredRows.length > 0 && (
                                            <tr className="bg-muted/30 font-medium border-b-2 border-border">
                                                {table.getVisibleFlatColumns().map(column => {
                                                    const colId = column.id;
                                                    if (colId === 'month') {
                                                        return <td key={colId} className="px-4 py-2 text-sm font-semibold border-r border-border">Total</td>;
                                                    }
                                                    if (colId === 'pieces') {
                                                        return <td key={colId} className="px-4 py-2 text-sm font-semibold border-r border-border">{overallTotals.pieces}</td>;
                                                    }
                                                    if (colId === 'total_sq_ft') {
                                                        return <td key={colId} className="px-4 py-2 text-sm font-semibold border-r border-border">{overallTotals.sqft.toFixed(1)}</td>;
                                                    }
                                                    if (colId === 'total_cut_ln_ft') {
                                                        return <td key={colId} className="px-4 py-2 text-sm font-semibold border-r border-border">{overallTotals.totalCut.toFixed(1)}</td>;
                                                    }
                                                    if (colId === 'saw_cut_ln_ft') {
                                                        return <td key={colId} className="px-4 py-2 text-sm font-semibold border-r border-border">{overallTotals.sawCut.toFixed(1)}</td>;
                                                    }
                                                    if (colId === 'water_jet_ln_ft') {
                                                        return <td key={colId} className="px-4 py-2 text-sm font-semibold border-r border-border">{overallTotals.waterJet.toFixed(1)}</td>;
                                                    }
                                                    return <td key={colId} className="px-4 py-2 text-sm border-r border-border"></td>;
                                                })}
                                            </tr>
                                        )}

                                        {/* Grouped rows by date */}
                                        {Object.entries(groupedRows).map(([dateKey, group]) => (
                                            <React.Fragment key={dateKey}>
                                                <tr className="bg-[#F6FFE7]">
                                                    <td className="px-4 py-2 text-xs font-medium text-gray-800 text-start" colSpan={table.getVisibleFlatColumns().length}>
                                                        {group.dateDisplay}
                                                    </td>
                                                </tr>
                                                {group.rows.map(row => {
                                                    const tableRow = table.getRowModel().rows.find(r => r.original.plan_id === row.plan_id && r.original.fab_id === row.fab_id);
                                                    if (!tableRow) return null;
                                                    return (
                                                        <tr key={tableRow.id} className="border-b border-border" data-fab-type={row.fab_type.toLowerCase()}>
                                                            {tableRow.getVisibleCells().map(cell => {
                                                                if (cell.column.id === 'month') {
                                                                    return <td key={cell.id} className="px-4 py-2 text-sm border-r border-border"></td>;
                                                                }
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
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}

                                        {Object.keys(groupedRows).length === 0 && (
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
    );
};

export { ShopTable };