import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardHeading, CardTable, CardFooter, CardToolbar } from '@/components/ui/card'
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
} from '@tanstack/react-table';
import { DataGridTable } from '@/components/ui/data-grid-table'
import { DataGridPagination } from '@/components/ui/data-grid-pagination'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { exportTableToCSV } from '@/lib/exportToCsv'
import { DataGrid } from '@/components/ui/data-grid'

interface ShopData {
     id: number;
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

export default function ShopTable() {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [tab, setTab] = useState('cutting')
    const [searchQuery, setSearchQuery] = useState('')

    const columns: ColumnDef<ShopData>[] = [
        { accessorKey: 'fab_type', header: 'FAB TYPE' },
        { accessorKey: 'fab_id', header: 'FAB ID' },
        { accessorKey: 'job_no', header: 'JOB NO' },
        { accessorKey: 'pieces', header: 'NO. OF PIECES' },
        { accessorKey: 'total_sq_ft', header: 'TOTAL SQ FT' },
        { accessorKey: 'wj_time', header: 'WJ TIME (MINUTES)' },
        { accessorKey: 'machine', header: 'MACHINE' },
        { accessorKey: 'confirmed', header: 'CONFIRMED' },
        { accessorKey: 'revenue', header: 'REVENUE' },
        { accessorKey: 'fp_complete', header: 'FP COMPLETE' },
    ]

    const filteredData = dummyData.filter((item) =>
        item.job_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.fab_id.toLowerCase().includes(searchQuery.toLowerCase())
    )

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

            {/* Tabs */}
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="cutting">Cutting plan</TabsTrigger>
                    <TabsTrigger value="wj">WJ</TabsTrigger>
                    <TabsTrigger value="incomplete">Incomplete</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
            </Tabs>

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
                                <SelectItem value="alex">Alex</SelectItem>
                                <SelectItem value="ngozi">Ngozi</SelectItem>
                                <SelectItem value="ozavize">Ozavize</SelectItem>
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
