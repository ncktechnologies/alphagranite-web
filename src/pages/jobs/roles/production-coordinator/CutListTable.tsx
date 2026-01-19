import { useMemo, useState } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    PaginationState,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardFooter,
    CardHeader,
    CardHeading,
    CardTable,
    CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, X, CalendarDays, EllipsisVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { useNavigate } from 'react-router';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { JOB_STAGES } from '@/hooks/use-job-stage'; // Add this import
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface CutList {
    id: number;
    fab_type: string;
    fab_id: string;
    fab_id_0?: string;
    job_name: string;
    job_no: string;
    no_of_pcs: number;
    total_sq_ft: number;
    wl_ln_ft: number;
    sl_ln_ft: number;
    edging_ln_ft: number;
    cnc_ln_ft: number;
    milter_ln_ft: number;
    cost_of_stone: number;
    revenue: number;
    fp_completed: string;
    cip: string;
    install_date: string;
    sales_person?: string;
}

interface CutListTableProps {
    cutLists: CutList[];
    path: string;
    isSuperAdmin?: boolean;
    isLoading?: boolean;
    onRowClick?: (fabId: string) => void;
}

export const CutListTable = ({ cutLists, path, isSuperAdmin = false, isLoading, onRowClick }: CutListTableProps) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 25, // Same as JobTable
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [salesPersonFilter, setSalesPersonFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Get unique fab types - FIXED: Handle undefined cutLists
    const fabTypes = useMemo(() => {
        if (!cutLists || !Array.isArray(cutLists)) return [];
        const types = Array.from(new Set(cutLists.map(list => list.fab_type).filter(Boolean)));
        return types.sort();
    }, [cutLists]);

    // Get unique sales persons - FIXED: Handle undefined cutLists
    const salesPersons = useMemo(() => {
        if (!cutLists || !Array.isArray(cutLists)) return [];
        const persons = Array.from(new Set(cutLists.map(list => list.sales_person).filter((person): person is string => Boolean(person))));
        return persons.sort();
    }, [cutLists]);

    const filteredData = useMemo(() => {
        // FIXED: Handle undefined cutLists
        if (!cutLists || !Array.isArray(cutLists)) return [];

        let result = cutLists;

        // Text search - FIXED: Use optional chaining
        if (searchQuery) {
            result = result.filter((list) =>
                list.job_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                list.fab_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                list.fab_id_0?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                list.job_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                list.fab_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                list.sales_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                list.cip?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Date filter based on install_date - FIXED: Handle undefined install_date
        if (dateFilter !== 'all') {
            result = result.filter((list) => {
                // Handle "unscheduled" filter
                if (dateFilter === 'unscheduled') {
                    return !list.install_date || list.install_date === '';
                }

                // Handle "scheduled" filter
                if (dateFilter === 'scheduled') {
                    return list.install_date && list.install_date !== '';
                }

                if (!list.install_date) return false;

                const installDate = new Date(list.install_date);
                const today = new Date();

                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                const startOfNextWeek = new Date(endOfWeek);
                startOfNextWeek.setDate(endOfWeek.getDate() + 1);
                const endOfNextWeek = new Date(startOfNextWeek);
                endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

                const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

                switch (dateFilter) {
                    case 'today':
                        return installDate.toDateString() === today.toDateString();
                    case 'this_week':
                        return installDate >= startOfWeek && installDate <= endOfWeek;
                    case 'this_month':
                        return installDate >= startOfMonth && installDate <= endOfMonth;
                    case 'next_week':
                        return installDate >= startOfNextWeek && installDate <= endOfNextWeek;
                    case 'next_month':
                        return installDate >= startOfNextMonth && installDate <= endOfNextMonth;
                    case 'custom':
                        if (dateRange?.from && dateRange?.to) {
                            const start = new Date(dateRange.from);
                            const end = new Date(dateRange.to);
                            end.setHours(23, 59, 59, 999);
                            return installDate >= start && installDate <= end;
                        }
                        return true;
                    default:
                        return list.install_date?.includes(dateFilter);
                }
            });
        }

        // Fab Type filter
        if (fabTypeFilter !== 'all') {
            result = result.filter((list) => list.fab_type === fabTypeFilter);
        }

        // Sales Person filter
        if (salesPersonFilter !== 'all') {
            if (salesPersonFilter === 'no_sales_person') {
                result = result.filter((list) => !list.sales_person || list.sales_person === '');
            } else {
                result = result.filter((list) => list.sales_person === salesPersonFilter);
            }
        }

        return result;
    }, [searchQuery, dateFilter, fabTypeFilter, salesPersonFilter, dateRange, cutLists]);

    const navigate = useNavigate();

    const handleView = (department: string, id: string) => {
        navigate(`/job/${department}/${id}`);
    };

    // Function to handle row click
    const handleRowClickInternal = (list: CutList) => {
        if (onRowClick) {
            onRowClick(list.fab_id);
        }
    };

    // Function to handle stage filter change - ADDED: Same as JobTable
    const handleStageFilterChange = (stageValue: string) => {
        if (stageValue === 'all') {
            return;
        }

        const selectedStage = Object.values(JOB_STAGES).find(stage => stage.stage === stageValue);
        if (selectedStage) {
            navigate(selectedStage.route);
        }
    };

    const baseColumns = useMemo<ColumnDef<CutList>[]>(() => [
        {
            accessorKey: 'id',
            accessorFn: (row: CutList) => row.id,
            header: () => <DataGridTableRowSelectAll />,
            cell: ({ row }) => <DataGridTableRowSelect row={row} />,
            enableSorting: false,
            enableHiding: false,
            enableResizing: false,
            size: 48,
            meta: {
                cellClassName: '',
            },
        },
        {
            id: "fab_type",
            accessorKey: "fab_type",
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB TYPE" column={column} />
            ),
            cell: ({ row }) => {
                const fabType = row.original.fab_type;
                
                return (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {fabType}
                    </span>
                );
            },
        },
        {
            id: "fab_id",
            accessorKey: "fab_id",
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB ID" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.fab_id}</span>,
        },
        {
            id: "fab_id_0",
            accessorKey: "fab_id_0",
            header: ({ column }) => (
                <DataGridColumnHeader title="SECOND FAB ID" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">{row.original.fab_id_0 || 'N/A'}</span>
            ),
        },
        {
            id: "job_name",
            accessorKey: "job_name",
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NAME" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[200px]">
                    {row.original.job_name}
                </span>
            ),
        },
        {
            id: "job_no",
            accessorKey: "job_no",
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NO" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.job_no}</span>,
        },
        {
            id: "no_of_pcs",
            accessorKey: "no_of_pcs",
            header: ({ column }) => (
                <DataGridColumnHeader title="NO OF PCS" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.no_of_pcs.toLocaleString()}
                </span>
            ),
        },
        {
            id: "total_sq_ft",
            accessorKey: "total_sq_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="TOTAL SQ FT" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.total_sq_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "wl_ln_ft",
            accessorKey: "wl_ln_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="WL LN FT" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.wl_ln_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "sl_ln_ft",
            accessorKey: "sl_ln_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="SL LN FT" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.sl_ln_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "edging_ln_ft",
            accessorKey: "edging_ln_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="EDGING LN FT" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.edging_ln_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "cnc_ln_ft",
            accessorKey: "cnc_ln_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="CNC LN FT" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.cnc_ln_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "milter_ln_ft",
            accessorKey: "milter_ln_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="MILTER LN FT" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.milter_ln_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "cost_of_stone",
            accessorKey: "cost_of_stone",
            header: ({ column }) => (
                <DataGridColumnHeader title="COST OF STONE" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    ${row.original.cost_of_stone.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "revenue",
            accessorKey: "revenue",
            header: ({ column }) => (
                <DataGridColumnHeader title="REVENUE" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    ${row.original.revenue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "fp_completed",
            accessorKey: "fp_completed",
            header: ({ column }) => (
                <DataGridColumnHeader title="FP COMPLETED" column={column} />
            ),
            cell: ({ row }) => (
                <span className={`text-sm font-medium ${row.original.fp_completed === 'Yes' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {row.original.fp_completed}
                </span>
            ),
        },
        {
            id: "cip",
            accessorKey: "cip",
            header: ({ column }) => (
                <DataGridColumnHeader title="CIP" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.cip}</span>,
        },
        {
            id: "install_date",
            accessorKey: "install_date",
            header: ({ column }) => (
                <DataGridColumnHeader title="INSTALL DATE" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.install_date ?
                        new Date(row.original.install_date).toLocaleDateString() :
                        'Not Scheduled'
                    }
                </span>
            ),
        },
        {
            id: "sales_person",
            accessorKey: "sales_person",
            header: ({ column }) => (
                <DataGridColumnHeader title="SALES PERSON" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.sales_person || 'N/A'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <Button 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleView(path, row.original.fab_id);
                    }}
                >
                    <EllipsisVertical className="h-4 w-4" />
                </Button>
            ),
            enableSorting: false,
            size: 60,
        },
    ], [path]);


    const table = useReactTable({
        columns: baseColumns,
        data: filteredData,
        pageCount: Math.ceil(filteredData.length / pagination.pageSize),
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        meta: {
            getRowAttributes: (row: any) => ({
                'data-fab-type': row.original.fab_type?.toLowerCase()
            })
        }
    });

    return (
        <DataGrid
            table={table}
            recordCount={filteredData.length}
            isLoading={isLoading}
            groupByDate={false}
            dateKey="install_date"
            tableLayout={{
                columnsPinnable: true,
                columnsMovable: true,
                columnsVisibility: true,
                cellBorder: true,
            }}
            onRowClick={onRowClick ? (row) => handleRowClickInternal(row) : undefined}
        >
            <Card>
                <CardHeader className="py-3.5 border-b">
                    <CardHeading>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Search Input - EXACT same as JobTable */}
                            <div className="relative">
                                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder="Search Cut Lists..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="ps-9 w-[230px] h-[34px]"
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

                            {/* Fab Type Filter - EXACT same pattern */}
                            <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                                <SelectTrigger className="w-[150px] h-[34px]">
                                    <SelectValue placeholder="Fab Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fab Types</SelectItem>
                                    {fabTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Date Filter - EXACT same pattern as JobTable */}
                            <div className="flex items-center gap-2">
                                <Select value={dateFilter} onValueChange={(value) => {
                                    setDateFilter(value);
                                    if (value === 'custom') {
                                        setIsDatePickerOpen(false);
                                    }
                                }}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Install Date" />
                                    </SelectTrigger>
                                    <SelectContent className="w-48">
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="this_week">This Week</SelectItem>
                                        <SelectItem value="last_week">Last Week</SelectItem>
                                        <SelectItem value="this_month">This Month</SelectItem>
                                        <SelectItem value="last_month">Last Month</SelectItem>
                                        <SelectItem value="next_week">Next Week</SelectItem>
                                        <SelectItem value="next_month">Next Month</SelectItem>
                                        <SelectItem value="unscheduled">Unscheduled</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Custom Date Range Picker - EXACT same as JobTable */}
                                {dateFilter === 'custom' && (
                                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-[34px]">
                                                <CalendarDays className="h-4 w-4 mr-2" />
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
                                                defaultMonth={tempDateRange?.from || new Date()}
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
                                )}
                            </div>

                            {/* Sales Person Filter - NEW filter */}
                            <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter}>
                                <SelectTrigger className="w-[180px] h-[34px]">
                                    <SelectValue placeholder="Sales Person" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sales Persons</SelectItem>
                                    <SelectItem value="no_sales_person">No Sales Person</SelectItem>
                                    {salesPersons.map((person) => (
                                        <SelectItem key={person || 'unknown'} value={person || 'unknown'}>
                                            {person || 'Unknown'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Stage filter - only visible to super admins - SAME as JobTable */}
                            {isSuperAdmin && (
                                <Select onValueChange={handleStageFilterChange}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Go to stage" />
                                    </SelectTrigger>
                                    <SelectContent className="w-48">
                                        <SelectItem value="all">All Stages</SelectItem>
                                        {Object.values(JOB_STAGES).map((stage) => (
                                            <SelectItem key={stage.stage} value={stage.stage}>
                                                {stage.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </CardHeading>

                    <CardToolbar>
                        <Button variant="outline" onClick={() => exportTableToCSV(table, "CutList")}>
                            Export CSV
                        </Button>
                    </CardToolbar>
                </CardHeader>

                <CardTable>
                    <ScrollArea>
                        <DataGridTable />
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