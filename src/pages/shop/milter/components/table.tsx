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
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Link, useNavigate } from 'react-router';
import { toAbsoluteUrl } from '@/lib/helpers';
import { dummyData, salesPersons, ShopData } from '../../components/shop';
import ActionsCell from '../../components/action';



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
    const navigate = useNavigate();

    const filteredData = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return dummyData.filter(
            (item) =>
                item.job_no.toLowerCase().includes(q) ||
                item.fab_id.toLowerCase().includes(q)
        )
    }, [dummyData, searchQuery])

    const handleView = (id: string) => {
        navigate(`/shop/miter/${id}`);
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
                id: 'milter_planning',
                accessorFn: (row) => row.miter_planning,
                header: ({ column }) => (
                    <DataGridColumnHeader title="Miter PlaninG" column={column} className='uppercase' />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text max-w-[200px]">{row.original.miter_planning}</span>
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
