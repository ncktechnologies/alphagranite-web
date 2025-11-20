import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTable, CardFooter, CardToolbar } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Search, Calendar } from 'lucide-react'
import { DateTimePicker } from '@/components/ui/datetime-picker'
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

function ShopTableContent({ data}: { data: ShopData[] }) {
     const navigate = useNavigate();

    const handleView = ( id: string) => {
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
    const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined)
    const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined)
    const [showCustomDate, setShowCustomDate] = useState(false)

    // ✅ useMemo to avoid re-filtering on every keystroke
    const filteredData = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return data.filter(
            (item) =>
                item.job_no.toLowerCase().includes(q) ||
                item.fab_id.toLowerCase().includes(q)
        )
    }, [data, searchQuery])

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

                        <Select value={dateFilter} onValueChange={(value) => {
                            setDateFilter(value)
                            if (value === 'custom') {
                                setShowCustomDate(true)
                            } else {
                                setShowCustomDate(false)
                                setCustomStartDate(undefined)
                                setCustomEndDate(undefined)
                            }
                        }}>
                            <SelectTrigger className="w-[150px] h-[34px]">
                                <SelectValue placeholder="Date Filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="7days">Last 7 Days</SelectItem>
                                <SelectItem value="30days">Last 30 Days</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>

                        {showCustomDate && (
                            <>
                                <DateTimePicker
                                    value={customStartDate}
                                    onChange={setCustomStartDate}
                                    placeholder="Start Date"
                                    granularity="day"
                                />
                                <DateTimePicker
                                    value={customEndDate}
                                    onChange={setCustomEndDate}
                                    placeholder="End Date"
                                    granularity="day"
                                />
                            </>
                        )}

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
    )
}

// ✅ Prevent full re-renders when switching tabs
const MemoizedShopTableContent = React.memo(ShopTableContent)
