import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTable, CardFooter, CardToolbar } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'
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
import { DataGridTable } from '@/components/ui/data-grid-table'
import { DataGridPagination } from '@/components/ui/data-grid-pagination'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { exportTableToCSV } from '@/lib/exportToCsv'
import { DataGrid } from '@/components/ui/data-grid'
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header'

interface ShopData {
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
    },
]
  const salesPersons = [
    'Mike Rodriguez',
    'Sarah Johnson',
    'Bruno Pires',
    'Maria Garcia'
  ];

// ---------------------- MAIN SHOP TABS ---------------------- //
export default function ShopTabs() {
    const [tab, setTab] = useState('cutting')

    const cutting = dummyData
    const wj = dummyData.filter((d) => d.wj_time !== '-')
    const incomplete = dummyData.filter((d) => d.fp_complete === 'No')
    const completed = dummyData.filter((d) => d.fp_complete !== 'No')

    return (
        <Tabs value={tab} onValueChange={setTab} className="w-full">
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
                <ShopTableContent data={cutting} />
            </TabsContent>

            <TabsContent value="wj">
                <ShopTableContent data={wj} />
            </TabsContent>

            <TabsContent value="incomplete">
                <ShopTableContent data={incomplete} />
            </TabsContent>

            <TabsContent value="completed">
                <ShopTableContent data={completed} />
            </TabsContent>
        </Tabs>
    )
}

// ---------------------- SHOP TABLE CONTENT ---------------------- //
function ShopTableContent({ data }: { data: ShopData[] }) {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    })
    const [sorting, setSorting] = useState<SortingState>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [searchQuery, setSearchQuery] = useState('')

    const filteredData = data.filter(
        (item) =>
            item.job_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.fab_id.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const columns: ColumnDef<ShopData>[] = [
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
                <span className="text-sm text-text">{row.original.total_sq_ft}</span>
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
                <span className="text-sm text-text">{row.original.wj_time}</span>
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
                <span className="text-sm text-text">{row.original.machine}</span>
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
                <span className="text-sm text-text">{row.original.confirmed}</span>
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
                <span className="text-sm text-text">{row.original.revenue}</span>
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
                <span className="text-sm text-text">{row.original.fp_complete}</span>
            ),
            enableSorting: true,
        },
    ]

    const table = useReactTable({
        columns,
        data: filteredData,
        pageCount: Math.ceil(filteredData.length / pagination.pageSize),
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
            recordCount={filteredData.length}
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

                        <Select>
                            <SelectTrigger className="w-[150px] h-[34px]">
                                <SelectValue placeholder="2 June - 9 June" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week1">2 June - 9 June</SelectItem>
                                <SelectItem value="week2">10 June - 17 June</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select>
                            <SelectTrigger className="w-[120px] h-[34px]">
                                <SelectValue placeholder="FAB type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select>
                            <SelectTrigger className="w-[160px] h-[34px]">
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
                    </div>

                    <CardToolbar>
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
