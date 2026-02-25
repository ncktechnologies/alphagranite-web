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
import { DataGridTableRowSelect, DataGridTableRowSelectAll } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGetFabsQuery } from '@/store/api/job'; // Import the API hook
import { formatDate } from '@/utils/date-utils';

export interface CutPlanningData {
    id: number;
    month: string;
    monthDate?: string; // Full date format like "08 DECEMBER, 2025"
    shop_cut_date_scheduled: string;
    office_cut_date_scheduled: string;
    fab_completion_date: string;
    fab_type: string;
    fab_id: string;
    job_no: string;
    fab_info: string;
    pieces: number;
    total_sq_ft: number;
    percent_complete: number;
    total_cut_ln_ft: number;
    saw_cut_ln_ft: number;
    wj_linft: number;
    machining_workstation: string;
    hours_scheduled: number;
    machine_operator: string;
    notes: string;
}

interface ShopTableProps {
    path?: string;
    isSuperAdmin?: boolean;
    isLoading?: boolean;
}

const salesPersons: string[] = ['Mike Rodriguez', 'Sarah Johnson', 'Bruno Pires', 'Maria Garcia'];

const ShopTable: React.FC<ShopTableProps> = ({ path = '/job/cut-list', isSuperAdmin = false, isLoading: externalLoading }) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        // from: new Date(2025, 5, 2), // June 2, 2025
        // to: new Date(2025, 5, 9), // June 9, 2025
    });
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [salesPersonFilter, setSalesPersonFilter] = useState<string>('all');

    // Fetch cut list data from API using the same approach as CutListPage
    const queryParams = useMemo(() => {
        return {
            current_stage: 'cut_list',
            skip: pagination.pageIndex * pagination.pageSize,
            limit: pagination.pageSize,
            ...(searchQuery && { search: searchQuery }),
            ...(fabTypeFilter !== 'all' && { fab_type: fabTypeFilter }),
        };
    }, [searchQuery, fabTypeFilter, pagination]);
    
    const { data: fabsData, isLoading: isApiLoading } = useGetFabsQuery(queryParams);
    
    // Extract the fabs array from the response
    const fabs = useMemo(() => {
        if (!fabsData) return [];
        
        // Handle different response formats
        if (Array.isArray(fabsData)) {
            return fabsData;
        } else if (typeof fabsData === 'object' && 'data' in fabsData) {
            const responseData = fabsData.data;
            if (Array.isArray(responseData)) {
                return responseData;
            } else if (typeof responseData === 'object' && responseData.data) {
                return responseData.data || [];
            }
        }
        return [];
    }, [fabsData]);

    // Transform the Fab data to CutPlanningData format
    const actualData: CutPlanningData[] = useMemo(() => {
        return fabs.map((fab: any) => ({
            id: fab.id,
            month: fab.fab_type ? `${fab.fab_type.toUpperCase()} ${new Date().getFullYear()}` : 'N/A',
            monthDate: fab.created_at ? format(new Date(fab.created_at), 'dd MMMM, yyyy') : format(new Date(), 'dd MMMM, yyyy'),
            shop_cut_date_scheduled: fab.shop_date_schedule || '-',
            office_cut_date_scheduled: fab.office_cut_date_scheduled || '-',
            fab_completion_date: fab.completion_date || '-',
            fab_type: fab.fab_type || 'N/A',
            fab_id: fab.id.toString(),
            job_no: fab.job_details?.job_number || 'N/A',
            job_name: fab.job_details?.name || 'N/A',
            fab_info: `${fab.job_details?.name || ''} - ${fab.stone_type_name || ''} - ${fab.stone_color_name || ''}`.trim(),
            pieces: fab.no_of_pieces || 0,
            total_sq_ft: fab.total_sqft || 0,
            percent_complete: fab.percent_complete || 0,
            total_cut_ln_ft: fab.total_cut_ln_ft || 0,
            saw_cut_ln_ft: fab.saw_cut_ln_ft || 0,
            water_jet_ln_ft: fab.water_jet_ln_ft || 0,
            machining_workstation: fab.machining_workstation || '-',
            hours_scheduled: fab.hours_scheduled || 0,
            machine_operator: fab.machine_operator || '-',
            notes: fab.notes || '-',
        }));
    }, [fabs]);

    // If some rows only have fab_id but no fab_type, fetch details for those fabs
    const [fabTypeMap, setFabTypeMap] = React.useState<Record<string, string>>({});
    React.useEffect(() => {
        const idsToFetch = Array.from(
            new Set(
                fabs
                    .map((f: any) => f.id)
                    .filter((id: any) => {
                        const row = fabs.find((x: any) => x.id === id);
                        return row && !row.fab_type && !fabTypeMap[String(id)];
                    }),
            ),
        );

        if (idsToFetch.length === 0) return;

        let cancelled = false;

        (async () => {
            try {
                await Promise.all(
                    idsToFetch.map(async (id) => {
                        try {
                            const res = await fetch(`/api/v1/fabs/${id}`);
                            if (!res.ok) return;
                            const json = await res.json();
                            const data = json?.data || json;
                            const fabType = data?.fab_type || data?.fabType || '';
                            if (!cancelled && fabType) {
                                setFabTypeMap((prev) => ({ ...prev, [String(id)]: fabType }));
                            }
                        } catch (e) {
                            // ignore individual failures
                        }
                    }),
                );
            } catch (err) {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [fabs, fabTypeMap]);

    const filteredData = useMemo(() => {
        let result = actualData as CutPlanningData[];

        // Text search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (item: CutPlanningData) =>
                    item.job_no.toLowerCase().includes(q) ||
                    item.fab_id.toLowerCase().includes(q) ||
                    item.fab_info.toLowerCase().includes(q)
            );
        }

        // FAB type filter
        if (fabTypeFilter !== 'all') {
            result = result.filter((item: CutPlanningData) => item.fab_type.toLowerCase() === fabTypeFilter.toLowerCase());
        }

        // Sales person filter (if we had that data, for now skip)

        // Date range filter
        if (dateRange?.from && dateRange?.to) {
            result = result.filter((item: CutPlanningData) => {
                const itemDate = new Date(item.shop_cut_date_scheduled);
                const start = new Date(dateRange.from!);
                const end = new Date(dateRange.to!);
                end.setHours(23, 59, 59, 999);
                return itemDate >= start && itemDate <= end;
            });
        }

        return result;
    }, [actualData, searchQuery, fabTypeFilter, salesPersonFilter, dateRange]);

    // Group data by shop_cut_date_scheduled (formatted) and get the display date
    const groupedData = useMemo(() => {
        const groups: Record<string, { rows: CutPlanningData[]; dateDisplay: string }> = {};
        filteredData.forEach((item: CutPlanningData) => {
            const rawDate = item.shop_cut_date_scheduled;
            const dateDisplay = rawDate ? formatDate(rawDate) : 'Unscheduled';
            const key = dateDisplay; // group by the formatted date
            if (!groups[key]) {
                groups[key] = {
                    rows: [],
                    dateDisplay,
                };
            }
            groups[key].rows.push(item);
        });
        return groups;
    }, [filteredData]);

    // Calculate totals for all data (single total row at top)
    const overallTotals = useMemo(() => {
        return {
            pieces: filteredData.reduce((sum: number, row: CutPlanningData) => sum + row.pieces, 0),
            total_sq_ft: filteredData.reduce((sum: number, row: CutPlanningData) => sum + row.total_sq_ft, 0),
            total_cut_ln_ft: filteredData.reduce((sum: number, row: CutPlanningData) => sum + row.total_cut_ln_ft, 0),
            saw_cut_ln_ft: filteredData.reduce((sum: number, row: CutPlanningData) => sum + row.saw_cut_ln_ft, 0),
            water_jet_ln_ft: filteredData.reduce((sum: number, row: CutPlanningData) => sum + row.water_jet_ln_ft, 0),
        };
    }, [filteredData]);

    const handleFabIdClick = (fabId: string) => {
        // TODO: Open PDF diagram for this FAB ID
        console.log('Opening PDF for FAB ID:', fabId);
        // You can implement PDF viewer modal here
    };

    const columns = useMemo<ColumnDef<CutPlanningData>[]>(
        () => [
            // {
            //     accessorKey: 'id',
            //     accessorFn: (row: CutPlanningData) => row.id,
            //     header: () => <DataGridTableRowSelectAll />,
            //     cell: ({ row }) => <DataGridTableRowSelect row={row} />,
            //     enableSorting: false,
            //     enableHiding: false,
            //     size: 48,
            // },
            {
                id: 'month',
                accessorFn: (row) => row.month,
                header: ({ column }) => (
                    <DataGridColumnHeader title="MONTH" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text font-medium">
                        {row.original.month}
                    </span>
                ),
                enableSorting: true,
                size: 200,
            },
            {
                id: 'shop_cut_date_scheduled',
                accessorFn: (row) => row.shop_cut_date_scheduled,
                header: ({ column }) => (
                    <DataGridColumnHeader title="SHOP CUT DATE SCHEDULED" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.shop_cut_date_scheduled !==null ? formatDate(row.original.shop_cut_date_scheduled) : '-'}
                    </span>
                ),
                enableSorting: true,
                size: 150,
            },
            {
                id: 'office_cut_date_scheduled',
                accessorFn: (row) => row.office_cut_date_scheduled,
                header: ({ column }) => (
                    <DataGridColumnHeader title="OFFICE CUT DATE SCHEDULED" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.office_cut_date_scheduled || '-'}
                    </span>
                ),
                enableSorting: true,
                size: 150,
            },
            {
                id: 'fab_completion_date',
                accessorFn: (row) => row.fab_completion_date,
                header: ({ column }) => (
                    <DataGridColumnHeader title="FAB COMPLETION DATE" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.fab_completion_date || '-'}
                    </span>
                ),
                enableSorting: true,
                size: 150,
            },
            {
                id: 'fab_type',
                accessorFn: (row) => row.fab_type,
                header: ({ column }) => (
                    <DataGridColumnHeader title="FAB TYPE" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text whitespace-nowrap">
                        {row.original.fab_type}
                    </span>
                ),
                enableSorting: true,
                size: 100,
            },
            {
                id: 'fab_id',
                accessorFn: (row) => row.fab_id,
                header: ({ column }) => (
                    <DataGridColumnHeader title="FAB ID" column={column} />
                ),
                cell: ({ row }) => (
                    <button
                        onClick={() => handleFabIdClick(row.original.fab_id)}
                        className="text-sm text-primary hover:underline cursor-pointer"
                    >
                        {row.original.fab_id}
                    </button>
                ),
                enableSorting: true,
                size: 100,
            },
            {
                id: 'job_no',
                accessorFn: (row) => row.job_no,
                header: ({ column }) => (
                    <DataGridColumnHeader title="JOB NO" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">{row.original.job_no}</span>
                ),
                enableSorting: true,
                size: 100,
            },
            {
                id: 'fab_info',
                accessorFn: (row) => row.fab_info,
                header: ({ column }) => (
                    <DataGridColumnHeader title="FAB INFO" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.fab_info}
                    </span>
                ),
                enableSorting: true,
                size: 500, // Increase the size for better readability
            },
            {
                id: 'pieces',
                accessorFn: (row) => row.pieces,
                header: ({ column }) => (
                    <DataGridColumnHeader title="NO. OF PIECES" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">{row.original.pieces}</span>
                ),
                enableSorting: true,
            },
            {
                id: 'total_sq_ft',
                accessorFn: (row) => row.total_sq_ft,
                header: ({ column }) => (
                    <DataGridColumnHeader title="TOTAL SQ FT" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">{row.original.total_sq_ft}</span>
                ),
                enableSorting: true,
            },
            {
                id: 'percent_complete',
                accessorFn: (row) => row.percent_complete,
                header: ({ column }) => (
                    <DataGridColumnHeader title="% COMPLETE" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.percent_complete.toFixed(2)}%
                    </span>
                ),
                enableSorting: true,
            },
            {
                id: 'total_cut_ln_ft',
                accessorFn: (row) => row.total_cut_ln_ft,
                header: ({ column }) => (
                    <DataGridColumnHeader title="TOTAL CUT LN FT" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.total_cut_ln_ft || '-'}
                    </span>
                ),
                enableSorting: true,
            },
            {
                id: 'saw_cut_ln_ft',
                accessorFn: (row) => row.saw_cut_ln_ft,
                header: ({ column }) => (
                    <DataGridColumnHeader title="SAW CUT LN FT" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.saw_cut_ln_ft || '-'}
                    </span>
                ),
                enableSorting: true,
            },
            {
                id: 'water_jet_ln_ft',
                accessorFn: (row) => row.wj_linft,
                header: ({ column }) => (
                    <DataGridColumnHeader title="WATER JET LN FT" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.wj_linft || '-'}
                    </span>
                ),
                enableSorting: true,
            },
            {
                id: 'machining_workstation',
                accessorFn: (row) => row.machining_workstation,
                header: ({ column }) => (
                    <DataGridColumnHeader title="MACHINING WORKSTATION" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.machining_workstation || '-'}
                    </span>
                ),
                enableSorting: true,
            },
            {
                id: 'hours_scheduled',
                accessorFn: (row) => row.hours_scheduled,
                header: ({ column }) => (
                    <DataGridColumnHeader title="HOURS SCHEDULED" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.hours_scheduled || '0'}
                    </span>
                ),
                enableSorting: true,
            },
            {
                id: 'machine_operator',
                accessorFn: (row) => row.machine_operator,
                header: ({ column }) => (
                    <DataGridColumnHeader title="MACHINE OPERATOR" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.machine_operator || '-'}
                    </span>
                ),
                enableSorting: true,
            },
            {
                id: 'notes',
                accessorFn: (row) => row.notes,
                header: ({ column }) => (
                    <DataGridColumnHeader title="NOTES" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">
                        {row.original.notes || '-'}
                    </span>
                ),
                enableSorting: true,
                size: 300, // Increase the size for better readability
            },
        ],
        []
    );

    // Flatten grouped data for table (we'll render groups manually)
    const flatData = useMemo(() => {
        return Object.values(groupedData).flatMap((group) => group.rows);
    }, [groupedData]);

    const table = useReactTable({
        columns,
        data: flatData,
        pageCount: Math.ceil((flatData?.length || 0) / pagination.pageSize),
        getRowId: (row: CutPlanningData) => String(row.id),
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
    });

    return (
        <DataGrid
            table={table}
            recordCount={flatData?.length || 0}
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
                                placeholder="Search by job, Fab ID"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="ps-9 w-[230px] h-[34px]"
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
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setTempDateRange(undefined);
                                            setDateRange(undefined);
                                        }}
                                    >
                                        Reset
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setDateRange(tempDateRange);
                                            setIsDatePickerOpen(false);
                                        }}
                                    >
                                        Apply
                                    </Button>
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
                                {salesPersons.map((person) => (
                                    <SelectItem key={person} value={person}>
                                        {person}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => exportTableToCSV(table, 'cut-planning-data')}
                            disabled={isApiLoading || externalLoading}
                        >
                            Export CSV
                        </Button>
                    </CardToolbar>
                </CardHeader>

                <CardTable>
                    <ScrollArea>
                        <div className="relative">
                            {(isApiLoading || externalLoading) ? (
                                <div className="flex items-center justify-center h-64">
                                    <p>Loading cut list data...</p>
                                </div>
                            ) : (
                                <table className="w-full border-collapse">
                                    {/* Table Header */}
                                    <thead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <th
                                                        key={header.id}
                                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground border-b border-border bg-muted/50 break-words whitespace-normal min-h-10" // Added padding and background
                                                        style={{ width: header.getSize() }}
                                                    >
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    {/* Table Body */}
                                    <tbody>
                                        {/* Single Total Row at Top */}
                                        {filteredData.length > 0 && (
                                            <tr className="bg-muted/30 font-medium border-b-2 border-border">
                                                {table.getVisibleFlatColumns().map((column) => {
                                                    const columnId = column.id;

                                                    // Checkbox column - show "Total"
                                                    if (columnId === 'id') {
                                                        return (
                                                            <td key={column.id} className="px-4 py-2 text-sm font-semibold border-r border-border break-words">
                                                                Total
                                                            </td>
                                                        );
                                                    }
                                                    // Month column - show "-"
                                                    else if (columnId === 'month') {
                                                        return (
                                                            <td key={column.id} className="px-4 py-2 text-sm font-semibold border-r border-border break-words">
                                                                -
                                                            </td>
                                                        );
                                                    }
                                                    // Numeric columns with totals
                                                    else if (columnId === 'pieces') {
                                                        return (
                                                            <td key={column.id} className="px-4 py-2 text-sm font-semibold border-r border-border break-words">
                                                                {overallTotals.pieces}
                                                            </td>
                                                        );
                                                    } else if (columnId === 'total_sq_ft') {
                                                        return (
                                                            <td key={column.id} className="px-4 py-2 text-sm font-semibold border-r border-border break-words">
                                                                {overallTotals.total_sq_ft.toFixed(1)}
                                                            </td>
                                                        );
                                                    } else if (columnId === 'total_cut_ln_ft') {
                                                        return (
                                                            <td key={column.id} className="px-4 py-2 text-sm font-semibold border-r border-border break-words">
                                                                {overallTotals.total_cut_ln_ft.toFixed(1)}
                                                            </td>
                                                        );
                                                    } else if (columnId === 'saw_cut_ln_ft') {
                                                        return (
                                                            <td key={column.id} className="px-4 py-2 text-sm font-semibold border-r border-border break-words">
                                                                {overallTotals.saw_cut_ln_ft.toFixed(1)}
                                                            </td>
                                                        );
                                                    } else if (columnId === 'water_jet_ln_ft') {
                                                        return (
                                                            <td key={column.id} className="px-4 py-2 text-sm font-semibold border-r border-border break-words">
                                                                {overallTotals.water_jet_ln_ft.toFixed(1)}
                                                            </td>
                                                        );
                                                    } else {
                                                        // All other columns - EMPTY (not dash)
                                                        return (
                                                            <td key={column.id} className="px-4 py-2 text-sm border-r border-border break-words">
                                                                {/* Empty - no dash */}
                                                            </td>
                                                        );
                                                    }
                                                })}
                                            </tr>
                                        )}

                                        {/* Month Groups */}
                                        {Object.entries(groupedData).map(([dateKey, groupData]) => {
                                            const monthRows = table.getRowModel().rows.filter((row) =>
                                                groupData.rows.some((r: CutPlanningData) => r.id === row.original.id)
                                            );

                                            return (
                                                <React.Fragment key={dateKey}>
                                                    {/* Date Header Row - Spans ALL columns */}
                                                    <tr className="bg-[#F6FFE7] ">
                                                        <td
                                                            className="px-4 py-2 text-xs font-medium text-gray-800 text-start break-words"
                                                            colSpan={table.getVisibleFlatColumns().length}
                                                        >
                                                            {groupData.dateDisplay}
                                                        </td>
                                                    </tr>

                                                    {/* Data Rows for this Date - Month column is EMPTY */}
                                                    {monthRows.map((row) => (
                                                        <tr
                                                            key={row.id}
                                                            className="border-b border-border hover:bg-muted/50"
                                                            data-fab-type={(row.original.fab_type || fabTypeMap[String(row.original.id)] || fabTypeMap[String(row.original.fab_id)] || 'unknown').toString().toLowerCase()}
                                                        >
                                                            {row.getVisibleCells().map((cell) => {
                                                                // If this is the month column, show empty cell
                                                                if (cell.column.id === 'month') {
                                                                    return (
                                                                        <td

                                                                            key={cell.id}
                                                                            className="px-4 py-2 text-sm border-r border-border last:border-r-0 break-words"
                                                                        >
                                                                            {/* Empty - date already shown in header row */}
                                                                        </td>
                                                                    );
                                                                }

                                                                // For FAB INFO and NOTES columns, allow wrapping
                                                                const isLongTextColumn = cell.column.id === 'fab_info' || cell.column.id === 'notes';
                                                                const cellClassName = `px-4 py-2 text-sm border-r border-border last:border-r-0 ${isLongTextColumn ? 'whitespace-normal break-words min-w-[200px]' : 'break-words'}
                                                                    }`;

                                                                // For all other columns, render normally
                                                                return (
                                                                    <td
                                                                        key={cell.id}
                                                                        className={cellClassName}
                                                                    >
                                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                        {Object.keys(groupedData).length === 0 && (
                                            <tr>
                                                <td colSpan={table.getVisibleFlatColumns().length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                                    No data available
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
