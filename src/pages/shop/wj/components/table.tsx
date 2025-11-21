import { useMemo, useState } from 'react';
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
    CardHeading,
    CardTable,
    CardTitle,
    CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, X, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Link, useNavigate } from 'react-router';
import { toAbsoluteUrl } from '@/lib/helpers';
import { dummyData, salesPersons, ShopData } from '../../components/shop';
import ActionsCell from '../../components/action';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';



// const StatusBadge = ({ status }: { status: ShopData['status'] }) => {
//     const colors: Record<ShopData['status'], string> = {
//         Active: 'bg-green-100 text-green-700',
//         Deactivated: 'bg-gray-100 text-gray-600',
//     };

//     return (
//         <span
//             className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[status]}`}
//         >
//             {status}
//         </span>
//     );
// };

const CuttingPlan = () => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const navigate = useNavigate();

    const filteredData = useMemo(() => {
        let result = dummyData;
        
        // Text search across multiple fields
        if (searchQuery) {
            result = result.filter((item) => 
                item.job_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.fab_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.fab_type?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        // Date filter
        if (dateFilter !== 'all') {
            result = result.filter((item) => {
                if (!item.date) return false;
                
                const itemDate = new Date(item.date);
                const today = new Date();
                
                switch (dateFilter) {
                    case 'today':
                        return itemDate.toDateString() === today.toDateString();
                    case '7days':
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(today.getDate() - 7);
                        return itemDate >= sevenDaysAgo && itemDate <= today;
                    case '30days':
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(today.getDate() - 30);
                        return itemDate >= thirtyDaysAgo && itemDate <= today;
                    case 'custom':
                        if (dateRange?.from && dateRange?.to) {
                            const start = new Date(dateRange.from);
                            const end = new Date(dateRange.to);
                            end.setHours(23, 59, 59, 999);
                            return itemDate >= start && itemDate <= end;
                        }
                        return true;
                    default:
                        return item.date?.includes(dateFilter);
                }
            });
        }
        
        return result;
    }, [searchQuery, dateFilter, dateRange, dummyData]);

    const handleView = (id: string) => {
        navigate(`/shop/wj/${id}`);
    };

    const columns = useMemo<ColumnDef<ShopData>[]>(
        () => [
            {
                accessorKey: 'id',
                accessorFn: (row: ShopData) => row.id,
                header: () => <DataGridTableRowSelectAll />,
                cell: ({ row }) => <DataGridTableRowSelect row={row} />,
                enableSorting: false,
                enableHiding: false,
                size: 48,
            },
            {
                id: 'fab_type',
                accessorFn: (row) => row.fab_type,
                header: ({ column }) => (
                    <DataGridColumnHeader title="FAB TYPE" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[120px]">
                        {row.original.fab_type}
                    </span>
                ),
                enableSorting: true,
            },
            {
                id: 'fab_id',
                accessorFn: (row) => row.fab_id,
                header: ({ column }) => (
                    <DataGridColumnHeader title="FAB ID" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text">{row.original.fab_id}</span>
                ),
                enableSorting: true,
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
                    <span className="text-sm text-text max-w-[200px]">{row.original.total_sq_ft}</span>
                ),
                enableSorting: true,
            },
            {
                id: 'wj_time',
                accessorFn: (row) => row.wj_time,
                header: ({ column }) => (
                    <DataGridColumnHeader title="WJ TIME (MINUTES)" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text max-w-[300px]">{row.original.wj_time}</span>
                ),
                enableSorting: true,
            },
            {
                id: 'machine',
                accessorFn: (row) => row.machine,
                header: ({ column }) => (
                    <DataGridColumnHeader title="MACHINE" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text max-w-[200px]">{row.original.machine}</span>
                ),
                enableSorting: true,
            },
            {
                id: 'confirmed',
                accessorFn: (row) => row.confirmed,
                header: ({ column }) => (
                    <DataGridColumnHeader title="CONFIRMED" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text max-w-[200px]">{row.original.confirmed}</span>
                ),
                enableSorting: true,
            },
            {
                id: 'revenue',
                accessorFn: (row) => row.revenue,
                header: ({ column }) => (
                    <DataGridColumnHeader title="REVENUE" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text max-w-[200px]">{row.original.revenue}</span>
                ),
                enableSorting: true,
            },
            {
                id: 'fp_complete',
                accessorFn: (row) => row.fp_complete,
                header: ({ column }) => (
                    <DataGridColumnHeader title="FP COMPLETE" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[200px]">{row.original.fp_complete}</span>
                ),
                enableSorting: true,
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => <ActionsCell row={row} onView={() => handleView(row.original.fab_id)} />,
                enableSorting: false,
                size: 60,
            },
        ], [])

    const table = useReactTable({
        columns,
        data: filteredData,
        pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
        getRowId: (row: ShopData) => String(row.id),
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
            recordCount={filteredData?.length || 0}
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
                                placeholder="Search by job or FAB ID"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="ps-9 w-[230px] h-[34px]"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Select value={dateFilter} onValueChange={(value) => {
                                setDateFilter(value);
                                setIsDatePickerOpen(false);
                            }}>
                                <SelectTrigger className="w-[250px] h-[34px]">
                                    <SelectValue placeholder="Date Filter">
                                        {dateFilter === 'custom' && dateRange?.from ? (
                                            dateRange.to ? (
                                                `Custom: ${format(dateRange.from, 'd MMM yyyy')} - ${format(dateRange.to, 'd MMM yyyy')}`
                                            ) : (
                                                `Custom: ${format(dateRange.from, 'd MMM yyyy')}`
                                            )
                                        ) : (
                                            dateFilter === 'custom' ? 'Custom Range' : undefined
                                        )}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="7days">Last 7 Days</SelectItem>
                                    <SelectItem value="30days">Last 30 Days</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>

                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className={`${dateFilter !== 'custom' ? 'hidden' : ''}`}
                                    >
                                        Select Dates
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
                                                setIsDatePickerOpen(false);
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
                        </div>

                        <Select>
                            <SelectTrigger className="w-[120px] h-[34px]">
                                <SelectValue placeholder="FAB type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                        </Select>


                    </div>

                    <CardToolbar>
                        <Select>
                            <SelectTrigger className="w-[205px] h-[34px]">
                                <SelectValue placeholder="Select sales person" />
                            </SelectTrigger>
                            <SelectContent>
                                {salesPersons.map((person) => (
                                    <SelectItem key={person} value={person}>
                                        {person}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => exportTableToCSV(table, 'shop-data')}
                        >
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

export { CuttingPlan };
