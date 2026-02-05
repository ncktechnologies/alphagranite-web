import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTable, CardFooter, CardToolbar } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Search, CalendarDays } from 'lucide-react'
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
} from '@tanstack/react-table'
import {
    DataGridTable,
    DataGridTableRowSelect,
    DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table'
import { DataGridPagination } from '@/components/ui/data-grid-pagination'
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { exportTableToCSV } from '@/lib/exportToCsv'
import { DataGrid } from '@/components/ui/data-grid'
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header'
import ActionsCell from './action'
import { useNavigate } from 'react-router'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'

export interface ShopData {
    id: number
    fab_type: string
    fab_id: string
    job_no: string
    pieces: number
    total_sq_ft: number
    wj_time: string
    machine: string
    confirmed: string
    revenue: string
    fp_complete: string
    date: string
}

const dummyData: ShopData[] = [
    {
        id: 1,
        fab_type: 'Standard',
        fab_id: '14425',
        job_no: '9999',
        pieces: 14,
        total_sq_ft: 171,
        wj_time: '-',
        machine: '-',
        confirmed: '9/10/2025',
        revenue: '$5,005.00',
        fp_complete: '9/10/2025',
        date: '10 October, 2025',
    },
    {
        id: 2,
        fab_type: 'Standard',
        fab_id: '33034',
        job_no: '9999',
        pieces: 16,
        total_sq_ft: 28.5,
        wj_time: '-',
        machine: '-',
        confirmed: '-',
        revenue: '-',
        fp_complete: 'No',
        date: '10 October, 2025',
    },
    {
        id: 3,
        fab_type: 'Standard',
        fab_id: '33034',
        job_no: '9999',
        pieces: 5,
        total_sq_ft: 28.5,
        wj_time: '-',
        machine: '-',
        confirmed: '-',
        revenue: '-',
        fp_complete: 'No',
        date: '10 October, 2025',
    },
]

const salesPersons = ['Mike Rodriguez', 'Sarah Johnson', 'Bruno Pires', 'Maria Garcia']

export default function ShopTabs() {

    const [tab, setTab] = useState('cutting')

    const cutting = dummyData
    const wj = dummyData.filter((d) => d.wj_time !== '-')
    const incomplete = dummyData.filter((d) => d.fp_complete === 'No')
    const completed = dummyData.filter((d) => d.fp_complete !== 'No')

    return (
        <Tabs value={tab} onValueChange={setTab} className="w-full" >
            <TabsList className="mb-3 bg-transparent p-2 border flex flex-wrap gap-2">
                <TabsTrigger value="cutting">Cutting plan</TabsTrigger>
                <TabsTrigger value="wj">WJ</TabsTrigger>
                <TabsTrigger value="incomplete">
                    Incomplete ({incomplete.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                    Completed ({completed.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="cutting">
                <MemoizedShopTableContent data={cutting} />
            </TabsContent>

            <TabsContent value="wj">
                <MemoizedShopTableContent data={wj} />
            </TabsContent>

            <TabsContent value="incomplete">
                <MemoizedShopTableContent data={incomplete} />
            </TabsContent>

            <TabsContent value="completed">
                <MemoizedShopTableContent data={completed} />
            </TabsContent>
        </Tabs>
    )
}

// ✅ Prevent full re-renders when switching tabs
const MemoizedShopTableContent = React.memo(ShopTableContent)

function ShopTableContent({ data }: { data: ShopData[] }) {
    const navigate = useNavigate();

    const handleView = (id: string) => {
        navigate(`/shop/${id}`);
    };

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    })
    const [sorting, setSorting] = useState<SortingState>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState<string>('all')
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined)
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

    // ✅ useMemo to avoid re-filtering on every keystroke
    const filteredData = useMemo(() => {
        let result = data;

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
    }, [searchQuery, dateFilter, dateRange, data]);

    // ✅ memoize columns once
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
                    <span className="text-sm text-text break-words max-w-[120px]">
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
                    <span className="text-sm text-text break-words max-w-[200px]">{row.original.fp_complete}</span>
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
        pageCount: Math.ceil(filteredData.length / pagination.pageSize),
        state: { pagination, sorting, rowSelection },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    return (
        <DataGrid
            table={table}
            recordCount={filteredData.length}
            groupByDate
            dateKey="date"
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
                    <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-300px)]">
                        <DataGridTable />
                        <ScrollBar
                            orientation="horizontal"
                            className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500"
                        />
                    </ScrollArea>
                </CardTable>

                <CardFooter>
                    <DataGridPagination />
                </CardFooter>
            </Card>
        </DataGrid>
    )
}
